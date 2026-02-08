'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTeam } from '@/components/TeamProvider'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditUpdateDialog } from '@/components/EditUpdateDialog'
import { DeleteUpdateDialog } from '@/components/DeleteUpdateDialog'
import {
  Mic,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react'

interface StatusUpdate {
  id: string
  rawTranscript: string
  completed: string[]
  inProgress: string[]
  blockers: string[]
  needsHelp: string[]
  sentiment: string | null
  summary: string | null
  createdAt: string
}

interface User {
  id: string
  name: string
  email: string
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

function ExpandedDetails({ update }: { update: StatusUpdate }) {
  const [showRaw, setShowRaw] = useState(false)

  return (
    <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-4">
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
        {showRaw ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {showRaw ? 'Hide' : 'Show'} original transcript
      </button>

      {showRaw && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs font-medium text-slate-500 mb-1">What you said</p>
          <p className="text-sm text-slate-700 italic">&ldquo;{update.rawTranscript}&rdquo;</p>
        </div>
      )}

      {/* Extracted Details Grid */}
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        {update.completed.length > 0 && (
          <div className="flex gap-2 bg-white rounded-lg p-3 border border-green-100">
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
          <div className="flex gap-2 bg-white rounded-lg p-3 border border-blue-100">
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
          <div className="flex gap-2 bg-white rounded-lg p-3 border border-red-100">
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
          <div className="flex gap-2 bg-white rounded-lg p-3 border border-orange-100">
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
    </div>
  )
}

function UpdateTableRow({
  update,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  update: StatusUpdate
  isExpanded: boolean
  onToggle: () => void
  onEdit: (update: StatusUpdate) => void
  onDelete: (id: string) => void
}) {
  const truncatedSummary = update.summary
    ? update.summary.length > 60
      ? update.summary.substring(0, 60) + '...'
      : update.summary
    : 'No summary'

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex flex-col">
            <span>{format(new Date(update.createdAt), 'MMM d')}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(update.createdAt), 'h:mm a')}
            </span>
          </div>
        </TableCell>
        <TableCell className="max-w-[200px]">
          <span className="text-sm text-slate-600 whitespace-normal">{truncatedSummary}</span>
        </TableCell>
        <TableCell>
          {update.sentiment && (
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${sentimentDots[update.sentiment] || sentimentDots.neutral}`} />
              <span className="text-xs capitalize text-muted-foreground">{update.sentiment}</span>
            </div>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-3 text-xs">
            {update.completed.length > 0 && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                <span>{update.completed.length}</span>
              </div>
            )}
            {update.inProgress.length > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <Clock className="h-3 w-3" />
                <span>{update.inProgress.length}</span>
              </div>
            )}
            {update.blockers.length > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span>{update.blockers.length}</span>
              </div>
            )}
            {update.needsHelp.length > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <HelpCircle className="h-3 w-3" />
                <span>{update.needsHelp.length}</span>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(update)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(update.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <ExpandedDetails update={update} />
          </td>
        </tr>
      )}
    </>
  )
}

export default function MyUpdatesPage() {
  const { data: session } = useSession()
  const { currentTeam } = useTeam()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [updates, setUpdates] = useState<StatusUpdate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Edit/Delete state
  const [editingUpdate, setEditingUpdate] = useState<StatusUpdate | null>(null)
  const [deletingUpdateId, setDeletingUpdateId] = useState<string | null>(null)

  // Check if current user is LEAD or MANAGER (can view others' updates)
  const canViewOthers = currentTeam?.role === 'LEAD' || currentTeam?.role === 'MANAGER'

  // Fetch users (only if can view others) and default to logged-in user
  useEffect(() => {
    // If not a manager/lead, just use logged-in user
    if (!canViewOthers) {
      if (session?.user?.id) {
        setSelectedUserId(session.user.id)
        setUsers([])
      }
      return
    }

    // Managers/leads can fetch team members
    const teamParam = currentTeam ? `?teamId=${currentTeam.id}` : ''
    fetch(`/api/users${teamParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setUsers([])
          return
        }
        setUsers(data)
        // Default to logged-in user, or first user if not found
        const loggedInUser = data.find((u: User) => u.id === session?.user?.id)
        if (loggedInUser) {
          setSelectedUserId(loggedInUser.id)
        } else if (data.length > 0) {
          setSelectedUserId(data[0].id)
        }
      })
      .catch(console.error)
  }, [session?.user?.id, currentTeam?.id, canViewOthers])

  // Fetch updates for selected user
  useEffect(() => {
    if (!selectedUserId) return

    setIsLoading(true)
    fetch(`/api/status?userId=${selectedUserId}&days=30`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setUpdates([])
          return
        }
        setUpdates(data)
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [selectedUserId])

  const handleEditSave = (updated: StatusUpdate) => {
    setUpdates((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
  }

  const handleDeleted = (id: string) => {
    setUpdates((prev) => prev.filter((u) => u.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Updates</h1>
            <p className="text-muted-foreground">Your status update history</p>
          </div>
          <Link href="/submit">
            <Button>
              <Mic className="mr-2 h-4 w-4" />
              New Update
            </Button>
          </Link>
        </div>

        {/* User Selector - Only shown for managers/leads */}
        {canViewOthers && users.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Viewing updates for</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="w-full px-3 py-2 border rounded-md bg-white"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}

        {/* Updates Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading updates...</div>
        ) : updates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {selectedUser?.name} hasn&apos;t submitted any updates yet.
              </p>
              <Link href="/submit">
                <Button variant="outline">
                  <Mic className="mr-2 h-4 w-4" />
                  Submit First Update
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {updates.length} update{updates.length !== 1 ? 's' : ''} in the last 30 days
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="w-24">Mood</TableHead>
                    <TableHead className="w-32">Stats</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updates.map((update) => (
                    <UpdateTableRow
                      key={update.id}
                      update={update}
                      isExpanded={expandedId === update.id}
                      onToggle={() => toggleExpanded(update.id)}
                      onEdit={setEditingUpdate}
                      onDelete={setDeletingUpdateId}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <EditUpdateDialog
          update={editingUpdate}
          open={!!editingUpdate}
          onOpenChange={(open) => !open && setEditingUpdate(null)}
          onSave={handleEditSave}
        />

        {/* Delete Dialog */}
        <DeleteUpdateDialog
          updateId={deletingUpdateId}
          open={!!deletingUpdateId}
          onOpenChange={(open) => !open && setDeletingUpdateId(null)}
          onDeleted={handleDeleted}
        />
      </div>
    </div>
  )
}
