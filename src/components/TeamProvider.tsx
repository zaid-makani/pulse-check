'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface Team {
  id: string
  name: string
  description: string | null
  role: 'MEMBER' | 'LEAD' | 'MANAGER'
  memberCount: number
  createdAt: string
}

interface TeamContextType {
  teams: Team[]
  currentTeam: Team | null
  isLoading: boolean
  error: string | null
  setCurrentTeam: (team: Team) => void
  refreshTeams: () => Promise<void>
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

const TEAM_STORAGE_KEY = 'pulsecheck_current_team_id'

export function TeamProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeamState] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    if (status !== 'authenticated') {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      const response = await fetch('/api/teams')

      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      setTeams(data)

      // Restore last selected team from localStorage, or use first team
      if (data.length > 0) {
        const savedTeamId = localStorage.getItem(TEAM_STORAGE_KEY)
        const savedTeam = data.find((t: Team) => t.id === savedTeamId)
        setCurrentTeamState(savedTeam || data[0])
      } else {
        setCurrentTeamState(null)
      }
    } catch (err) {
      console.error('Error fetching teams:', err)
      setError('Failed to load teams')
    } finally {
      setIsLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const setCurrentTeam = (team: Team) => {
    setCurrentTeamState(team)
    localStorage.setItem(TEAM_STORAGE_KEY, team.id)
  }

  const refreshTeams = async () => {
    setIsLoading(true)
    await fetchTeams()
  }

  return (
    <TeamContext.Provider
      value={{
        teams,
        currentTeam,
        isLoading,
        error,
        setCurrentTeam,
        refreshTeams,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
}

// Helper hook to check if current user can manage the team
export function useCanManageTeam() {
  const { currentTeam } = useTeam()
  return currentTeam?.role === 'LEAD' || currentTeam?.role === 'MANAGER'
}

// Helper hook to check if current user is team lead
export function useIsTeamLead() {
  const { currentTeam } = useTeam()
  return currentTeam?.role === 'LEAD'
}
