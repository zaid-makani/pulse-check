'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, Field, inputClass, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/components/TeamProvider'

export default function NewTeamPage() {
  const router = useRouter()
  const { refreshTeams } = useTeam()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Give the team a name.')
    setBusy(true)
    setError('')
    const res = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), description: description.trim() }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'Could not create the team.'); setBusy(false); return }
    await refreshTeams()
    router.push(`/teams/${d.id}/settings`)
  }

  return (
    <AuthShell title="Start a team" subtitle="You will be its lead. Add people on the next screen." footer={<Link href="/home" className="text-ink-soft hover:text-ink">Cancel</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Team name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Payments" autoFocus /></Field>
        <Field label="What the team does"><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="Checkout, gateways, and reconciliation" /></Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create team'}</Button>
      </form>
    </AuthShell>
  )
}
