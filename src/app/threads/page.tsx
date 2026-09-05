'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Search } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { useTeam } from '@/components/TeamProvider'
import { Panel, Empty, Pill, PageTitle } from '@/components/ui/primitives'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ThreadRow {
  id: string
  teamId: string
  teamName: string
  name: string
  description: string | null
  summary: string | null
  aliases: string[]
  status: 'ACTIVE' | 'BLOCKED' | 'DONE' | 'STALE'
  lastActivityAt: string
  updateCount: number
  participants: { id: string; name: string }[]
}

export const statusTone = { ACTIVE: 'info', BLOCKED: 'bad', DONE: 'ok', STALE: 'neutral' } as const
export const statusLabel = { ACTIVE: 'Active', BLOCKED: 'Blocked', DONE: 'Done', STALE: 'Quiet' } as const

export default function ThreadsPage() {
  const { currentTeam, teams } = useTeam()
  const [scope, setScope] = useState<'team' | 'all'>('team')
  const [rows, setRows] = useState<ThreadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'open' | 'all' | 'blocked' | 'done'>('open')

  useEffect(() => {
    if (scope === 'team' && !currentTeam) return
    setLoading(true)
    const url = scope === 'team' ? `/api/threads?teamId=${currentTeam!.id}` : '/api/threads'
    fetch(url).then((r) => r.json()).then((d) => setRows(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [currentTeam, scope])

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((t) => {
      if (filter === 'open' && (t.status === 'DONE')) return false
      if (filter === 'blocked' && t.status !== 'BLOCKED') return false
      if (filter === 'done' && t.status !== 'DONE') return false
      if (!needle) return true
      return [t.name, ...t.aliases, t.summary ?? '', ...t.participants.map((p) => p.name)].join(' ').toLowerCase().includes(needle)
    })
  }, [rows, q, filter])

  const counts = useMemo(() => ({
    blocked: rows.filter((t) => t.status === 'BLOCKED').length,
    active: rows.filter((t) => t.status === 'ACTIVE').length,
    stale: rows.filter((t) => t.status === 'STALE').length,
    done: rows.filter((t) => t.status === 'DONE').length,
  }), [rows])

  return (
    <>
      <TopBar title="Threads" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <PageTitle
          title="What the team is working on"
          subtitle="Every thread is built from people's updates. Rename or merge anything the AI got wrong."
          aside={
            teams.length > 1 ? (
              <div className="flex gap-1 rounded-md border border-line bg-surface p-0.5">
                <button onClick={() => setScope('team')} className={cn('rounded px-2.5 py-1 text-[12.5px] font-medium', scope === 'team' ? 'bg-ink text-paper' : 'text-ink-soft')}>{currentTeam?.name ?? 'Team'}</button>
                <button onClick={() => setScope('all')} className={cn('rounded px-2.5 py-1 text-[12.5px] font-medium', scope === 'all' ? 'bg-ink text-paper' : 'text-ink-soft')}>All my teams</button>
              </div>
            ) : undefined
          }
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search threads, aliases, people" className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-3 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-pulse/20" />
          </div>
          {([
            ['open', `Open ${counts.active + counts.blocked + counts.stale}`],
            ['blocked', `Blocked ${counts.blocked}`],
            ['done', `Done ${counts.done}`],
            ['all', 'All'],
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} className={cn('h-9 rounded-md border px-3 text-[12.5px] font-medium', filter === k ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-soft hover:text-ink')}>{label}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : visible.length === 0 ? (
          <Panel><Empty title="No threads here" body={rows.length === 0 ? 'Threads appear as soon as updates come in.' : 'Nothing matches that filter.'} /></Panel>
        ) : (
          <Panel className="divide-y divide-line">
            {visible.map((t) => (
              <Link key={t.id} href={`/threads/${t.id}`} className="block px-5 py-4 hover:bg-paper-2/60">
                <div className="flex items-start gap-4">
                  <Pill tone={statusTone[t.status]} className="mt-0.5 w-[70px] justify-center">{statusLabel[t.status]}</Pill>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="text-[15px] font-semibold tracking-tight">{t.name}</h3>
                      {scope === 'all' && <span className="text-[12px] text-ink-faint">{t.teamName}</span>}
                    </div>
                    {t.summary && <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-soft">{t.summary}</p>}
                    <p className="mt-1.5 text-[12px] text-ink-faint">
                      {t.participants.map((p) => p.name.split(' ')[0]).join(', ') || 'No one yet'} · {t.updateCount} update{t.updateCount === 1 ? '' : 's'} · {relativeTime(t.lastActivityAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </Panel>
        )}
      </main>
    </>
  )
}
