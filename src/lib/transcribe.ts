import OpenAI, { toFile } from 'openai'
import { logLlmCall } from '@/lib/llm'

let _openai: OpenAI | null = null
function openai() {
  if (!_openai) _openai = new OpenAI()
  return _openai
}

/** Whisper is billed per minute (~$0.006/min). We log it as "seconds" in inputTokens. */
export async function transcribeAudio(
  data: Buffer | Blob,
  filename = 'audio.webm',
  ctx: { teamId?: string | null; userId?: string | null; purpose?: string } = {},
): Promise<string> {
  const started = Date.now()
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(await data.arrayBuffer())
    const file = await toFile(buffer, filename)
    const res = await openai().audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
    })
    const seconds = Math.round((res as { duration?: number }).duration ?? 0)
    await logLlmCall(
      { purpose: ctx.purpose ?? 'transcribe', teamId: ctx.teamId, userId: ctx.userId },
      { provider: 'openai', model: 'whisper-1', inputTokens: seconds, latencyMs: Date.now() - started, ok: true },
    )
    return res.text
  } catch (err) {
    await logLlmCall(
      { purpose: ctx.purpose ?? 'transcribe', teamId: ctx.teamId, userId: ctx.userId },
      { provider: 'openai', model: 'whisper-1', latencyMs: Date.now() - started, ok: false, error: err instanceof Error ? err.message : String(err) },
    )
    throw err
  }
}
