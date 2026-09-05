'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { Loader2, Copy, Check, Pencil, Trash2, ArrowLeft } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Pill } from '@/components/ui/primitives'

interface Report {
  id: string
  type: string
  title: string
  content: string
  teamId: string | null
  teamName: string | null
  subject: { id: string; name: string } | null
  authorName: string | null
  periodStart: string
  periodEnd: string
  createdAt: string
}

const typeLabel: Record<string, string> = {
  DAILY_BRIEFING: 'Briefing',
  STANDUP_BRIEF: 'Standup brief',
  ONE_ON_ONE_PREP: '1-on-1 prep',
  SELF_REVIEW: 'Self-review',
  WEEK_RECAP: 'Week recap',
  QUARTER_DELIVERY: 'Delivery report',
}

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [r, setR] = useState<Report | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { fetch(`/api/reports/${id}`).then((x) => x.json()).then((d) => { if (!d.error) { setR(d); setDraft(d.content) } }) }, [id])

  async function copy() {
    if (!r) return
    await navigator.clipboard.writeText(`# ${r.title}\n\n${r.content}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function save() {
    if (!r) return
    setBusy(true)
    const res = await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: draft }) })
    if (res.ok) setR({ ...r, content: draft })
    setBusy(false)
    setEditing(false)
  }

  async function remove() {
    if (!confirm('Delete this report?')) return
    await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    router.back()
  }

  if (!r) return <><TopBar title="Report" /><div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div></>

  const back = r.subject ? `/people/${r.subject.id}` : '/home'

  return (
    <>
      <TopBar title={typeLabel[r.type] ?? r.type}>
        {r.teamName && <span className="text-[12px] text-ink-faint">{r.teamName}</span>}
      </TopBar>
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href={back} className="mb-4 inline-flex items-center gap-1 text-[12.5px] text-ink-faint hover:text-ink"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        <article className="rounded-lg border border-line bg-surface px-8 py-8 shadow-sm">
          <header className="mb-6 border-b border-line pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="pulse">{typeLabel[r.type] ?? r.type}</Pill>
              <span className="text-[12px] text-ink-faint">Generated {new Date(r.createdAt).toLocaleString()}{r.authorName ? ` by ${r.authorName}` : ''}</span>
              <span className="ml-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={copy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy as Markdown'}</Button>
                {!editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit</Button>}
                <Button variant="ghost" size="icon-sm" onClick={remove} title="Delete"><Trash2 className="h-4 w-4 text-ink-faint" /></Button>
              </span>
            </div>
            <h1 className="mt-3 font-serif text-[30px] font-medium leading-tight tracking-tight">{r.title}</h1>
          </header>
          {editing ? (
            <div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={28} className="w-full rounded-md border border-line bg-paper px-4 py-3 font-mono text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-pulse/20" />
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(r.content) }}>Cancel</Button>
                <Button size="sm" onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
              </div>
            </div>
          ) : (
            <div className="prose-doc"><ReactMarkdown>{r.content}</ReactMarkdown></div>
          )}
        </article>
      </main>
    </>
  )
}
