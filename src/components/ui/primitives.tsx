import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'
import type { Sentiment } from '@prisma/client'

export function Avatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const s = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-[12px]', lg: 'h-11 w-11 text-[15px]' }[size]
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-paper', s, className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  )
}

const sentimentStyle: Record<Sentiment, { dot: string; label: string }> = {
  POSITIVE: { dot: 'bg-ok', label: 'Positive' },
  NEUTRAL: { dot: 'bg-ink-faint', label: 'Neutral' },
  CONCERNED: { dot: 'bg-warn', label: 'Concerned' },
  FRUSTRATED: { dot: 'bg-bad', label: 'Frustrated' },
}

export function SentimentDot({ value, withLabel = false }: { value: Sentiment; withLabel?: boolean }) {
  const s = sentimentStyle[value]
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft" title={s.label}>
      <span className={cn('h-2 w-2 rounded-full', s.dot)} />
      {withLabel && s.label}
    </span>
  )
}

export function Pill({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'pulse'
  children: React.ReactNode
  className?: string
}) {
  const t = {
    neutral: 'bg-paper-2 text-ink-soft',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    info: 'bg-info-soft text-info',
    pulse: 'bg-pulse-soft text-pulse-ink',
  }[tone]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium', t, className)}>
      {children}
    </span>
  )
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('rounded-lg border border-line bg-surface', className)}>{children}</section>
}

export function PanelHeader({ title, aside, className }: { title: React.ReactNode; aside?: React.ReactNode; className?: string }) {
  return (
    <header className={cn('flex items-center justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-soft">{title}</h2>
      {aside}
    </header>
  )
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[13.5px] text-ink-soft">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function PageTitle({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-ink-soft">{subtitle}</p>}
      </div>
      {aside}
    </div>
  )
}
