'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Loader2, Mic, FileText } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { ReportAction } from '@/components/ReportAction'
import { Panel, PanelHeader, Empty } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { dayLabel, relativeTime } from '@/lib/format'
import type { UpdateView } from '@/lib/updates'

export default function MePage() {
  const { data: session } = useSession()
  const [updates, setUpdates] = useState<UpdateView[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<{ id: string; type: string; title: string; createdAt: string }[]>([])
  const [editing, setEditing] = useState<UpdateView | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const me = session?.user?.id

  useEffect(() => {
    if (!me) return
    fetch(`/api/updates?userId=${me}&days=90`).then((r) => r.json()).then((d) => setUpdates(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
    fetch(`/api/reports?subjectUserId=${me}&limit=10`).then((r) => r.json()).then((d) => setReports(Array.isArray(d) ? d.filter((r: { type: string }) => r.type !== 'ONE_ON_ONE_PREP') : []))
  }, [me])

  const grouped = useMemo(() => {
    const g = new Map<string, UpdateView[]>()
    for (const u of updates) {
      const k = u.createdAt.slice(0, 10)
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(u)
    }
    return [...g.entries()]
  }, [updates])

  async function saveEdit() {
    if (!editing || !draft.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/updates/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rawText: draft.trim() }) })
      const data = await res.json()
      if (res.ok) setUpdates((list) => list.map((u) => (u.id === data.id ? data : u)))
      setEditing(null)
    } finally {
      setBusy(false)
    }
  }

  async function remove(u: UpdateView) {
    if (!confirm('Delete this update? This cannot be undone.')) return
    const res = await fetch(`/api/updates/${u.id}`, { method: 'DELETE' })
    if (res.ok) setUpdates((list) => list.filter((x) => x.id !== u.id))
  }

  return (
    <>
      <TopBar title="Me" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-[28px] font-medium tracking-tight">{session?.user?.name}</h1>
          <p className="text-[14px] text-ink-soft">Everything you have told PulseCheck, across all your teams. Only you and your leads see this page in full.</p>
        </div>

        {me && (
          <Panel className="mb-6">
            <PanelHeader title="Your documents" aside={<span className="text-[12px] text-ink-faint">Written from your own updates</span>} />
            <div className="space-y-2 border-t border-line px-4 py-3">
              <ReportAction type="WEEK_RECAP" label="Your week" subjectUserId={me} compact />
              <ReportAction type="SELF_REVIEW" label="Self-review" subjectUserId={me} withPeriod defaultDays={182} compact />
            </div>
            {reports.length > 0 && (
              <ul className="divide-y divide-line border-t border-line">
                {reports.map((r) => (
                  <li key={r.id}><Link href={`/reports/${r.id}`} className="flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-paper-2"><FileText className="h-3.5 w-3.5 text-ink-faint" /><span className="flex-1">{r.title}</span><span className="text-[12px] text-ink-faint">{relativeTime(r.createdAt)}</span></Link></li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : grouped.length === 0 ? (
          <Panel>
            <Empty title="Your record is empty" body="Capture your first update. It takes thirty seconds." action={<Link href="/capture"><Button><Mic className="h-4 w-4" /> Capture</Button></Link>} />
          </Panel>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, list]) => (
              <section key={day}>
                <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{dayLabel(list[0].createdAt)}</h2>
                <Panel className="divide-y divide-line">
                  {list.map((u) =>
                    editing?.id === u.id ? (
                      <div key={u.id} className="px-5 py-4">
                        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} className="w-full rounded-md border border-line bg-paper px-3 py-2 font-serif text-[15px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-pulse/20" />
                        <div className="mt-2 flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
                          <Button size="sm" onClick={saveEdit} disabled={busy || !draft.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and re-read'}</Button>
                        </div>
                      </div>
                    ) : (
                      <UpdateCard key={u.id} update={u} showAuthor={false} compact onEdit={(x) => { setEditing(x); setDraft(x.rawText) }} onDelete={remove} />
                    ),
                  )}
                </Panel>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
