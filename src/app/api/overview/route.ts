import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireUserId, visibleTeamIds } from '@/lib/authz'
import { effectiveStatus } from '@/lib/threads'
import { readSignals } from '@/lib/extract'

/**
 * GET /api/overview
 * One row per team the caller can see, with the signals a director or VP
 * scans first: blocked threads, quiet people, tone, latest briefing lead.
 */
export const GET = handle(async () => {
  const me = await requireUserId()
  const teamIds = await visibleTeamIds(me)
  const since7 = new Date(Date.now() - 7 * 86_400_000)
  const since2 = new Date(Date.now() - 2 * 86_400_000)

  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    orderBy: { name: 'asc' },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, updates: { where: { createdAt: { gte: since7 } }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, sentiment: true, signals: true, teamId: true } } } } },
      },
      threads: { where: { mergedIntoId: null, status: { not: 'DONE' } }, orderBy: { lastActivityAt: 'desc' }, select: { id: true, name: true, status: true, lastActivityAt: true } },
      reports: { where: { type: 'DAILY_BRIEFING' }, orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, content: true, createdAt: true } },
      _count: { select: { updates: { where: { createdAt: { gte: since7 } } } } },
    },
  })

  const rows = teams.map((t) => {
    const people = t.memberships.filter((m) => m.role !== 'MANAGER')
    const quiet = people.filter((m) => !m.user.updates[0] || m.user.updates[0].createdAt < since2).map((m) => m.user.name)
    const frustrated = people.filter((m) => m.user.updates[0]?.sentiment === 'FRUSTRATED').map((m) => m.user.name)
    const blockedPeople = people.filter((m) => m.user.updates[0] && readSignals(m.user.updates[0].signals).blockers.length > 0).map((m) => m.user.name)
    const threads = t.threads.map((th) => ({ id: th.id, name: th.name, status: effectiveStatus(th) }))
    const blockedThreads = threads.filter((th) => th.status === 'BLOCKED')
    const staleThreads = threads.filter((th) => th.status === 'STALE')
    const briefing = t.reports[0]
    const talkToFirst = briefing ? firstSection(briefing.content, 'Talk to first') : null
    const lastActivity = t.memberships.map((m) => m.user.updates[0]?.createdAt).filter(Boolean).sort().at(-1) ?? null

    let health: 'green' | 'amber' | 'red' = 'green'
    if (blockedThreads.length > 0 || frustrated.length > 0 || quiet.length > people.length / 2) health = 'amber'
    if ((blockedThreads.length > 0 && frustrated.length > 0) || (people.length > 0 && quiet.length === people.length)) health = 'red'

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      memberCount: t.memberships.length,
      updatesThisWeek: t._count.updates,
      lastActivity,
      health,
      openThreads: threads.length,
      blockedThreads,
      staleThreads: staleThreads.length,
      quiet,
      frustrated,
      blockedPeople,
      briefing: briefing ? { id: briefing.id, createdAt: briefing.createdAt, talkToFirst } : null,
    }
  })

  return NextResponse.json({ generatedAt: new Date().toISOString(), teams: rows })
})

function firstSection(markdown: string, heading: string): string | null {
  const lines = markdown.split('\n')
  const start = lines.findIndex((l) => l.replace(/^#+\s*/, '').trim().toLowerCase() === heading.toLowerCase())
  if (start < 0) return null
  const out: string[] = []
  for (const l of lines.slice(start + 1)) {
    if (/^#+\s/.test(l)) break
    if (l.trim()) out.push(l.replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, ''))
  }
  const trimmed = out.slice(0, 2).map((l) => (l.length > 150 ? l.slice(0, 147).replace(/\s+\S*$/, '') + '…' : l))
  return trimmed.join(' · ') || null
}
