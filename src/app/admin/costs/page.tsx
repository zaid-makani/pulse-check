'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Panel, PanelHeader, PageTitle } from '@/components/ui/primitives'
import { usd } from '@/lib/format'

interface Costs {
  days: number
  totalUsd: number
  calls: number
  keyHint: string
  keyOwner: string
  byDay: { day: string; costUsd: number }[]
  byPurpose: { purpose: string; calls: number; costUsd: number; failed: number }[]
  byModel: { model: string; calls: number; costUsd: number; inputTokens: number; outputTokens: number }[]
  byTeam: { teamId: string; teamName: string; costUsd: number }[]
  recent: { purpose: string; model: string; costUsd: number; latencyMs: number; ok: boolean; createdAt: string; inputTokens: number; outputTokens: number }[]
}

export default function CostsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Costs | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    setData(null)
    fetch(`/api/admin/costs?days=${days}`).then(async (r) => {
      if (r.status === 403) { setDenied(true); return }
      const d = await r.json()
      if (Array.isArray(d.byDay)) setData(d)
    })
  }, [days])

  const max = data ? Math.max(0.0001, ...data.byDay.map((d) => d.costUsd)) : 1

  return (
    <>
      <TopBar title="AI spend" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <PageTitle
          title="What the model is costing"
          subtitle="Every call PulseCheck makes, priced at list rates. When this runs on the org key, this page is the bill."
          aside={
            <div className="flex gap-1 rounded-md border border-line bg-surface p-0.5">
              {[7, 30, 90].map((d) => (
                <button key={d} onClick={() => setDays(d)} className={`rounded px-2.5 py-1 text-[12.5px] font-medium ${days === d ? 'bg-ink text-paper' : 'text-ink-soft hover:text-ink'}`}>{d}d</button>
              ))}
            </div>
          }
        />
        {denied ? (
          <Panel className="px-5 py-6 text-[13.5px] text-ink-soft">This page is for leads and managers.</Panel>
        ) : !data ? (
          <div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Stat label={`Total, last ${data.days} days`} value={usd(data.totalUsd)} />
              <Stat label="Model calls" value={data.calls.toLocaleString()} />
              <Stat label="API key in use" value={data.keyHint} sub={`owner: ${data.keyOwner}`} mono />
            </div>

            <Panel>
              <PanelHeader title="By day" />
              <div className="flex h-28 items-end gap-[3px] px-5 pb-4">
                {data.byDay.length === 0 && <p className="text-[13px] text-ink-faint">No calls yet.</p>}
                {data.byDay.map((d) => (
                  <div key={d.day} className="group relative max-w-6 flex-1" title={`${d.day}: ${usd(d.costUsd)}`}>
                    <div className="w-full rounded-t bg-ink/80 transition-colors group-hover:bg-pulse" style={{ height: `${Math.max(2, (d.costUsd / max) * 96)}px` }} />
                  </div>
                ))}
              </div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
              <Table title="By purpose" rows={data.byPurpose.map((p) => [p.purpose, String(p.calls), p.failed ? `${p.failed} failed` : '', usd(p.costUsd)])} head={['Purpose', 'Calls', '', 'Cost']} />
              <Table title="By model" rows={data.byModel.map((m) => [m.model, String(m.calls), `${(m.inputTokens / 1000).toFixed(1)}k in / ${(m.outputTokens / 1000).toFixed(1)}k out`, usd(m.costUsd)])} head={['Model', 'Calls', 'Tokens', 'Cost']} />
              <Table title="By team" rows={data.byTeam.map((t) => [t.teamName, '', '', usd(t.costUsd)])} head={['Team', '', '', 'Cost']} />
              <Table
                title="Recent calls"
                head={['Purpose', 'Model', 'Latency', 'Cost']}
                rows={data.recent.slice(0, 15).map((c) => [c.ok ? c.purpose : `${c.purpose} (failed)`, c.model.replace('claude-', ''), `${(c.latencyMs / 1000).toFixed(1)}s`, usd(c.costUsd)])}
              />
            </div>
          </div>
        )}
      </main>
    </>
  )
}

function Stat({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <Panel className="px-5 py-4">
      <p className="text-[12px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className={`mt-1 text-[24px] font-medium tracking-tight ${mono ? 'font-mono text-[16px]' : ''}`}>{value}</p>
      {sub && <p className="text-[12px] text-ink-faint">{sub}</p>}
    </Panel>
  )
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <Panel>
      <PanelHeader title={title} />
      <table className="w-full border-t border-line text-[13px]">
        <thead>
          <tr className="text-left text-[11.5px] uppercase tracking-wide text-ink-faint">
            {head.map((h, i) => <th key={i} className={`px-5 py-2 font-medium ${i === head.length - 1 ? 'text-right' : ''}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 && <tr><td colSpan={head.length} className="px-5 py-4 text-ink-faint">Nothing yet.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => <td key={j} className={`px-5 py-2 ${j === r.length - 1 ? 'text-right font-mono tabular-nums' : j > 0 ? 'text-ink-soft' : ''}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}
