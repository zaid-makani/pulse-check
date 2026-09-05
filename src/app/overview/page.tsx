'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageCircle, UserPlus, X } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { useTeam } from '@/components/TeamProvider'
import { Panel, PanelHeader, PageTitle, Pill, Avatar, Empty } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Row {
  id: string
  name: string
  description: string | null
  memberCount: number
  updatesThisWeek: number
  lastActivity: string | null
  health: 'green' | 'amber' | 'red'
  openThreads: number
  blockedThreads: { id: string; name: string }[]
  staleThreads: number
  quiet: string[]
  frustrated: string[]
  blockedPeople: string[]
  briefing: { id: string; createdAt: string; talkToFirst: string | null } | null
}

interface Org { id: string; name: string; isAdmin: boolean; teams: { id: string; name: string }[]; admins: { id: string; name: string; email: string }[] }

const healthTone = { green: 'ok', amber: 'warn', red: 'bad' } as const
const healthLabel = { green: 'Steady', amber: 'Watch', red: 'Attention' } as const

export default function OverviewPage() {
  const { setCurrentTeam, teams } = useTeam()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [org, setOrg] = useState<Org | null>(null)
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [addId, setAddId] = useState('')

  const load = () => {
    fetch('/api/overview').then((r) => r.json()).then((d) => setRows(Array.isArray(d.teams) ? d.teams : []))
    fetch('/api/org').then((r) => r.json()).then((d) => { if (d.id) setOrg(d) })
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if (org?.isAdmin) fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])) }, [org?.isAdmin])

  async function setAdmin(userId: string, role: 'ADMIN' | 'MEMBER') {
    await fetch('/api/org', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    setAddId('')
    load()
  }

  function openTeam(id: string) {
    const t = teams.find((x) => x.id === id)
    if (t) setCurrentTeam(t)
  }

  const attention = rows?.filter((r) => r.health !== 'green') ?? []

  return (
    <>
      <TopBar title="Overview" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <PageTitle
          title={org ? `${org.name}, every team you can see` : 'Every team you can see'}
          subtitle="Read the whole picture in a minute, then open a team or ask a question across all of them."
          aside={<Link href="/ask"><Button variant="outline" size="sm"><MessageCircle className="h-4 w-4" /> Ask across teams</Button></Link>}
        />

        {rows === null ? (
          <div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <Panel><Empty title="No teams yet" body="Teams you lead, manage, or administer appear here." /></Panel>
        ) : (
          <div className="space-y-6">
            {attention.length > 0 && (
              <p className="text-[13.5px] text-ink-soft">
                {attention.length} of {rows.length} team{rows.length === 1 ? '' : 's'} need{attention.length === 1 ? 's' : ''} a look: {attention.map((r) => r.name).join(', ')}.
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {rows.map((r) => (
                <Panel key={r.id} className={cn('flex flex-col', r.health === 'red' && 'border-bad/40', r.health === 'amber' && 'border-warn/40')}>
                  <div className="flex items-start justify-between gap-3 px-5 pt-4">
                    <div className="min-w-0">
                      <Link href="/home" onClick={() => openTeam(r.id)} className="text-[17px] font-semibold tracking-tight hover:underline">{r.name}</Link>
                      <p className="text-[12.5px] text-ink-faint">{r.memberCount} people · {r.updatesThisWeek} update{r.updatesThisWeek === 1 ? '' : 's'} this week{r.lastActivity ? ` · last ${relativeTime(r.lastActivity)}` : ''}</p>
                    </div>
                    <Pill tone={healthTone[r.health]}>{healthLabel[r.health]}</Pill>
                  </div>
                  <div className="mt-3 space-y-2 px-5 pb-4 text-[13.5px]">
                    {r.briefing?.talkToFirst && (
                      <p className="text-ink"><span className="font-medium">Talk to first:</span> {r.briefing.talkToFirst}</p>
                    )}
                    {r.blockedThreads.length > 0 && (
                      <p><span className="font-medium text-bad">Blocked:</span> {r.blockedThreads.map((t, i) => <span key={t.id}>{i > 0 && ', '}<Link href={`/threads/${t.id}`} className="underline decoration-line-strong underline-offset-2 hover:decoration-ink">{t.name}</Link></span>)}</p>
                    )}
                    {r.frustrated.length > 0 && <p><span className="font-medium text-warn">Sounding fed up:</span> {r.frustrated.join(', ')}</p>}
                    {r.quiet.length > 0 && <p><span className="font-medium text-ink-soft">Quiet 2+ days:</span> {r.quiet.join(', ')}</p>}
                    {r.blockedThreads.length === 0 && r.frustrated.length === 0 && r.quiet.length === 0 && !r.briefing?.talkToFirst && (
                      <p className="text-ink-soft">{r.openThreads} open thread{r.openThreads === 1 ? '' : 's'}{r.staleThreads ? `, ${r.staleThreads} gone quiet` : ''}. Nothing flagged.</p>
                    )}
                  </div>
                  <div className="mt-auto flex items-center gap-3 border-t border-line px-5 py-2.5 text-[12.5px]">
                    <Link href="/home" onClick={() => openTeam(r.id)} className="font-medium text-ink hover:underline">Open team</Link>
                    <Link href="/threads" onClick={() => openTeam(r.id)} className="text-ink-soft hover:text-ink">{r.openThreads} threads</Link>
                    {r.briefing && <Link href={`/reports/${r.briefing.id}`} className="text-ink-soft hover:text-ink">Briefing {relativeTime(r.briefing.createdAt)}</Link>}
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        )}

        {org && (
          <Panel className="mt-8">
            <PanelHeader title="Org-wide view" aside={<span className="text-[12px] text-ink-faint">{org.teams.length} team{org.teams.length === 1 ? '' : 's'} in {org.name}</span>} />
            <p className="border-t border-line px-5 pt-3 text-[13px] text-ink-soft">People listed here see every team in the org, can ask across all of them, and prepare for a 1-on-1 with anyone. Everyone else sees only the teams they are on.</p>
            <ul className="divide-y divide-line px-5 py-2">
              {org.admins.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <Avatar name={a.name} size="sm" />
                  <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{a.name}</span><span className="block text-[12px] text-ink-faint">{a.email}</span></span>
                  {org.isAdmin && org.admins.length > 1 && (
                    <button onClick={() => setAdmin(a.id, 'MEMBER')} className="rounded p-1 text-ink-faint hover:bg-bad-soft hover:text-bad" title="Remove org-wide view"><X className="h-4 w-4" /></button>
                  )}
                </li>
              ))}
            </ul>
            {org.isAdmin && (
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
                <select value={addId} onChange={(e) => setAddId(e.target.value)} className="h-9 min-w-[240px] flex-1 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                  <option value="">Give someone org-wide view…</option>
                  {users.filter((u) => !org.admins.some((a) => a.id === u.id)).map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
                </select>
                <Button size="sm" onClick={() => addId && setAdmin(addId, 'ADMIN')} disabled={!addId}><UserPlus className="h-4 w-4" /> Grant</Button>
              </div>
            )}
          </Panel>
        )}
      </main>
    </>
  )
}
