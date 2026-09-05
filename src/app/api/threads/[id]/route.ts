import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, requireTeamView, requireTeamMember } from '@/lib/authz'
import { effectiveStatus, mergeThreads, refreshThread } from '@/lib/threads'
import { updateInclude, toView } from '@/lib/updates'

type Ctx = { params: Promise<{ id: string }> }

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const t = await prisma.thread.findUnique({
    where: { id },
    include: {
      team: { select: { id: true, name: true } },
      mergedInto: { select: { id: true, name: true } },
      mergedFrom: { select: { id: true, name: true } },
      links: {
        include: { update: { include: updateInclude } },
        orderBy: { update: { createdAt: 'desc' } },
      },
    },
  })
  if (!t) throw new HttpError(404, 'Thread not found')
  await requireTeamView(me, t.teamId)

  const people = new Map<string, string>()
  for (const l of t.links) people.set(l.update.userId, l.update.user.name)

  return NextResponse.json({
    id: t.id,
    teamId: t.teamId,
    teamName: t.team.name,
    name: t.name,
    description: t.description,
    summary: t.summary,
    aliases: t.aliases,
    status: effectiveStatus(t),
    rawStatus: t.status,
    lastActivityAt: t.lastActivityAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    createdByAi: t.createdByAi,
    mergedInto: t.mergedInto,
    mergedFrom: t.mergedFrom,
    participants: [...people.entries()].map(([pid, name]) => ({ id: pid, name })),
    updates: t.links.map((l) => ({ ...toView(l.update), linkConfidence: l.confidence, excerpt: l.excerpt })),
  })
})

const PatchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  status: z.enum(['ACTIVE', 'BLOCKED', 'DONE']).optional(),
  mergeIntoId: z.string().optional(),
  refresh: z.boolean().optional(),
})

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const t = await prisma.thread.findUnique({ where: { id }, select: { teamId: true } })
  if (!t) throw new HttpError(404, 'Thread not found')
  await requireTeamMember(me, t.teamId)

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) throw new HttpError(400, 'Invalid body')
  const { mergeIntoId, refresh, ...data } = parsed.data

  if (mergeIntoId) {
    await mergeThreads(id, mergeIntoId, me)
    return NextResponse.json({ ok: true, mergedInto: mergeIntoId })
  }
  if (Object.keys(data).length > 0) {
    await prisma.thread.update({ where: { id }, data: { ...data, createdByAi: false } })
  }
  if (refresh) await refreshThread(id, { teamId: t.teamId, userId: me })
  const fresh = await prisma.thread.findUniqueOrThrow({ where: { id } })
  return NextResponse.json({ ...fresh, status: effectiveStatus(fresh) })
})

export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const t = await prisma.thread.findUnique({ where: { id }, select: { teamId: true } })
  if (!t) throw new HttpError(404, 'Thread not found')
  await requireTeamMember(me, t.teamId)
  await prisma.thread.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
