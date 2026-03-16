import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/teams/[id]/join - Self-service join a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params

    // Verify team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId } },
    })

    if (existingMembership) {
      return NextResponse.json({ error: 'Already a member of this team' }, { status: 409 })
    }

    // Create membership
    const membership = await prisma.teamMembership.create({
      data: {
        userId: session.user.id,
        teamId,
        role: 'MEMBER',
      },
    })

    return NextResponse.json(membership)
  } catch (error) {
    console.error('Error joining team:', error)
    return NextResponse.json({ error: 'Failed to join team' }, { status: 500 })
  }
}
