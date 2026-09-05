import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId } from '@/lib/authz'
import { orgForUser } from '@/lib/org'

/** GET /api/org — the caller's org, its teams, and who has org-wide view. */
export const GET = handle(async () => {
  const me = await requireUserId()
  const org = await orgForUser(me)
  const [full, myRole] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: org.id },
      include: {
        teams: { select: { id: true, name: true, _count: { select: { memberships: true } } }, orderBy: { name: 'asc' } },
        memberships: { where: { role: 'ADMIN' }, include: { user: { select: { id: true, name: true, email: true } } } },
      },
    }),
    prisma.orgMembership.findUnique({ where: { orgId_userId: { orgId: org.id, userId: me } }, select: { role: true } }),
  ])
  return NextResponse.json({
    id: full.id,
    name: full.name,
    isAdmin: myRole?.role === 'ADMIN',
    teams: full.teams.map((t) => ({ id: t.id, name: t.name, memberCount: t._count.memberships })),
    admins: full.memberships.map((m) => m.user),
  })
})

const PatchSchema = z.object({ userId: z.string(), role: z.enum(['ADMIN', 'MEMBER']) })

/** PATCH /api/org { userId, role } — grant or remove org-wide view. Admins only. */
export const PATCH = handle(async (req: NextRequest) => {
  const me = await requireUserId()
  const org = await orgForUser(me)
  const mine = await prisma.orgMembership.findUnique({ where: { orgId_userId: { orgId: org.id, userId: me } } })
  if (mine?.role !== 'ADMIN') throw new HttpError(403, 'Org admins only')
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) throw new HttpError(400, 'Invalid body')
  const { userId, role } = parsed.data
  if (userId === me && role === 'MEMBER') throw new HttpError(400, 'You cannot remove your own org-wide view')
  await prisma.orgMembership.upsert({
    where: { orgId_userId: { orgId: org.id, userId } },
    update: { role },
    create: { orgId: org.id, userId, role },
  })
  return NextResponse.json({ ok: true })
})
