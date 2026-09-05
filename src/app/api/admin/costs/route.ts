import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { handle, requireUserId, visibleTeamIds } from '@/lib/authz'

/**
 * GET /api/admin/costs?days=30
 * LLM spend for the teams the caller can see, grouped by day, purpose, model.
 * Also reports which API key is in use (masked) so nobody is surprised whose
 * account is paying.
 */
export const GET = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const days = Math.min(parseInt(new URL(request.url).searchParams.get('days') || '30', 10) || 30, 365)
  const since = new Date()
  since.setDate(since.getDate() - days)
  const teamIds = await visibleTeamIds(me)

  const calls = await prisma.llmCall.findMany({
    where: {
      createdAt: { gte: since },
      OR: [{ teamId: { in: teamIds } }, { teamId: null, userId: me }],
    },
    select: {
      purpose: true,
      model: true,
      provider: true,
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      costUsd: true,
      ok: true,
      latencyMs: true,
      createdAt: true,
      teamId: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const byDay = new Map<string, number>()
  const byPurpose = new Map<string, { calls: number; costUsd: number; failed: number }>()
  const byModel = new Map<string, { calls: number; costUsd: number; inputTokens: number; outputTokens: number }>()
  const byTeam = new Map<string, number>()
  let total = 0

  for (const c of calls) {
    total += c.costUsd
    const day = c.createdAt.toISOString().slice(0, 10)
    byDay.set(day, (byDay.get(day) ?? 0) + c.costUsd)
    const p = byPurpose.get(c.purpose) ?? { calls: 0, costUsd: 0, failed: 0 }
    p.calls++
    p.costUsd += c.costUsd
    if (!c.ok) p.failed++
    byPurpose.set(c.purpose, p)
    const m = byModel.get(c.model) ?? { calls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 }
    m.calls++
    m.costUsd += c.costUsd
    m.inputTokens += c.inputTokens
    m.outputTokens += c.outputTokens
    byModel.set(c.model, m)
    const t = c.teamId ?? 'none'
    byTeam.set(t, (byTeam.get(t) ?? 0) + c.costUsd)
  }

  const teams = await prisma.team.findMany({
    where: { id: { in: [...byTeam.keys()].filter((k) => k !== 'none') } },
    select: { id: true, name: true },
  })
  const teamName = new Map(teams.map((t) => [t.id, t.name]))

  const key = process.env.ANTHROPIC_API_KEY ?? ''
  const keyHint = key ? `${key.slice(0, 10)}…${key.slice(-4)}` : 'not set'

  return NextResponse.json({
    days,
    totalUsd: total,
    calls: calls.length,
    keyHint,
    keyOwner: process.env.PULSE_KEY_OWNER ?? 'unspecified',
    byDay: [...byDay.entries()].sort().map(([day, costUsd]) => ({ day, costUsd })),
    byPurpose: [...byPurpose.entries()].map(([purpose, v]) => ({ purpose, ...v })).sort((a, b) => b.costUsd - a.costUsd),
    byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.costUsd - a.costUsd),
    byTeam: [...byTeam.entries()].map(([teamId, costUsd]) => ({
      teamId,
      teamName: teamId === 'none' ? 'No team' : (teamName.get(teamId) ?? teamId),
      costUsd,
    })).sort((a, b) => b.costUsd - a.costUsd),
    recent: calls.slice(0, 50),
  })
})
