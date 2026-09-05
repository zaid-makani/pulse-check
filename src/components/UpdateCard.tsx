'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Mic, MessageSquare, Slack, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { relativeTime, timeLabel } from '@/lib/format'
import { Avatar, SentimentDot, Pill } from '@/components/ui/primitives'
import type { UpdateView } from '@/lib/updates'

const sourceIcon = {
  WEB_VOICE: Mic,
  WEB_TEXT: MessageSquare,
  SLACK_DM: Slack,
  SLACK_COMMAND: Slack,
  SLACK_MENTION: Slack,
  SLACK_THREAD: Slack,
  SEED: MessageSquare,
} as const

export function UpdateCard({
  update,
  showAuthor = true,
  compact = false,
  showSentiment = true,
  onEdit,
  onDelete,
}: {
  update: UpdateView
  showAuthor?: boolean
  compact?: boolean
  showSentiment?: boolean
  onEdit?: (u: UpdateView) => void
  onDelete?: (u: UpdateView) => void
}) {
  const [open, setOpen] = useState(!compact)
  const s = update.signals
  const Src = sourceIcon[update.source] ?? MessageSquare
  const hasDetail = s.done.length + s.inProgress.length + s.blockers.length + s.asks.length + s.risks.length > 0

  return (
    <article className="group/card px-5 py-4">
      <div className="flex items-start gap-3">
        {showAuthor && (
          <Link href={`/people/${update.userId}`} className="mt-0.5">
            <Avatar name={update.user.name} />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {showAuthor && (
              <Link href={`/people/${update.userId}`} className="text-[13.5px] font-semibold text-ink hover:underline">
                {update.user.name}
              </Link>
            )}
            <span className="text-[12px] text-ink-faint" title={new Date(update.createdAt).toLocaleString()}>
              {relativeTime(update.createdAt)} · {timeLabel(update.createdAt)}
            </span>
            <Src className="h-3 w-3 text-ink-faint" />
            {showSentiment && <SentimentDot value={update.sentiment} />}
            <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
              {onEdit && (
                <button onClick={() => onEdit(update)} className="rounded p-1 text-ink-faint hover:bg-paper-2 hover:text-ink" title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(update)} className="rounded p-1 text-ink-faint hover:bg-bad-soft hover:text-bad" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </span>
          </div>

          <p className="mt-1 text-[14.5px] leading-relaxed text-ink">{update.summary || update.rawText}</p>

          {update.threads.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {update.threads.map((t) => (
                <Link key={t.id} href={`/threads/${t.id}`}>
                  <Pill tone={t.status === 'BLOCKED' ? 'bad' : t.status === 'DONE' ? 'ok' : 'neutral'}>
                    {t.name}
                  </Pill>
                </Link>
              ))}
            </div>
          )}

          {s.blockers.length > 0 && !open && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {s.blockers.map((b, i) => (
                <Pill key={i} tone="bad">Blocked{b.waitingOn ? ` on ${b.waitingOn}` : ''}</Pill>
              ))}
            </div>
          )}

          {hasDetail && (
            <button
              onClick={() => setOpen(!open)}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-ink-soft hover:text-ink"
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              {open ? 'Hide detail' : 'Detail'}
            </button>
          )}

          {open && (
            <div className="mt-3 grid gap-3 rounded-md border border-line bg-paper px-4 py-3 text-[13.5px] sm:grid-cols-2">
              <SignalList title="Done" tone="ok" items={s.done} />
              <SignalList title="In progress" tone="info" items={s.inProgress} />
              <SignalList
                title="Blocked"
                tone="bad"
                items={s.blockers.map((b) => (b.waitingOn ? `${b.text} (waiting on ${b.waitingOn})` : b.text))}
              />
              <SignalList title="Asks" tone="pulse" items={s.asks} />
              <SignalList title="Risks" tone="warn" items={s.risks} />
              <details className="sm:col-span-2">
                <summary className="cursor-pointer text-[12px] font-medium text-ink-faint hover:text-ink-soft">Original text</summary>
                <p className="mt-1 whitespace-pre-wrap font-serif text-[14.5px] italic leading-relaxed text-ink-soft">{update.rawText}</p>
              </details>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function SignalList({ title, tone, items }: { title: string; tone: 'ok' | 'info' | 'bad' | 'pulse' | 'warn'; items: string[] }) {
  if (items.length === 0) return null
  const color = { ok: 'text-ok', info: 'text-info', bad: 'text-bad', pulse: 'text-pulse-ink', warn: 'text-warn' }[tone]
  return (
    <div>
      <p className={cn('text-[11px] font-semibold uppercase tracking-wide', color)}>{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((it, i) => (
          <li key={i} className="text-ink">{it}</li>
        ))}
      </ul>
    </div>
  )
}
