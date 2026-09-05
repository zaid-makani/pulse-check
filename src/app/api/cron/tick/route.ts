import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReport } from '@/lib/reports'
import { postWebhook } from '@/lib/slack-webhook'

export const maxDuration = 300

/**
 * POST /api/cron/tick   (Authorization: Bearer CRON_SECRET)
 *
 * Call every 15 minutes from the host's scheduler. For each team it checks,
 * in the team's timezone, whether a scheduled job is due in the current
 * window and has not already run today:
 *
 *   briefingTime  -> DAILY_BRIEFING for the team, posted to the team webhook
 *   recapDay      -> WEEK_RECAP for every member (at briefingTime that day)
 *
 * The nightly nudge is delivered by the Slack app (Phase 2), which reads
 * nudgeTime from the same settings.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dry') === '1'
  const now = new Date()
  const ran: string[] = []

  const teams = await prisma.team.findMany({ include: { settings: true, memberships: { select: { userId: true, role: true } } } })
  for (const team of teams) {
    const s = team.settings
    if (!s) continue
    const local = localParts(now, s.timezone)
    const dueBriefing = inWindow(local.minutes, s.briefingTime) && s.nudgeDays.includes(local.weekday)
    if (dueBriefing) {
      const already = await prisma.report.findFirst({ where: { type: 'DAILY_BRIEFING', teamId: team.id, createdAt: { gte: startOfLocalDay(now, s.timezone) } } })
      if (!already) {
        ran.push(`briefing:${team.name}`)
        if (!dryRun) {
          const start = new Date(now.getTime() - 3 * 86_400_000)
          const report = await generateReport({ type: 'DAILY_BRIEFING', teamId: team.id, periodStart: start, periodEnd: now })
          if (s.slackWebhookUrl) {
            try {
              await postWebhook(s.slackWebhookUrl, { title: report.title, markdown: report.content, link: `${process.env.NEXTAUTH_URL}/home` })
            } catch (err) {
              console.error('webhook failed', team.name, err)
            }
          }
        }
      }
    }
    const dueRecap = local.weekday === s.recapDay && inWindow(local.minutes, s.briefingTime)
    if (dueRecap) {
      for (const m of team.memberships) {
        if (m.role === 'MANAGER') continue
        const already = await prisma.report.findFirst({ where: { type: 'WEEK_RECAP', subjectUserId: m.userId, createdAt: { gte: startOfLocalDay(now, s.timezone) } } })
        if (already) continue
        const count = await prisma.update.count({ where: { userId: m.userId, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } })
        if (count === 0) continue
        ran.push(`recap:${m.userId}`)
        if (!dryRun) {
          await generateReport({ type: 'WEEK_RECAP', subjectUserId: m.userId, periodStart: new Date(now.getTime() - 7 * 86_400_000), periodEnd: now })
        }
      }
    }
  }
  return NextResponse.json({ at: now.toISOString(), dryRun, ran })
}

function localParts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', weekday: 'short', hour12: false })
  const parts = Object.fromEntries(f.formatToParts(d).map((p) => [p.type, p.value]))
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday)
  return { minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute), weekday }
}

/** Due if the scheduled HH:MM falls within the last 15 minutes. */
function inWindow(nowMinutes: number, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const target = h * 60 + m
  const diff = nowMinutes - target
  return diff >= 0 && diff < 15
}

function startOfLocalDay(d: Date, tz: string): Date {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  const ymd = f.format(d)
  const offsetMs = d.getTime() - new Date(new Date(d.toLocaleString('en-US', { timeZone: tz })).getTime()).getTime()
  return new Date(new Date(`${ymd}T00:00:00`).getTime() + offsetMs)
}
