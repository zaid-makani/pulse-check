'use client'

import { useSession } from 'next-auth/react'
import { TeamSelector } from '@/components/TeamSelector'

export function TopBar({ title, children }: { title?: string; children?: React.ReactNode }) {
  const { data: session } = useSession()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3 min-w-0">
        {title && <h1 className="truncate text-[15px] font-semibold tracking-tight">{title}</h1>}
        {children}
      </div>
      {session?.user && <TeamSelector />}
    </header>
  )
}
