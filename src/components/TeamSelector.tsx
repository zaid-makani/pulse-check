'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Check, Plus } from 'lucide-react'
import { useTeam } from '@/components/TeamProvider'
import { cn } from '@/lib/utils'

export function TeamSelector() {
  const { teams, currentTeam, isLoading, setCurrentTeam } = useTeam()
  const [open, setOpen] = useState(false)

  if (isLoading) return <div className="h-8 w-28 animate-pulse rounded-md bg-paper-2" />
  if (teams.length === 0) {
    return (
      <Link href="/teams/new" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-[13px] font-medium hover:bg-paper-2">
        <Plus className="h-3.5 w-3.5" /> Create team
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-3 text-[13px] font-medium hover:bg-paper-2"
      >
        <span className="h-2 w-2 rounded-full bg-pulse" />
        <span className="max-w-[160px] truncate">{currentTeam?.name || 'Select team'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-ink-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg shadow-ink/5">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => { setCurrentTeam(t); setOpen(false) }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-paper-2"
              >
                <span className="flex-1">
                  <span className="block text-[13.5px] font-medium">{t.name}</span>
                  <span className="block text-[11.5px] text-ink-faint">
                    {t.memberCount} member{t.memberCount !== 1 ? 's' : ''} · {t.role.toLowerCase()}
                  </span>
                </span>
                {currentTeam?.id === t.id && <Check className="h-4 w-4 text-pulse" />}
              </button>
            ))}
            <div className="mt-1 border-t border-line pt-1">
              <Link href="/teams/new" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-soft hover:bg-paper-2 hover:text-ink">
                <Plus className="h-3.5 w-3.5" /> New team
              </Link>
              <Link href="/teams/join" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-soft hover:bg-paper-2 hover:text-ink">
                Join a team
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
