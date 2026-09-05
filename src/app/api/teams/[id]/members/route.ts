import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TeamRole } from '@prisma/client'

// Helper to check if user can manage members
async function canManageMembers(userId: string, teamId: string) {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  })
  return membership?.role === 'LEAD' || membership?.role === 'MANAGER'
}

// GET /api/teams/[id]/members - List team members
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

    // Check if user is a member of this team
    const userMembership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: id } },
    })

    if (!userMembership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
    }

    const members = await prisma.teamMembership.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

// POST /api/teams/[id]/members - Add member to team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check permissions
    if (!(await canManageMembers(session.user.id, id))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { email, userId, role = 'MEMBER' } = body

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or userId is required' }, { status: 400 })
    }

    // Validate role
    if (!['MEMBER', 'LEAD', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Find user by userId or email
    let user
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } })
    } else {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already a member
    const existingMembership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId: id } },
    })

    if (existingMembership) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 409 })
    }

    // Add member
    const membership = await prisma.teamMembership.create({
      data: {
        userId: user.id,
        teamId: id,
        role: role as TeamRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(membership, { status: 201 })
  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}
