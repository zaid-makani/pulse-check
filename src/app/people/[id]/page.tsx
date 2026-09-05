'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { Loader2, FileText } from 'lucide-react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ReportButton } from '@/components/ReportButton'
import { relativeTime } from '@/lib/format'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { Panel, Empty, Avatar } from '@/components/ui/primitives'
import { dayLabel } from '@/lib/format'
import type { UpdateView } from '@/lib/updates'

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const [updates, setUpdates] = useState<UpdateView[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<{ id: string; type: string; title: string; createdAt: string }[]>([])
  const isMe = session?.user?.id === id

  useEffect(() => {
    fetch(`/api/reports?subjectUserId=${id}&limit=10`).then((r) => r.json()).then((d) => setReports(Array.isArray(d) ? d : []))
  }, [id])

  useEffect(() => {
    fetch(`/api/updates?userId=${id}&days=60`)
      .then((r) => r.json())
      .then((d) => setUpdates(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [id])

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
          <Panel><Empty title="No updates in the last 60 days" /></Panel>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <Avatar name={person.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight">{person.name}</h1>
                <p className="text-[13.5px] text-ink-soft">{updates.length} updates in the last 60 days</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!isMe && <ReportButton type="ONE_ON_ONE_PREP" label="1-on-1 prep" subjectUserId={id} withPeriod defaultDays={21} variant="default" />}
                <ReportButton type="SELF_REVIEW" label="Self-review" subjectUserId={id} withPeriod defaultDays={182} />
              </div>
            </div>
            {reports.length > 0 && (
              <Panel className="mb-6">
                <ul className="divide-y divide-line">
                  {reports.map((r) => (
                    <li key={r.id}><Link href={`/reports/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 text-[13.5px] hover:bg-paper-2"><FileText className="h-4 w-4 text-ink-faint" /><span className="flex-1 font-medium">{r.title}</span><span className="text-[12px] text-ink-faint">{relativeTime(r.createdAt)}</span></Link></li>
                  ))}
                </ul>
              </Panel>
            )}
            <div className="space-y-6">
              {grouped.map(([day, list]) => (
                <section key={day}>
                  <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{dayLabel(list[0].createdAt)}</h2>
                  <Panel className="divide-y divide-line">
                    {list.map((u) => <UpdateCard key={u.id} update={u} showAuthor={false} compact />)}
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
