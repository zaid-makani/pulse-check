import type { KnownBlock } from '@slack/web-api'
import { prisma } from '@/lib/db'
import { slack, appUrl } from '@/lib/slack/client'
import { ingestUpdate, reextractUpdate, type UpdateView } from '@/lib/updates'
import { transcribeAudio } from '@/lib/transcribe'
import { runAsk } from '@/lib/ask'
import { visibleTeamIds } from '@/lib/authz'
import { markdownToMrkdwn } from '@/lib/slack-webhook'

/**
 * Everything the Slack app does, independent of how the event arrived
 * (HTTP events route in production, Socket Mode script in development).
 */

// ---------------------------------------------------------------------------
// Types for the parts of Slack payloads we read
// ---------------------------------------------------------------------------

export interface SlackFile {
  id: string
  name?: string
  mimetype?: string
  filetype?: string
  url_private_download?: string
  url_private?: string
}

export interface SlackMessageEvent {
  type: 'message'
  subtype?: string
  channel: string
  channel_type?: string
  user?: string
  bot_id?: string
  text?: string
  ts: string
  thread_ts?: string
  files?: SlackFile[]
}

export interface SlackMentionEvent {
  type: 'app_mention'
  channel: string
  user: string
  text: string
  ts: string
  thread_ts?: string
}

export type SlackEvent = SlackMessageEvent | SlackMentionEvent | { type: string; [k: string]: unknown }

export interface SlashCommand {
  command: string
  text: string
  user_id: string
  channel_id: string
  response_url: string
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

async function resolveUser(slackUserId: string): Promise<{ id: string; name: string } | null> {
  const linked = await prisma.user.findUnique({ where: { slackUserId }, select: { id: true, name: true } })
  if (linked) return linked
  // Link by email on first contact.
  const info = await slack().users.info({ user: slackUserId })
  const email = info.user?.profile?.email?.toLowerCase()
  if (!email) return null
  const byEmail = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } })
  if (!byEmail) return null
  await prisma.user.update({ where: { id: byEmail.id }, data: { slackUserId } })
  return byEmail
}

/** Which team an update from this person belongs to. */
async function pickTeam(userId: string, opts: { channel?: string; threadTs?: string; explicit?: string }): Promise<{ id: string; name: string } | null> {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    include: { team: { select: { id: true, name: true } } },
  })
  if (memberships.length === 0) return null
  if (opts.explicit) {
    const n = opts.explicit.toLowerCase()
    const m = memberships.find((x) => x.team.name.toLowerCase() === n) ?? memberships.find((x) => x.team.name.toLowerCase().startsWith(n))
    if (m) return m.team
  }
  if (memberships.length === 1) return memberships[0].team
  if (opts.channel && opts.threadTs) {
    const nudge = await prisma.slackNudge.findUnique({ where: { channelId_ts: { channelId: opts.channel, ts: opts.threadTs } } })
    if (nudge) {
      const m = memberships.find((x) => x.teamId === nudge.teamId)
      if (m) return m.team
    }
  }
  const last = await prisma.update.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { teamId: true } })
  const m = last ? memberships.find((x) => x.teamId === last.teamId) : undefined
  return (m ?? memberships[0]).team
}

/** "Payments: did x and y" -> explicit team prefix */
function splitTeamPrefix(text: string): { explicit?: string; body: string } {
  const m = text.match(/^\s*(?:to|team)?\s*([A-Za-z][\w &-]{1,30}?)\s*:\s+(.+)$/s)
  if (m && !/^(fix|note|ask)$/i.test(m[1])) return { explicit: m[1].trim(), body: m[2].trim() }
  return { body: text.trim() }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Short text that reads as a question about the team, not a report of work. */
export function looksLikeQuestion(text: string): boolean {
  const t = text.trim()
  if (!t || t.length > 200) return false
  if (t.endsWith('?')) return true
  return /^(who|what|which|where|when|why|how|is|are|was|were|does|do|did|has|have|can|could|should|any|anyone|anything)\b/i.test(t) && !/\b(i|i'm|im|i've|ive|we|my|our|today|yesterday)\b/i.test(t.split(/\s+/).slice(0, 4).join(' '))
}

async function audioToText(files: SlackFile[] | undefined, ctx: { userId: string; teamId?: string }): Promise<string> {
  if (!files?.length) return ''
  const parts: string[] = []
  for (const f of files) {
    const isAudio = (f.mimetype ?? '').startsWith('audio/') || ['m4a', 'mp4', 'webm', 'mp3', 'ogg', 'wav'].includes(f.filetype ?? '')
    const url = f.url_private_download ?? f.url_private
    if (!isAudio || !url) continue
    const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}` } })
    if (!res.ok) throw new Error(`Could not download audio: ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    const ext = (f.filetype && f.filetype !== 'unknown' ? f.filetype : (f.mimetype?.split('/')[1] ?? 'mp4')).replace('x-m4a', 'm4a')
    parts.push(await transcribeAudio(buf, f.name ?? `clip.${ext}`, { userId: ctx.userId, teamId: ctx.teamId, purpose: 'transcribe:slack' }))
  }
  return parts.join(' ')
}

function confirmationText(u: UpdateView, teamName: string): string {
  const s = u.signals
  const lines = [`*Got it* · _${teamName}_`, u.summary || s.summary]
  if (u.threads.length) lines.push(`Threads: ${u.threads.map((t) => t.name).join(', ')}`)
  if (s.blockers.length) lines.push(`:no_entry: Blocked: ${s.blockers.map((b) => (b.waitingOn ? `${b.text} (waiting on ${b.waitingOn})` : b.text)).join('; ')}`)
  if (s.asks.length) lines.push(`:raising_hand: Asks: ${s.asks.join('; ')}`)
  lines.push(`_Reply \`fix: <the whole update again>\` if I misread it. Ask me anything about the team by just asking._`)
  return lines.join('\n')
}

export async function handleDirectMessage(ev: SlackMessageEvent) {
  if (ev.bot_id || !ev.user) return
  if (ev.subtype && ev.subtype !== 'file_share') return
  const user = await resolveUser(ev.user)
  if (!user) {
    await slack().chat.postMessage({
      channel: ev.channel,
      thread_ts: ev.thread_ts ?? ev.ts,
      text: `I don't know you yet. Sign up at ${appUrl('/signup')} with the same email as your Slack account and I'll connect the two.`,
    })
    return
  }

  let text = (ev.text ?? '').trim()
  const fixMatch = text.match(/^fix\s*:\s*(.+)$/is)
  const askMatch = text.match(/^(?:ask|q)\s*:\s*(.+)$/is)

  // A question typed to the bot is a question, not a status update.
  const question = askMatch ? askMatch[1] : looksLikeQuestion(text) ? text : null
  if (question) {
    await answerQuestion({ channel: ev.channel, threadTs: ev.thread_ts ?? ev.ts, userId: user.id, userName: user.name, question })
    return
  }

  const { explicit, body } = splitTeamPrefix(fixMatch ? fixMatch[1] : text)
  const team = await pickTeam(user.id, { channel: ev.channel, threadTs: ev.thread_ts, explicit })
  if (!team) {
    await slack().chat.postMessage({ channel: ev.channel, thread_ts: ev.thread_ts ?? ev.ts, text: `You're not on a team yet. Join one at ${appUrl('/teams/join')}.` })
    return
  }

  const spoken = await audioToText(ev.files, { userId: user.id, teamId: team.id })
  text = [body, spoken].filter(Boolean).join(' ').trim()
  if (!text) return

  const hasText = !!body
  const replyTo = ev.thread_ts ?? ev.ts

  if (fixMatch) {
    const since = new Date(Date.now() - 36 * 3_600_000)
    const latest = await prisma.update.findFirst({ where: { userId: user.id, createdAt: { gte: since }, supersededBy: null }, orderBy: { createdAt: 'desc' } })
    if (!latest) {
      await slack().chat.postMessage({ channel: ev.channel, thread_ts: replyTo, text: `Nothing recent to fix, so I'll take that as a new update.` })
    } else {
      const fixed = await reextractUpdate(latest.id, text)
      await slack().chat.postMessage({ channel: ev.channel, thread_ts: replyTo, text: confirmationText(fixed, team.name) })
      return
    }
  }

  console.log('[slack] ingesting for', user.name, 'to', team.name)
  const update = await ingestUpdate({
    userId: user.id,
    teamId: team.id,
    source: ev.thread_ts ? 'SLACK_THREAD' : 'SLACK_DM',
    rawText: text,
    slackChannelId: ev.channel,
    slackTs: ev.ts,
  })
  const prefix = !hasText && spoken ? `_Heard:_ "${spoken.slice(0, 300)}"\n\n` : ''
  console.log('[slack] replying in', ev.channel)
  await slack().chat.postMessage({ channel: ev.channel, thread_ts: replyTo, text: prefix + confirmationText(update, team.name) })
  console.log('[slack] replied')
}

export async function handleMention(ev: SlackMentionEvent) {
  const user = await resolveUser(ev.user)
  if (!user) {
    await slack().chat.postMessage({ channel: ev.channel, thread_ts: ev.thread_ts ?? ev.ts, text: `I don't know you yet. Sign up at ${appUrl('/signup')} with your Slack email.` })
    return
  }
  const question = ev.text.replace(/<@[A-Z0-9]+>/g, '').trim()
  if (!question) return
  await answerQuestion({ channel: ev.channel, threadTs: ev.thread_ts ?? ev.ts, userId: user.id, userName: user.name, question })
}

async function answerQuestion(opts: { channel: string; threadTs: string; userId: string; userName: string; question: string }) {
  const teamIds = await visibleTeamIds(opts.userId)
  if (teamIds.length === 0) {
    await slack().chat.postMessage({ channel: opts.channel, thread_ts: opts.threadTs, text: `You're not on any team yet, so there is nothing for me to look at.` })
    return
  }
  const { text } = await runAsk({ userId: opts.userId, askerName: opts.userName, teamIds, question: opts.question })
  await slack().chat.postMessage({ channel: opts.channel, thread_ts: opts.threadTs, text: markdownToMrkdwn(text || 'I could not find anything on that.') })
}

export async function handleEvent(ev: SlackEvent) {
  if (ev.type === 'message') {
    const m = ev as SlackMessageEvent
    if (m.channel_type === 'im') await handleDirectMessage(m)
    return
  }
  if (ev.type === 'app_mention') await handleMention(ev as SlackMentionEvent)
}

// ---------------------------------------------------------------------------
// Slash command
// ---------------------------------------------------------------------------

export async function handleCommand(cmd: SlashCommand): Promise<string> {
  const user = await resolveUser(cmd.user_id)
  if (!user) return `I don't know you yet. Sign up at ${appUrl('/signup')} with your Slack email.`
  const text = cmd.text.trim()
  if (!text || text === 'help') {
    return [
      '*PulseCheck*',
      '`/pulse <what you worked on>` records an update.',
      '`/pulse Payments: <update>` records it to a specific team.',
      '`/pulse ask <question>` asks about your teams.',
      `Or just DM me. Voice clips work too. ${appUrl('/me')}`,
    ].join('\n')
  }
  const ask = text.match(/^(?:ask|q)\s+(.+)$/is)
  if (ask) {
    const teamIds = await visibleTeamIds(user.id)
    const { text: answer } = await runAsk({ userId: user.id, askerName: user.name, teamIds, question: ask[1] })
    return markdownToMrkdwn(answer || 'Nothing found.')
  }
  const { explicit, body } = splitTeamPrefix(text)
  const team = await pickTeam(user.id, { explicit })
  if (!team) return `You're not on a team yet. Join one at ${appUrl('/teams/join')}.`
  const update = await ingestUpdate({ userId: user.id, teamId: team.id, source: 'SLACK_COMMAND', rawText: body })
  return confirmationText(update, team.name)
}

// ---------------------------------------------------------------------------
// Outbound: nudges and documents
// ---------------------------------------------------------------------------

export async function openDm(slackUserId: string): Promise<string> {
  const res = await slack().conversations.open({ users: slackUserId })
  const id = res.channel?.id
  if (!id) throw new Error('Could not open DM')
  return id
}

export async function sendNudge(opts: { userId: string; slackUserId: string; teamId: string; teamName: string; firstName: string }) {
  const channel = await openDm(opts.slackUserId)
  const prompts = [
    `What did you work on today, ${opts.firstName}?`,
    `How did today go, ${opts.firstName}? What moved, what didn't?`,
    `${opts.firstName}, thirty seconds on today: done, in progress, stuck?`,
  ]
  const text = prompts[Math.floor(Math.random() * prompts.length)]
  const res = await slack().chat.postMessage({
    channel,
    text,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `${text}\n_Reply in this thread with text or a voice clip. It goes to *${opts.teamName}*._` } },
    ],
  })
  if (res.ts) {
    await prisma.slackNudge.create({ data: { userId: opts.userId, teamId: opts.teamId, channelId: channel, ts: res.ts } })
  }
}

export async function dmDocument(slackUserId: string, opts: { title: string; markdown: string; link?: string }) {
  const channel = await openDm(slackUserId)
  const body = markdownToMrkdwn(opts.markdown)
  const chunks: string[] = []
  let cur = ''
  for (const para of body.split('\n\n')) {
    if ((cur + '\n\n' + para).length > 2900 && cur) { chunks.push(cur); cur = para } else cur = cur ? `${cur}\n\n${para}` : para
  }
  if (cur) chunks.push(cur)
  const blocks: KnownBlock[] = [
    { type: 'header', text: { type: 'plain_text', text: opts.title.slice(0, 150) } },
    ...chunks.map((t): KnownBlock => ({ type: 'section', text: { type: 'mrkdwn', text: t } })),
  ]
  if (opts.link) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `<${opts.link}|Open in PulseCheck>` }] })
  await slack().chat.postMessage({ channel, text: opts.title, blocks })
}
