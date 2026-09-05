'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Activity,
  Users,
  Plus,
  ArrowRight,
  Loader2,
  Mic,
  MessageCircle,
  LayoutGrid,
  CheckCircle2,
} from 'lucide-react'

type Step = 'team' | 'tips'

interface Team {
  id: string
  name: string
  memberCount: number
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [step, setStep] = useState<Step>('team')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Team step state
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [existingTeams, setExistingTeams] = useState<Team[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const isReturningUser = !!session?.user?.onboardingCompleted

  // Fetch existing teams the user can join
  useEffect(() => {
    async function fetchAvailableTeams() {
      try {
        const response = await fetch('/api/teams/available')
        if (response.ok) {
          const data = await response.json()
          setExistingTeams(data)
        }
      } catch (err) {
        console.error('Error fetching available teams:', err)
      } finally {
        setIsLoadingTeams(false)
      }
    }
    fetchAvailableTeams()
  }, [])

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      setError('Team name is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDescription.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create team')
        return
      }

      // Returning users go straight to dashboard; new users see tips
      if (isReturningUser) {
        router.push('/home')
        return
      }
      setStep('tips')
    } catch {
      setError('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinTeam = async (teamId: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/teams/${teamId}/join`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to join team')
        return
      }

      // Returning users go straight to dashboard; new users see tips
      if (isReturningUser) {
        router.push('/home')
        return
      }
      setStep('tips')
    } catch {
      setError('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)

    try {
      // Mark onboarding as complete
      await fetch('/api/user/onboarding', {
        method: 'POST',
      })

      // Update the session to reflect new onboarding status
      await update()

      // Redirect to dashboard
      router.push('/home')
    } catch {
      setError('Failed to complete onboarding')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25">
              <Activity className="h-6 w-6 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              PulseCheck
            </span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-8 rounded-full ${step === 'team' ? 'bg-violet-600' : 'bg-violet-200'}`} />
            <div className={`h-2 w-8 rounded-full ${step === 'tips' ? 'bg-violet-600' : 'bg-violet-200'}`} />
          </div>
        </div>

        {/* Team Step */}
        {step === 'team' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome, {session?.user?.name}!</CardTitle>
              <CardDescription>
                Let&apos;s get you set up with a team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              {mode === 'choose' && (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex items-start gap-4"
                    onClick={() => setMode('create')}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                      <Plus className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Create a new team</p>
                      <p className="text-sm text-muted-foreground">
                        Start fresh and invite your colleagues
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex items-start gap-4"
                    onClick={() => setMode('join')}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Join an existing team</p>
                      <p className="text-sm text-muted-foreground">
                        Connect with teams already using PulseCheck
                      </p>
                    </div>
                  </Button>
                </div>
              )}

              {mode === 'create' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">Team Name</label>
                    <Input
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g., Engineering, Product, Design"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-2">Description (optional)</label>
                    <Input
                      value={newTeamDescription}
                      onChange={(e) => setNewTeamDescription(e.target.value)}
                      placeholder="What does this team work on?"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setMode('choose')}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCreateTeam}
                      disabled={isLoading || !newTeamName.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Create Team
                    </Button>
                  </div>
                </div>
              )}

              {mode === 'join' && (
                <div className="space-y-4">
                  {isLoadingTeams ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                    </div>
                  ) : existingTeams.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>No teams available to join.</p>
                      <Button
                        variant="link"
                        onClick={() => setMode('create')}
                        className="mt-2"
                      >
                        Create a new team instead
                      </Button>
                    </div>
                  ) : (
                    existingTeams.map((team) => (
                      <Button
                        key={team.id}
                        variant="outline"
                        className="w-full justify-between"
                        onClick={() => handleJoinTeam(team.id)}
                        disabled={isLoading}
                      >
                        <span>{team.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {team.memberCount} members
                        </span>
                      </Button>
                    ))
                  )}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => setMode('choose')}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tips Step */}
        {step === 'tips' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">You&apos;re all set!</CardTitle>
              <CardDescription>
                Here&apos;s how to get the most out of PulseCheck
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                  <Mic className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-medium">Submit voice updates</p>
                  <p className="text-sm text-muted-foreground">
                    Click the mic and speak naturally about your work. AI extracts the key details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                  <MessageCircle className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium">Chat with your team data</p>
                  <p className="text-sm text-muted-foreground">
                    Ask questions like &quot;Who has blockers?&quot; or &quot;What did we complete yesterday?&quot;
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100">
                  <LayoutGrid className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Ask, don't chase</p>
                  <p className="text-sm text-muted-foreground">
                    Ask PulseCheck who is working on what, or open a person's page before a 1-on-1. Reports write themselves from the team's updates.
                  </p>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
                onClick={handleComplete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
