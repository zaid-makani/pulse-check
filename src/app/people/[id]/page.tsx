'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, FileText } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { ReportAction } from '@/components/ReportAction'
import { useTeam } from '@/components/TeamProvider'
import { Panel, Empty, Avatar } from '@/components/ui/primitives'
import { dayLabel, relativeTime } from '@/lib/format'
import type { UpdateView } from '@/lib/updates'

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { me } = useTeam()
  const [updates, setUpdates] = useState<UpdateView[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<{ id: string; type: string; title: string; createdAt: string }[]>([])

  const isMe = me?.id === id
  // Can this viewer prepare for a 1-on-1 with this person? Leads/managers and org admins.
  const canPrep = !!me && !isMe && me.isManager

  useEffect(() => {
    fetch(`/api/updates?userId=${id}&days=60`).then((r) => r.json()).then((d) => setUpdates(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!canPrep) return
    fetch(`/api/reports?subjectUserId=${id}&type=ONE_ON_ONE_PREP&limit=10`).then((r) => r.json()).then((d) => setReports(Array.isArray(d) ? d : []))
  }, [id, canPrep])

  const person = updates[0]?.user
  const grouped = useMemo(() => {
    const g = new Map<string, UpdateView[]>()
    for (const u of updates) {
      const k = u.createdAt.slice(0, 10)
      if (!g.has(k)) g.set(k, [])
      g.get(k)!.push(u)
    }
    return [...g.entries()]
  }, [updates])

  return (
    <>
      <TopBar title={person?.name ?? 'Person'} />
      <main className="mx-auto max-w-3xl px-6 py-8">
        {loading ? (
          <div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : !person ? (
          <Panel><Empty title="No updates in the last 60 days" body={isMe ? 'Capture one and it appears here.' : undefined} /></Panel>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <Avatar name={person.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight">{person.name}{isMe && <span className="text-ink-faint"> (you)</span>}</h1>
                <p className="text-[13.5px] text-ink-soft">{updates.length} update{updates.length === 1 ? '' : 's'} in the last 60 days{isMe && <> · <Link href="/me" className="underline">your page</Link></>}</p>
              </div>
            </div>

            {canPrep && (
              <Panel className="mb-6">
                <div className="px-4 py-3">
                  <ReportAction type="ONE_ON_ONE_PREP" label="1-on-1 prep" subjectUserId={id} withPeriod defaultDays={21} compact />
                </div>
                {reports.length > 1 && (
                  <ul className="divide-y divide-line border-t border-line">
                    {reports.slice(1).map((r) => (
                      <li key={r.id}><Link href={`/reports/${r.id}`} className="flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-paper-2"><FileText className="h-3.5 w-3.5 text-ink-faint" /><span className="flex-1">{r.title}</span><span className="text-[12px] text-ink-faint">{relativeTime(r.createdAt)}</span></Link></li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}

            <div className="space-y-6">
              {grouped.map(([day, list]) => (
                <section key={day}>
                  <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{dayLabel(list[0].createdAt)}</h2>
                  <Panel className="divide-y divide-line">
                    {list.map((u) => <UpdateCard key={u.id} update={u} showAuthor={false} compact showSentiment={isMe || canPrep} />)}
                  </Panel>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
