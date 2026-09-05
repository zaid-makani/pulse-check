'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Trash2, UserPlus, Check } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { useTeam } from '@/components/TeamProvider'
import { Panel, PanelHeader, Avatar, Pill, PageTitle } from '@/components/ui/primitives'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Role = 'MEMBER' | 'LEAD' | 'MANAGER'

interface Member { id: string; userId: string; role: Role; user: { id: string; name: string; email: string } }
interface Team { id: string; name: string; description: string | null; memberships: Member[]; currentUserRole: Role }
interface Settings {
  nudgeTime: string
  nudgeDays: number[]
  briefingTime: string
  recapDay: number
  timezone: string
  slackWebhookUrl: string | null
  vocabulary: 'engineering' | 'sales' | 'marketing' | 'general'
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TZ = ['Asia/Kolkata', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Singapore', 'Australia/Sydney']
const ROLE_HELP: Record<Role, string> = {
  MEMBER: 'Captures updates, sees the team',
  LEAD: 'Runs the team day to day, gets the briefing',
  MANAGER: 'Oversees, gets the briefing, manages settings',
}

export default function TeamSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const { refreshTeams } = useTeam()

  const [team, setTeam] = useState<Team | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [addId, setAddId] = useState('')
  const [addRole, setAddRole] = useState<Role>('MEMBER')

  const load = useCallback(async () => {
    const [t, s] = await Promise.all([fetch(`/api/teams/${id}`).then((r) => r.json()), fetch(`/api/teams/${id}/settings`).then((r) => r.json())])
    if (t.error) { setError(t.error); return }
    setTeam(t); setName(t.name); setDescription(t.description ?? '')
    setSettings({ ...s, nudgeDays: s.nudgeDays ?? [1, 2, 3, 4, 5], slackWebhookUrl: s.slackWebhookUrl ?? '' })
  }, [id])

  useEffect(() => { load() }, [load])

  const canManage = team?.currentUserRole === 'LEAD' || team?.currentUserRole === 'MANAGER'

  useEffect(() => {
    if (canManage) fetch('/api/users').then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : []))
  }, [canManage])

  function flash(key: string) { setSaved(key); setTimeout(() => setSaved(null), 1500) }

  async function saveTeam() {
    setSaving('team')
    const res = await fetch(`/api/teams/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) })
    setSaving(null)
    if (res.ok) { flash('team'); refreshTeams() }
  }

  async function saveSettings() {
    if (!settings) return
    setSaving('settings')
    const res = await fetch(`/api/teams/${id}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
    setSaving(null)
    if (res.ok) flash('settings'); else setError('Could not save settings')
  }

  async function addMember() {
    if (!addId) return
    setSaving('member')
    const res = await fetch(`/api/teams/${id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: addId, role: addRole }) })
    setSaving(null)
    if (res.ok) { setAddId(''); load(); refreshTeams() } else setError((await res.json()).error || 'Could not add member')
  }

  async function changeRole(userId: string, role: Role) {
    await fetch(`/api/teams/${id}/members/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) })
    load()
  }

  async function removeMember(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from ${team?.name}?`)) return
    await fetch(`/api/teams/${id}/members/${userId}`, { method: 'DELETE' })
    load(); refreshTeams()
  }

  async function deleteTeam() {
    if (!confirm(`Delete ${team?.name}? Every update and thread in it goes too. This cannot be undone.`)) return
    const res = await fetch(`/api/teams/${id}`, { method: 'DELETE' })
    if (res.ok) { await refreshTeams(); router.push('/home') }
  }

  if (error && !team) return <><TopBar title="Team settings" /><main className="p-8 text-bad">{error}</main></>
  if (!team || !settings) return <><TopBar title="Team settings" /><div className="flex justify-center py-16 text-ink-faint"><Loader2 className="h-4 w-4 animate-spin" /></div></>

  const memberIds = new Set(team.memberships.map((m) => m.userId))
  const addable = users.filter((u) => !memberIds.has(u.id))

  return (
    <>
      <TopBar title="Team settings" />
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <PageTitle title={team.name} subtitle={canManage ? 'You can change everything here.' : 'Only leads and managers can change settings.'} />
        {error && <p className="rounded-md bg-bad-soft px-4 py-2 text-[13px] text-bad">{error}</p>}

        <Panel>
          <PanelHeader title="About" />
          <div className="space-y-3 border-t border-line px-5 py-4">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} disabled={!canManage} /></Field>
            <Field label="What this team does"><Input value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManage} placeholder="Payments platform, checkout, and reconciliation" /></Field>
            <Field label="Vocabulary" hint="Shapes how updates are read. Engineering knows tickets and PRs; sales knows deals and clients.">
              <select value={settings.vocabulary} onChange={(e) => setSettings({ ...settings, vocabulary: e.target.value as Settings['vocabulary'] })} disabled={!canManage} className="h-9 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                <option value="engineering">Engineering</option>
                <option value="sales">Sales / BD</option>
                <option value="marketing">Marketing</option>
                <option value="general">General</option>
              </select>
            </Field>
            {canManage && <SaveRow busy={saving === 'team'} done={saved === 'team'} onClick={() => { saveTeam(); saveSettings() }} />}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Rhythm" aside={<span className="text-[12px] text-ink-faint">{settings.timezone}</span>} />
          <div className="space-y-4 border-t border-line px-5 py-4">
            <Field label="Nightly nudge" hint="PulseCheck asks each person what they worked on. Reply by text or voice from Slack.">
              <div className="flex flex-wrap items-center gap-2">
                <Input type="time" value={settings.nudgeTime} onChange={(e) => setSettings({ ...settings, nudgeTime: e.target.value })} disabled={!canManage} className="w-32" />
                <div className="flex gap-1">
                  {DAYS.map((d, i) => {
                    const on = settings.nudgeDays.includes(i)
                    return (
                      <button key={d} type="button" disabled={!canManage} onClick={() => setSettings({ ...settings, nudgeDays: on ? settings.nudgeDays.filter((x) => x !== i) : [...settings.nudgeDays, i].sort() })}
                        className={`h-8 w-10 rounded-md border text-[12px] font-medium ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-soft'}`}>{d}</button>
                    )
                  })}
                </div>
              </div>
            </Field>
            <Field label="Morning briefing" hint="Leads and managers get who-to-talk-to-first at this time.">
              <Input type="time" value={settings.briefingTime} onChange={(e) => setSettings({ ...settings, briefingTime: e.target.value })} disabled={!canManage} className="w-32" />
            </Field>
            <Field label="Weekly recap day" hint="Everyone gets their own week back, in their own words.">
              <select value={settings.recapDay} onChange={(e) => setSettings({ ...settings, recapDay: Number(e.target.value) })} disabled={!canManage} className="h-9 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </Field>
            <Field label="Timezone">
              <select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} disabled={!canManage} className="h-9 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                {[...new Set([settings.timezone, ...TZ])].map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Slack incoming webhook" hint="Temporary, until the Slack app is installed. Used for the team briefing.">
              <Input value={settings.slackWebhookUrl ?? ''} onChange={(e) => setSettings({ ...settings, slackWebhookUrl: e.target.value })} disabled={!canManage} placeholder="https://hooks.slack.com/services/…" />
            </Field>
            {canManage && <SaveRow busy={saving === 'settings'} done={saved === 'settings'} onClick={saveSettings} />}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="People" aside={<span className="text-[12px] text-ink-faint">{team.memberships.length}</span>} />
          <ul className="divide-y divide-line border-t border-line">
            {team.memberships.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={m.user.name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{m.user.name}{m.userId === session?.user?.id && <span className="ml-1 text-ink-faint">(you)</span>}</span>
                  <span className="block truncate text-[12px] text-ink-faint">{m.user.email}</span>
                </span>
                {canManage && m.userId !== session?.user?.id ? (
                  <>
                    <select value={m.role} onChange={(e) => changeRole(m.userId, e.target.value as Role)} className="h-8 rounded-md border border-line bg-surface px-2 text-[12.5px]" title={ROLE_HELP[m.role]}>
                      <option value="MEMBER">Member</option><option value="LEAD">Lead</option><option value="MANAGER">Manager</option>
                    </select>
                    <button onClick={() => removeMember(m.userId, m.user.name)} className="rounded p-1.5 text-ink-faint hover:bg-bad-soft hover:text-bad" title="Remove"><Trash2 className="h-4 w-4" /></button>
                  </>
                ) : (
                  <Pill>{m.role.toLowerCase()}</Pill>
                )}
              </li>
            ))}
          </ul>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
              <select value={addId} onChange={(e) => setAddId(e.target.value)} className="h-9 min-w-[220px] flex-1 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                <option value="">Add someone…</option>
                {addable.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}
              </select>
              <select value={addRole} onChange={(e) => setAddRole(e.target.value as Role)} className="h-9 rounded-md border border-line bg-surface px-3 text-[13.5px]">
                <option value="MEMBER">Member</option><option value="LEAD">Lead</option><option value="MANAGER">Manager</option>
              </select>
              <Button size="sm" onClick={addMember} disabled={!addId || saving === 'member'}><UserPlus className="h-4 w-4" /> Add</Button>
            </div>
          )}
        </Panel>

        {team.currentUserRole === 'LEAD' && (
          <Panel className="border-bad/30">
            <PanelHeader title="Danger" />
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
              <p className="text-[13.5px] text-ink-soft">Deleting the team removes every update, thread, and report in it.</p>
              <Button variant="destructive" size="sm" onClick={deleteTeam}>Delete team</Button>
            </div>
          </Panel>
        )}
      </main>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12.5px] font-medium text-ink-soft">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[12px] text-ink-faint">{hint}</span>}
    </label>
  )
}

function SaveRow({ busy, done, onClick }: { busy: boolean; done: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <Button size="sm" onClick={onClick} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <><Check className="h-4 w-4" /> Saved</> : 'Save'}
      </Button>
    </div>
  )
}
