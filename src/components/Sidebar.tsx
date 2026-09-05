'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Activity, Mic, User, MessageCircle, LayoutGrid, LayoutDashboard, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/submit', label: 'Submit', icon: Mic },
  { href: '/my-updates', label: 'My Updates', icon: User },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/views', label: 'Views', icon: LayoutGrid },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="group fixed left-0 top-0 z-50 flex h-screen w-16 flex-col border-r border-slate-200/60 bg-white transition-all duration-200 hover:w-56">
      {/* Logo */}
      <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-[14px] shrink-0">
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
          <Activity className="h-5 w-5 text-white" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
        </div>
        <span className="overflow-hidden whitespace-nowrap text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          PulseCheck
        </span>
      </Link>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex h-10 items-center gap-3 rounded-lg px-[5px] transition-all duration-150',
                isActive
                  ? 'bg-violet-50 text-violet-700 border-l-[3px] border-violet-600 pl-[2px]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              )}
              title={item.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User avatar + sign out */}
      {session?.user && (
        <div className="border-t border-slate-200/60 px-3 py-3">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 rounded-lg px-[5px] py-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            title="Sign out"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-medium">
              {session.user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="text-sm font-medium text-slate-900">{session.user.name}</p>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <LogOut className="h-3 w-3" />
                Sign out
              </div>
            </div>
          </button>
        </div>
      )}
    </aside>
  )
}
