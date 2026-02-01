'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CheckCircle2, Clock, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface StatusCardProps {
  update: {
    id: string
    rawTranscript: string
    completed: string[]
    inProgress: string[]
    blockers: string[]
    needsHelp: string[]
    sentiment: string | null
    summary: string | null
    createdAt: string
    user: {
      name: string
      email: string
      role: string
    }
  }
}

const sentimentColors: Record<string, string> = {
  positive: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-800',
  frustrated: 'bg-orange-100 text-orange-800',
  concerned: 'bg-yellow-100 text-yellow-800',
}

export function StatusCard({ update }: StatusCardProps) {
  const [showRaw, setShowRaw] = useState(false)

  const initials = update.user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{update.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(update.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          {update.sentiment && (
            <Badge className={sentimentColors[update.sentiment] || sentimentColors.neutral}>
              {update.sentiment}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Summary */}
        {update.summary && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
            <p className="text-sm text-blue-900">{update.summary}</p>
          </div>
        )}

        {/* Raw Transcript Toggle */}
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-700 transition-colors"
        >
          {showRaw ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {showRaw ? 'Hide' : 'Show'} original message
        </button>

        {showRaw && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-sm text-slate-700 italic">&ldquo;{update.rawTranscript}&rdquo;</p>
          </div>
        )}

        {/* Extracted Details */}
        <div className="grid gap-3 text-sm">
          {update.completed.length > 0 && (
            <div className="flex gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-green-700">Completed</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {update.completed.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {update.inProgress.length > 0 && (
            <div className="flex gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-blue-700">In Progress</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {update.inProgress.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {update.blockers.length > 0 && (
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-700">Blockers</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {update.blockers.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {update.needsHelp.length > 0 && (
            <div className="flex gap-2">
              <HelpCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-orange-700">Needs Help</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {update.needsHelp.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
