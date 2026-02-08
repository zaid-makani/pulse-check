import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface Insight {
  id: string
  type: 'blocker' | 'missing_update' | 'sentiment' | 'risk'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  userId?: string
  userName?: string
  createdAt: string
}

/**
 * GET /api/insights
 *
 * Returns proactive insights about team health and potential issues.
 * Acts as an AI agent that surfaces important information.
 *
 * Query params:
 * - teamId: Filter insights to a specific team
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    // Get team members
    let userIds: string[] = []
    if (teamId) {
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: session.user.id, teamId } },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
      }

      const memberships = await prisma.teamMembership.findMany({
        where: { teamId },
        select: { userId: true },
      })
      userIds = memberships.map(m => m.userId)
    }

    const insights: Insight[] = []
    const now = new Date()

    // Time ranges
    const threeDaysAgo = new Date(now)
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    const twoDaysAgo = new Date(now)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const oneDayAgo = new Date(now)
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // ============================================
    // 1. STALE BLOCKERS - Blockers mentioned 3+ days ago
    // ============================================
    const recentUpdatesWithBlockers = await prisma.statusUpdate.findMany({
      where: {
        ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
        createdAt: { gte: sevenDaysAgo },
        NOT: { blockers: '[]' },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group blockers by user and find stale ones
    const userBlockerMap = new Map<string, { blockers: string[]; date: Date; userName: string }>()

    for (const update of recentUpdatesWithBlockers) {
      try {
        const blockers = JSON.parse(update.blockers) as string[]
        if (blockers.length > 0 && !userBlockerMap.has(update.userId)) {
          userBlockerMap.set(update.userId, {
            blockers,
            date: update.createdAt,
            userName: update.user.name,
          })
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Check for stale blockers (reported 3+ days ago, no recent update without blockers)
    for (const [userId, data] of userBlockerMap) {
      if (data.date < threeDaysAgo) {
        // Check if there's a more recent update without blockers
        const laterUpdates = recentUpdatesWithBlockers.filter(
          u => u.userId === userId && u.createdAt > data.date
        )
        const hasResolvedBlockers = laterUpdates.some(u => {
          try {
            return JSON.parse(u.blockers).length === 0
          } catch {
            return false
          }
        })

        if (!hasResolvedBlockers) {
          insights.push({
            id: `blocker-${userId}`,
            type: 'blocker',
            severity: 'high',
            title: `Stale blocker for ${data.userName}`,
            description: `"${data.blockers[0]}" has been blocking ${data.userName} for ${Math.floor((now.getTime() - data.date.getTime()) / (1000 * 60 * 60 * 24))} days.`,
            userId,
            userName: data.userName,
            createdAt: data.date.toISOString(),
          })
        }
      }
    }

    // ============================================
    // 2. MISSING UPDATES - No update in 2+ days
    // ============================================
    const users = teamId
      ? await prisma.teamMembership.findMany({
          where: { teamId },
          include: { user: { select: { id: true, name: true } } },
        }).then(m => m.map(x => x.user))
      : await prisma.user.findMany({ select: { id: true, name: true } })

    for (const user of users) {
      const lastUpdate = await prisma.statusUpdate.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      if (!lastUpdate || lastUpdate.createdAt < twoDaysAgo) {
        const daysSince = lastUpdate
          ? Math.floor((now.getTime() - lastUpdate.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : null

        insights.push({
          id: `missing-${user.id}`,
          type: 'missing_update',
          severity: daysSince && daysSince >= 5 ? 'high' : 'medium',
          title: `No recent update from ${user.name}`,
          description: lastUpdate
            ? `${user.name} hasn't submitted an update in ${daysSince} days.`
            : `${user.name} has never submitted a status update.`,
          userId: user.id,
          userName: user.name,
          createdAt: now.toISOString(),
        })
      }
    }

    // ============================================
    // 3. SENTIMENT DROPS - Negative sentiment detected
    // ============================================
    const recentUpdatesWithSentiment = await prisma.statusUpdate.findMany({
      where: {
        ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
        createdAt: { gte: threeDaysAgo },
        sentiment: { not: null },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const negativeSentiments = ['frustrated', 'concerned', 'stressed', 'overwhelmed', 'blocked']

    for (const update of recentUpdatesWithSentiment) {
      if (update.sentiment && negativeSentiments.includes(update.sentiment.toLowerCase())) {
        // Only add if this is their most recent update
        const isLatest = !recentUpdatesWithSentiment.some(
          u => u.userId === update.userId && u.createdAt > update.createdAt
        )

        if (isLatest) {
          insights.push({
            id: `sentiment-${update.id}`,
            type: 'sentiment',
            severity: update.sentiment.toLowerCase() === 'frustrated' ? 'high' : 'medium',
            title: `${update.user.name} may need support`,
            description: `${update.user.name}'s latest update shows a ${update.sentiment} sentiment. Consider checking in with them.`,
            userId: update.userId,
            userName: update.user.name,
            createdAt: update.createdAt.toISOString(),
          })
        }
      }
    }

    // ============================================
    // 4. RISK FLAGS - AI-detected risks
    // ============================================
    const updatesWithRisks = await prisma.statusUpdate.findMany({
      where: {
        ...(userIds.length > 0 ? { userId: { in: userIds } } : {}),
        createdAt: { gte: threeDaysAgo },
        NOT: { riskFlags: '[]' },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    for (const update of updatesWithRisks) {
      try {
        const risks = JSON.parse(update.riskFlags) as string[]
        if (risks.length > 0) {
          insights.push({
            id: `risk-${update.id}`,
            type: 'risk',
            severity: 'medium',
            title: `Risk flagged by ${update.user.name}`,
            description: risks[0],
            userId: update.userId,
            userName: update.user.name,
            createdAt: update.createdAt.toISOString(),
          })
        }
      } catch {
        // Skip invalid JSON
      }
    }

    // Sort by severity (high first) then by date (newest first)
    const severityOrder = { high: 0, medium: 1, low: 2 }
    insights.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return NextResponse.json({
      insights,
      generatedAt: now.toISOString(),
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 })
  }
}
