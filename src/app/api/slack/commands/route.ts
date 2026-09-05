import { NextRequest, NextResponse, after } from 'next/server'
import { verifySlackSignature } from '@/lib/slack/client'
import { handleCommand, type SlashCommand } from '@/lib/slack/handlers'

export const maxDuration = 120

/** /pulse slash command. Acks immediately, then posts the result to response_url. */
export async function POST(req: NextRequest) {
  const raw = await req.text()
  if (!verifySlackSignature(raw, req.headers.get('x-slack-request-timestamp'), req.headers.get('x-slack-signature'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 })
  }
  const params = new URLSearchParams(raw)
  const cmd: SlashCommand = {
    command: params.get('command') ?? '',
    text: params.get('text') ?? '',
    user_id: params.get('user_id') ?? '',
    channel_id: params.get('channel_id') ?? '',
    response_url: params.get('response_url') ?? '',
  }

  after(async () => {
    let text: string
    try {
      text = await handleCommand(cmd)
    } catch (err) {
      console.error('slack command failed', err)
      text = 'Something went wrong on my side. Try again in a minute.'
    }
    await fetch(cmd.response_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response_type: 'ephemeral', text }) })
  })

  const isAsk = /^(ask|q)\s/i.test(cmd.text.trim())
  return NextResponse.json({ response_type: 'ephemeral', text: isAsk ? 'Looking…' : 'Reading that…' })
}
