import 'dotenv/config'
import { prisma } from '../src/lib/db'
import { embed, setThreadEmbedding, setUpdateEmbedding } from '../src/lib/embeddings'
import { embeddingText } from '../src/lib/updates'
import { readSignals } from '../src/lib/extract'
import { linkUpdateToThreads, refreshThread } from '../src/lib/threads'

/**
 * Fills in what the seed cannot: embeddings for threads and updates, and
 * (optionally) AI links for updates that have none.
 *
 *   npm run db:backfill            embeddings only
 *   npm run db:backfill -- --link  also link unlinked updates
 *   npm run db:backfill -- --refresh  also regenerate every thread summary
 */
async function main() {
  const args = new Set(process.argv.slice(2))

  const threads = await prisma.$queryRaw<{ id: string; name: string; summary: string | null; aliases: string[] }[]>`
    SELECT id, name, summary, aliases FROM "Thread" WHERE embedding IS NULL`
  for (const t of threads) {
    const v = await embed(`${t.name}\n${t.aliases.join(', ')}\n${t.summary ?? ''}`, { purpose: 'backfill:embed' })
    await setThreadEmbedding(t.id, v)
  }
  console.log(`Embedded ${threads.length} threads`)

  const updates = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Update" WHERE embedding IS NULL`
  for (const { id } of updates) {
    const u = await prisma.update.findUniqueOrThrow({ where: { id } })
    const v = await embed(embeddingText(u.rawText, readSignals(u.signals)), { purpose: 'backfill:embed', teamId: u.teamId, userId: u.userId })
    await setUpdateEmbedding(id, v)
  }
  console.log(`Embedded ${updates.length} updates`)

  if (args.has('--link')) {
    const unlinked = await prisma.update.findMany({ where: { links: { none: {} } }, orderBy: { createdAt: 'asc' } })
    for (const u of unlinked) {
      const row = await prisma.$queryRaw<{ e: string }[]>`SELECT embedding::text AS e FROM "Update" WHERE id = ${u.id}`
      const vec = JSON.parse(row[0].e) as number[]
      await linkUpdateToThreads({ updateId: u.id, teamId: u.teamId, userId: u.userId, rawText: u.rawText, signals: readSignals(u.signals), embedding: vec })
      console.log(`linked ${u.id}`)
    }
    console.log(`Linked ${unlinked.length} updates`)
  }

  if (args.has('--refresh')) {
    const all = await prisma.thread.findMany({ where: { mergedIntoId: null }, select: { id: true, name: true } })
    for (const t of all) {
      await refreshThread(t.id)
      console.log(`refreshed ${t.name}`)
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
