'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AuthShell, Field, inputClass, ErrorNote } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'

function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const callbackUrl = sp.get('callbackUrl') || '/home'
  const registered = sp.get('registered') === 'true'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const result = await signIn('credentials', { email: email.trim().toLowerCase(), password, redirect: false })
    if (result?.error) {
      setError('That email and password do not match.')
      setBusy(false)
      return
    }
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <AuthShell title="Welcome back" subtitle={registered ? 'Account created. Sign in to continue.' : undefined} footer={<>New here? <Link href="/signup" className="font-medium text-ink underline underline-offset-2">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Work email"><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" /></Field>
        <Field label="Password"><input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} /></Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}</Button>
        <p className="text-center text-[12.5px]"><Link href="/forgot-password" className="text-ink-soft hover:text-ink">Forgot your password?</Link></p>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return <Suspense fallback={null}><LoginForm /></Suspense>
}
