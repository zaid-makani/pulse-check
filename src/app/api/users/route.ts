import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/users - Get users (optionally filtered by team)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (teamId) {
      // Verify the current user is a member of this team
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }

      // Get team members
      const memberships = await prisma.teamMembership.findMany({
        where: { teamId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              _count: { select: { statusUpdates: true } },
            },
          },
        },
        orderBy: { user: { name: 'asc' } },
      })

      const users = memberships.map((m) => ({
        ...m.user,
        teamRole: m.role,
      }))

      return NextResponse.json(users)
    }

    // No team filter - return all users (for backwards compatibility)
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { statusUpdates: true },
        },
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users - Create a new user (used for admin purposes)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, role } = body

    if (!email || !name) {
      return NextResponse.json({ error: 'email and name are required' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        role: role || 'DEVELOPER',
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
