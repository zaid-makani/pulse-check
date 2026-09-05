'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Mic, Sun, User, MessageCircle, GitBranch, LogOut, Coins, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTeam } from '@/components/TeamProvider'

const primary = [
  { href: '/home', label: 'Today', icon: Sun },
  { href: '/capture', label: 'Capture', icon: Mic },
  { href: '/threads', label: 'Threads', icon: GitBranch },
  { href: '/ask', label: 'Ask', icon: MessageCircle },
  { href: '/me', label: 'Me', icon: User },
]

function PulseMark() {
  return (
    <svg viewBox="0 0 32 32" width={28} height={28} className="h-7 w-7 shrink-0" aria-hidden>
      <rect x="0" y="0" width="32" height="32" rx="8" fill="var(--ink)" />
      <path
        d="M5 17h5l3-7 4 13 4-9 2 3h4"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        stroke="var(--pulse)"
      />
    </svg>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { currentTeam } = useTeam()

  const secondary = [
    ...(currentTeam ? [{ href: `/teams/${currentTeam.id}/settings`, label: 'Team settings', icon: Settings }] : []),
    { href: '/admin/costs', label: 'AI spend', icon: Coins },
  ]

  const Item = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Sun }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        title={label}
        className={cn(
          'group/item relative flex h-10 items-center gap-3 rounded-md px-2.5 text-[13.5px] font-medium transition-colors',
          active ? 'bg-surface text-ink shadow-[0_1px_0_0_var(--line)]' : 'text-ink-soft hover:bg-surface/60 hover:text-ink',
        )}
      >
        <Icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-pulse' : 'text-ink-faint group-hover/item:text-ink-soft')} />
        <span className="truncate opacity-0 transition-opacity duration-150 group-hover:opacity-100">{label}</span>
      </Link>
    )
  }

  return (
    <aside className="group fixed left-0 top-0 z-40 flex h-screen w-14 flex-col border-r border-line bg-paper-2/70 backdrop-blur transition-[width] duration-200 hover:w-52">
      <Link href="/home" className="flex h-14 items-center gap-2.5 px-3.5">
        <PulseMark />
        <span className="truncate text-[15px] font-semibold tracking-tight opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          PulseCheck
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 pt-2">
        {primary.map((i) => (
          <Item key={i.href} {...i} />
        ))}
        <div className="my-3 border-t border-line" />
        {secondary.map((i) => (
          <Item key={i.href} {...i} />
        ))}
      </nav>

      {session?.user && (
        <div className="border-t border-line px-2 py-2">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className="flex w-full items-center gap-3 rounded-md px-1.5 py-1.5 text-left text-ink-soft transition-colors hover:bg-surface/60 hover:text-ink"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-paper">
              {session.user.name?.charAt(0).toUpperCase() || 'U'}
            </span>
            <span className="min-w-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <span className="block truncate text-[13px] font-medium text-ink">{session.user.name}</span>
              <span className="flex items-center gap-1 text-[11px] text-ink-faint">
                <LogOut className="h-3 w-3" /> Sign out
              </span>
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
