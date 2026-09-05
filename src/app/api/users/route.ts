import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireUserId, requireTeamView } from '@/lib/authz'

/**
 * GET /api/users?teamId=
 *   With teamId: members of that team with their team role and last update time.
 *   Without: every user (used by add-member pickers).
 */
export const GET = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const teamId = new URL(request.url).searchParams.get('teamId')

  if (teamId) {
    await requireTeamView(me, teamId)
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            slackUserId: true,
            updates: {
              where: { teamId },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true, sentiment: true, summary: true },
            },
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    })
    return NextResponse.json(
      memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatarUrl: m.user.avatarUrl,
        slackLinked: !!m.user.slackUserId,
        teamRole: m.role,
        lastUpdate: m.user.updates[0] ?? null,
      })),
    )
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })
  return NextResponse.json(users)
})
