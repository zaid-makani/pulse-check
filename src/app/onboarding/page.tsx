'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Users, Mic, MessageCircle, User } from 'lucide-react'
import { AuthShell, Field, inputClass, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/components/TeamProvider'

interface AvailableTeam { id: string; name: string; description?: string | null; memberCount: number }

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const { refreshTeams } = useTeam()
  const [step, setStep] = useState<'team' | 'how'>('team')
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [teams, setTeams] = useState<AvailableTeam[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
  useEffect(() => { fetch('/api/teams/available').then((r) => r.json()).then((d) => setTeams(Array.isArray(d) ? d : [])).catch(() => {}) }, [])

  async function createTeam() {
    if (!name.trim()) return setError('Give the team a name.')
    setBusy(true)
    setError('')
    const res = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), description: description.trim() }) })
    if (!res.ok) { setError('Could not create the team.'); setBusy(false); return }
    setBusy(false)
    setStep('how')
  }

  async function joinTeam(id: string) {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/teams/${id}/join`, { method: 'POST' })
    if (!res.ok) { setError('Could not join that team.'); setBusy(false); return }
    setBusy(false)
    setStep('how')
  }

  async function finish() {
    setBusy(true)
    await fetch('/api/user/onboarding', { method: 'POST' })
    await update()
    await refreshTeams()
    router.push('/home')
  }

  const first = session?.user?.name?.split(' ')[0] ?? 'there'

  if (step === 'how') {
    return (
      <AuthShell title="Three things to know" wide>
        <ul className="space-y-4">
          <Tip icon={Mic} title="Say what you did, however is easiest" body="A voice note here, a reply to the nightly Slack nudge, or a line of text. Thirty seconds. PulseCheck pulls out what got done, what is in progress, and what is stuck." />
          <Tip icon={MessageCircle} title="Ask instead of chasing" body="Who is on the N1 integration? What is blocked? What did I say I would do last week? Answers come from people's own updates, with sources." />
          <Tip icon={User} title="Your record is yours" body="Every update builds a timeline only you and your lead see in full. At review time, PulseCheck drafts your self-review from it." />
        </ul>
        <Button className="mt-6 w-full" onClick={finish} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Take me in'}</Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={`Hi ${first}.`} subtitle="Updates belong to a team. Which one is yours?" wide>
      {mode === 'choose' && (
        <div className="space-y-2">
          <button onClick={() => setMode('create')} className="flex w-full items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-left hover:border-line-strong">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-ink text-paper"><Plus className="h-4 w-4" /></span>
            <span><span className="block text-[14px] font-medium">Start a team</span><span className="block text-[12.5px] text-ink-soft">You will be its lead. Add people afterwards.</span></span>
          </button>
          <button onClick={() => setMode('join')} className="flex w-full items-center gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-left hover:border-line-strong">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper-2 text-ink"><Users className="h-4 w-4" /></span>
            <span><span className="block text-[14px] font-medium">Join a team</span><span className="block text-[12.5px] text-ink-soft">{teams.length > 0 ? `${teams.length} team${teams.length === 1 ? '' : 's'} already here` : 'Pick from the teams already here'}</span></span>
          </button>
        </div>
      )}
      {mode === 'create' && (
        <div className="space-y-4">
          <Field label="Team name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Payments" autoFocus /></Field>
          <Field label="What the team does"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Checkout, gateways, and reconciliation" /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setMode('choose')} disabled={busy}>Back</Button>
            <Button className="flex-1" onClick={createTeam} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create team'}</Button>
          </div>
        </div>
      )}
      {mode === 'join' && (
        <div className="space-y-3">
          {teams.length === 0 ? (
            <p className="text-[13.5px] text-ink-soft">No teams to join yet. Start one instead.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {teams.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{t.name}</span><span className="block truncate text-[12.5px] text-ink-soft">{t.description || `${t.memberCount} people`}</span></span>
                  <Button size="sm" variant="outline" onClick={() => joinTeam(t.id)} disabled={busy}>Join</Button>
                </li>
              ))}
            </ul>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button variant="ghost" onClick={() => setMode('choose')} disabled={busy}>Back</Button>
        </div>
      )}
    </AuthShell>
  )
}

function Tip({ icon: Icon, title, body }: { icon: typeof Mic; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-pulse-soft text-pulse-ink"><Icon className="h-4 w-4" /></span>
      <span><span className="block text-[14px] font-medium">{title}</span><span className="block text-[13px] leading-relaxed text-ink-soft">{body}</span></span>
    </li>
  )
}
