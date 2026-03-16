import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateTeamDigest } from '@/lib/ai'

// GET /api/digest - Generate team digest
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const days = parseInt(searchParams.get('days') || '7')

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // Build where clause
    let whereClause: {
      createdAt: { gte: Date }
      teamId?: string
    } = {
      createdAt: { gte: dateFilter },
    }

    if (teamId) {
      // Verify the current user is a member of this team
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }

      whereClause.teamId = teamId
    }

    const updates = await prisma.statusUpdate.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (updates.length === 0) {
      return NextResponse.json({ digest: 'No status updates found for the specified period.' })
    }

    // Prepare data for digest generation
    const updatesForDigest = updates.map((update) => ({
      userName: update.user.name,
      summary: update.summary || update.rawTranscript.slice(0, 200),
      blockers: JSON.parse(update.blockers) as string[],
      sentiment: update.sentiment || 'neutral',
    }))

    const digest = await generateTeamDigest(updatesForDigest)

    return NextResponse.json({ digest, updatesCount: updates.length, period: `${days} days` })
  } catch (error) {
    console.error('Error generating digest:', error)
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 })
  }
}
