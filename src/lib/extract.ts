import { z } from 'zod'
import { structured } from '@/lib/llm'

/**
 * Turns one raw update (voice transcript, Slack reply, typed text) into
 * Signals. The raw text is always kept alongside; this is derived data.
 */

export const BlockerSchema = z.object({
  text: z.string().describe('The blocker in the person\'s own words, lightly cleaned'),
  waitingOn: z
    .string()
    .nullable()
    .describe('Who or what they are waiting on: a person, a team, a vendor, a system. Null if unclear'),
  external: z
    .boolean()
    .describe('True when the blocker is owned by another team or an outside party'),
})

export const SignalsSchema = z.object({
  done: z.array(z.string()).describe('Things finished or shipped, one per item'),
  inProgress: z.array(z.string()).describe('Things actively being worked on, one per item'),
  blockers: z.array(BlockerSchema),
  asks: z.array(z.string()).describe('Explicit requests for help, decisions, or reviews'),
  risks: z.array(z.string()).describe('Concerns about timeline, scope, quality, or dependencies that are not yet blockers'),
  mentions: z.object({
    people: z.array(z.string()).describe('Names of people mentioned'),
    teams: z.array(z.string()).describe('Names of teams, groups, or vendors mentioned'),
    tickets: z.array(z.string()).describe('Ticket or PR identifiers mentioned, e.g. PAY-123, #456'),
  }),
  sentiment: z.enum(['positive', 'neutral', 'concerned', 'frustrated']),
  summary: z.string().describe('One sentence in past tense that starts with a verb and has no subject, e.g. "Shipped the refund API and started on reconciliation; blocked on bank credentials." Name the concrete work. No filler'),
  workItems: z
    .array(z.string())
    .describe(
      'Short names (2 to 6 words) for each distinct piece of work this update touches, as a colleague would refer to it. Used to link the update to ongoing work threads',
    ),
})

export type Signals = z.infer<typeof SignalsSchema>
export type Blocker = z.infer<typeof BlockerSchema>

export const EMPTY_SIGNALS: Signals = {
  done: [],
  inProgress: [],
  blockers: [],
  asks: [],
  risks: [],
  mentions: { people: [], teams: [], tickets: [] },
  sentiment: 'neutral',
  summary: '',
  workItems: [],
}

const VOCABULARY: Record<string, string> = {
  engineering: `The team builds software. Work items are features, integrations, bug fixes, migrations, incidents, releases, reviews, and infrastructure tasks. Tickets look like ABC-123 or PR numbers.`,
  sales: `The team sells and manages client relationships. Work items are deals, accounts, renewals, proposals, demos, and client conversations. Blockers are usually waiting on a client, legal, pricing approval, or another internal team.`,
  marketing: `The team runs campaigns and content. Work items are campaigns, launches, content pieces, events, and analytics work. Blockers are usually waiting on design, approvals, vendors, or data.`,
  general: `The team does knowledge work. Work items are projects, deliverables, and decisions.`,
}

function systemPrompt(vocabulary: string) {
  const domain = VOCABULARY[vocabulary] ?? VOCABULARY.general
  return `You extract structure from short work updates that people give by voice or chat. The text may be a transcript with disfluencies, missing punctuation, or mixed English and Hindi words. Do not invent work that is not mentioned. Keep items short and concrete. Preserve product names, ticket IDs, and people's names exactly.

Domain: ${domain}

Sentiment guide:
- positive: things going well, momentum, pride
- neutral: plain status
- concerned: worried about a timeline, a dependency, or a risk, but still moving
- frustrated: stuck, repeated blockers, annoyance, or exhaustion. Prefer this whenever the person sounds fed up, even mildly.`
}

export async function extractSignals(
  rawText: string,
  opts: { vocabulary?: string; teamId?: string | null; userId?: string | null },
): Promise<Signals> {
  const text = rawText.trim()
  if (!text) return EMPTY_SIGNALS
  return structured(
    { purpose: 'extract', teamId: opts.teamId, userId: opts.userId },
    {
      system: systemPrompt(opts.vocabulary ?? 'engineering'),
      prompt: `Update:\n"""\n${text}\n"""`,
      schema: SignalsSchema,
      effort: 'low',
    },
  )
}

/** Safe parse of the JSON column into Signals with defaults. */
export function readSignals(value: unknown): Signals {
  const r = SignalsSchema.safeParse(value)
  return r.success ? r.data : { ...EMPTY_SIGNALS }
}
