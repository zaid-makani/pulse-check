import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, canViewTeam, teamRole } from '@/lib/authz'
import { reextractUpdate, updateInclude, toView } from '@/lib/updates'

type Ctx = { params: Promise<{ id: string }> }

async function load(id: string) {
  const u = await prisma.update.findUnique({ where: { id }, include: updateInclude })
  if (!u) throw new HttpError(404, 'Update not found')
  return u
}

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const u = await load(id)
  if (u.userId !== me && !(await canViewTeam(me, u.teamId))) throw new HttpError(403, 'Forbidden')
  return NextResponse.json(toView(u))
})

/** PATCH { rawText } re-extracts. Only the author may edit. */
export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const u = await load(id)
  if (u.userId !== me) throw new HttpError(403, 'Only the author can edit an update')
  const body = await req.json().catch(() => ({}))
  const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : ''
  if (!rawText) throw new HttpError(400, 'rawText is required')
  return NextResponse.json(await reextractUpdate(id, rawText))
})

/** Author or a team lead/manager may delete. */
export const DELETE = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  const u = await load(id)
  const role = await teamRole(me, u.teamId)
  const allowed = u.userId === me || role === 'LEAD' || role === 'MANAGER'
  if (!allowed) throw new HttpError(403, 'Forbidden')
  await prisma.update.delete({ where: { id } })
  return NextResponse.json({ ok: true })
})
