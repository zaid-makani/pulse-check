'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { TopBar } from '@/components/TopBar'
import { UpdateCard } from '@/components/UpdateCard'
import { useTeam } from '@/components/TeamProvider'
import { Panel, Empty } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import type { UpdateView } from '@/lib/updates'

export default function CapturePage() {
  const { currentTeam, isLoading } = useTeam()
  const [text, setText] = useState('')
  const [usedVoice, setUsedVoice] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UpdateView | null>(null)

  const onTranscript = useCallback((t: string) => {
    setError(null)
    setUsedVoice(true)
    setText((prev) => (prev ? `${prev.trim()} ${t}` : t))
  }, [])

  async function submit() {
    if (!text.trim() || !currentTeam) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: currentTeam.id, rawText: text.trim(), source: usedVoice ? 'WEB_VOICE' : 'WEB_TEXT' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save the update')
      setResult(data)
      setText('')
      setUsedVoice(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar title="Capture" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        {!isLoading && !currentTeam ? (
          <Panel>
            <Empty
              title="Join a team first"
              body="Updates belong to a team. Create one or join an existing team, then come back here."
              action={
                <div className="flex gap-2">
                  <Link href="/teams/join"><Button variant="outline">Join a team</Button></Link>
                  <Link href="/teams/new"><Button>Create a team</Button></Link>
                </div>
              }
            />
          </Panel>
        ) : result ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-serif text-2xl font-medium tracking-tight">Got it.</p>
              <p className="mt-1 text-[14px] text-ink-soft">Here is what PulseCheck understood. Edit it from your page if anything is off.</p>
            </div>
            <Panel>
              <UpdateCard update={result} showAuthor={false} />
            </Panel>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setResult(null)}>
                <RotateCcw className="h-4 w-4" /> Add another
              </Button>
              <Link href="/me"><Button variant="ghost">Your page <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <p className="font-serif text-2xl font-medium tracking-tight">What did you work on?</p>
              <p className="mt-1 text-[14px] text-ink-soft">
                Talk like you would in standup. Thirty seconds is plenty.
                {currentTeam && <> Posting to <span className="font-medium text-ink">{currentTeam.name}</span>.</>}
              </p>
            </div>

            <div className="py-2">
              <VoiceRecorder onTranscript={onTranscript} onError={setError} disabled={busy} />
            </div>

            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="…or type it. What got done, what is in progress, anything you are waiting on."
                rows={5}
                className="w-full resize-y rounded-lg border border-line bg-surface px-4 py-3 font-serif text-[16px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-pulse/20"
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit() }}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className="text-[12px] text-ink-faint">⌘↩ to send</p>
                <Button onClick={submit} disabled={!text.trim() || busy || !currentTeam}>
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading…</> : 'Send'}
                </Button>
              </div>
            </div>

            {error && <p className="rounded-md bg-bad-soft px-4 py-3 text-[13.5px] text-bad">{error}</p>}
          </div>
        )}
      </main>
    </>
  )
}
