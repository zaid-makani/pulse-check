import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractStatusFromTranscript } from '@/lib/ai'

// GET /api/status - Get status updates with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')
    const days = parseInt(searchParams.get('days') || '7')

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Build where clause
    let whereClause: {
      createdAt: { gte: Date }
      userId?: string
      user?: { teamMemberships: { some: { teamId: string } } }
    } = {
      createdAt: { gte: dateFilter },
    }

    if (userId) {
      // Filter by specific user
      whereClause.userId = userId
    } else if (teamId) {
      // Filter by team - only show updates from team members
      // First verify the current user is a member of this team
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }

      whereClause.user = {
        teamMemberships: {
          some: { teamId },
        },
      }
    }

    const updates = await prisma.statusUpdate.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Parse JSON fields
    const parsedUpdates = updates.map((update) => ({
      ...update,
      completed: JSON.parse(update.completed),
      inProgress: JSON.parse(update.inProgress),
      blockers: JSON.parse(update.blockers),
      needsHelp: JSON.parse(update.needsHelp),
      riskFlags: JSON.parse(update.riskFlags),
    }))

    return NextResponse.json(parsedUpdates)
  } catch (error) {
    console.error('Error fetching status updates:', error)
    return NextResponse.json({ error: 'Failed to fetch status updates' }, { status: 500 })
  }
}

// POST /api/status - Create a new status update
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { transcript } = body

    if (!transcript) {
      return NextResponse.json({ error: 'transcript is required' }, { status: 400 })
    }

    // Extract structured data using AI
    const extracted = await extractStatusFromTranscript(transcript)

    // Save to database - always use the logged-in user
    const statusUpdate = await prisma.statusUpdate.create({
      data: {
        userId: session.user.id,
        rawTranscript: transcript,
        completed: JSON.stringify(extracted.completed),
        inProgress: JSON.stringify(extracted.inProgress),
        blockers: JSON.stringify(extracted.blockers),
        needsHelp: JSON.stringify(extracted.needsHelp),
        sentiment: extracted.sentiment,
        riskFlags: JSON.stringify(extracted.riskFlags),
        summary: extracted.summary,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...statusUpdate,
      completed: extracted.completed,
      inProgress: extracted.inProgress,
      blockers: extracted.blockers,
      needsHelp: extracted.needsHelp,
      riskFlags: extracted.riskFlags,
    })
  } catch (error) {
    console.error('Error creating status update:', error)
    return NextResponse.json({ error: 'Failed to create status update' }, { status: 500 })
  }
}
