'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, Field, inputClass, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase() }) })
    if (!res.ok) setError('Could not send the email. Try again in a minute.')
    else setSent(true)
    setBusy(false)
  }

  return (
    <AuthShell title="Reset your password" subtitle="We will email you a link that works for one hour." footer={<Link href="/login" className="text-ink-soft hover:text-ink">Back to sign in</Link>}>
      {sent ? (
        <p className="rounded-md bg-ok-soft px-3 py-3 text-[13.5px] text-ok">If an account exists for {email}, the email is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Work email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" /></Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}</Button>
        </form>
      )}
    </AuthShell>
  )
}
