import 'dotenv/config'
import { SocketModeClient } from '@slack/socket-mode'
import { WebClient } from '@slack/web-api'
import { prisma } from '../src/lib/db'
import { handleEvent, handleCommand, type SlackMessageEvent } from '../src/lib/slack/handlers'

/**
 * Local development: connects to Slack over Socket Mode so no public URL is
 * needed. Uses the same handlers as the HTTP routes.
 *
 *   npm run slack:dev
 *
 * Needs SLACK_APP_TOKEN (xapp-..., "connections:write") and SLACK_BOT_TOKEN.
 *
 * Also polls bot DMs every 20 seconds as a safety net: anything the socket
 * missed (a dropped connection, events not enabled yet) still gets handled.
 */

const seen = new Set<string>()

async function catchUpDms(web: WebClient, since: number) {
  const ims = await web.conversations.list({ types: 'im', limit: 200 })
  for (const ch of ims.channels ?? []) {
    if (!ch.id) continue
    const hist = await web.conversations.history({ channel: ch.id, oldest: String(since), limit: 50 })
    for (const m of (hist.messages ?? []).reverse()) {
      if (!m.ts || !m.user || m.bot_id || (m.subtype && m.subtype !== 'file_share')) continue
      if (seen.has(m.ts)) continue
      // Already answered in a thread (questions are not stored, so this is their dedupe)
      if ((m as { reply_count?: number }).reply_count) { seen.add(m.ts); continue }
      const already = await prisma.update.findFirst({ where: { slackChannelId: ch.id, slackTs: m.ts }, select: { id: true } })
      if (already) { seen.add(m.ts); continue }
      seen.add(m.ts)
      console.log('[poll] handling DM', ch.id, m.ts)
      const ev: SlackMessageEvent = {
        type: 'message',
        channel: ch.id,
        channel_type: 'im',
        user: m.user,
        text: m.text ?? '',
        ts: m.ts,
        thread_ts: m.thread_ts,
        subtype: m.subtype,
        files: (m.files as SlackMessageEvent['files']) ?? undefined,
      }
      try {
        await handleEvent(ev)
      } catch (err) {
        console.error('[poll] failed', err)
      }
    }
  }
}

async function main() {
  const appToken = process.env.SLACK_APP_TOKEN
  if (!appToken) throw new Error('SLACK_APP_TOKEN is not set')
  const client = new SocketModeClient({ appToken })
  const web = new WebClient(process.env.SLACK_BOT_TOKEN)

  client.on('events_api', async ({ event, ack, retry_num }) => {
    await ack()
    if (retry_num) return
    console.log('[event]', event.type, event.channel_type ?? '', event.user ?? '')
    if (event.ts) seen.add(event.ts)
    try {
      await handleEvent(event)
      console.log('[event] handled')
    } catch (err) {
      console.error('event failed', err)
    }
  })

  client.on('slash_commands', async ({ body, ack }) => {
    const isAsk = /^(ask|q)\s/i.test(String(body.text ?? '').trim())
    await ack({ response_type: 'ephemeral', text: isAsk ? 'Looking…' : 'Reading that…' })
    let text: string
    try {
      text = await handleCommand({ command: body.command, text: body.text ?? '', user_id: body.user_id, channel_id: body.channel_id, response_url: body.response_url })
    } catch (err) {
      console.error('command failed', err)
      text = 'Something went wrong on my side.'
    }
    await fetch(body.response_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response_type: 'ephemeral', text }) })
  })

  await client.start()
  console.log('PulseCheck Slack bot connected over Socket Mode. DM it, mention it, or use /pulse.')

  // Safety net: catch up on the last hour now, then poll.
  let since = Math.floor(Date.now() / 1000) - 900
  const tick = async () => {
    try {
      await catchUpDms(web, since)
      since = Math.floor(Date.now() / 1000) - 120
    } catch (err) {
      console.error('[poll] error', err)
    }
  }
  await tick()
  setInterval(tick, 20_000)
}

main().catch((e) => { console.error(e); process.exit(1) })
