'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusCard } from '@/components/StatusCard'
import { TeamPulseTable } from '@/components/TeamPulseTable'
import { useTeam } from '@/components/TeamProvider'
import { RefreshCw, Loader2, Users, AlertTriangle, TrendingUp, Sparkles, Clock, Frown, AlertCircle, X } from 'lucide-react'

interface StatusUpdate {
  id: string
  userId: string
  rawTranscript: string
  completed: string[]
  inProgress: string[]
  blockers: string[]
  needsHelp: string[]
  sentiment: string | null
  riskFlags: string[]
  summary: string | null
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl: string | null
  }
}

interface User {
  id: string
  name: string
  email: string
  role: string
  _count: { statusUpdates: number }
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  lastUpdate?: {
    createdAt: string
    summary: string | null
    sentiment: string | null
    blockers: string[]
  }
}

interface Insight {
  id: string
  type: 'blocker' | 'missing_update' | 'sentiment' | 'risk'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  userId?: string
  userName?: string
  createdAt: string
}

const insightIcons = {
  blocker: AlertTriangle,
  missing_update: Clock,
  sentiment: Frown,
  risk: AlertCircle,
}

const insightColors = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-orange-200 bg-orange-50',
  low: 'border-yellow-200 bg-yellow-50',
}

const insightIconColors = {
  high: 'text-red-600',
  medium: 'text-orange-600',
  low: 'text-yellow-600',
}

export default function DashboardPage() {
  const { currentTeam } = useTeam()
  const [updates, setUpdates] = useState<StatusUpdate[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [digest, setDigest] = useState<string>('')
  const [isLoadingDigest, setIsLoadingDigest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [insights, setInsights] = useState<Insight[]>([])
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set())

  const fetchData = useCallback(async () => {
    if (!currentTeam) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const teamParam = `teamId=${currentTeam.id}`
      const [updatesRes, usersRes, insightsRes] = await Promise.all([
        fetch(`/api/status?days=7&${teamParam}`),
        fetch(`/api/users?${teamParam}`),
        fetch(`/api/insights?${teamParam}`),
      ])

      const updatesData = await updatesRes.json()
      const usersData = await usersRes.json()
      const insightsData = await insightsRes.json()

      // Handle error responses
      if (updatesData.error || usersData.error) {
        console.error('API Error:', updatesData.error || usersData.error)
        setUpdates([])
        setUsers([])
        setTeamMembers([])
        setInsights([])
        return
      }

      // Set insights
      if (insightsData.insights) {
        setInsights(insightsData.insights)
      }

      setUpdates(updatesData)
      setUsers(usersData)

      // Build team members with their latest update
      const membersWithUpdates: TeamMember[] = usersData.map((user: User) => {
        const userUpdates = updatesData.filter((u: StatusUpdate) => u.userId === user.id)
        const lastUpdate = userUpdates[0] // Already sorted by createdAt desc

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastUpdate: lastUpdate
            ? {
                createdAt: lastUpdate.createdAt,
                summary: lastUpdate.summary,
                sentiment: lastUpdate.sentiment,
                blockers: lastUpdate.blockers,
              }
            : undefined,
        }
      })

      setTeamMembers(membersWithUpdates)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentTeam])

  useEffect(() => {
    fetchData()
    // Reset digest when team changes
    setDigest('')
  }, [fetchData])

  const generateDigest = async () => {
    if (!currentTeam) return

    setIsLoadingDigest(true)
    try {
      const response = await fetch(`/api/digest?days=7&teamId=${currentTeam.id}`)
      const data = await response.json()
      setDigest(data.digest)
    } catch (error) {
      console.error('Error generating digest:', error)
    } finally {
      setIsLoadingDigest(false)
    }
  }

  // Calculate stats
  const totalBlockers = updates.reduce((acc, u) => acc + u.blockers.length, 0)
  const recentUpdates = updates.filter(
    (u) => new Date(u.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length
  const noUpdateCount = teamMembers.filter((m) => !m.lastUpdate).length

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {currentTeam ? `${currentTeam.name} Dashboard` : 'Team Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {currentTeam ? 'Team status at a glance' : 'Select or create a team to get started'}
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" disabled={isLoading || !currentTeam}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">
                {noUpdateCount > 0 ? (
                  <span className="text-orange-600">{noUpdateCount} without recent updates</span>
                ) : (
                  'All members active'
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Blockers</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBlockers}</div>
              <p className="text-xs text-muted-foreground">Across all team members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Updates Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentUpdates}</div>
              <p className="text-xs text-muted-foreground">In the last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        {insights.filter(i => !dismissedInsights.has(i.id)).length > 0 && (
          <Card className="mb-8 border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Proactive alerts about your team that may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights
                  .filter(insight => !dismissedInsights.has(insight.id))
                  .slice(0, 5)
                  .map(insight => {
                    const Icon = insightIcons[insight.type]
                    return (
                      <div
                        key={insight.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${insightColors[insight.severity]}`}
                      >
                        <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${insightIconColors[insight.severity]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{insight.title}</p>
                          <p className="text-sm text-slate-600">{insight.description}</p>
                        </div>
                        <button
                          onClick={() => setDismissedInsights(prev => new Set([...prev, insight.id]))}
                          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
              </div>
              {insights.filter(i => !dismissedInsights.has(i.id)).length > 5 && (
                <p className="text-sm text-slate-500 mt-3 text-center">
                  +{insights.filter(i => !dismissedInsights.has(i.id)).length - 5} more insights
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <Tabs defaultValue="pulse" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pulse">Team Pulse</TabsTrigger>
            <TabsTrigger value="updates">Recent Updates</TabsTrigger>
            <TabsTrigger value="digest">AI Digest</TabsTrigger>
          </TabsList>

          <TabsContent value="pulse">
            <Card>
              <CardHeader>
                <CardTitle>Team Pulse</CardTitle>
                <CardDescription>
                  Overview of all team members and their current status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length > 0 ? (
                  <TeamPulseTable members={teamMembers} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No team members found. Add users to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="updates">
            <div className="space-y-4">
              {updates.length > 0 ? (
                updates.map((update) => <StatusCard key={update.id} update={update} />)
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <p className="text-center text-muted-foreground">
                      No status updates yet. Team members can submit updates from the Submit page.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="digest">
            <Card>
              <CardHeader>
                <CardTitle>AI-Generated Team Digest</CardTitle>
                <CardDescription>
                  Get an AI-powered summary of your team&apos;s status over the past week
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!digest ? (
                  <div className="text-center py-8">
                    <Button onClick={generateDigest} disabled={isLoadingDigest}>
                      {isLoadingDigest ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Weekly Digest'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Badge>Last 7 days</Badge>
                      <Button variant="outline" size="sm" onClick={generateDigest}>
                        Regenerate
                      </Button>
                    </div>
                    <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-p:text-slate-600 prose-p:my-2 prose-li:text-slate-600 prose-strong:text-slate-700 prose-ul:my-2 prose-li:my-1 prose-hr:my-6 prose-hr:border-slate-200">
                      <ReactMarkdown>{digest}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
