import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { TeamRole } from '@prisma/client'

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function currentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}

export async function requireUserId(): Promise<string> {
  const id = await currentUserId()
  if (!id) throw new HttpError(401, 'Unauthorized')
  return id
}

export async function teamRole(userId: string, teamId: string): Promise<TeamRole | null> {
  const m = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true },
  })
  return m?.role ?? null
}

/** Org admins (directors and above) can see every team in their org. */
export async function canViewTeam(userId: string, teamId: string): Promise<boolean> {
  if (await teamRole(userId, teamId)) return true
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { orgId: true } })
  if (!team?.orgId) return false
  const om = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: team.orgId, userId } },
    select: { role: true },
  })
  return om?.role === 'ADMIN'
}

export async function requireTeamView(userId: string, teamId: string) {
  if (!(await canViewTeam(userId, teamId))) throw new HttpError(403, 'Not a member of this team')
}

export async function requireTeamMember(userId: string, teamId: string): Promise<TeamRole> {
  const role = await teamRole(userId, teamId)
  if (!role) throw new HttpError(403, 'Not a member of this team')
  return role
}

export async function requireTeamManager(userId: string, teamId: string) {
  const role = await teamRole(userId, teamId)
  if (role !== 'LEAD' && role !== 'MANAGER') throw new HttpError(403, 'Insufficient permissions')
  return role
}

/** All team IDs a user can read: memberships plus every team in orgs they admin. */
export async function visibleTeamIds(userId: string): Promise<string[]> {
  const [memberships, orgAdmin] = await Promise.all([
    prisma.teamMembership.findMany({ where: { userId }, select: { teamId: true } }),
    prisma.orgMembership.findMany({
      where: { userId, role: 'ADMIN' },
      select: { org: { select: { teams: { select: { id: true } } } } },
    }),
  ])
  const ids = new Set(memberships.map((m) => m.teamId))
  for (const om of orgAdmin) for (const t of om.org.teams) ids.add(t.id)
  return [...ids]
}

/** Wrap a route handler so thrown HttpError becomes a JSON response. */
export function handle<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args) => {
    try {
      return await fn(...args)
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      console.error(err)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
  }
}
