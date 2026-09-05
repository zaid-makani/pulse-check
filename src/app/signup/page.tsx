'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, Field, inputClass, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The passwords do not match.')
    setBusy(true)
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'Could not create the account.'); setBusy(false); return }
    router.push('/login?registered=true')
  }

  return (
    <AuthShell title="Create your account" subtitle="Use the same email as your Slack profile so the bot can find you." footer={<>Already have one? <Link href="/login" className="font-medium text-ink underline underline-offset-2">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Your name"><input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="As your team knows you" /></Field>
        <Field label="Work email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" /></Field>
        <Field label="Password"><input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" /></Field>
        <Field label="Confirm password"><input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} /></Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}</Button>
      </form>
    </AuthShell>
  )
}
