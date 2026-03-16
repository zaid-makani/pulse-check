import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/cron/digest
 *
 * Sends digest emails to team managers with a summary of team status.
 * This endpoint should be called by a cron job at the configured digest times.
 *
 * Security: Requires CRON_SECRET header to match environment variable.
 *
 * Query params:
 * - teamId: (optional) Only process a specific team
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret')
    if (!process.env.CRON_SECRET || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if cron emails are enabled
    const cronEmailsEnabled = process.env.ENABLE_CRON_EMAILS === 'true'

    const { searchParams } = new URL(request.url)
    const specificTeamId = searchParams.get('teamId')

    const now = new Date()
    const currentDay = now.getUTCDay()

    // Get yesterday's date range for daily digests
    const yesterdayStart = new Date(now)
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)
    yesterdayStart.setUTCHours(0, 0, 0, 0)

    const yesterdayEnd = new Date(yesterdayStart)
    yesterdayEnd.setUTCHours(23, 59, 59, 999)

    // Get last week's range for weekly digests
    const weekStart = new Date(now)
    weekStart.setUTCDate(weekStart.getUTCDate() - 7)
    weekStart.setUTCHours(0, 0, 0, 0)

    // Find teams with digest enabled
    const teamSettings = await prisma.teamSettings.findMany({
      where: {
        digestEnabled: true,
        ...(specificTeamId ? { teamId: specificTeamId } : {}),
      },
      include: {
        team: {
          include: {
            memberships: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    let emailsSent = 0
    let slackMessagesSent = 0
    const results: Array<{ team: string; managers: number; schedule: string; slack: boolean }> = []

    for (const settings of teamSettings) {
      // Check if it's the right time/day for this digest
      const isWeekly = settings.digestSchedule === 'weekly'

      // Weekly digests only on Monday (day 1)
      if (isWeekly && currentDay !== 1 && !specificTeamId) {
        continue
      }

      // Get the date range based on schedule
      const dateRange = isWeekly
        ? { gte: weekStart, lte: now }
        : { gte: yesterdayStart, lte: yesterdayEnd }

      // Get all status updates for the period
      const updates = await prisma.statusUpdate.findMany({
        where: {
          teamId: settings.teamId,
          createdAt: dateRange,
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Group updates by user (get most recent for each)
      const latestByUser = new Map<string, typeof updates[0]>()
      for (const update of updates) {
        if (!latestByUser.has(update.userId)) {
          latestByUser.set(update.userId, update)
        }
      }

      // Calculate stats
      const usersWithUpdates = new Set(updates.map(u => u.userId))
      const allBlockers = updates.flatMap(u => {
        try {
          return JSON.parse(u.blockers)
        } catch {
          return []
        }
      })

      const stats = {
        totalMembers: settings.team.memberships.length,
        submittedToday: usersWithUpdates.size,
        blockers: allBlockers.length,
      }

      // Build member updates list
      const memberUpdates = settings.team.memberships.map(m => {
        const update = latestByUser.get(m.user.id)
        let hasBlockers = false
        if (update) {
          try {
            const blockers = JSON.parse(update.blockers)
            hasBlockers = blockers.length > 0
          } catch {
            // ignore
          }
        }
        return {
          name: m.user.name,
          summary: update?.summary || null,
          sentiment: update?.sentiment || null,
          hasBlockers,
        }
      })

      // Generate summary
      const summary = generateDigestSummary(stats, isWeekly)

      // Find managers/leads to send digest to
      const managers = settings.team.memberships.filter(
        m => m.role === 'MANAGER' || m.role === 'LEAD'
      )

      // Send digest emails to managers/leads
      if (cronEmailsEnabled && process.env.RESEND_API_KEY) {
        const { sendDigestEmail } = await import('@/lib/email')
        for (const manager of managers) {
          try {
            await sendDigestEmail({
              to: manager.user.email,
              managerName: manager.user.name,
              teamName: settings.team.name,
              summary,
              stats,
              memberUpdates,
            })
            emailsSent++
          } catch (error) {
            console.error(`Failed to send digest to ${manager.user.email}:`, error)
          }
        }
      } else {
        console.log(`[CRON-DRY-RUN] Digest for ${settings.team.name}: would email ${managers.length} managers (${managers.map(m => m.user.email).join(', ')})`)
      }

      // Post to Slack if configured
      let slackSent = false
      if (settings.slackWebhookUrl) {
        try {
          const { postDigestToSlack } = await import('@/lib/slack')
          await postDigestToSlack({
            webhookUrl: settings.slackWebhookUrl,
            teamName: settings.team.name,
            summary,
            stats,
            memberUpdates,
          })
          slackMessagesSent++
          slackSent = true
        } catch (error) {
          console.error(`Failed to post digest to Slack for ${settings.team.name}:`, error)
        }
      }

      results.push({
        team: settings.team.name,
        managers: managers.length,
        schedule: settings.digestSchedule,
        slack: slackSent,
      })
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      slackMessagesSent,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Error sending digests:', error)
    return NextResponse.json({ error: 'Failed to send digests' }, { status: 500 })
  }
}

function generateDigestSummary(
  stats: { totalMembers: number; submittedToday: number; blockers: number },
  isWeekly: boolean
): string {
  const period = isWeekly ? 'this week' : 'yesterday'
  const participation = Math.round((stats.submittedToday / stats.totalMembers) * 100)

  let summary = `Here's your ${isWeekly ? 'weekly' : 'daily'} team summary. `

  if (participation === 100) {
    summary += `Great news! All ${stats.totalMembers} team members submitted updates ${period}. `
  } else if (participation >= 75) {
    summary += `${stats.submittedToday} of ${stats.totalMembers} team members (${participation}%) submitted updates ${period}. `
  } else {
    summary += `Only ${stats.submittedToday} of ${stats.totalMembers} team members (${participation}%) submitted updates ${period}. Consider following up with the team. `
  }

  if (stats.blockers > 0) {
    summary += `There ${stats.blockers === 1 ? 'is' : 'are'} ${stats.blockers} blocker${stats.blockers === 1 ? '' : 's'} that may need attention.`
  } else {
    summary += `No blockers were reported.`
  }

  return summary
}

// Also support GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request)
}
