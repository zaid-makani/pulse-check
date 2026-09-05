import type { Signals } from '@/lib/extract'

/**
 * Thread linking. Phase 1 fills this in. Phase 0 ships a no-op so the
 * ingestion pipeline has its final shape from day one.
 */
export async function linkUpdateToThreads(_input: {
  updateId: string
  teamId: string
  userId: string
  rawText: string
  signals: Signals
  embedding: number[]
}): Promise<void> {
  void _input
}
