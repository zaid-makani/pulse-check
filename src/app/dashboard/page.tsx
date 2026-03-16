'use client'

import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeamPulseTable } from '@/components/TeamPulseTable'
import { useTeam } from '@/components/TeamProvider'
import {
  RefreshCw,
  Loader2,
  AlertTriangle,
  Sparkles,
  Clock,
  Frown,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
} from 'lucide-react'
import Link from 'next/link'

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
  high: 'border-red-200 bg-red-50/80',
  medium: 'border-amber-200 bg-amber-50/80',
  low: 'border-slate-200 bg-slate-50/80',
}

const insightIconColors = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-slate-500',
}

const severityLabels = {
  high: 'Needs attention',
  medium: 'Worth noting',
  low: 'FYI',
}

const severityBadgeColors = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function DashboardPage() {
  const { currentTeam } = useTeam()
  const [updates, setUpdates] = useState<StatusUpdate[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [digest, setDigest] = useState<string>('')
  const [isLoadingDigest, setIsLoadingDigest] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [insights, setInsights] = useState<Insight[]>([])
  const [isDigestExpanded, setIsDigestExpanded] = useState(false)
  const [showAllInsights, setShowAllInsights] = useState(false)

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

      if (updatesData.error || usersData.error) {
        console.error('API Error:', updatesData.error || usersData.error)
        setUpdates([])
        setTeamMembers([])
        setInsights([])
        return
      }

      if (insightsData.insights) {
        setInsights(insightsData.insights)
      }

      setUpdates(updatesData)

      const membersWithUpdates: TeamMember[] = usersData.map((user: User) => {
        const userUpdates = updatesData.filter((u: StatusUpdate) => u.userId === user.id)
        const lastUpdate = userUpdates[0]

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

  const fetchDigest = useCallback(async () => {
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
  }, [currentTeam])

  useEffect(() => {
    fetchData()
    setDigest('')
    setIsDigestExpanded(false)
    setShowAllInsights(false)

    // Auto-poll every 60 seconds for fresh data
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Auto-load digest after main data loads (if there are updates)
  useEffect(() => {
    if (!isLoading && updates.length > 0 && !digest) {
      fetchDigest()
    }
  }, [isLoading, updates.length, digest, fetchDigest])

  const highSeverityCount = insights.filter(i => i.severity === 'high').length
  const totalBlockers = updates.reduce((acc, u) => acc + u.blockers.length, 0)

  // No team selected
  if (!currentTeam) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
          <Sparkles className="h-12 w-12 text-violet-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome to PulseCheck</h1>
          <p className="text-slate-500 mb-6">Join or create a team to see your dashboard.</p>
          <div className="flex justify-center gap-3">
            <Link href="/teams/join">
              <Button variant="outline">Join a Team</Button>
            </Link>
            <Link href="/teams/new">
              <Button>Create a Team</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{currentTeam.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {teamMembers.length} members · {updates.length} updates this week
              {totalBlockers > 0 && (
                <span className="text-red-600 font-medium"> · {totalBlockers} active blocker{totalBlockers !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Daily Briefing (AI Insights) */}
        {isLoading ? (
          <Card className="mb-6 border-violet-200/60">
            <CardContent className="py-8 flex items-center justify-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading insights...
            </CardContent>
          </Card>
        ) : insights.length > 0 ? (
          <Card className="mb-6 border-violet-200/60 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 border-b border-violet-100/60">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                <span className="text-base font-semibold leading-none">Daily Briefing</span>
              </div>
              {highSeverityCount > 0 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  {highSeverityCount} need{highSeverityCount === 1 ? 's' : ''} attention
                </Badge>
              )}
            </div>
            <CardContent className="pt-4">
              <div className="space-y-2.5">
                {(showAllInsights ? insights : insights.slice(0, 5)).map(insight => {
                  const Icon = insightIcons[insight.type]
                  return (
                    <div
                      key={insight.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${insightColors[insight.severity]}`}
                    >
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${insightIconColors[insight.severity]}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium text-slate-900">{insight.title}</p>
                          <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${severityBadgeColors[insight.severity]}`}>
                            {severityLabels[insight.severity]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{insight.description}</p>
                      </div>
                      {insight.userName && (
                        <Link
                          href="/chat"
                          className="shrink-0 p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors"
                          title={`Ask about ${insight.userName} in Chat`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
              {insights.length > 5 && (
                <button
                  onClick={() => setShowAllInsights(!showAllInsights)}
                  className="mt-3 w-full text-center text-sm text-violet-600 hover:text-violet-800 font-medium py-1.5 rounded-md hover:bg-violet-50 transition-colors"
                >
                  {showAllInsights ? 'Show less' : `Show all ${insights.length} insights`}
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-green-200/60 bg-green-50/30">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-green-700 font-medium">All clear — no issues detected this week.</p>
              <p className="text-xs text-green-600 mt-1">AI is monitoring blockers, sentiment, and update frequency.</p>
            </CardContent>
          </Card>
        )}

        {/* Team Pulse */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team Pulse</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading team data...
              </div>
            ) : teamMembers.length > 0 ? (
              <TeamPulseTable members={teamMembers} />
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No team members found.</p>
                <p className="text-xs text-slate-400 mt-1">Add members in Team Settings to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Digest (auto-loaded, collapsible) */}
        <Card className="border-slate-200/60">
          <CardHeader
            className="pb-3 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
            onClick={() => setIsDigestExpanded(!isDigestExpanded)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-400" />
                <CardTitle className="text-base">Weekly Digest</CardTitle>
                <Badge variant="outline" className="text-xs text-slate-500">Last 7 days</Badge>
              </div>
              <div className="flex items-center gap-2">
                {isLoadingDigest && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                {isDigestExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </div>
            </div>
          </CardHeader>
          {isDigestExpanded && (
            <CardContent>
              {isLoadingDigest ? (
                <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating digest...
                </div>
              ) : digest ? (
                <div>
                  <div className="flex justify-end mb-3">
                    <Button variant="outline" size="sm" onClick={fetchDigest} className="text-xs h-7">
                      <RefreshCw className="mr-1.5 h-3 w-3" />
                      Regenerate
                    </Button>
                  </div>
                  <div className="prose prose-slate prose-sm max-w-none prose-headings:text-slate-900 prose-headings:mt-6 prose-headings:mb-3 prose-h2:text-lg prose-h2:font-semibold prose-h3:text-base prose-p:text-slate-600 prose-p:my-2 prose-li:text-slate-600 prose-strong:text-slate-700 prose-ul:my-2 prose-li:my-1 prose-hr:my-6 prose-hr:border-slate-200">
                    <ReactMarkdown>{digest}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-500">No updates to digest yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Team members need to submit updates first.</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
