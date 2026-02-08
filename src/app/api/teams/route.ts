import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/teams - List teams for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { userId: session.user.id },
      include: {
        team: {
          include: {
            _count: { select: { memberships: true } },
            settings: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const teams = memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      description: m.team.description,
      role: m.role,
      memberCount: m.team._count.memberships,
      hasSettings: !!m.team.settings,
      createdAt: m.team.createdAt,
    }))

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // Create team and add creator as LEAD
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        memberships: {
          create: {
            userId: session.user.id,
            role: 'LEAD',
          },
        },
        settings: {
          create: {}, // Create with defaults
        },
      },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        settings: true,
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
