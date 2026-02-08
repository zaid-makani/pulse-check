import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendReminderEmail } from '@/lib/email'

/**
 * POST /api/cron/reminders
 *
 * Sends reminder emails to team members who haven't submitted their daily update.
 * This endpoint should be called by a cron job at the configured reminder times.
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

    const { searchParams } = new URL(request.url)
    const specificTeamId = searchParams.get('teamId')

    // Get current time info for matching team settings
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    const currentDay = now.getUTCDay() // 0 = Sunday

    // Round to nearest 15 minutes for matching
    const roundedMinute = Math.floor(currentMinute / 15) * 15
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${roundedMinute.toString().padStart(2, '0')}`

    // Start of today (UTC)
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)

    // Find teams that need reminders sent now
    const teamSettings = await prisma.teamSettings.findMany({
      where: specificTeamId ? { teamId: specificTeamId } : undefined,
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
    const results: Array<{ team: string; sent: number; skipped: number }> = []

    for (const settings of teamSettings) {
      // Check if it's the right time for this team
      // For simplicity, we're checking UTC time - in production you'd convert based on timezone
      const reminderDays = JSON.parse(settings.reminderDays) as number[]

      if (!reminderDays.includes(currentDay)) {
        continue // Not a reminder day for this team
      }

      // Check if reminder time matches (with some tolerance)
      // In production, you'd want more sophisticated time matching with timezone support
      const [reminderHour, reminderMinute] = settings.reminderTime.split(':').map(Number)
      const reminderTimeStr = `${reminderHour.toString().padStart(2, '0')}:${Math.floor(reminderMinute / 15) * 15}`

      if (currentTime !== reminderTimeStr && !specificTeamId) {
        continue // Not the right time for this team
      }

      // Find members who haven't submitted today
      const membersWithUpdates = await prisma.statusUpdate.findMany({
        where: {
          createdAt: { gte: todayStart },
          userId: {
            in: settings.team.memberships.map(m => m.user.id),
          },
        },
        select: { userId: true },
      })

      const usersWithUpdates = new Set(membersWithUpdates.map(u => u.userId))

      let sent = 0
      let skipped = 0

      for (const membership of settings.team.memberships) {
        if (usersWithUpdates.has(membership.user.id)) {
          skipped++
          continue // Already submitted today
        }

        try {
          await sendReminderEmail({
            to: membership.user.email,
            userName: membership.user.name,
            teamName: settings.team.name,
          })
          sent++
          emailsSent++
        } catch (error) {
          console.error(`Failed to send reminder to ${membership.user.email}:`, error)
        }
      }

      results.push({
        team: settings.team.name,
        sent,
        skipped,
      })
    }

    return NextResponse.json({
      success: true,
      emailsSent,
      results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 })
  }
}

// Also support GET for easy testing via browser (still requires secret)
export async function GET(request: NextRequest) {
  return POST(request)
}
