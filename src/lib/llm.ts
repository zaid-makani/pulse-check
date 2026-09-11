import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import type { z } from 'zod'
import { prisma } from '@/lib/db'

/**
 * Single entry point for every model call in PulseCheck.
 *
 * Every call is logged to LlmCall with token counts and an estimated cost so
 * that the admin cost page can show exactly what the org key is paying for.
 */

// 90s per attempt keeps a stalled call from wedging the Slack bot; the SDK retries twice on transient errors.
export const anthropic = new Anthropic({ timeout: 90_000, maxRetries: 2 })

// Two tiers. "fast" handles per-update work (extraction, thread linking,
// rolling summaries). "smart" handles anything a human reads directly
// (chat answers, generated reports). Both are overridable by env so the
// pilot can be re-tuned without a deploy.
export const MODELS = {
  fast: process.env.PULSE_FAST_MODEL ?? 'claude-sonnet-5',
  smart: process.env.PULSE_SMART_MODEL ?? 'claude-opus-5',
} as const

// USD per 1M tokens. Cache read is ~10% of input, cache write ~125%.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
}

export function estimateCostUsd(
  model: string,
  usage: { input: number; output: number; cacheRead?: number; cacheWrite?: number },
): number {
  const p = PRICING[model] ?? { input: 5, output: 25 }
  const perTok = 1 / 1_000_000
  return (
    usage.input * p.input * perTok +
    usage.output * p.output * perTok +
    (usage.cacheRead ?? 0) * p.input * 0.1 * perTok +
    (usage.cacheWrite ?? 0) * p.input * 1.25 * perTok
  )
}

export interface CallContext {
  purpose: string
  teamId?: string | null
  userId?: string | null
}

export async function logLlmCall(
  ctx: CallContext,
  data: {
    provider?: string
    model: string
    inputTokens?: number
    outputTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    latencyMs: number
    ok: boolean
    error?: string
  },
) {
  const costUsd = estimateCostUsd(data.model, {
    input: data.inputTokens ?? 0,
    output: data.outputTokens ?? 0,
    cacheRead: data.cacheReadTokens,
    cacheWrite: data.cacheWriteTokens,
  })
  try {
    await prisma.llmCall.create({
      data: {
        purpose: ctx.purpose,
        provider: data.provider ?? 'anthropic',
        model: data.model,
        inputTokens: data.inputTokens ?? 0,
        outputTokens: data.outputTokens ?? 0,
        cacheReadTokens: data.cacheReadTokens ?? 0,
        cacheWriteTokens: data.cacheWriteTokens ?? 0,
        latencyMs: data.latencyMs,
        costUsd,
        ok: data.ok,
        error: data.error?.slice(0, 500),
        teamId: ctx.teamId ?? undefined,
        userId: ctx.userId ?? undefined,
      },
    })
  } catch (err) {
    // Logging must never break the product path.
    console.error('LlmCall log failed', err)
  }
}

function usageOf(msg: Anthropic.Message) {
  return {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
  }
}

/**
 * Structured call: returns a parsed object matching the Zod schema.
 * Uses the API's native structured outputs so the JSON is guaranteed valid.
 */
export async function structured<T extends z.ZodType>(
  ctx: CallContext,
  params: {
    model?: string
    system?: string
    prompt: string
    schema: T
    effort?: 'low' | 'medium' | 'high'
    maxTokens?: number
  },
): Promise<z.infer<T>> {
  const model = params.model ?? MODELS.fast
  const started = Date.now()
  try {
    const res = await anthropic.messages.parse({
      model,
      max_tokens: params.maxTokens ?? 4096,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
      output_config: {
        format: zodOutputFormat(params.schema),
        effort: params.effort ?? 'low',
      },
    })
    await logLlmCall(ctx, { model, latencyMs: Date.now() - started, ok: true, ...usageOf(res) })
    if (!res.parsed_output) {
      throw new Error(`Structured output missing (stop_reason=${res.stop_reason})`)
    }
    return res.parsed_output as z.infer<T>
  } catch (err) {
    await logLlmCall(ctx, {
      model,
      latencyMs: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

/**
 * Plain text call (non-streaming). For reports and summaries.
 */
export async function text(
  ctx: CallContext,
  params: {
    model?: string
    system?: string
    messages: Anthropic.MessageParam[]
    effort?: 'low' | 'medium' | 'high'
    maxTokens?: number
  },
): Promise<string> {
  const model = params.model ?? MODELS.smart
  const started = Date.now()
  try {
    const res = await anthropic.messages.create({
      model,
      max_tokens: params.maxTokens ?? 8000,
      system: params.system,
      messages: params.messages,
      output_config: { effort: params.effort ?? 'medium' },
    })
    await logLlmCall(ctx, { model, latencyMs: Date.now() - started, ok: true, ...usageOf(res) })
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  } catch (err) {
    await logLlmCall(ctx, {
      model,
      latencyMs: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
