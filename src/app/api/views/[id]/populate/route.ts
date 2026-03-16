import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/views/[id]/populate
 *
 * Auto-populates a 1-on-1 view with data from the target user's status updates.
 * Groups updates by week/period and fills in the view columns.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: viewId } = await params

    // Get view with columns
    const view = await prisma.view.findUnique({
      where: { id: viewId },
      include: {
        columns: { orderBy: { order: 'asc' } },
      },
    })

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    if (!view.targetUserId) {
      return NextResponse.json({ error: 'View has no target user' }, { status: 400 })
    }

    // Calculate date range
    const now = new Date()
    const startDate = new Date(now)
    switch (view.timeRange) {
      case '1w': startDate.setDate(startDate.getDate() - 7); break
      case '2w': startDate.setDate(startDate.getDate() - 14); break
      case '1m': startDate.setMonth(startDate.getMonth() - 1); break
      case '3m': startDate.setMonth(startDate.getMonth() - 3); break
      default: startDate.setDate(startDate.getDate() - 14) // default 2 weeks
    }

    // Fetch target user's updates across ALL their teams
    const updates = await prisma.statusUpdate.findMany({
      where: {
        userId: view.targetUserId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (updates.length === 0) {
      return NextResponse.json({ items: [], message: 'No updates found for this period' })
    }

    // Group updates by week
    const weekGroups = new Map<string, typeof updates>()

    for (const update of updates) {
      const date = new Date(update.createdAt)
      // Get Monday of the week
      const monday = new Date(date)
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)

      const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

      if (!weekGroups.has(weekLabel)) {
        weekGroups.set(weekLabel, [])
      }
      weekGroups.get(weekLabel)!.push(update)
    }

    // Build column name → id mapping
    const colMap = new Map<string, string>()
    for (const col of view.columns) {
      colMap.set(col.name.toLowerCase(), col.id)
    }

    // Delete existing items (re-populate)
    await prisma.workItem.deleteMany({ where: { viewId } })

    // Create work items for each week
    const items = []
    let order = 0

    for (const [weekLabel, weekUpdates] of weekGroups) {
      const allCompleted: string[] = []
      const allInProgress: string[] = []
      const allBlockers: string[] = []
      const sentiments: string[] = []

      for (const update of weekUpdates) {
        try {
          const completed = JSON.parse(update.completed) as string[]
          const inProgress = JSON.parse(update.inProgress) as string[]
          const blockers = JSON.parse(update.blockers) as string[]
          allCompleted.push(...completed)
          allInProgress.push(...inProgress)
          allBlockers.push(...blockers)
          if (update.sentiment) sentiments.push(update.sentiment)
        } catch {
          // Skip malformed JSON
        }
      }

      // Determine dominant sentiment
      const sentimentCounts = sentiments.reduce((acc, s) => {
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      const dominantSentiment = Object.entries(sentimentCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

      // Build values object using column IDs
      const values: Record<string, string> = {}

      if (colMap.has('period')) values[colMap.get('period')!] = weekLabel
      if (colMap.has('completed')) values[colMap.get('completed')!] = allCompleted.join(', ') || 'None'
      if (colMap.has('in progress')) values[colMap.get('in progress')!] = allInProgress.join(', ') || 'None'
      if (colMap.has('blockers')) values[colMap.get('blockers')!] = allBlockers.join(', ') || 'None'
      if (colMap.has('sentiment')) values[colMap.get('sentiment')!] = dominantSentiment
      // Notes column left empty for manager to fill

      const item = await prisma.workItem.create({
        data: {
          viewId,
          values: JSON.stringify(values),
          order: order++,
        },
      })

      items.push({
        ...item,
        values: JSON.parse(item.values),
      })
    }

    return NextResponse.json({ items, periodsFound: weekGroups.size })
  } catch (error) {
    console.error('Error populating view:', error)
    return NextResponse.json({ error: 'Failed to populate view' }, { status: 500 })
  }
}
