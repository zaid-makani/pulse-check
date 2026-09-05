'use client'

import { use, useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { Panel, Empty, Avatar } from '@/components/ui/primitives'
import { dayLabel } from '@/lib/format'
import type { UpdateView } from '@/lib/updates'

export default function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [updates, setUpdates] = useState<UpdateView[]>([])
  const [loading, setLoading] = useState(true)

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
            <div className="mb-6 flex items-center gap-4">
              <Avatar name={person.name} size="lg" />
              <div>
                <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight">{person.name}</h1>
                <p className="text-[13.5px] text-ink-soft">{updates.length} updates in the last 60 days</p>
              </div>
            </div>
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
