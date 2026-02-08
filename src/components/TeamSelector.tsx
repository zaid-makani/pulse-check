'use client'

import { useState } from 'react'
import { useTeam } from '@/components/TeamProvider'
import { Button } from '@/components/ui/button'
import { ChevronDown, Users, Check, Plus, Settings } from 'lucide-react'
import Link from 'next/link'

export function TeamSelector() {
  const { teams, currentTeam, isLoading, setCurrentTeam } = useTeam()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="h-9 w-32 bg-slate-100 animate-pulse rounded-lg" />
    )
  }

  if (teams.length === 0) {
    return (
      <Link href="/teams/new">
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </Link>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 min-w-[140px] justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-500" />
          <span className="truncate max-w-[100px]">{currentTeam?.name || 'Select Team'}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your Teams</p>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {teams.map((team) => (
                <button
                  key={team.id}
                  className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setCurrentTeam(team)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-medium">
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-500">
                      {team.memberCount} member{team.memberCount !== 1 ? 's' : ''} · {team.role.toLowerCase()}
                    </p>
                  </div>
                  {currentTeam?.id === team.id && (
                    <Check className="h-4 w-4 text-violet-600" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 px-3 py-2 space-y-2">
              {currentTeam && (currentTeam.role === 'LEAD' || currentTeam.role === 'MANAGER') && (
                <Link
                  href={`/teams/${currentTeam.id}/settings`}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Team Settings
                </Link>
              )}
              <Link
                href="/teams/new"
                className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Plus className="h-4 w-4" />
                Create new team
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
