import { prisma } from '@/lib/db'

/**
 * Organizations group teams so that people with org-wide roles (VP, CTO)
 * can see every team. For the pilot there is one org, created on demand
 * from the first user's email domain.
 */

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'org'
}

/** The org a user belongs to, creating one from their email domain if they have none. */
export async function orgForUser(userId: string): Promise<{ id: string; name: string }> {
  const existing = await prisma.orgMembership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { org: { select: { id: true, name: true } } },
  })
  if (existing) return existing.org

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } })
  const domain = user.email.split('@')[1] ?? 'org'
  const name = domain.split('.')[0].replace(/^\w/, (c) => c.toUpperCase())
  const slug = slugify(domain)

  // Join an org that already exists for this domain, else create it. First person in becomes admin.
  const byDomain = await prisma.organization.findUnique({ where: { slug } })
  if (byDomain) {
    await prisma.orgMembership.create({ data: { orgId: byDomain.id, userId, role: 'MEMBER' } })
    return byDomain
  }
  const org = await prisma.organization.create({ data: { name, slug, memberships: { create: { userId, role: 'ADMIN' } } } })
  return org
}

/** Make sure a user is in the org that owns a team (as a plain member). */
export async function ensureOrgMembership(userId: string, orgId: string) {
  await prisma.orgMembership.upsert({
    where: { orgId_userId: { orgId, userId } },
    update: {},
    create: { orgId, userId, role: 'MEMBER' },
  })
}
