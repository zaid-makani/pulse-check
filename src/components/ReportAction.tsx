'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/format'

type ReportType = 'DAILY_BRIEFING' | 'STANDUP_BRIEF' | 'ONE_ON_ONE_PREP' | 'SELF_REVIEW' | 'WEEK_RECAP' | 'QUARTER_DELIVERY'

const periodOptions = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '3 weeks', days: 21 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 91 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
]

/**
 * One report type for one subject. Shows the latest existing copy as a link
 * and makes writing a new one an explicit, separate action, so a click never
 * silently replaces a document with a different one.
 */
export function ReportAction({
  type,
  label,
  teamId,
  subjectUserId,
  withPeriod = false,
  defaultDays = 14,
  compact = false,
}: {
  type: ReportType
  label: string
  teamId?: string
  subjectUserId?: string
  withPeriod?: boolean
  defaultDays?: number
  compact?: boolean
}) {
  const router = useRouter()
  const [latest, setLatest] = useState<{ id: string; createdAt: string } | null | undefined>(undefined)
  const [days, setDays] = useState(defaultDays)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = new URLSearchParams({ type, limit: '1' })
    if (teamId) q.set('teamId', teamId)
    if (subjectUserId) q.set('subjectUserId', subjectUserId)
    fetch(`/api/reports?${q}`).then((r) => r.json()).then((rows) => setLatest(Array.isArray(rows) && rows[0] ? rows[0] : null)).catch(() => setLatest(null))
  }, [type, teamId, subjectUserId])

  async function writeNew() {
    setBusy(true)
    setError('')
    try {
      const body: Record<string, unknown> = { type, teamId, subjectUserId, force: true }
      if (withPeriod) {
        body.periodEnd = new Date().toISOString()
        body.periodStart = new Date(Date.now() - days * 86_400_000).toISOString()
      }
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not write it')
      router.push(`/reports/${d.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not write it')
      setBusy(false)
    }
  }

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface px-3 py-2'}>
      <FileText className="h-4 w-4 text-ink-faint" />
      <span className="text-[13px] font-medium">{label}</span>
      {latest === undefined ? (
        <span className="text-[12px] text-ink-faint">…</span>
      ) : latest ? (
        <Link href={`/reports/${latest.id}`} className="text-[12.5px] text-pulse-ink underline decoration-pulse/40 underline-offset-2 hover:decoration-pulse">
          Open latest · {relativeTime(latest.createdAt)}
        </Link>
      ) : (
        <span className="text-[12px] text-ink-faint">none yet</span>
      )}
      <span className="ml-auto flex items-center gap-1.5">
        {withPeriod && (
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={busy} className="h-7 rounded-md border border-line bg-surface px-1.5 text-[12px]">
            {periodOptions.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
          </select>
        )}
        <Button variant="ghost" size="xs" onClick={writeNew} disabled={busy} title="Write a fresh one from the latest updates">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} {busy ? 'Writing…' : latest ? 'Write new' : 'Write'}
        </Button>
      </span>
      {error && <span className="basis-full text-[12px] text-bad">{error}</span>}
    </div>
  )
}
