'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
 * "Generate <report>" with an optional period picker. Navigates to the report when done.
 */
export function ReportButton({
  type,
  label,
  teamId,
  subjectUserId,
  defaultDays,
  withPeriod = false,
  variant = 'outline',
}: {
  type: 'DAILY_BRIEFING' | 'STANDUP_BRIEF' | 'ONE_ON_ONE_PREP' | 'SELF_REVIEW' | 'WEEK_RECAP' | 'QUARTER_DELIVERY'
  label: string
  teamId?: string
  subjectUserId?: string
  defaultDays?: number
  withPeriod?: boolean
  variant?: 'outline' | 'default' | 'ghost'
}) {
  const router = useRouter()
  const [days, setDays] = useState(defaultDays ?? 14)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function go() {
    setBusy(true)
    setError('')
    const periodEnd = new Date()
    const periodStart = new Date(Date.now() - days * 86_400_000)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, teamId, subjectUserId, ...(withPeriod ? { periodStart: periodStart.toISOString(), periodEnd: periodEnd.toISOString() } : {}) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Could not generate')
      router.push(`/reports/${d.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate')
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {withPeriod && (
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} disabled={busy} className="h-8 rounded-md border border-line bg-surface px-2 text-[12.5px]">
          {periodOptions.map((p) => <option key={p.days} value={p.days}>{p.label}</option>)}
        </select>
      )}
      <Button variant={variant} size="sm" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} {busy ? 'Writing…' : label}
      </Button>
      {error && <span className="text-[12px] text-bad">{error}</span>}
    </span>
  )
}
