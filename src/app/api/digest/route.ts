import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateTeamDigest } from '@/lib/ai'

// GET /api/digest - Generate team digest
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    const updates = await prisma.statusUpdate.findMany({
      where: {
        createdAt: { gte: dateFilter },
      },
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
