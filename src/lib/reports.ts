import type { ReportType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { text as llmText, MODELS } from '@/lib/llm'
import { readSignals } from '@/lib/extract'
import { effectiveStatus } from '@/lib/threads'
import { daysSince } from '@/lib/format'

/**
 * Reports are generated documents, never maintained by hand. Each one is a
 * prompt over the threads and updates of a subject (a team or a person) for
 * a period, producing Markdown that is stored and can be regenerated.
 */

export interface GenerateInput {
  type: ReportType
  teamId?: string
  subjectUserId?: string
  periodStart: Date
  periodEnd: Date
  authorId?: string
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function teamContext(teamId: string, start: Date, end: Date) {
  const [team, threads, updates, members] = await Promise.all([
    prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { name: true, description: true } }),
    prisma.thread.findMany({
      where: { teamId, mergedIntoId: null, OR: [{ status: { not: 'DONE' } }, { lastActivityAt: { gte: start } }] },
      orderBy: { lastActivityAt: 'desc' },
      include: { links: { select: { update: { select: { user: { select: { name: true } } } } } } },
    }),
    prisma.update.findMany({
      where: { teamId, createdAt: { gte: start, lte: end }, supersededBy: null },
      include: { user: { select: { name: true } }, links: { include: { thread: { select: { name: true } } } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { name: true, updates: { where: { teamId }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } } } } },
    }),
  ])

  const threadLines = threads.map((t) => {
    const people = [...new Set(t.links.map((l) => l.update.user.name))]
    return `- ${t.name} [${effectiveStatus(t)}, last activity ${daysSince(t.lastActivityAt)}d ago; ${people.join(', ') || 'no one'}]: ${t.summary ?? t.description ?? ''}`
  })
  const updateLines = updates.map((u) => {
    const s = readSignals(u.signals)
    return [
      `${u.createdAt.toISOString().slice(0, 10)} · ${u.user.name} · ${s.sentiment}${u.links.length ? ` · threads: ${u.links.map((l) => l.thread.name).join(', ')}` : ''}`,
      `  ${s.summary || u.rawText.slice(0, 200)}`,
      s.done.length ? `  done: ${s.done.join('; ')}` : '',
      s.blockers.length ? `  blocked: ${s.blockers.map((b) => (b.waitingOn ? `${b.text} (waiting on ${b.waitingOn})` : b.text)).join('; ')}` : '',
      s.asks.length ? `  asks: ${s.asks.join('; ')}` : '',
      s.risks.length ? `  risks: ${s.risks.join('; ')}` : '',
    ].filter(Boolean).join('\n')
  })
  const memberLines = members.map((m) => {
    const last = m.user.updates[0]
    return `- ${m.user.name} (${m.role.toLowerCase()}): ${last ? `last update ${daysSince(last.createdAt)}d ago` : 'no updates yet'}`
  })

  return { team, threadLines, updateLines, memberLines, updateCount: updates.length }
}

async function personContext(userId: string, start: Date, end: Date, teamIds?: string[]) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } })
  const updates = await prisma.update.findMany({
    where: { userId, createdAt: { gte: start, lte: end }, supersededBy: null, ...(teamIds ? { teamId: { in: teamIds } } : {}) },
    include: { team: { select: { name: true } }, links: { include: { thread: { select: { id: true, name: true, status: true, summary: true, lastActivityAt: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  const threads = new Map<string, { name: string; status: string; summary: string | null; count: number }>()
  for (const u of updates) for (const l of u.links) {
    const t = threads.get(l.thread.id) ?? { name: l.thread.name, status: effectiveStatus(l.thread), summary: l.thread.summary, count: 0 }
    t.count++
    threads.set(l.thread.id, t)
  }
  const updateLines = updates.map((u) => {
    const s = readSignals(u.signals)
    return [
      `${u.createdAt.toISOString().slice(0, 10)} · ${u.team.name} · ${s.sentiment}${u.links.length ? ` · ${u.links.map((l) => l.thread.name).join(', ')}` : ''}`,
      `  said: "${u.rawText.replace(/\s+/g, ' ').slice(0, 400)}"`,
      s.done.length ? `  done: ${s.done.join('; ')}` : '',
      s.inProgress.length ? `  in progress: ${s.inProgress.join('; ')}` : '',
      s.blockers.length ? `  blocked: ${s.blockers.map((b) => (b.waitingOn ? `${b.text} (waiting on ${b.waitingOn})` : b.text)).join('; ')}` : '',
      s.asks.length ? `  asks: ${s.asks.join('; ')}` : '',
      s.risks.length ? `  risks: ${s.risks.join('; ')}` : '',
    ].filter(Boolean).join('\n')
  })
  const threadLines = [...threads.values()].sort((a, b) => b.count - a.count).map((t) => `- ${t.name} [${t.status}, ${t.count} updates]: ${t.summary ?? ''}`)
  return { user, updateLines, threadLines, updateCount: updates.length }
}

const STYLE = `Write in plain, direct English. Short sentences. Name people and dates. No corporate filler, no "leveraging", no "synergies". Use Markdown: ## for sections, - for lists, **bold** only for names of people or work when it helps scanning. Do not add a title line; the document already has one. Do not invent anything that is not in the data; if the data is thin, say so in one line rather than padding.`

const TEMPLATES: Record<ReportType, { title: (s: string, a: Date, b: Date) => string; system: string; effort: 'low' | 'medium' | 'high' }> = {
  DAILY_BRIEFING: {
    title: (s, _a, b) => `${s} · briefing for ${fmtDate(b)}`,
    effort: 'medium',
    system: `You write the morning briefing a team lead or director reads before their first meeting. It answers one question: who do I need to talk to today, and why. ${STYLE}

Structure:
## Talk to first
The two or three people who need attention, each with one line on why (a blocker, a frustrated tone, a risk, or silence). If no one does, say "No one is stuck." and move on.
## Moving
What progressed since the last briefing, grouped by thread, one line each. Skip threads with no movement.
## Watch
Risks and external dependencies that could bite this week. One line each.
## Quiet
People with no update in 2 or more working days, listed by name with the number of days. Omit the section if empty.`,
  },
  STANDUP_BRIEF: {
    title: (s, _a, b) => `${s} · standup brief for ${fmtDate(b)}`,
    effort: 'low',
    system: `You write a brief for a daily standup so the meeting can skip the round of updates and go straight to problems. ${STYLE}

Structure:
## Since yesterday
One line per person who posted: what they did and what they are on now.
## Needs discussion
Blockers, asks, and cross-team dependencies that the standup should resolve. Name who owns each.
## Not heard from
Names only.`,
  },
  ONE_ON_ONE_PREP: {
    title: (s, a, b) => `1-on-1 prep · ${s} · ${fmtDate(a)} to ${fmtDate(b)}`,
    effort: 'high',
    system: `You prepare a manager for a 1-on-1 with someone on their team. The manager may not have spoken to this person in weeks and wants to walk in knowing what they have been doing, where they were stuck, and how they have sounded. ${STYLE}

Structure:
## In one paragraph
What this person has been carrying in the period and how it is going.
## What they did
Grouped by thread, most significant first. Concrete outcomes, with dates.
## Where they were stuck
Blockers and asks, whether they were resolved, and how long each lasted.
## How they sounded
Sentiment over the period in two or three sentences, quoting a phrase or two from their own words when it reveals something. Be honest but fair; a frustrated week is information, not a verdict.
## Worth asking
Three to five specific questions for the conversation, each tied to something above. Include at least one about what the manager could remove from their way and one about what they want next.`,
  },
  SELF_REVIEW: {
    title: (s, a, b) => `Self-review · ${s} · ${fmtDate(a)} to ${fmtDate(b)}`,
    effort: 'high',
    system: `You draft a self-review for a person, written in the first person, from their own updates. They will paste this into an appraisal form and edit it, so it must sound like them and claim only what they reported. Quiet people under-sell themselves; give their work its full weight without inflating it. ${STYLE}

Structure:
## Summary
Three or four sentences on what I delivered and what I drove in this period.
## What I delivered
Grouped by piece of work, most significant first. Each with the outcome and, where the data shows it, the difficulty (blockers overcome, dependencies managed, scale, incidents).
## How I worked with others
Reviews, pairing, unblocking others, cross-team coordination, drawn from the updates. Name people.
## What got in the way
Blockers and dependencies I dealt with, stated factually.
## What I want next
Leave two or three bullet placeholders in [brackets] for the person to fill; do not invent goals.`,
  },
  WEEK_RECAP: {
    title: (s, a, b) => `Your week · ${fmtDate(a)} to ${fmtDate(b)}`,
    effort: 'low',
    system: `You write a short Friday note to one person, in the second person, giving them their own week back. Warm, brief, specific. It should take twenty seconds to read and make them feel their work was noticed. ${STYLE}

Structure:
One short paragraph on what they got done, one line on what is still open or blocked, and one closing sentence. No headings. Under 120 words.`,
  },
  QUARTER_DELIVERY: {
    title: (s, a, b) => `${s} · delivery ${fmtDate(a)} to ${fmtDate(b)}`,
    effort: 'high',
    system: `You draft a team's delivery report for a period, the kind a CTO pastes into a quarterly newsletter or roadmap review. The team will review and edit it rather than write it from scratch. ${STYLE}

Structure:
## Shipped
What was completed, one line each with who drove it and when. Most significant first.
## In flight
Work still open, with current status and what it is waiting on.
## Slipped or at risk
Anything that missed or is likely to miss, with the reason stated plainly (usually an external dependency).
## People
One line per person naming their main contribution in the period.`,
  },
}

export async function generateReport(input: GenerateInput) {
  const tpl = TEMPLATES[input.type]
  const isPerson = input.type === 'ONE_ON_ONE_PREP' || input.type === 'SELF_REVIEW' || input.type === 'WEEK_RECAP'
  let subjectName = ''
  let prompt = ''

  if (isPerson) {
    if (!input.subjectUserId) throw new Error('subjectUserId required')
    const ctx = await personContext(input.subjectUserId, input.periodStart, input.periodEnd, input.teamId ? [input.teamId] : undefined)
    subjectName = ctx.user.name
    prompt = `Person: ${ctx.user.name}\nPeriod: ${fmtDate(input.periodStart)} to ${fmtDate(input.periodEnd)}\nUpdates in period: ${ctx.updateCount}\n\nThreads they touched:\n${ctx.threadLines.join('\n') || '(none)'}\n\nUpdates, oldest first:\n${ctx.updateLines.join('\n\n') || '(none)'}`
  } else {
    if (!input.teamId) throw new Error('teamId required')
    const ctx = await teamContext(input.teamId, input.periodStart, input.periodEnd)
    subjectName = ctx.team.name
    prompt = `Team: ${ctx.team.name}${ctx.team.description ? ` (${ctx.team.description})` : ''}\nPeriod: ${fmtDate(input.periodStart)} to ${fmtDate(input.periodEnd)}\nUpdates in period: ${ctx.updateCount}\n\nPeople:\n${ctx.memberLines.join('\n')}\n\nThreads:\n${ctx.threadLines.join('\n') || '(none)'}\n\nUpdates in period, oldest first:\n${ctx.updateLines.join('\n\n') || '(none)'}`
  }

  const content = await llmText(
    { purpose: `report:${input.type.toLowerCase()}`, teamId: input.teamId ?? null, userId: input.authorId ?? input.subjectUserId ?? null },
    { model: MODELS.smart, system: tpl.system, messages: [{ role: 'user', content: prompt }], effort: tpl.effort, maxTokens: 6000 },
  )

  return prisma.report.create({
    data: {
      type: input.type,
      teamId: input.teamId,
      subjectUserId: input.subjectUserId,
      authorId: input.authorId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      title: tpl.title(subjectName, input.periodStart, input.periodEnd),
      content: content.trim(),
    },
  })
}

/** Default period for a report type, ending now. */
export function defaultPeriod(type: ReportType): { periodStart: Date; periodEnd: Date } {
  const periodEnd = new Date()
  const periodStart = new Date()
  const days = { DAILY_BRIEFING: 3, STANDUP_BRIEF: 2, ONE_ON_ONE_PREP: 21, SELF_REVIEW: 182, WEEK_RECAP: 7, QUARTER_DELIVERY: 91 }[type]
  periodStart.setDate(periodStart.getDate() - days)
  return { periodStart, periodEnd }
}
