'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, RefreshCw, GitMerge, Pencil, Check, X } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { Panel, PanelHeader, Pill, Avatar } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/format'
import type { UpdateView } from '@/lib/updates'
import { statusTone, statusLabel, type ThreadRow } from '../page'

interface ThreadDetail extends Omit<ThreadRow, 'updateCount'> {
  createdAt: string
  createdByAi: boolean
  rawStatus: 'ACTIVE' | 'BLOCKED' | 'DONE'
  mergedInto: { id: string; name: string } | null
  mergedFrom: { id: string; name: string }[]
  updates: (UpdateView & { linkConfidence: number; excerpt: string | null })[]
}

export default function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [t, setT] = useState<ThreadDetail | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [merging, setMerging] = useState(false)
  const [candidates, setCandidates] = useState<ThreadRow[]>([])
  const [mergeTarget, setMergeTarget] = useState('')

  const load = useCallback(() => fetch(`/api/threads/${id}`).then((r) => r.json()).then((d) => { if (!d.error) { setT(d); setName(d.name) } }), [id])
  useEffect(() => { load() }, [load])

  async function patch(body: Record<string, unknown>, key: string) {
    setBusy(key)
    await fetch(`/api/threads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    await load()
    setBusy(null)
  }

  async function openMerge() {
    if (!t) return
    setMerging(true)
    const rows: ThreadRow[] = await fetch(`/api/threads?teamId=${t.teamId}`).then((r) => r.json())
    setCandidates(rows.filter((r) => r.id !== id))
  }

  async function doMerge() {
    if (!mergeTarget) return
    setBusy('merge')
    await fetch(`/api/threads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mergeIntoId: mergeTarget }) })
    router.push(`/threads/${mergeTarget}`)
  }

  if (!t) return <><TopBar title="Thread" /><div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div></>

  return (
    <>
      <TopBar title={t.name}>
        <span className="text-[12px] text-ink-faint">{t.teamName}</span>
      </TopBar>
      <main className="mx-auto max-w-5xl px-6 py-8">
        {t.mergedInto && (
          <p className="mb-4 rounded-md bg-warn-soft px-4 py-2 text-[13px] text-warn">
            This thread was merged into <Link className="underline" href={`/threads/${t.mergedInto.id}`}>{t.mergedInto.name}</Link>.
          </p>
        )}

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-10 flex-1 rounded-md border border-line bg-surface px-3 font-serif text-[22px] focus:outline-none focus:ring-2 focus:ring-pulse/20" autoFocus />
                <Button size="icon-sm" onClick={() => { patch({ name }, 'name'); setEditing(false) }}><Check className="h-4 w-4" /></Button>
                <Button size="icon-sm" variant="ghost" onClick={() => { setEditing(false); setName(t.name) }}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <h1 className="group flex items-center gap-2 font-serif text-[30px] font-medium leading-tight tracking-tight">
                {t.name}
                <button onClick={() => setEditing(true)} className="rounded p-1 text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover:opacity-100" title="Rename"><Pencil className="h-4 w-4" /></button>
              </h1>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-faint">
              <Pill tone={statusTone[t.status]}>{statusLabel[t.status]}</Pill>
              <span>Last activity {relativeTime(t.lastActivityAt)}</span>
              {t.aliases.length > 0 && <span>· also called {t.aliases.join(', ')}</span>}
              {t.createdByAi && <span>· created by AI</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-ink-faint">Status
            <select value={t.rawStatus} onChange={(e) => patch({ status: e.target.value }, 'status')} className="h-8 rounded-md border border-line bg-surface px-2 text-[12.5px] text-ink" title="Set by AI from the latest updates; override it here">
              <option value="ACTIVE">Active</option><option value="BLOCKED">Blocked</option><option value="DONE">Done</option>
            </select>
            </label>
            <Button variant="outline" size="sm" onClick={() => patch({ refresh: true }, 'refresh')} disabled={busy === 'refresh'} title="Rewrite the summary from the latest updates">
              {busy === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-summarize
            </Button>
            <Button variant="outline" size="sm" onClick={openMerge}><GitMerge className="h-4 w-4" /> Merge into…</Button>
          </div>
        </div>

        {merging && (
          <Panel className="mb-6 px-5 py-4">
            <p className="text-[13.5px] font-medium">Merge this thread into another. Its updates move over and this one closes.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)} className="h-9 min-w-[280px] flex-1 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                <option value="">Choose a thread…</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.name} ({statusLabel[c.status].toLowerCase()})</option>)}
              </select>
              <Button size="sm" onClick={doMerge} disabled={!mergeTarget || busy === 'merge'}>{busy === 'merge' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Merge'}</Button>
              <Button size="sm" variant="ghost" onClick={() => setMerging(false)}>Cancel</Button>
            </div>
          </Panel>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <Panel className="px-5 py-4">
              <p className="font-serif text-[17px] leading-relaxed text-ink">{t.summary ?? t.description ?? 'No summary yet. It appears after the first update links here.'}</p>
            </Panel>
            <section>
              <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Timeline · {t.updates.length} update{t.updates.length === 1 ? '' : 's'}</h2>
              <Panel className="divide-y divide-line">
                {t.updates.length === 0 && <p className="px-5 py-6 text-[13.5px] text-ink-faint">No updates linked yet.</p>}
                {t.updates.map((u) => <UpdateCard key={u.id} update={u} compact />)}
              </Panel>
            </section>
          </div>
          <aside>
            <Panel>
              <PanelHeader title="People" />
              <ul className="divide-y divide-line border-t border-line">
                {t.participants.map((p) => (
                  <li key={p.id}><Link href={`/people/${p.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper-2"><Avatar name={p.name} size="sm" /><span className="text-[13.5px] font-medium">{p.name}</span></Link></li>
                ))}
                {t.participants.length === 0 && <li className="px-5 py-3 text-[13px] text-ink-faint">No one yet</li>}
              </ul>
              {t.mergedFrom.length > 0 && (
                <div className="border-t border-line px-5 py-3 text-[12.5px] text-ink-faint">Absorbed: {t.mergedFrom.map((m) => m.name).join(', ')}</div>
              )}
            </Panel>
          </aside>
        </div>
      </main>
    </>
  )
}
