import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId } from '@/lib/authz'
import { orgForUser } from '@/lib/org'

/**
 * GET /api/teams
 * Teams the caller can open: their memberships, plus every team in an org
 * they administer (role "ADMIN", read-only, no capture).
 */
export const GET = handle(async () => {
  const me = await requireUserId()

  const [memberships, adminOrgs] = await Promise.all([
    prisma.teamMembership.findMany({
      where: { userId: me },
      include: { team: { include: { _count: { select: { memberships: true } } } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.orgMembership.findMany({
      where: { userId: me, role: 'ADMIN' },
      select: { org: { select: { teams: { include: { _count: { select: { memberships: true } } }, orderBy: { name: 'asc' } } } } },
    }),
  ])

  const seen = new Set<string>()
  const teams = memberships.map((m) => {
    seen.add(m.teamId)
    return { id: m.team.id, name: m.team.name, description: m.team.description, role: m.role as string, memberCount: m.team._count.memberships, createdAt: m.team.createdAt }
  })
  for (const o of adminOrgs) {
    for (const t of o.org.teams) {
      if (seen.has(t.id)) continue
      seen.add(t.id)
      teams.push({ id: t.id, name: t.name, description: t.description, role: 'ADMIN', memberCount: t._count.memberships, createdAt: t.createdAt })
    }
  }
  return NextResponse.json(teams)
})

/** POST /api/teams { name, description? } — creator becomes LEAD; team joins the creator's org. */
export const POST = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (!name) throw new HttpError(400, 'Team name is required')

  const org = await orgForUser(me)
  const team = await prisma.team.create({
    data: {
      name,
      description: description || null,
      orgId: org.id,
      memberships: { create: { userId: me, role: 'LEAD' } },
      settings: { create: {} },
    },
  })
  return NextResponse.json(team, { status: 201 })
})
