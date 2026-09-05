'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

const bare = ['/', '/login', '/signup', '/onboarding', '/forgot-password', '/reset-password']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (bare.includes(pathname)) return <>{children}</>
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-14">{children}</div>
    </div>
  )
}
