import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireUserId } from '@/lib/authz'

/** GET /api/me — who am I and what can I see. */
export const GET = handle(async () => {
  const me = await requireUserId()
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: me },
    select: {
      id: true,
      name: true,
      email: true,
      slackUserId: true,
      teamMemberships: { select: { teamId: true, role: true } },
      orgMemberships: { select: { orgId: true, role: true } },
    },
  })
  const orgAdmin = user.orgMemberships.some((o) => o.role === 'ADMIN')
  const manages = user.teamMemberships.filter((m) => m.role === 'LEAD' || m.role === 'MANAGER').map((m) => m.teamId)
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    slackLinked: !!user.slackUserId,
    orgAdmin,
    managesTeamIds: manages,
    isManager: orgAdmin || manages.length > 0,
  })
})
