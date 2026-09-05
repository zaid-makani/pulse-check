'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, Field, inputClass, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'

function ResetForm() {
  const router = useRouter()
  const token = useSearchParams().get('token')
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
    const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || 'This link is no longer valid.'); setBusy(false); return }
    router.push('/login')
  }

  if (!token) {
    return (
      <AuthShell title="Link missing" subtitle="Open the link from the email we sent you." footer={<Link href="/forgot-password" className="text-ink-soft hover:text-ink">Request a new one</Link>}>
        <span />
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password"><input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="At least 8 characters" /></Field>
        <Field label="Confirm"><input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} /></Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save password'}</Button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetForm /></Suspense>
}
