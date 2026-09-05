import { NextRequest, NextResponse, after } from 'next/server'
import { verifySlackSignature } from '@/lib/slack/client'
import { handleEvent, type SlackEvent } from '@/lib/slack/handlers'

export const maxDuration = 120

/**
 * Slack Events API endpoint. Acknowledges within Slack's 3 second window and
 * does the work after the response is sent.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text()
  if (!verifySlackSignature(raw, req.headers.get('x-slack-request-timestamp'), req.headers.get('x-slack-signature'))) {
    return NextResponse.json({ error: 'Bad signature' }, { status: 401 })
  }
  const body = JSON.parse(raw)
  if (body.type === 'url_verification') return NextResponse.json({ challenge: body.challenge })
  if (req.headers.get('x-slack-retry-num')) return new Response('ok') // don't double-process retries

  if (body.type === 'event_callback' && body.event) {
    const ev = body.event as SlackEvent
    after(async () => {
      try {
        await handleEvent(ev)
      } catch (err) {
        console.error('slack event failed', err)
      }
    })
  }
  return new Response('ok')
}
