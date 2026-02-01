import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractStatusFromTranscript } from '@/lib/ai'

// GET /api/status - Get status updates with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const days = parseInt(searchParams.get('days') || '7')

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    const updates = await prisma.statusUpdate.findMany({
      where: {
        ...(userId && { userId }),
        createdAt: { gte: dateFilter },
      },
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
    const body = await request.json()
    const { userId, transcript } = body

    if (!userId || !transcript) {
      return NextResponse.json({ error: 'userId and transcript are required' }, { status: 400 })
    }

    // Extract structured data using AI
    const extracted = await extractStatusFromTranscript(transcript)

    // Save to database
    const statusUpdate = await prisma.statusUpdate.create({
      data: {
        userId,
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
