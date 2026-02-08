import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SYSTEM_COLUMNS } from '@/lib/view-columns'

// GET /api/views - List views (filtered by team if teamId provided)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    // Build where clause
    let whereClause = {}

    if (teamId) {
      // Verify user is a member of this team
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }

      whereClause = { teamId }
    }

    const views = await prisma.view.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
            columns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(views)
  } catch (error) {
    console.error('Error fetching views:', error)
    return NextResponse.json({ error: 'Failed to fetch views' }, { status: 500 })
  }
}

// POST /api/views - Create a new view with system columns
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, teamId } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    // If teamId provided, verify membership
    if (teamId) {
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }
    }

    // Create view with system columns in a transaction
    const view = await prisma.$transaction(async (tx) => {
      const newView = await tx.view.create({
        data: {
          name,
          description,
          createdById: session.user.id,
          teamId: teamId || null,
        },
      })

      // Create system columns
      await tx.viewColumn.createMany({
        data: SYSTEM_COLUMNS.map((col) => ({
          viewId: newView.id,
          name: col.name,
          type: col.type,
          options: 'options' in col ? JSON.stringify(col.options) : '[]',
          isSystem: true,
          order: col.order,
        })),
      })

      return newView
    })

    // Fetch the complete view with columns
    const completeView = await prisma.view.findUnique({
      where: { id: view.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        columns: {
          orderBy: { order: 'asc' },
        },
        items: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(completeView)
  } catch (error) {
    console.error('Error creating view:', error)
    return NextResponse.json({ error: 'Failed to create view' }, { status: 500 })
  }
}
