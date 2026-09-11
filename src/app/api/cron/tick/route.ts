import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateReport } from '@/lib/reports'
import { postWebhook } from '@/lib/slack-webhook'
import { slackEnabled, appUrl } from '@/lib/slack/client'
import { sendNudge, dmDocument } from '@/lib/slack/handlers'

export const maxDuration = 300

/**
 * POST /api/cron/tick   (Authorization: Bearer CRON_SECRET)
 *
 * Call every 15 minutes from the host's scheduler. For each team, in the
 * team's timezone, it runs whatever is due in the current window and has
 * not already run today:
 *
 *   nudgeTime on nudgeDays  -> Slack DM to each member without an update today
 *   briefingTime on nudgeDays -> DAILY_BRIEFING, DM'd to leads/managers
 *                                (or posted to the team webhook)
 *   recapDay at briefingTime -> WEEK_RECAP DM'd to each member
 *
 * ?dry=1 reports what would run without doing it.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const dryRun = new URL(req.url).searchParams.get('dry') === '1'
  const force = new URL(req.url).searchParams.get('force') // 'nudge' | 'briefing' | 'recap' for manual testing
  const now = new Date()
  const ran: string[] = []
  const errors: string[] = []
  const slackOn = slackEnabled()

  const teams = await prisma.team.findMany({
    include: {
      settings: true,
      memberships: { include: { user: { select: { id: true, name: true, slackUserId: true } } } },
    },
  })

  for (const team of teams) {
    const s = team.settings
    if (!s) continue
    const local = localParts(now, s.timezone)
    const dayStart = startOfLocalDay(now, s.timezone)
    const workday = s.nudgeDays.includes(local.weekday)

    // --- Nightly nudge ------------------------------------------------------
    if (slackOn && ((workday && inWindow(local.minutes, s.nudgeTime)) || force === 'nudge')) {
      for (const m of team.memberships) {
        if ((m.role === 'MANAGER' && force !== 'nudge') || !m.user.slackUserId) continue
        const [posted, nudged] = await Promise.all([
          prisma.update.findFirst({ where: { userId: m.userId, teamId: team.id, createdAt: { gte: dayStart } }, select: { id: true } }),
          prisma.slackNudge.findFirst({ where: { userId: m.userId, teamId: team.id, sentAt: { gte: dayStart } }, select: { id: true } }),
        ])
        if (posted || (nudged && force !== 'nudge')) continue
        ran.push(`nudge:${team.name}:${m.user.name}`)
        if (dryRun) continue
        try {
          await sendNudge({ userId: m.userId, slackUserId: m.user.slackUserId, teamId: team.id, teamName: team.name, firstName: m.user.name.split(' ')[0] })
        } catch (err) {
          errors.push(`nudge ${m.user.name}: ${String(err)}`)
        }
      }
    }

    // --- Morning briefing ---------------------------------------------------
    if ((workday && inWindow(local.minutes, s.briefingTime)) || force === 'briefing') {
      const already = await prisma.report.findFirst({ where: { type: 'DAILY_BRIEFING', teamId: team.id, createdAt: { gte: dayStart } } })
      if (!already || force === 'briefing') {
        ran.push(`briefing:${team.name}`)
        if (!dryRun) {
          try {
            const report = await generateReport({ type: 'DAILY_BRIEFING', teamId: team.id, periodStart: new Date(now.getTime() - 3 * 86_400_000), periodEnd: now })
            const doc = { title: report.title, markdown: report.content, link: appUrl('/home') }
            const leads = team.memberships.filter((m) => (m.role === 'LEAD' || m.role === 'MANAGER') && m.user.slackUserId)
            if (slackOn && leads.length) {
              for (const m of leads) {
                try { await dmDocument(m.user.slackUserId!, doc) } catch (err) { errors.push(`briefing dm ${m.user.name}: ${String(err)}`) }
              }
            } else if (s.slackWebhookUrl) {
              await postWebhook(s.slackWebhookUrl, doc)
            }
          } catch (err) {
            errors.push(`briefing ${team.name}: ${String(err)}`)
          }
        }
      }
    }

    // --- Friday recap -------------------------------------------------------
    if ((local.weekday === s.recapDay && inWindow(local.minutes, s.briefingTime)) || force === 'recap') {
      for (const m of team.memberships) {
        if (m.role === 'MANAGER') continue
        const already = await prisma.report.findFirst({ where: { type: 'WEEK_RECAP', subjectUserId: m.userId, createdAt: { gte: dayStart } } })
        if (already && force !== 'recap') continue
        const count = await prisma.update.count({ where: { userId: m.userId, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } })
        if (count === 0) continue
        ran.push(`recap:${team.name}:${m.user.name}`)
        if (dryRun) continue
        try {
          const report = await generateReport({ type: 'WEEK_RECAP', subjectUserId: m.userId, periodStart: new Date(now.getTime() - 7 * 86_400_000), periodEnd: now })
          if (slackOn && m.user.slackUserId) {
            await dmDocument(m.user.slackUserId, { title: report.title, markdown: report.content, link: appUrl('/me') })
          }
        } catch (err) {
          errors.push(`recap ${m.user.name}: ${String(err)}`)
        }
      }
    }
  }
  return NextResponse.json({ at: now.toISOString(), dryRun, slack: slackOn, ran, errors })
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
  const diff = nowMinutes - (h * 60 + m)
  return diff >= 0 && diff < 15
}

/** Midnight today in the given timezone, as an absolute instant. */
function startOfLocalDay(d: Date, tz: string): Date {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]))
  const localMs = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second))
  const offset = localMs - d.getTime()
  const midnightLocalAsUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
  return new Date(midnightLocalAsUtc - offset)
}
