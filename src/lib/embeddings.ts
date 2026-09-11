import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { logLlmCall } from '@/lib/llm'

const EMBED_MODEL = 'text-embedding-3-small'
export const EMBED_DIM = 1536

let _openai: OpenAI | null = null
function openai() {
  if (!_openai) _openai = new OpenAI({ timeout: 60_000, maxRetries: 2 })
  return _openai
}

export async function embed(
  text: string,
  ctx: { purpose?: string; teamId?: string | null; userId?: string | null } = {},
): Promise<number[]> {
  const started = Date.now()
  try {
    const res = await openai().embeddings.create({
      model: EMBED_MODEL,
      input: text.slice(0, 8000),
    })
    await logLlmCall(
      { purpose: ctx.purpose ?? 'embed', teamId: ctx.teamId, userId: ctx.userId },
      {
        provider: 'openai',
        model: EMBED_MODEL,
        inputTokens: res.usage.prompt_tokens,
        latencyMs: Date.now() - started,
        ok: true,
      },
    )
    return res.data[0].embedding
  } catch (err) {
    await logLlmCall(
      { purpose: ctx.purpose ?? 'embed', teamId: ctx.teamId, userId: ctx.userId },
      {
        provider: 'openai',
        model: EMBED_MODEL,
        latencyMs: Date.now() - started,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
    )
    throw err
  }
}

export function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`
}

export async function setUpdateEmbedding(updateId: string, v: number[]) {
  await prisma.$executeRaw`UPDATE "Update" SET embedding = ${toVectorLiteral(v)}::vector WHERE id = ${updateId}`
}

export async function setThreadEmbedding(threadId: string, v: number[]) {
  await prisma.$executeRaw`UPDATE "Thread" SET embedding = ${toVectorLiteral(v)}::vector WHERE id = ${threadId}`
}

export interface ThreadMatch {
  id: string
  name: string
  status: string
  summary: string | null
  aliases: string[]
  similarity: number
}

/** Nearest active threads in a team by cosine similarity. */
export async function nearestThreads(
  teamId: string,
  v: number[],
  limit = 8,
): Promise<ThreadMatch[]> {
  const rows = await prisma.$queryRaw<ThreadMatch[]>(Prisma.sql`
    SELECT id, name, status, summary, aliases,
           1 - (embedding <=> ${toVectorLiteral(v)}::vector) AS similarity
    FROM "Thread"
    WHERE "teamId" = ${teamId}
      AND "mergedIntoId" IS NULL
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${toVectorLiteral(v)}::vector
    LIMIT ${limit}
  `)
  return rows
}

export interface UpdateMatch {
  id: string
  userId: string
  teamId: string
  summary: string | null
  rawText: string
  createdAt: Date
  similarity: number
}

/** Nearest updates across a set of teams. */
export async function nearestUpdates(
  teamIds: string[],
  v: number[],
  limit = 20,
): Promise<UpdateMatch[]> {
  if (teamIds.length === 0) return []
  const rows = await prisma.$queryRaw<UpdateMatch[]>(Prisma.sql`
    SELECT id, "userId", "teamId", summary, "rawText", "createdAt",
           1 - (embedding <=> ${toVectorLiteral(v)}::vector) AS similarity
    FROM "Update"
    WHERE "teamId" IN (${Prisma.join(teamIds)})
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${toVectorLiteral(v)}::vector
    LIMIT ${limit}
  `)
  return rows
}
