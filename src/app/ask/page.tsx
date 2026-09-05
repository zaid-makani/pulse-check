'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { ArrowUp, Loader2, Search, Sparkles } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { useTeam } from '@/components/TeamProvider'
import { Avatar } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/format'
import type { AskSource } from '@/lib/ask'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  tools?: string[]
  sources?: AskSource[]
  error?: string
}

const starters = [
  'What needs my attention today?',
  'Who is working on the N1 integration and where is it?',
  'What has Rahul been doing for the last two weeks?',
  'Is anything at risk for this quarter?',
  'Who is blocked on another team?',
]

export default function AskPage() {
  const { currentTeam, teams } = useTeam()
  const [scope, setScope] = useState<'team' | 'all'>('all')
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [turns])

  async function ask(q: string) {
    const question = q.trim()
    if (!question || busy) return
    setInput('')
    const history = turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content }))
    setTurns((t) => [...t, { role: 'user', content: question }, { role: 'assistant', content: '', tools: [] }])
    setBusy(true)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history, teamId: scope === 'team' ? currentTeam?.id : undefined }),
      })
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Request failed')
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      const patch = (fn: (t: Turn) => Turn) => setTurns((all) => all.map((t, i) => (i === all.length - 1 ? fn(t) : t)))
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const ev = JSON.parse(line)
          if (ev.type === 'text') patch((t) => ({ ...t, content: t.content + ev.text }))
          else if (ev.type === 'tool') patch((t) => ({ ...t, tools: [...(t.tools ?? []), describeTool(ev.tool)] }))
          else if (ev.type === 'done') patch((t) => ({ ...t, sources: ev.sources }))
          else if (ev.type === 'error') patch((t) => ({ ...t, error: ev.text }))
        }
      }
    } catch (e) {
      setTurns((all) => all.map((t, i) => (i === all.length - 1 ? { ...t, error: e instanceof Error ? e.message : 'Something went wrong' } : t)))
    } finally {
      setBusy(false)
      textareaRef.current?.focus()
    }
  }

  return (
    <>
      <TopBar title="Ask">
        {teams.length > 1 && (
          <div className="ml-2 flex gap-0.5 rounded-md border border-line bg-surface p-0.5">
            <button onClick={() => setScope('all')} className={cn('rounded px-2 py-0.5 text-[12px] font-medium', scope === 'all' ? 'bg-ink text-paper' : 'text-ink-soft')}>All my teams</button>
            <button onClick={() => setScope('team')} className={cn('rounded px-2 py-0.5 text-[12px] font-medium', scope === 'team' ? 'bg-ink text-paper' : 'text-ink-soft')}>{currentTeam?.name ?? 'Team'}</button>
          </div>
        )}
      </TopBar>
      <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-3xl flex-col px-6">
        <div className="flex-1 py-8">
          {turns.length === 0 ? (
            <div className="py-12">
              <p className="font-serif text-[30px] font-medium leading-tight tracking-tight">Ask instead of chasing.</p>
              <p className="mt-2 max-w-lg text-[14.5px] text-ink-soft">Anything about who is doing what, what is stuck, or what someone has been up to. Answers come from people&apos;s own updates, with the sources shown.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {starters.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-soft transition-colors hover:border-line-strong hover:text-ink">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {turns.map((t, i) =>
                t.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[14.5px] leading-relaxed text-paper">{t.content}</p>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3">
                    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pulse-soft"><Sparkles className="h-3.5 w-3.5 text-pulse-ink" /></span>
                    <div className="min-w-0 flex-1">
                      {t.tools && t.tools.length > 0 && (
                        <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-faint">
                          <Search className="h-3 w-3" /> {t.tools.join(' · ')}
                        </p>
                      )}
                      {t.error ? (
                        <p className="rounded-md bg-bad-soft px-3 py-2 text-[13.5px] text-bad">{t.error}</p>
                      ) : t.content ? (
                        <div className="prose-doc"><ReactMarkdown>{t.content}</ReactMarkdown></div>
                      ) : (
                        <p className="flex items-center gap-2 text-[13.5px] text-ink-faint"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking through updates…</p>
                      )}
                      {t.sources && t.sources.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-[12px] font-medium text-ink-faint hover:text-ink-soft">{t.sources.length} source{t.sources.length === 1 ? '' : 's'}</summary>
                          <ul className="mt-2 divide-y divide-line rounded-md border border-line bg-surface">
                            {t.sources.slice(0, 12).map((s) => (
                              <li key={s.id} className="flex items-start gap-2.5 px-3 py-2">
                                <Avatar name={s.userName} size="sm" />
                                <span className="min-w-0 flex-1 text-[12.5px]">
                                  <span className="font-medium">{s.userName}</span> <span className="text-ink-faint">· {s.teamName} · {relativeTime(s.createdAt)}</span>
                                  <span className="block text-ink-soft">{s.summary}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </div>
                ),
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-paper pb-6 pt-2">
          <div className="relative rounded-xl border border-line bg-surface shadow-sm focus-within:ring-2 focus-within:ring-pulse/20">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input) } }}
              placeholder={scope === 'team' && currentTeam ? `Ask about ${currentTeam.name}…` : 'Ask about any of your teams…'}
              rows={2}
              disabled={busy}
              className="w-full resize-none bg-transparent px-4 py-3 pr-12 text-[14.5px] leading-relaxed placeholder:text-ink-faint focus:outline-none"
            />
            <button onClick={() => ask(input)} disabled={!input.trim() || busy} aria-label="Send" className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-paper disabled:opacity-30">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-2 text-center text-[11.5px] text-ink-faint">Answers are drawn only from updates people have shared. <Link href="/threads" className="underline">See the threads</Link>.</p>
        </div>
      </main>
    </>
  )
}

function describeTool(t: { name: string; input: Record<string, unknown> }): string {
  switch (t.name) {
    case 'search_threads': return `threads: ${t.input.query}`
    case 'search_updates': return `updates: ${t.input.query}${t.input.personName ? ` (${t.input.personName})` : ''}`
    case 'person_timeline': return `timeline: ${t.input.personName}`
    case 'team_status': return `team status${t.input.teamName ? `: ${t.input.teamName}` : ''}`
    case 'thread_detail': return 'thread history'
    default: return t.name
  }
}
