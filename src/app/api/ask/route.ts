import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, requireTeamView, visibleTeamIds } from '@/lib/authz'
import { runAsk, type AskEvent } from '@/lib/ask'

export const maxDuration = 120

/**
 * POST /api/ask { question, teamId?, history? }
 * Streams newline-delimited JSON events: text | tool | done | error.
 */
export const POST = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const body = await request.json().catch(() => ({}))
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  if (!question) throw new HttpError(400, 'question is required')

  let teamIds: string[]
  if (typeof body.teamId === 'string' && body.teamId) {
    await requireTeamView(me, body.teamId)
    teamIds = [body.teamId]
  } else {
    teamIds = await visibleTeamIds(me)
  }
  if (teamIds.length === 0) throw new HttpError(400, 'You are not on any team yet')

  const history = Array.isArray(body.history)
    ? body.history.filter((h: { role?: string; content?: string }) => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
    : []

  const user = await prisma.user.findUniqueOrThrow({ where: { id: me }, select: { name: true } })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: AskEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'))
      try {
        await runAsk({ userId: me, askerName: user.name, teamIds, question, history, onEvent: send })
      } catch (err) {
        console.error('ask failed', err)
        send({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-cache' } })
})
