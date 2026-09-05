import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, requireTeamView, teamRole, visibleTeamIds } from '@/lib/authz'
import { generateReport, defaultPeriod } from '@/lib/reports'

export const maxDuration = 120

const TYPES = ['DAILY_BRIEFING', 'STANDUP_BRIEF', 'ONE_ON_ONE_PREP', 'SELF_REVIEW', 'WEEK_RECAP', 'QUARTER_DELIVERY'] as const

/** Can `me` generate/read a person-scoped report about `subjectUserId`? Self, or lead/manager of a shared team. */
async function canSeePerson(me: string, subjectUserId: string) {
  if (me === subjectUserId) return true
  const shared = await prisma.teamMembership.findMany({ where: { userId: subjectUserId }, select: { teamId: true } })
  for (const s of shared) {
    const r = await teamRole(me, s.teamId)
    if (r === 'LEAD' || r === 'MANAGER') return true
  }
  const orgs = await prisma.orgMembership.findMany({ where: { userId: me, role: 'ADMIN' }, select: { orgId: true } })
  if (orgs.length) {
    const subjOrg = await prisma.orgMembership.findFirst({ where: { userId: subjectUserId, orgId: { in: orgs.map((o) => o.orgId) } } })
    if (subjOrg) return true
  }
  return false
}

/** GET /api/reports?type=&teamId=&subjectUserId=&limit= */
export const GET = handle(async (req: NextRequest) => {
  const me = await requireUserId()
  const sp = new URL(req.url).searchParams
  const type = sp.get('type')
  const teamId = sp.get('teamId')
  const subjectUserId = sp.get('subjectUserId')
  const limit = Math.min(parseInt(sp.get('limit') || '20', 10) || 20, 100)

  if (subjectUserId && !(await canSeePerson(me, subjectUserId))) throw new HttpError(403, 'Forbidden')
  if (teamId) await requireTeamView(me, teamId)
  const teamIds = teamId ? [teamId] : await visibleTeamIds(me)

  const rows = await prisma.report.findMany({
    where: {
      ...(type && (TYPES as readonly string[]).includes(type) ? { type: type as (typeof TYPES)[number] } : {}),
      ...(subjectUserId ? { subjectUserId } : { OR: [{ teamId: { in: teamIds } }, { subjectUserId: me }] }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, type: true, title: true, teamId: true, subjectUserId: true, periodStart: true, periodEnd: true, createdAt: true },
  })
  return NextResponse.json(rows)
})

const PostSchema = z.object({
  type: z.enum(TYPES),
  teamId: z.string().optional(),
  subjectUserId: z.string().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
})

/** POST /api/reports generates and stores a report. */
export const POST = handle(async (req: NextRequest) => {
  const me = await requireUserId()
  const parsed = PostSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) throw new HttpError(400, 'Invalid body')
  const { type, teamId, subjectUserId } = parsed.data

  const isPerson = type === 'ONE_ON_ONE_PREP' || type === 'SELF_REVIEW' || type === 'WEEK_RECAP'
  if (isPerson) {
    if (!subjectUserId) throw new HttpError(400, 'subjectUserId required')
    if (!(await canSeePerson(me, subjectUserId))) throw new HttpError(403, 'Forbidden')
    if (type === 'ONE_ON_ONE_PREP' && subjectUserId === me) throw new HttpError(400, '1-on-1 prep is about someone else')
  } else {
    if (!teamId) throw new HttpError(400, 'teamId required')
    await requireTeamView(me, teamId)
  }

  const dp = defaultPeriod(type)
  const periodStart = parsed.data.periodStart ? new Date(parsed.data.periodStart) : dp.periodStart
  const periodEnd = parsed.data.periodEnd ? new Date(parsed.data.periodEnd) : dp.periodEnd

  const report = await generateReport({ type, teamId, subjectUserId, periodStart, periodEnd, authorId: me })
  return NextResponse.json(report, { status: 201 })
})
