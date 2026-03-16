import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/teams/available - Returns teams the user is NOT already a member of
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get IDs of teams the user is already in
    const userMemberships = await prisma.teamMembership.findMany({
      where: { userId: session.user.id },
      select: { teamId: true },
    })
    const memberTeamIds = userMemberships.map(m => m.teamId)

    // Find teams the user is NOT a member of
    const availableTeams = await prisma.team.findMany({
      where: {
        ...(memberTeamIds.length > 0 ? { id: { notIn: memberTeamIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(
      availableTeams.map(team => ({
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: team._count.memberships,
      }))
    )
  } catch (error) {
    console.error('Error fetching available teams:', error)
    return NextResponse.json({ error: 'Failed to fetch available teams' }, { status: 500 })
  }
}
