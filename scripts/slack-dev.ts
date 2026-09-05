import 'dotenv/config'
import { SocketModeClient } from '@slack/socket-mode'
import { handleEvent, handleCommand } from '../src/lib/slack/handlers'

/**
 * Local development: connects to Slack over Socket Mode so no public URL is
 * needed. Uses the same handlers as the HTTP routes.
 *
 *   npm run slack:dev
 *
 * Needs SLACK_APP_TOKEN (xapp-..., "connections:write") and SLACK_BOT_TOKEN.
 */
async function main() {
  const appToken = process.env.SLACK_APP_TOKEN
  if (!appToken) throw new Error('SLACK_APP_TOKEN is not set')
  const client = new SocketModeClient({ appToken })

  client.on('events_api', async ({ event, ack, retry_num }) => {
    await ack()
    if (retry_num) return
    try {
      await handleEvent(event)
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
}

main().catch((e) => { console.error(e); process.exit(1) })
