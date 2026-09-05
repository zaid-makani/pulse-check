import { Prisma, type UpdateSource, type Sentiment } from '@prisma/client'
import { prisma } from '@/lib/db'
import { extractSignals, readSignals, type Signals } from '@/lib/extract'
import { embed, setUpdateEmbedding } from '@/lib/embeddings'

/**
 * The one way an update enters PulseCheck, whatever the source.
 *
 *   raw text -> extract signals -> store -> embed -> (Phase 1) link to threads
 */

export const updateInclude = {
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
  links: {
    include: { thread: { select: { id: true, name: true, status: true } } },
  },
} satisfies Prisma.UpdateInclude

export type UpdateWithRelations = Prisma.UpdateGetPayload<{ include: typeof updateInclude }>

export interface UpdateView {
  id: string
  userId: string
  teamId: string
  source: UpdateSource
  rawText: string
  signals: Signals
  sentiment: Sentiment
  summary: string | null
  createdAt: string
  user: { id: string; name: string; email: string; avatarUrl: string | null }
  threads: { id: string; name: string; status: string; confidence: number }[]
}

export function toView(u: UpdateWithRelations): UpdateView {
  return {
    id: u.id,
    userId: u.userId,
    teamId: u.teamId,
    source: u.source,
    rawText: u.rawText,
    signals: readSignals(u.signals),
    sentiment: u.sentiment,
    summary: u.summary,
    createdAt: u.createdAt.toISOString(),
    user: u.user,
    threads: u.links.map((l) => ({
      id: l.thread.id,
      name: l.thread.name,
      status: l.thread.status,
      confidence: l.confidence,
    })),
  }
}

function toSentiment(s: Signals['sentiment']): Sentiment {
  return s.toUpperCase() as Sentiment
}

export function embeddingText(rawText: string, signals: Signals): string {
  const parts = [
    signals.summary,
    signals.workItems.join('; '),
    signals.done.join('; '),
    signals.inProgress.join('; '),
    signals.blockers.map((b) => b.text).join('; '),
  ].filter(Boolean)
  return `${parts.join('\n')}\n${rawText}`.slice(0, 6000)
}

export interface IngestInput {
  userId: string
  teamId: string
  source: UpdateSource
  rawText: string
  slackChannelId?: string
  slackTs?: string
  /** When true, the update this one corrects is superseded. */
  supersedesId?: string
}

export async function ingestUpdate(input: IngestInput): Promise<UpdateView> {
  const team = await prisma.team.findUnique({
    where: { id: input.teamId },
    select: { vocabulary: true },
  })
  const signals = await extractSignals(input.rawText, {
    vocabulary: team?.vocabulary,
    teamId: input.teamId,
    userId: input.userId,
  })

  const update = await prisma.update.create({
    data: {
      userId: input.userId,
      teamId: input.teamId,
      source: input.source,
      rawText: input.rawText.trim(),
      signals,
      sentiment: toSentiment(signals.sentiment),
      summary: signals.summary || null,
      slackChannelId: input.slackChannelId,
      slackTs: input.slackTs,
      supersedesId: input.supersedesId,
    },
    include: updateInclude,
  })

  await afterIngest(update.id, input.teamId, input.userId, input.rawText, signals)

  const fresh = await prisma.update.findUniqueOrThrow({
    where: { id: update.id },
    include: updateInclude,
  })
  return toView(fresh)
}

/** Re-run extraction on an edited update. */
export async function reextractUpdate(updateId: string, rawText: string): Promise<UpdateView> {
  const existing = await prisma.update.findUniqueOrThrow({
    where: { id: updateId },
    select: { teamId: true, userId: true, team: { select: { vocabulary: true } } },
  })
  const signals = await extractSignals(rawText, {
    vocabulary: existing.team.vocabulary,
    teamId: existing.teamId,
    userId: existing.userId,
  })
  await prisma.update.update({
    where: { id: updateId },
    data: {
      rawText: rawText.trim(),
      signals,
      sentiment: toSentiment(signals.sentiment),
      summary: signals.summary || null,
      links: { deleteMany: {} },
    },
  })
  await afterIngest(updateId, existing.teamId, existing.userId, rawText, signals)
  const fresh = await prisma.update.findUniqueOrThrow({
    where: { id: updateId },
    include: updateInclude,
  })
  return toView(fresh)
}

/**
 * Post-ingest enrichment. Embedding now; thread linking arrives in Phase 1
 * and hooks in here so both web and Slack paths get it.
 */
async function afterIngest(
  updateId: string,
  teamId: string,
  userId: string,
  rawText: string,
  signals: Signals,
) {
  try {
    const vec = await embed(embeddingText(rawText, signals), { teamId, userId })
    await setUpdateEmbedding(updateId, vec)
    const { linkUpdateToThreads } = await import('@/lib/threads')
    await linkUpdateToThreads({ updateId, teamId, userId, rawText, signals, embedding: vec })
  } catch (err) {
    // Enrichment failures must not lose the update itself.
    console.error('afterIngest failed for', updateId, err)
  }
}
