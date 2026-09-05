'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Loader2, Mic } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { useTeam } from '@/components/TeamProvider'
import { Panel, PanelHeader, Empty, Avatar, SentimentDot, Pill } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { dayLabel, daysSince, relativeTime } from '@/lib/format'
import type { UpdateView } from '@/lib/updates'
import type { Sentiment } from '@prisma/client'

interface Member {
  id: string
  name: string
  email: string
  teamRole: string
  lastUpdate: { createdAt: string; sentiment: Sentiment; summary: string | null } | null
}

interface Flag {
  kind: 'blocked' | 'quiet' | 'frustrated' | 'ask'
  userId: string
  userName: string
  text: string
  at: string
}

export default function HomePage() {
  const { currentTeam, isLoading: teamLoading } = useTeam()
  const [updates, setUpdates] = useState<UpdateView[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentTeam) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch(`/api/updates?teamId=${currentTeam.id}&days=14`).then((r) => r.json()),
      fetch(`/api/users?teamId=${currentTeam.id}`).then((r) => r.json()),
    ])
      .then(([u, m]) => { if (!cancelled) { setUpdates(Array.isArray(u) ? u : []); setMembers(Array.isArray(m) ? m : []) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [currentTeam])

  const flags = useMemo<Flag[]>(() => {
    const out: Flag[] = []
    const latestByUser = new Map<string, UpdateView>()
    for (const u of updates) if (!latestByUser.has(u.userId)) latestByUser.set(u.userId, u)
    for (const u of latestByUser.values()) {
      for (const b of u.signals.blockers) out.push({ kind: 'blocked', userId: u.userId, userName: u.user.name, text: b.waitingOn ? `${b.text} — waiting on ${b.waitingOn}` : b.text, at: u.createdAt })
      if (u.sentiment === 'FRUSTRATED') out.push({ kind: 'frustrated', userId: u.userId, userName: u.user.name, text: u.summary || u.rawText, at: u.createdAt })
      for (const a of u.signals.asks) out.push({ kind: 'ask', userId: u.userId, userName: u.user.name, text: a, at: u.createdAt })
    }
    for (const m of members) {
      if (m.teamRole === 'MANAGER') continue
      const d = m.lastUpdate ? daysSince(m.lastUpdate.createdAt) : null
      if (d === null || d >= 2) out.push({ kind: 'quiet', userId: m.id, userName: m.name, text: d === null ? 'No updates yet' : `Quiet for ${d} days`, at: m.lastUpdate?.createdAt ?? '' })
    }
    const order = { blocked: 0, frustrated: 1, ask: 2, quiet: 3 }
    return out.sort((a, b) => order[a.kind] - order[b.kind])
  }, [updates, members])

  const grouped = useMemo(() => {
    const g = new Map<string, UpdateView[]>()
    for (const u of updates) {
      const k = u.createdAt.slice(0, 10)
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(u)
    }
    return [...g.entries()]
  }, [updates])

  const roster = useMemo(
    () => [...members].sort((a, b) => (a.lastUpdate?.createdAt ?? '').localeCompare(b.lastUpdate?.createdAt ?? '')),
    [members],
  )

  const today = format(new Date(), 'EEEE, d MMMM')

  return (
    <>
      <TopBar title="Today">
        <span className="text-[13px] text-ink-faint">{today}</span>
      </TopBar>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {teamLoading || loading ? (
          <div className="flex items-center gap-2 py-16 justify-center text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> Loading</div>
        ) : !currentTeam ? (
          <Panel><Empty title="No team selected" body="Create or join a team to see its pulse." action={<Link href="/teams/new"><Button>Create a team</Button></Link>} /></Panel>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              <Panel>
                <PanelHeader title="Needs a look" aside={<span className="text-[12px] text-ink-faint">{flags.length === 0 ? 'All clear' : `${flags.length}`}</span>} />
                {flags.length === 0 ? (
                  <p className="px-5 pb-5 text-[13.5px] text-ink-soft">No blockers, no one quiet, nobody sounding fed up. Enjoy it.</p>
                ) : (
                  <ul className="divide-y divide-line border-t border-line">
                    {flags.slice(0, 8).map((f, i) => (
                      <li key={i} className="flex items-start gap-3 px-5 py-3">
                        <Pill tone={f.kind === 'blocked' ? 'bad' : f.kind === 'frustrated' ? 'warn' : f.kind === 'ask' ? 'pulse' : 'neutral'} className="mt-0.5 w-20 justify-center">
                          {f.kind === 'blocked' ? 'Blocked' : f.kind === 'frustrated' ? 'Fed up' : f.kind === 'ask' ? 'Asking' : 'Quiet'}
                        </Pill>
                        <div className="min-w-0 flex-1">
                          <Link href={`/people/${f.userId}`} className="text-[13.5px] font-semibold hover:underline">{f.userName}</Link>
                          <p className="text-[13.5px] text-ink-soft">{f.text}</p>
                        </div>
                        {f.at && <span className="text-[11.5px] text-ink-faint">{relativeTime(f.at)}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              {grouped.length === 0 ? (
                <Panel>
                  <Empty
                    title="Nothing captured yet"
                    body="Once people start talking to PulseCheck, their updates show up here, newest first."
                    action={<Link href="/capture"><Button><Mic className="h-4 w-4" /> Capture the first one</Button></Link>}
                  />
                </Panel>
              ) : (
                grouped.map(([day, list]) => (
                  <section key={day}>
                    <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{dayLabel(list[0].createdAt)}</h2>
                    <Panel className="divide-y divide-line">
                      {list.map((u) => <UpdateCard key={u.id} update={u} compact />)}
                    </Panel>
                  </section>
                ))
              )}
            </div>

            <aside className="space-y-6">
              <Panel>
                <PanelHeader title={currentTeam.name} aside={<span className="text-[12px] text-ink-faint">{members.length} people</span>} />
                <ul className="divide-y divide-line border-t border-line">
                  {roster.map((m) => (
                    <li key={m.id}>
                      <Link href={`/people/${m.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper-2">
                        <Avatar name={m.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium">{m.name}</span>
                          <span className="block text-[11.5px] text-ink-faint">{m.lastUpdate ? relativeTime(m.lastUpdate.createdAt) : 'never'}</span>
                        </span>
                        {m.lastUpdate && <SentimentDot value={m.lastUpdate.sentiment} />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            </aside>
          </div>
        )}
      </main>
    </>
  )
}
