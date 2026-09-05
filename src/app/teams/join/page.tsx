'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/components/TeamProvider'

interface AvailableTeam { id: string; name: string; description?: string | null; memberCount: number }

export default function JoinTeamPage() {
  const router = useRouter()
  const { refreshTeams } = useTeam()
  const [teams, setTeams] = useState<AvailableTeam[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { fetch('/api/teams/available').then((r) => r.json()).then((d) => setTeams(Array.isArray(d) ? d : [])) }, [])

  async function join(id: string) {
    setBusy(id)
    setError('')
    const res = await fetch(`/api/teams/${id}/join`, { method: 'POST' })
    if (!res.ok) { setError('Could not join that team.'); setBusy(null); return }
    await refreshTeams()
    router.push('/home')
  }

  return (
    <AuthShell title="Join a team" subtitle="Teams already using PulseCheck that you are not on yet." wide footer={<Link href="/teams/new" className="text-ink-soft hover:text-ink">Or start a new one</Link>}>
      {teams === null ? (
        <div className="flex justify-center py-6 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : teams.length === 0 ? (
        <p className="text-[13.5px] text-ink-soft">You are on every team there is.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {teams.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{t.name}</span><span className="block truncate text-[12.5px] text-ink-soft">{t.description || ''}{t.description ? ' · ' : ''}{t.memberCount} people</span></span>
              <Button size="sm" variant="outline" onClick={() => join(t.id)} disabled={busy !== null}>{busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join'}</Button>
            </li>
          ))}
        </ul>
      )}
      {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
    </AuthShell>
  )
}
