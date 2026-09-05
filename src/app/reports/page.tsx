'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, FileText } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { useTeam } from '@/components/TeamProvider'
import { Panel, PanelHeader, Empty, PageTitle, Pill } from '@/components/ui/primitives'
import { relativeTime } from '@/lib/format'

interface Row { id: string; type: string; title: string; teamId: string | null; subjectUserId: string | null; createdAt: string }

const typeLabel: Record<string, string> = {
  DAILY_BRIEFING: 'Briefing',
  STANDUP_BRIEF: 'Standup brief',
  ONE_ON_ONE_PREP: '1-on-1 prep',
  SELF_REVIEW: 'Self-review',
  WEEK_RECAP: 'Week recap',
  QUARTER_DELIVERY: 'Delivery report',
}

export default function ReportsPage() {
  const { currentTeam, me, managesCurrent } = useTeam()
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    if (!me) return
    const q = new URLSearchParams({ limit: '100' })
    if (currentTeam) q.set('teamId', currentTeam.id)
    fetch(`/api/reports?${q}`).then((r) => r.json()).then((d) => setRows(Array.isArray(d) ? d : []))
  }, [currentTeam, me])

  const team = (rows ?? []).filter((r) => r.teamId && !r.subjectUserId && managesCurrent)
  const mine = (rows ?? []).filter((r) => r.subjectUserId === me?.id)
  const about = (rows ?? []).filter((r) => r.subjectUserId && r.subjectUserId !== me?.id && managesCurrent)

  return (
    <>
      <TopBar title="Reports" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <PageTitle title="Documents PulseCheck has written" subtitle="Every one is built from updates. Open, edit, copy, or write a fresh one from the page it belongs to." />
        {rows === null ? (
          <div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <Panel><Empty title="Nothing written yet" body="Briefings appear every morning once the team is posting. Your week recap arrives on Fridays." /></Panel>
        ) : (
          <div className="space-y-6">
            {managesCurrent && currentTeam && <Section title={`${currentTeam.name} · team`} rows={team} />}
            <Section title="About you" rows={mine} />
            {managesCurrent && about.length > 0 && <Section title="1-on-1 prep" rows={about} />}
          </div>
        )}
      </main>
    </>
  )
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Panel>
      <PanelHeader title={title} aside={<span className="text-[12px] text-ink-faint">{rows.length}</span>} />
      {rows.length === 0 ? (
        <p className="border-t border-line px-5 py-4 text-[13px] text-ink-faint">None yet.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/reports/${r.id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-paper-2">
                <FileText className="h-4 w-4 shrink-0 text-ink-faint" />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{r.title}</span>
                <Pill>{typeLabel[r.type] ?? r.type}</Pill>
                <span className="w-20 text-right text-[12px] text-ink-faint">{relativeTime(r.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
