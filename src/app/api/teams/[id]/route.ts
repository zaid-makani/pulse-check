import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Helper to check if user has access to team
async function getUserTeamRole(userId: string, teamId: string) {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  })
  return membership?.role || null
}

// GET /api/teams/[id] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const role = await getUserTeamRole(session.user.id, id)
    if (!role) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        settings: true,
      },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...team,
      currentUserRole: role,
    })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

// PATCH /api/teams/[id] - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const role = await getUserTeamRole(session.user.id, id)

    // Only LEAD or MANAGER can update team
    if (!role || role === 'MEMBER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description } = body

    const team = await prisma.team.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
      },
    })

    return NextResponse.json(team)
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const role = await getUserTeamRole(session.user.id, id)

    // Only LEAD can delete team
    if (role !== 'LEAD') {
      return NextResponse.json({ error: 'Only team lead can delete the team' }, { status: 403 })
    }

    await prisma.team.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Team deleted' })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
