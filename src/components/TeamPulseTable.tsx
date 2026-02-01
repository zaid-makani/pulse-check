'use client'

import { useState, Fragment } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

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

interface TeamPulseTableProps {
  members: TeamMember[]
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-800',
  frustrated: 'bg-orange-100 text-orange-800',
  concerned: 'bg-yellow-100 text-yellow-800',
}

const sentimentDots: Record<string, string> = {
  positive: 'bg-green-500',
  neutral: 'bg-gray-400',
  frustrated: 'bg-orange-500',
  concerned: 'bg-yellow-500',
}

const roleColors: Record<string, string> = {
  DEVELOPER: 'bg-blue-100 text-blue-800',
  TESTER: 'bg-purple-100 text-purple-800',
  LEAD: 'bg-indigo-100 text-indigo-800',
  MANAGER: 'bg-slate-100 text-slate-800',
}

function ExpandedMemberDetails({ member }: { member: TeamMember }) {
  if (!member.lastUpdate) {
    return (
      <div className="bg-slate-50 border-t p-4">
        <p className="text-sm text-slate-500">No recent updates from this team member.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 border-t p-4 space-y-3">
      {/* Summary */}
      {member.lastUpdate.summary && (
        <div className="bg-white border border-blue-100 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Latest Summary</p>
          <p className="text-sm text-slate-700">{member.lastUpdate.summary}</p>
        </div>
      )}

      {/* Blockers - highlighted */}
      {member.lastUpdate.blockers && member.lastUpdate.blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-medium text-red-700">Active Blockers</p>
          </div>
          <ul className="space-y-1">
            {member.lastUpdate.blockers.map((blocker, i) => (
              <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                <span className="text-red-400 mt-1">-</span>
                <span>{blocker}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function TeamPulseTable({ members }: TeamPulseTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Sort members: those with blockers first, then by last update date
  const sortedMembers = [...members].sort((a, b) => {
    const aBlockers = a.lastUpdate?.blockers?.length || 0
    const bBlockers = b.lastUpdate?.blockers?.length || 0
    if (aBlockers !== bBlockers) return bBlockers - aBlockers

    const aDate = a.lastUpdate ? new Date(a.lastUpdate.createdAt).getTime() : 0
    const bDate = b.lastUpdate ? new Date(b.lastUpdate.createdAt).getTime() : 0
    return bDate - aDate
  })

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/50">
          <TableHead className="w-8"></TableHead>
          <TableHead>Team Member</TableHead>
          <TableHead className="w-24">Role</TableHead>
          <TableHead className="w-32">Last Update</TableHead>
          <TableHead className="w-24">Mood</TableHead>
          <TableHead className="w-32">Blockers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedMembers.map((member) => {
          const initials = member.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()

          const hasRecentUpdate = member.lastUpdate !== undefined
          const daysSinceUpdate = member.lastUpdate
            ? Math.floor(
                (Date.now() - new Date(member.lastUpdate.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              )
            : null
          const hasBlockers = (member.lastUpdate?.blockers?.length || 0) > 0
          const isExpanded = expandedId === member.id

          return (
            <Fragment key={member.id}>
              <TableRow
                className={`cursor-pointer hover:bg-slate-50 transition-colors ${hasBlockers ? 'bg-red-50/30' : ''}`}
                onClick={() => toggleExpanded(member.id)}
              >
                <TableCell className="w-8">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                      <AvatarFallback className="text-xs bg-gradient-to-br from-slate-100 to-slate-200">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${roleColors[member.role] || roleColors.DEVELOPER}`}>
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {hasRecentUpdate ? (
                    <span
                      className={
                        daysSinceUpdate !== null && daysSinceUpdate > 2
                          ? 'text-orange-600 font-medium text-sm'
                          : 'text-sm text-slate-600'
                      }
                    >
                      {formatDistanceToNow(new Date(member.lastUpdate!.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  ) : (
                    <span className="text-red-600 font-medium text-sm">No updates</span>
                  )}
                </TableCell>
                <TableCell>
                  {member.lastUpdate?.sentiment ? (
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${sentimentDots[member.lastUpdate.sentiment] || sentimentDots.neutral}`}
                      />
                      <span className="text-xs text-slate-600 capitalize">
                        {member.lastUpdate.sentiment}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {hasBlockers ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {member.lastUpdate!.blockers.length}
                    </Badge>
                  ) : (
                    <span className="text-green-600 text-sm">Clear</span>
                  )}
                </TableCell>
              </TableRow>
              {isExpanded && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <ExpandedMemberDetails member={member} />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
