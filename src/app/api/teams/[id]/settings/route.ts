import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handle, HttpError, requireUserId, requireTeamView, requireTeamManager } from '@/lib/authz'

type Ctx = { params: Promise<{ id: string }> }

const TIME = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/

const PatchSchema = z.object({
  nudgeTime: z.string().regex(TIME).optional(),
  nudgeDays: z.array(z.number().int().min(0).max(6)).optional(),
  briefingTime: z.string().regex(TIME).optional(),
  recapDay: z.number().int().min(0).max(6).optional(),
  timezone: z.string().min(1).optional(),
  slackChannelId: z.string().nullable().optional(),
  slackWebhookUrl: z.string().url().nullable().optional().or(z.literal('')),
  vocabulary: z.enum(['engineering', 'sales', 'marketing', 'general']).optional(),
})

export const GET = handle(async (_req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  await requireTeamView(me, id)
  const [settings, team] = await Promise.all([
    prisma.teamSettings.upsert({ where: { teamId: id }, update: {}, create: { teamId: id } }),
    prisma.team.findUnique({ where: { id }, select: { vocabulary: true } }),
  ])
  return NextResponse.json({ ...settings, vocabulary: team?.vocabulary ?? 'engineering' })
})

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  const me = await requireUserId()
  const { id } = await params
  await requireTeamManager(me, id)
  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) throw new HttpError(400, 'Invalid settings')
  const { vocabulary, slackWebhookUrl, ...rest } = parsed.data

  const [settings, team] = await Promise.all([
    prisma.teamSettings.upsert({
      where: { teamId: id },
      update: { ...rest, ...(slackWebhookUrl !== undefined ? { slackWebhookUrl: slackWebhookUrl || null } : {}) },
      create: { teamId: id, ...rest, slackWebhookUrl: slackWebhookUrl || null },
    }),
    vocabulary
      ? prisma.team.update({ where: { id }, data: { vocabulary }, select: { vocabulary: true } })
      : prisma.team.findUnique({ where: { id }, select: { vocabulary: true } }),
  ])
  return NextResponse.json({ ...settings, vocabulary: team?.vocabulary ?? 'engineering' })
})
