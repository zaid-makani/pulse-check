import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, canViewTeam, teamRole } from '@/lib/authz'

type Ctx = { params: Promise<{ id: string }> }

async function loadForUser(id: string, me: string) {
  const r = await prisma.report.findUnique({
    where: { id },
    include: { team: { select: { name: true } }, subjectUser: { select: { id: true, name: true } }, author: { select: { name: true } } },
  })
  if (!r) throw new HttpError(404, 'Report not found')
  let ok = false
  if (r.subjectUserId) {
    if (r.subjectUserId === me) ok = r.type !== 'ONE_ON_ONE_PREP'
    if (!ok) {
      const shared = await prisma.teamMembership.findMany({ where: { userId: r.subjectUserId }, select: { teamId: true } })
      for (const s of shared) {
        const role = await teamRole(me, s.teamId)
        if (role === 'LEAD' || role === 'MANAGER') { ok = true; break }
      }
      if (!ok && r.teamId) ok = await canViewTeam(me, r.teamId)
    }
  } else if (r.teamId) {
    ok = await canViewTeam(me, r.teamId)
  }
  if (!ok) throw new HttpError(403, 'Forbidden')
  return r
}

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const r = await loadForUser(id, me)
  return NextResponse.json({
    id: r.id,
    type: r.type,
    title: r.title,
    content: r.content,
    teamId: r.teamId,
    teamName: r.team?.name ?? null,
    subject: r.subjectUser,
    authorName: r.author?.name ?? null,
    periodStart: r.periodStart.toISOString(),
    periodEnd: r.periodEnd.toISOString(),
    createdAt: r.createdAt.toISOString(),
  })
})

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  await loadForUser(id, me)
  const body = await req.json().catch(() => ({}))
  const content = typeof body.content === 'string' ? body.content : null
  if (content === null) throw new HttpError(400, 'content is required')
  const r = await prisma.report.update({ where: { id }, data: { content } })
  return NextResponse.json({ id: r.id, content: r.content })
})

export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  await loadForUser(id, me)
  await prisma.report.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
