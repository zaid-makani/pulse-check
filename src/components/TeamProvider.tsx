'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface Team {
  id: string
  name: string
  description: string | null
  role: 'MEMBER' | 'LEAD' | 'MANAGER' | 'ADMIN'
  memberCount: number
  createdAt: string
}

export interface Me {
  id: string
  name: string
  email: string
  slackLinked: boolean
  orgAdmin: boolean
  managesTeamIds: string[]
  isManager: boolean
}

interface TeamContextType {
  teams: Team[]
  currentTeam: Team | null
  me: Me | null
  /** Lead or manager of the current team, or org admin. Decides which Today you get. */
  managesCurrent: boolean
  isLoading: boolean
  error: string | null
  setCurrentTeam: (team: Team) => void
  refreshTeams: () => Promise<void>
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)
const KEY = 'pulsecheck_current_team_id'

export function TeamProvider({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (status !== 'authenticated') { setIsLoading(false); return }
    try {
      setError(null)
      const [t, m] = await Promise.all([fetch('/api/teams').then((r) => r.json()), fetch('/api/me').then((r) => r.json())])
      const list: Team[] = Array.isArray(t) ? t : []
      setTeams(list)
      setMe(m?.id ? m : null)
      if (list.length > 0) {
        let saved: string | null = null
        try { saved = localStorage.getItem(KEY) } catch {}
        setCurrentTeamState(list.find((x) => x.id === saved) ?? list[0])
      } else {
        setCurrentTeamState(null)
      }
    } catch {
      setError('Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const setCurrentTeam = (team: Team) => {
    setCurrentTeamState(team)
    try { localStorage.setItem(KEY, team.id) } catch {}
  }

  const managesCurrent = !!me && (me.orgAdmin || (!!currentTeam && (currentTeam.role === 'LEAD' || currentTeam.role === 'MANAGER')))

  return (
    <TeamContext.Provider value={{ teams, currentTeam, me, managesCurrent, isLoading, error, setCurrentTeam, refreshTeams: async () => { setIsLoading(true); await load() } }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const ctx = useContext(TeamContext)
  if (!ctx) throw new Error('useTeam must be used within a TeamProvider')
  return ctx
}

export function useCanManageTeam() {
  return useTeam().managesCurrent
}
