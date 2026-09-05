import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, requireTeamMember, requireTeamView, visibleTeamIds } from '@/lib/authz'
import { effectiveStatus } from '@/lib/threads'
import { embed, setThreadEmbedding } from '@/lib/embeddings'

/**
 * GET /api/threads?teamId=&status=&q=
 * Threads the caller can see, with participant names and counts.
 */
export const GET = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const sp = new URL(request.url).searchParams
  const teamId = sp.get('teamId')
  const q = sp.get('q')?.trim()

  let teamIds: string[]
  if (teamId) {
    await requireTeamView(me, teamId)
    teamIds = [teamId]
  } else {
    teamIds = await visibleTeamIds(me)
  }

  const threads = await prisma.thread.findMany({
    where: {
      teamId: { in: teamIds },
      mergedIntoId: null,
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { aliases: { hasSome: [q] } }, { summary: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    include: {
      team: { select: { id: true, name: true } },
      links: {
        select: { update: { select: { userId: true, user: { select: { name: true } }, createdAt: true } } },
        orderBy: { update: { createdAt: 'desc' } },
      },
    },
    orderBy: { lastActivityAt: 'desc' },
  })

  return NextResponse.json(
    threads.map((t) => {
      const people = new Map<string, string>()
      for (const l of t.links) people.set(l.update.userId, l.update.user.name)
      return {
        id: t.id,
        teamId: t.teamId,
        teamName: t.team.name,
        name: t.name,
        description: t.description,
        summary: t.summary,
        aliases: t.aliases,
        status: effectiveStatus(t),
        rawStatus: t.status,
        lastActivityAt: t.lastActivityAt.toISOString(),
        updateCount: t.links.length,
        participants: [...people.entries()].map(([id, name]) => ({ id, name })),
        createdByAi: t.createdByAi,
      }
    }),
  )
})

/** POST /api/threads { teamId, name, description? } manual creation */
export const POST = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const body = await request.json().catch(() => ({}))
  const teamId = typeof body.teamId === 'string' ? body.teamId : ''
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
  const description = typeof body.description === 'string' ? body.description.trim() : null
  if (!teamId || !name) throw new HttpError(400, 'teamId and name are required')
  await requireTeamMember(me, teamId)

  const t = await prisma.thread.create({
    data: { teamId, name, description, createdById: me, createdByAi: false },
  })
  try {
    const v = await embed(`${name}\n${description ?? ''}`, { teamId, userId: me })
    await setThreadEmbedding(t.id, v)
  } catch (err) {
    console.error('thread embed failed', err)
  }
  return NextResponse.json(t, { status: 201 })
})
