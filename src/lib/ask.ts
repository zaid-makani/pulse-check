import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { anthropic, MODELS, logLlmCall } from '@/lib/llm'
import { embed, nearestThreads, nearestUpdates } from '@/lib/embeddings'
import { readSignals } from '@/lib/extract'
import { effectiveStatus } from '@/lib/threads'
import { daysSince } from '@/lib/format'

/**
 * The Ask agent. One brain for the web chat and the Slack @mention.
 *
 * It answers questions about work by searching threads and updates with
 * tools, scoped to the teams the asker can see. Every update it reads is
 * returned as a source so the UI can show where an answer came from.
 */

export interface AskSource {
  id: string
  userName: string
  teamName: string
  createdAt: string
  summary: string
}

export interface AskEvent {
  type: 'text' | 'tool' | 'done' | 'error'
  text?: string
  tool?: { name: string; input: Record<string, unknown> }
  sources?: AskSource[]
}

interface Ctx {
  userId: string
  teamIds: string[]
  teamNames: Map<string, string>
  sources: Map<string, AskSource>
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

const tools: Anthropic.Tool[] = [
  {
    name: 'search_threads',
    description: 'Find ongoing work threads by meaning. Use for "what is happening with X", "who is working on X", "status of X". Returns thread name, status, summary, people, last activity.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'What to look for, in natural language' } },
      required: ['query'],
    },
  },
  {
    name: 'search_updates',
    description: 'Find individual updates by meaning, optionally restricted to one person or a time window. Use when you need the actual words someone said, or details a thread summary lacks.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        personName: { type: 'string', description: 'Restrict to this person (first name is enough)' },
        days: { type: 'integer', description: 'Only updates from the last N days', minimum: 1, maximum: 400 },
      },
      required: ['query'],
    },
  },
  {
    name: 'person_timeline',
    description: 'Everything one person has reported in a period, newest first. Use for "what has X been doing", 1-on-1 prep, or when a question is about a specific person.',
    input_schema: {
      type: 'object',
      properties: {
        personName: { type: 'string' },
        days: { type: 'integer', minimum: 1, maximum: 400, description: 'Default 14' },
      },
      required: ['personName'],
    },
  },
  {
    name: 'team_status',
    description: 'Current picture of one team or all visible teams: open threads with status, who is blocked, who has been quiet, recent sentiment. Use for broad questions like "how is the team doing" or "what needs my attention".',
    input_schema: {
      type: 'object',
      properties: { teamName: { type: 'string', description: 'Optional. Omit for all teams the asker can see' } },
    },
  },
  {
    name: 'thread_detail',
    description: 'Full timeline of one thread by id (from search_threads).',
    input_schema: {
      type: 'object',
      properties: { threadId: { type: 'string' } },
      required: ['threadId'],
    },
  },
]

function fmtUpdate(u: { id: string; createdAt: Date; rawText: string; summary: string | null; signals: unknown; user: { name: string }; teamId: string }, ctx: Ctx) {
  const s = readSignals(u.signals)
  const team = ctx.teamNames.get(u.teamId) ?? ''
  ctx.sources.set(u.id, { id: u.id, userName: u.user.name, teamName: team, createdAt: u.createdAt.toISOString(), summary: s.summary || u.rawText.slice(0, 160) })
  const bits = [
    `[${u.createdAt.toISOString().slice(0, 10)}] ${u.user.name} (${team}): ${s.summary || u.rawText.slice(0, 200)}`,
    s.done.length ? `  done: ${s.done.join('; ')}` : '',
    s.inProgress.length ? `  in progress: ${s.inProgress.join('; ')}` : '',
    s.blockers.length ? `  blocked: ${s.blockers.map((b) => (b.waitingOn ? `${b.text} (waiting on ${b.waitingOn})` : b.text)).join('; ')}` : '',
    s.asks.length ? `  asks: ${s.asks.join('; ')}` : '',
    s.risks.length ? `  risks: ${s.risks.join('; ')}` : '',
    `  sentiment: ${s.sentiment}`,
  ].filter(Boolean)
  return bits.join('\n')
}

async function findPerson(name: string, ctx: Ctx) {
  const n = name.trim().toLowerCase()
  const people = await prisma.user.findMany({
    where: { teamMemberships: { some: { teamId: { in: ctx.teamIds } } } },
    select: { id: true, name: true },
  })
  const exact = people.find((p) => p.name.toLowerCase() === n)
  if (exact) return exact
  const partial = people.filter((p) => p.name.toLowerCase().includes(n) || n.includes(p.name.split(' ')[0].toLowerCase()))
  return partial.length === 1 ? partial[0] : partial.length > 1 ? { ambiguous: partial } : null
}

async function runTool(name: string, input: Record<string, unknown>, ctx: Ctx): Promise<string> {
  switch (name) {
    case 'search_threads': {
      const q = String(input.query ?? '')
      const v = await embed(q, { purpose: 'ask:embed', userId: ctx.userId })
      const out: string[] = []
      for (const teamId of ctx.teamIds) {
        const rows = await nearestThreads(teamId, v, 5)
        for (const r of rows) if (r.similarity > 0.2) out.push(`${r.id}|${r.similarity.toFixed(2)}`)
      }
      if (out.length === 0) return 'No matching threads.'
      const ids = out.map((o) => o.split('|')[0])
      const threads = await prisma.thread.findMany({
        where: { id: { in: ids }, mergedIntoId: null },
        include: { links: { select: { update: { select: { user: { select: { name: true } } } } } } },
      })
      return threads
        .map((t) => {
          const people = [...new Set(t.links.map((l) => l.update.user.name))]
          return `thread_id=${t.id}\nname: ${t.name}${t.aliases.length ? ` (aka ${t.aliases.join(', ')})` : ''}\nteam: ${ctx.teamNames.get(t.teamId)}\nstatus: ${effectiveStatus(t)}\nlast activity: ${daysSince(t.lastActivityAt)} days ago\npeople: ${people.join(', ') || 'none'}\nsummary: ${t.summary ?? t.description ?? '(none)'}`
        })
        .join('\n\n')
    }
    case 'search_updates': {
      const q = String(input.query ?? '')
      const days = typeof input.days === 'number' ? input.days : undefined
      let personId: string | undefined
      if (input.personName) {
        const p = await findPerson(String(input.personName), ctx)
        if (!p) return `No one called "${input.personName}" on these teams.`
        if ('ambiguous' in p) return `Several people match: ${p.ambiguous.map((x) => x.name).join(', ')}. Ask with a full name.`
        personId = p.id
      }
      const v = await embed(q, { purpose: 'ask:embed', userId: ctx.userId })
      const near = await nearestUpdates(ctx.teamIds, v, 40)
      const since = days ? new Date(Date.now() - days * 86_400_000) : null
      const ids = near
        .filter((r) => (!personId || r.userId === personId) && (!since || r.createdAt >= since) && r.similarity > 0.15)
        .slice(0, 12)
        .map((r) => r.id)
      if (ids.length === 0) return 'No matching updates.'
      const updates = await prisma.update.findMany({ where: { id: { in: ids } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } })
      return updates.map((u) => fmtUpdate(u, ctx)).join('\n\n')
    }
    case 'person_timeline': {
      const p = await findPerson(String(input.personName ?? ''), ctx)
      if (!p) return `No one called "${input.personName}" on these teams.`
      if ('ambiguous' in p) return `Several people match: ${p.ambiguous.map((x) => x.name).join(', ')}. Ask with a full name.`
      const days = typeof input.days === 'number' ? input.days : 14
      const updates = await prisma.update.findMany({
        where: { userId: p.id, teamId: { in: ctx.teamIds }, createdAt: { gte: new Date(Date.now() - days * 86_400_000) }, supersededBy: null },
        include: { user: { select: { name: true } }, links: { include: { thread: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      })
      if (updates.length === 0) return `${p.name} has no updates in the last ${days} days.`
      return `${p.name}, last ${days} days, ${updates.length} updates:\n\n` + updates.map((u) => `${fmtUpdate(u, ctx)}\n  threads: ${u.links.map((l) => l.thread.name).join(', ') || '-'}`).join('\n\n')
    }
    case 'team_status': {
      let teamIds = ctx.teamIds
      if (input.teamName) {
        const n = String(input.teamName).toLowerCase()
        teamIds = ctx.teamIds.filter((id) => (ctx.teamNames.get(id) ?? '').toLowerCase().includes(n))
        if (teamIds.length === 0) return `No team called "${input.teamName}". Visible teams: ${[...ctx.teamNames.values()].join(', ')}.`
      }
      const parts: string[] = []
      for (const teamId of teamIds) {
        const [threads, members] = await Promise.all([
          prisma.thread.findMany({ where: { teamId, mergedIntoId: null, status: { not: 'DONE' } }, orderBy: { lastActivityAt: 'desc' }, take: 20 }),
          prisma.teamMembership.findMany({
            where: { teamId },
            include: { user: { select: { id: true, name: true, updates: { where: { teamId }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, sentiment: true, signals: true, summary: true } } } } },
          }),
        ])
        parts.push(`## ${ctx.teamNames.get(teamId)}`)
        parts.push('Open threads:')
        for (const t of threads) parts.push(`- ${t.name} [${effectiveStatus(t)}, ${daysSince(t.lastActivityAt)}d ago]: ${t.summary ?? ''}`)
        parts.push('People:')
        for (const m of members) {
          const last = m.user.updates[0]
          if (!last) { parts.push(`- ${m.user.name} (${m.role.toLowerCase()}): no updates yet`); continue }
          const s = readSignals(last.signals)
          parts.push(`- ${m.user.name} (${m.role.toLowerCase()}): last update ${daysSince(last.createdAt)}d ago, ${last.sentiment.toLowerCase()}${s.blockers.length ? `, BLOCKED: ${s.blockers.map((b) => b.text).join('; ')}` : ''}. ${last.summary ?? ''}`)
        }
      }
      return parts.join('\n')
    }
    case 'thread_detail': {
      const t = await prisma.thread.findFirst({
        where: { id: String(input.threadId ?? ''), teamId: { in: ctx.teamIds } },
        include: { links: { include: { update: { include: { user: { select: { name: true } } } } }, orderBy: { update: { createdAt: 'desc' } }, take: 25 } },
      })
      if (!t) return 'Thread not found.'
      return `${t.name} [${effectiveStatus(t)}]\n${t.summary ?? ''}\n\nTimeline:\n` + t.links.map((l) => fmtUpdate(l.update, ctx)).join('\n\n')
    }
    default:
      return `Unknown tool ${name}`
  }
}

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

function systemPrompt(ctx: Ctx, askerName: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `You are PulseCheck, a work memory for teams. ${askerName} is asking about their teams: ${[...ctx.teamNames.values()].join(', ')}. Today is ${today}.

You answer from what people have reported in their updates, found with your tools. You never invent status. When the data does not cover a question, say so plainly and say what would answer it.

How to answer:
- Lead with the answer in one or two sentences, then support it. Name people and dates. Prefer "Rahul, Tuesday" to "a team member recently".
- Say who is blocked and on what, and who to talk to. That is usually why someone is asking.
- Keep it short. A manager reads this between meetings. Use a short list only when there are several parallel items.
- If a question is about a person, start with person_timeline. If it is about a piece of work, start with search_threads, then thread_detail when you need the history. For "how is the team" use team_status.
- Call tools before writing anything. Your first words are the answer. Do not mention tools or searching, do not restate the question, and do not say that you will look into it.`
}

export async function runAsk(opts: {
  userId: string
  askerName: string
  teamIds: string[]
  question: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  onEvent?: (e: AskEvent) => void
}): Promise<{ text: string; sources: AskSource[] }> {
  const teams = await prisma.team.findMany({ where: { id: { in: opts.teamIds } }, select: { id: true, name: true } })
  const ctx: Ctx = { userId: opts.userId, teamIds: teams.map((t) => t.id), teamNames: new Map(teams.map((t) => [t.id, t.name])), sources: new Map() }
  const emit = opts.onEvent ?? (() => {})

  const messages: Anthropic.MessageParam[] = [
    ...(opts.history ?? []).slice(-8).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: opts.question },
  ]

  let finalText = ''
  const model = MODELS.smart

  for (let turn = 0; turn < 8; turn++) {
    const started = Date.now()
    let msg: Anthropic.Message
    try {
      const stream = anthropic.messages.stream({
        model,
        max_tokens: 4000,
        system: [{ type: 'text', text: systemPrompt(ctx, opts.askerName), cache_control: { type: 'ephemeral' } }],
        tools,
        messages,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
      })
      let turnText = ''
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          turnText += ev.delta.text
          emit({ type: 'text', text: ev.delta.text })
        }
      }
      msg = await stream.finalMessage()
      finalText += turnText
      await logLlmCall(
        { purpose: 'ask', userId: opts.userId, teamId: ctx.teamIds.length === 1 ? ctx.teamIds[0] : null },
        {
          model,
          latencyMs: Date.now() - started,
          ok: true,
          inputTokens: msg.usage.input_tokens,
          outputTokens: msg.usage.output_tokens,
          cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
          cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
        },
      )
    } catch (err) {
      await logLlmCall({ purpose: 'ask', userId: opts.userId }, { model, latencyMs: Date.now() - started, ok: false, error: err instanceof Error ? err.message : String(err) })
      throw err
    }

    if (msg.stop_reason !== 'tool_use') break

    messages.push({ role: 'assistant', content: msg.content })
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const block of msg.content) {
      if (block.type !== 'tool_use') continue
      const input = (block.input ?? {}) as Record<string, unknown>
      emit({ type: 'tool', tool: { name: block.name, input } })
      let content: string
      try {
        content = await runTool(block.name, input, ctx)
      } catch (err) {
        content = `Tool failed: ${err instanceof Error ? err.message : String(err)}`
      }
      results.push({ type: 'tool_result', tool_use_id: block.id, content })
    }
    messages.push({ role: 'user', content: results })
    if (finalText) { emit({ type: 'text', text: '\n\n' }); finalText += '\n\n' }
  }

  const sources = [...ctx.sources.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  emit({ type: 'done', sources })
  return { text: finalText.trim(), sources }
}
