'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Activity, Mic, User, LayoutGrid, LayoutDashboard, MessageCircle, LogOut, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/submit', label: 'Submit', icon: Mic },
  { href: '/my-updates', label: 'My Updates', icon: User },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/views', label: 'Views', icon: LayoutGrid },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

// Pages where NavHeader should be hidden
const hiddenOnPaths = ['/', '/login', '/signup']

export function NavHeader() {
  const pathname = usePathname()
  const { data: session, status } = useSession()

  // Hide on landing, login, signup pages
  if (hiddenOnPaths.includes(pathname)) {
    return null
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="group flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 transition-transform group-hover:scale-105">
              <Activity className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              PulseCheck
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : session?.user ? (
              <>
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-slate-900">
                    {session.user.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {session.user.email}
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-medium">
                  {session.user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">Sign out</span>
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
