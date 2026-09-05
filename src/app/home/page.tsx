'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import { Loader2, Mic, RefreshCw, Sparkles, Check, GitBranch } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { ReportAction } from '@/components/ReportAction'
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

interface Briefing { id: string; title: string; content: string; createdAt: string }

interface ThreadRow { id: string; name: string; status: 'ACTIVE' | 'BLOCKED' | 'DONE' | 'STALE'; summary: string | null; lastActivityAt: string }

const FEED_DAYS = 5

export default function HomePage() {
  const { currentTeam, me, managesCurrent, isLoading: teamLoading } = useTeam()
  const [updates, setUpdates] = useState<UpdateView[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [now] = useState(() => Date.now())
  const loading = !!currentTeam && loadedFor !== currentTeam.id

  useEffect(() => {
    if (!currentTeam) return
    let cancelled = false
    Promise.all([
      fetch(`/api/updates?teamId=${currentTeam.id}&days=14`).then((r) => r.json()),
      fetch(`/api/users?teamId=${currentTeam.id}`).then((r) => r.json()),
    ]).then(([u, m]) => {
      if (cancelled) return
      setUpdates(Array.isArray(u) ? u : [])
      setMembers(Array.isArray(m) ? m : [])
      setLoadedFor(currentTeam.id)
    })
    return () => { cancelled = true }
  }, [currentTeam])

  const feed = useMemo(() => {
    const cutoff = now - FEED_DAYS * 86_400_000
    const g = new Map<string, UpdateView[]>()
    for (const u of updates) {
      if (new Date(u.createdAt).getTime() < cutoff) continue
      const k = u.createdAt.slice(0, 10)
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(u)
    }
    return [...g.entries()]
  }, [updates, now])

  const today = format(new Date(), 'EEEE, d MMMM')

  return (
    <>
      <TopBar title="Today">
        <span className="text-[13px] text-ink-faint">{today}</span>
      </TopBar>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {teamLoading || loading || !me ? (
          <div className="flex items-center justify-center gap-2 py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /> Loading</div>
        ) : !currentTeam ? (
          <Panel><Empty title="No team yet" body="Create or join a team to see its pulse." action={<Link href="/teams/new"><Button>Create a team</Button></Link>} /></Panel>
        ) : managesCurrent ? (
          <ManagerToday teamId={currentTeam.id} teamName={currentTeam.name} meId={me.id} updates={updates} members={members} feed={feed} />
        ) : (
          <MemberToday teamId={currentTeam.id} teamName={currentTeam.name} meId={me.id} updates={updates} members={members} feed={feed} />
        )}
      </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// Lead / manager / org admin
// ---------------------------------------------------------------------------

function ManagerToday({ teamId, teamName, meId, updates, members, feed }: { teamId: string; teamName: string; meId: string; updates: UpdateView[]; members: Member[]; feed: [string, UpdateView[]][] }) {
  const [briefing, setBriefing] = useState<Briefing | null | undefined>(undefined)
  const [writing, setWriting] = useState(false)
  const autoRan = useRef(false)

  async function write(force: boolean) {
    setWriting(true)
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'DAILY_BRIEFING', teamId, force }) })
      const d = await res.json()
      if (res.ok) setBriefing(d)
    } finally {
      setWriting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setBriefing(undefined)
    autoRan.current = false
    fetch(`/api/reports?type=DAILY_BRIEFING&teamId=${teamId}&limit=1`)
      .then((r) => r.json())
      .then(async (rows) => {
        if (cancelled) return
        const row = Array.isArray(rows) ? rows[0] : null
        const fresh = row && Date.now() - new Date(row.createdAt).getTime() < 20 * 3_600_000
        if (fresh) {
          const full = await fetch(`/api/reports/${row.id}`).then((r) => r.json())
          if (!cancelled) setBriefing(full.error ? null : full)
        } else if (updates.length > 0 && !autoRan.current) {
          autoRan.current = true
          setBriefing(null)
          await write(false)
        } else {
          setBriefing(null)
        }
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId])

  const newSince = useMemo(() => {
    if (!briefing) return 0
    const t = new Date(briefing.createdAt).getTime()
    return updates.filter((u) => new Date(u.createdAt).getTime() > t && u.userId !== meId).length
  }, [briefing, updates, meId])

  const flags = useMemo<Flag[]>(() => {
    const out: Flag[] = []
    const latestByUser = new Map<string, UpdateView>()
    for (const u of updates) if (u.userId !== meId && !latestByUser.has(u.userId)) latestByUser.set(u.userId, u)
    for (const u of latestByUser.values()) {
      for (const b of u.signals.blockers) out.push({ kind: 'blocked', userId: u.userId, userName: u.user.name, text: b.waitingOn ? `${b.text} — waiting on ${b.waitingOn}` : b.text, at: u.createdAt })
      if (u.sentiment === 'FRUSTRATED') out.push({ kind: 'frustrated', userId: u.userId, userName: u.user.name, text: u.summary || u.rawText, at: u.createdAt })
      for (const a of u.signals.asks) out.push({ kind: 'ask', userId: u.userId, userName: u.user.name, text: a, at: u.createdAt })
    }
    for (const m of members) {
      if (m.teamRole === 'MANAGER' || m.id === meId) continue
      const d = m.lastUpdate ? daysSince(m.lastUpdate.createdAt) : null
      if (d === null || d >= 2) out.push({ kind: 'quiet', userId: m.id, userName: m.name, text: d === null ? 'No updates yet' : `Quiet for ${d} days`, at: m.lastUpdate?.createdAt ?? '' })
    }
    const order = { blocked: 0, frustrated: 1, ask: 2, quiet: 3 }
    return out.sort((a, b) => order[a.kind] - order[b.kind])
  }, [updates, members, meId])

  const roster = useMemo(() => [...members].sort((a, b) => (a.lastUpdate?.createdAt ?? '').localeCompare(b.lastUpdate?.createdAt ?? '')), [members])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Panel className="border-pulse/20">
          <PanelHeader
            title={<span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-pulse" /> Briefing</span>}
            aside={
              briefing ? (
                <span className="flex items-center gap-2 text-[12px] text-ink-faint">
                  <span>Written {relativeTime(briefing.createdAt)}</span>
                  {newSince > 0 && (
                    <button onClick={() => write(true)} disabled={writing} className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[12px] font-medium text-ink hover:bg-paper-2" title="Rewrite the briefing including the new updates">
                      {writing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Update · {newSince} new
                    </button>
                  )}
                </span>
              ) : undefined
            }
          />
          <div className="border-t border-line px-5 py-4">
            {briefing === undefined || (writing && !briefing) ? (
              <p className="flex items-center gap-2 text-[13.5px] text-ink-faint"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the last few days…</p>
            ) : briefing ? (
              <div className="prose-doc text-[14px]"><ReactMarkdown>{briefing.content}</ReactMarkdown></div>
            ) : (
              <p className="text-[13.5px] text-ink-soft">Nothing to brief yet. Once the team starts posting, this is written every morning and tells you who to talk to first.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Needs a look" aside={<span className="text-[12px] text-ink-faint">{flags.length === 0 ? 'All clear' : `${flags.length} · from people's latest updates`}</span>} />
          {flags.length === 0 ? (
            <p className="px-5 pb-5 text-[13.5px] text-ink-soft">No blockers, no one quiet, nobody sounding fed up.</p>
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

        <Feed feed={feed} teamName={teamName} showSentiment />
      </div>

      <aside className="space-y-6">
        <Panel>
          <PanelHeader title="Reports" aside={<Link href="/reports" className="text-[12px] text-ink-faint hover:text-ink">All</Link>} />
          <div className="space-y-2 border-t border-line px-4 py-3">
            <ReportAction type="STANDUP_BRIEF" label="Standup brief" teamId={teamId} compact />
            <ReportAction type="QUARTER_DELIVERY" label="Delivery report" teamId={teamId} withPeriod defaultDays={91} compact />
          </div>
        </Panel>
        <Panel>
          <PanelHeader title={teamName} aside={<span className="text-[12px] text-ink-faint">{members.length} people</span>} />
          <ul className="divide-y divide-line border-t border-line">
            {roster.map((m) => (
              <li key={m.id}>
                <Link href={`/people/${m.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper-2">
                  <Avatar name={m.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{m.name}</span>
                    <span className="block text-[11.5px] text-ink-faint">{m.lastUpdate ? `last update ${relativeTime(m.lastUpdate.createdAt)}` : 'no updates yet'}</span>
                  </span>
                  {m.lastUpdate && <SentimentDot value={m.lastUpdate.sentiment} />}
                </Link>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-2 text-[11px] text-ink-faint">Dot is the tone of their latest update: <span className="text-ok">●</span> positive <span className="text-ink-faint">●</span> neutral <span className="text-warn">●</span> concerned <span className="text-bad">●</span> frustrated</p>
        </Panel>
      </aside>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Member: no reports, no flags about colleagues
// ---------------------------------------------------------------------------

function MemberToday({ teamId, teamName, meId, updates, members, feed }: { teamId: string; teamName: string; meId: string; updates: UpdateView[]; members: Member[]; feed: [string, UpdateView[]][] }) {
  const [threads, setThreads] = useState<ThreadRow[]>([])
  useEffect(() => {
    fetch(`/api/threads?teamId=${teamId}&mine=1`).then((r) => r.json()).then((d) => setThreads(Array.isArray(d) ? d.filter((t: ThreadRow) => t.status !== 'DONE') : []))
  }, [teamId])

  const mine = updates.filter((u) => u.userId === meId)
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10))
  const postedToday = mine.some((u) => u.createdAt.slice(0, 10) === todayKey)
  const last = mine[0]

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Panel className={postedToday ? 'border-ok/30' : 'border-pulse/30'}>
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-[15px] font-semibold">{postedToday ? 'You\'re on the record for today.' : 'Nothing from you yet today.'}</p>
              <p className="mt-0.5 text-[13.5px] text-ink-soft">
                {postedToday ? 'Edit it from your page if anything is off.' : last ? `Last update ${relativeTime(last.createdAt)}. Thirty seconds is plenty.` : 'Thirty seconds by voice or text. It becomes your record.'}
              </p>
            </div>
            {postedToday ? (
              <Link href="/me"><Button variant="outline" size="sm"><Check className="h-4 w-4" /> Your page</Button></Link>
            ) : (
              <Link href="/capture"><Button size="sm"><Mic className="h-4 w-4" /> Capture</Button></Link>
            )}
          </div>
        </Panel>

        {threads.length > 0 && (
          <Panel>
            <PanelHeader title="Your open threads" aside={<Link href="/threads" className="text-[12px] text-ink-faint hover:text-ink">All threads</Link>} />
            <ul className="divide-y divide-line border-t border-line">
              {threads.slice(0, 6).map((t) => (
                <li key={t.id}>
                  <Link href={`/threads/${t.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-paper-2">
                    <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-[13.5px] font-medium">{t.name}{t.status === 'BLOCKED' && <Pill tone="bad">Blocked</Pill>}</span>
                      {t.summary && <span className="mt-0.5 line-clamp-1 block text-[12.5px] text-ink-soft">{t.summary}</span>}
                    </span>
                    <span className="text-[11.5px] text-ink-faint">{relativeTime(t.lastActivityAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Feed feed={feed} teamName={teamName} />
      </div>

      <aside>
        <Panel>
          <PanelHeader title={teamName} aside={<span className="text-[12px] text-ink-faint">{members.length} people</span>} />
          <ul className="divide-y divide-line border-t border-line">
            {members.map((m) => (
              <li key={m.id}>
                <Link href={`/people/${m.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper-2">
                  <Avatar name={m.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{m.name}{m.id === meId && <span className="text-ink-faint"> (you)</span>}</span>
                    <span className="block text-[11.5px] text-ink-faint">{m.teamRole.toLowerCase()}{m.lastUpdate ? ` · ${relativeTime(m.lastUpdate.createdAt)}` : ''}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </aside>
    </div>
  )
}

function Feed({ feed, teamName, showSentiment = false }: { feed: [string, UpdateView[]][]; teamName: string; showSentiment?: boolean }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">What {teamName} said · last {FEED_DAYS} days</h2>
      {feed.length === 0 ? (
        <Panel><Empty title="Quiet week so far" body="Updates people capture show up here, newest first." action={<Link href="/capture"><Button size="sm"><Mic className="h-4 w-4" /> Capture</Button></Link>} /></Panel>
      ) : (
        <div className="space-y-4">
          {feed.map(([day, list]) => (
            <div key={day}>
              <p className="mb-1.5 px-1 text-[12px] text-ink-faint">{dayLabel(list[0].createdAt)} · {list.length} update{list.length === 1 ? '' : 's'}</p>
              <Panel className="divide-y divide-line">
                {list.map((u) => <UpdateCard key={u.id} update={u} compact showSentiment={showSentiment} />)}
              </Panel>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
