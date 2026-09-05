import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, requireTeamMember, requireTeamView, visibleTeamIds } from '@/lib/authz'
import { ingestUpdate, updateInclude, toView } from '@/lib/updates'

/**
 * GET /api/updates?teamId=&userId=&days=&limit=
 *   teamId: one team the caller can view
 *   userId: only that person (caller must be able to view at least one shared team)
 *   no teamId: every team the caller can view
 */
export const GET = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const sp = new URL(request.url).searchParams
  const teamId = sp.get('teamId')
  const userId = sp.get('userId')
  const days = Math.min(parseInt(sp.get('days') || '14', 10) || 14, 400)
  const limit = Math.min(parseInt(sp.get('limit') || '200', 10) || 200, 1000)

  const since = new Date()
  since.setDate(since.getDate() - days)

  let teamIds: string[]
  if (teamId) {
    await requireTeamView(me, teamId)
    teamIds = [teamId]
  } else {
    teamIds = await visibleTeamIds(me)
  }

  const updates = await prisma.update.findMany({
    where: {
      teamId: { in: teamIds },
      ...(userId ? { userId } : {}),
      createdAt: { gte: since },
      supersededBy: null,
    },
    include: updateInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json(updates.map(toView))
})

/**
 * POST /api/updates  { teamId, rawText, source? }
 */
export const POST = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const body = await request.json().catch(() => ({}))
  const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : ''
  const teamId = typeof body.teamId === 'string' ? body.teamId : ''
  const source = body.source === 'WEB_VOICE' ? 'WEB_VOICE' : 'WEB_TEXT'

  if (!rawText) throw new HttpError(400, 'rawText is required')
  if (!teamId) throw new HttpError(400, 'teamId is required')
  await requireTeamMember(me, teamId)

  const view = await ingestUpdate({ userId: me, teamId, source, rawText })
  return NextResponse.json(view, { status: 201 })
})
