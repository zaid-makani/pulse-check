'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/components/TeamProvider'
import { Users, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface AvailableTeam {
  id: string
  name: string
  description: string | null
  memberCount: number
}

export default function JoinTeamPage() {
  const router = useRouter()
  const { refreshTeams } = useTeam()
  const [teams, setTeams] = useState<AvailableTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await fetch('/api/teams/available')
        if (response.ok) {
          setTeams(await response.json())
        }
      } catch {
        setError('Failed to load available teams')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const handleJoin = async (teamId: string) => {
    setJoiningId(teamId)
    setError('')

    try {
      const response = await fetch(`/api/teams/${teamId}/join`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to join team')
        setJoiningId(null)
        return
      }

      await refreshTeams()
      router.push('/dashboard')
    } catch {
      setError('An error occurred. Please try again.')
      setJoiningId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-lg px-4 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4">
              <Users className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Join a Team</CardTitle>
            <CardDescription>
              Find and join an existing team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No teams available to join.</p>
                <Link href="/teams/new">
                  <Button variant="link" className="mt-2">
                    Create a new team instead
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-violet-200 hover:bg-violet-50/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{team.name}</p>
                      {team.description && (
                        <p className="text-sm text-slate-500 mt-0.5">{team.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleJoin(team.id)}
                      disabled={joiningId !== null}
                    >
                      {joiningId === team.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Join'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
