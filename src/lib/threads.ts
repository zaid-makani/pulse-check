import { z } from 'zod'
import type { ThreadStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { structured, MODELS } from '@/lib/llm'
import { embed, nearestThreads, setThreadEmbedding } from '@/lib/embeddings'
import { readSignals, type Signals } from '@/lib/extract'

/**
 * Threads are the spine. Every update is linked to the ongoing work it
 * touches; new work becomes a new thread. Each touched thread then gets a
 * refreshed rolling summary and status.
 */

const STALE_AFTER_DAYS = 10

// ---------------------------------------------------------------------------
// Linking
// ---------------------------------------------------------------------------

const LinkDecisionSchema = z.object({
  decisions: z.array(
    z.object({
      workItem: z.string().describe('The work item from the update this decision is about'),
      action: z.enum(['link', 'create', 'skip']).describe('link to an existing thread, create a new one, or skip (not real ongoing work, e.g. a meeting)'),
      threadId: z.string().nullable().describe('Existing thread id when action is link'),
      name: z.string().nullable().describe('New thread name when action is create: 2 to 6 words, how a colleague would refer to it'),
      description: z.string().nullable().describe('New thread: one sentence on what the work is'),
      confidence: z.number().min(0).max(1),
      excerpt: z.string().describe('The part of the update that concerns this thread, one short phrase'),
    }),
  ),
})

const LINK_SYSTEM = `You maintain a team's list of ongoing work threads. A thread is a piece of work that lasts days or weeks and that several updates will mention: a feature, an integration, an incident, a migration, an audit, a deal. Not a thread: a meeting, a one-off review, a general remark.

Given a new update and the team's candidate threads, decide for each work item in the update whether it belongs to an existing thread or starts a new one.

Rules:
- Prefer linking. People refer to the same work with different words ("N1", "the N1 thing", "N1 vendor integration" are one thread).
- Create only when the work is clearly not any candidate.
- A single update can touch several threads.
- Skip meetings, reviews of other people's work, and vague remarks.
- Confidence is your certainty that the link or new thread is right.`

export async function linkUpdateToThreads(input: {
  updateId: string
  teamId: string
  userId: string
  rawText: string
  signals: Signals
  embedding: number[]
}): Promise<void> {
  const { updateId, teamId, userId, signals } = input

  const [near, recent] = await Promise.all([
    nearestThreads(teamId, input.embedding, 8),
    prisma.thread.findMany({
      where: { teamId, mergedIntoId: null, status: { in: ['ACTIVE', 'BLOCKED'] } },
      orderBy: { lastActivityAt: 'desc' },
      take: 25,
      select: { id: true, name: true, status: true, summary: true, aliases: true },
    }),
  ])
  const candidates = new Map<string, { id: string; name: string; status: string; summary: string | null; aliases: string[] }>()
  for (const t of [...near, ...recent]) candidates.set(t.id, t)

  const workItems = signals.workItems.length > 0 ? signals.workItems : [signals.summary].filter(Boolean)
  if (workItems.length === 0) return

  const candidateText =
    candidates.size === 0
      ? '(none yet)'
      : [...candidates.values()]
          .map((t) => `- id=${t.id} | ${t.name}${t.aliases.length ? ` (aka ${t.aliases.join(', ')})` : ''} | ${t.status} | ${t.summary ?? ''}`)
          .join('\n')

  const prompt = `Candidate threads:\n${candidateText}\n\nUpdate summary: ${signals.summary}\nWork items: ${workItems.join('; ')}\nDone: ${signals.done.join('; ') || '-'}\nIn progress: ${signals.inProgress.join('; ') || '-'}\nBlockers: ${signals.blockers.map((b) => b.text).join('; ') || '-'}\n\nRaw update:\n"""\n${input.rawText}\n"""`

  const { decisions } = await structured(
    { purpose: 'link', teamId, userId },
    { system: LINK_SYSTEM, prompt, schema: LinkDecisionSchema, effort: 'low', model: MODELS.fast },
  )

  const touched = new Set<string>()
  const createdNames = new Map<string, string>()

  for (const d of decisions) {
    if (d.action === 'skip') continue
    let threadId: string | null = null

    if (d.action === 'link' && d.threadId && candidates.has(d.threadId)) {
      threadId = d.threadId
    } else if (d.action === 'create' || (d.action === 'link' && !candidates.has(d.threadId ?? ''))) {
      const name = (d.name ?? d.workItem).trim().slice(0, 80)
      if (!name) continue
      const key = name.toLowerCase()
      if (createdNames.has(key)) {
        threadId = createdNames.get(key)!
      } else {
        const existing = await prisma.thread.findFirst({
          where: { teamId, mergedIntoId: null, name: { equals: name, mode: 'insensitive' } },
          select: { id: true },
        })
        if (existing) {
          threadId = existing.id
        } else {
          const t = await prisma.thread.create({
            data: { teamId, name, description: d.description ?? undefined, createdByAi: true, lastActivityAt: new Date() },
          })
          threadId = t.id
          createdNames.set(key, t.id)
          try {
            const v = await embed(`${name}\n${d.description ?? ''}`, { purpose: 'embed', teamId, userId })
            await setThreadEmbedding(t.id, v)
          } catch (err) {
            console.error('thread embed failed', err)
          }
        }
      }
    }

    if (!threadId) continue
    await prisma.threadLink.upsert({
      where: { threadId_updateId: { threadId, updateId } },
      update: { confidence: d.confidence, excerpt: d.excerpt },
      create: { threadId, updateId, confidence: d.confidence, excerpt: d.excerpt },
    })
    touched.add(threadId)
  }

  for (const id of touched) {
    try {
      await refreshThread(id, { teamId, userId })
    } catch (err) {
      console.error('refreshThread failed', id, err)
    }
  }
}

// ---------------------------------------------------------------------------
// Rolling summary
// ---------------------------------------------------------------------------

const SummarySchema = z.object({
  summary: z
    .string()
    .describe('Two to four sentences. What the work is, where it stands now, who is on it, what it is waiting on. Present tense. Name people. No preamble.'),
  status: z.enum(['active', 'blocked', 'done']),
  aliases: z.array(z.string()).describe('Other short names people have used for this work, if any'),
  participants: z.array(z.string()).describe('Names of the people who have contributed updates to this thread'),
})

const SUMMARY_SYSTEM = `You keep a running summary of one work thread for a team. You are given the thread name, its previous summary, and its most recent updates in order (oldest first). Write the new summary so that a director who has not been following can understand where things stand in ten seconds. Status is blocked only when the most recent updates state an explicit blocker for this thread (waiting on a person, team, vendor, or system). A risk, a worry, or a frustrated tone is not a blocker. Done only when the work has shipped or been closed out.`

export async function refreshThread(threadId: string, ctx: { teamId?: string | null; userId?: string | null } = {}) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      links: {
        include: { update: { include: { user: { select: { name: true } } } } },
        orderBy: { update: { createdAt: 'desc' } },
        take: 10,
      },
    },
  })
  if (!thread) return

  const updates = [...thread.links].reverse().map((l) => {
    const s = readSignals(l.update.signals)
    const date = l.update.createdAt.toISOString().slice(0, 10)
    return `${date} · ${l.update.user.name}: ${s.summary || l.update.rawText.slice(0, 200)}${s.blockers.length ? ` | blocked: ${s.blockers.map((b) => b.text).join('; ')}` : ''}${s.done.length ? ` | done: ${s.done.join('; ')}` : ''}`
  })

  const prompt = `Thread: ${thread.name}\nPrevious summary: ${thread.summary ?? '(none)'}\nKnown aliases: ${thread.aliases.join(', ') || '(none)'}\n\nRecent updates:\n${updates.join('\n')}`

  const out = await structured(
    { purpose: 'summarize_thread', teamId: ctx.teamId ?? thread.teamId, userId: ctx.userId },
    { system: SUMMARY_SYSTEM, prompt, schema: SummarySchema, effort: 'low', model: MODELS.fast },
  )

  const latestAt = thread.links[0]?.update.createdAt ?? thread.lastActivityAt
  const aliases = [...new Set([...thread.aliases, ...out.aliases.map((a) => a.trim()).filter((a) => a && a.toLowerCase() !== thread.name.toLowerCase())])].slice(0, 12)

  await prisma.thread.update({
    where: { id: threadId },
    data: {
      summary: out.summary,
      status: out.status.toUpperCase() as ThreadStatus,
      aliases,
      lastActivityAt: latestAt > thread.lastActivityAt ? latestAt : thread.lastActivityAt,
    },
  })

  try {
    const v = await embed(`${thread.name}\n${aliases.join(', ')}\n${out.summary}`, { purpose: 'embed', teamId: thread.teamId, userId: ctx.userId })
    await setThreadEmbedding(threadId, v)
  } catch (err) {
    console.error('thread embed failed', err)
  }
}

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

export function effectiveStatus(t: { status: ThreadStatus; lastActivityAt: Date }): ThreadStatus {
  if (t.status === 'DONE') return 'DONE'
  const age = (Date.now() - t.lastActivityAt.getTime()) / 86_400_000
  if (age > STALE_AFTER_DAYS) return 'STALE'
  return t.status
}

/** Merge `fromId` into `intoId`: move links, mark from as merged, refresh into. */
export async function mergeThreads(fromId: string, intoId: string, userId: string) {
  if (fromId === intoId) return
  const [from, into] = await Promise.all([
    prisma.thread.findUnique({ where: { id: fromId }, include: { links: true } }),
    prisma.thread.findUnique({ where: { id: intoId } }),
  ])
  if (!from || !into || from.teamId !== into.teamId) throw new Error('Threads not mergeable')

  await prisma.$transaction(async (tx) => {
    for (const l of from.links) {
      await tx.threadLink.upsert({
        where: { threadId_updateId: { threadId: intoId, updateId: l.updateId } },
        update: {},
        create: { threadId: intoId, updateId: l.updateId, confidence: l.confidence, excerpt: l.excerpt, confirmedById: userId },
      })
    }
    await tx.threadLink.deleteMany({ where: { threadId: fromId } })
    await tx.thread.update({
      where: { id: fromId },
      data: { mergedIntoId: intoId, status: 'DONE' },
    })
    await tx.thread.update({
      where: { id: intoId },
      data: { aliases: [...new Set([...into.aliases, from.name, ...from.aliases])].slice(0, 12) },
    })
  })
  await refreshThread(intoId, { teamId: into.teamId, userId })
}
