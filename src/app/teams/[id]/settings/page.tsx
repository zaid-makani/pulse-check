'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTeam } from '@/components/TeamProvider'
import {
  Users,
  Settings,
  Loader2,
  ArrowLeft,
  UserPlus,
  Trash2,
  Crown,
  Shield,
  User,
} from 'lucide-react'
import Link from 'next/link'

interface TeamMember {
  id: string
  userId: string
  role: 'MEMBER' | 'LEAD' | 'MANAGER'
  user: {
    id: string
    name: string
    email: string
    role: string
    avatarUrl: string | null
  }
}

interface TeamDetails {
  id: string
  name: string
  description: string | null
  memberships: TeamMember[]
  currentUserRole: 'MEMBER' | 'LEAD' | 'MANAGER'
}

const roleIcons = {
  LEAD: Crown,
  MANAGER: Shield,
  MEMBER: User,
}

const roleColors = {
  LEAD: 'text-amber-600 bg-amber-50',
  MANAGER: 'text-violet-600 bg-violet-50',
  MEMBER: 'text-slate-600 bg-slate-50',
}

export default function TeamSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = use(params)
  const router = useRouter()
  const { refreshTeams } = useTeam()

  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Edit team state
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string }[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'MEMBER' | 'LEAD' | 'MANAGER'>('MEMBER')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [addMemberError, setAddMemberError] = useState('')
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  useEffect(() => {
    fetchTeam()
  }, [teamId])

  // Fetch available users when add member form is shown
  useEffect(() => {
    if (showAddMember && team) {
      fetchAvailableUsers()
    }
  }, [showAddMember, team])

  const fetchAvailableUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const allUsers = await response.json()

      // Filter out users who are already team members
      const memberUserIds = new Set(team?.memberships.map(m => m.user.id) || [])
      const available = allUsers.filter((u: { id: string }) => !memberUserIds.has(u.id))
      setAvailableUsers(available)

      // Select first available user by default
      if (available.length > 0) {
        setSelectedUserId(available[0].id)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setAvailableUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push('/dashboard')
          return
        }
        throw new Error('Failed to fetch team')
      }
      const data = await response.json()
      setTeam(data)
      setEditName(data.name)
      setEditDescription(data.description || '')
    } catch (err) {
      setError('Failed to load team settings')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTeam = async () => {
    if (!editName.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription }),
      })

      if (!response.ok) throw new Error('Failed to update team')

      await fetchTeam()
      await refreshTeams()
      setIsEditingName(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddMemberError('')

    if (!selectedUserId) return

    setIsAddingMember(true)
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, role: newMemberRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAddMemberError(data.error || 'Failed to add member')
        return
      }

      await fetchTeam()
      await refreshTeams()
      setSelectedUserId('')
      setNewMemberRole('MEMBER')
      setShowAddMember(false)
    } catch (err) {
      setAddMemberError('An error occurred')
      console.error(err)
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to remove member')
        return
      }

      await fetchTeam()
      await refreshTeams()
    } catch (err) {
      console.error(err)
    }
  }

  const handleChangeRole = async (userId: string, newRole: 'MEMBER' | 'LEAD' | 'MANAGER') => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to change role')
        return
      }

      await fetchTeam()
    } catch (err) {
      console.error(err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    )
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Team not found'}</p>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const canManage = team.currentUserRole === 'LEAD' || team.currentUserRole === 'MANAGER'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-3xl px-4 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team Settings</h1>
            <p className="text-sm text-slate-500">{team.name}</p>
          </div>
        </div>

        {/* Team Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Team Details</CardTitle>
            <CardDescription>Basic information about your team</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingName ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Team Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="What does this team work on?"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTeam} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium">{team.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Description</p>
                  <p className="text-slate-700">{team.description || 'No description'}</p>
                </div>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)}>
                    Edit Details
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>{team.memberships.length} members</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setShowAddMember(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {/* Add Member Form */}
            {showAddMember && (
              <form onSubmit={handleAddMember} className="mb-6 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium mb-3">Add New Member</h4>
                {addMemberError && (
                  <div className="p-2 mb-3 text-sm text-red-600 bg-red-50 rounded">
                    {addMemberError}
                  </div>
                )}
                {isLoadingUsers ? (
                  <div className="flex items-center gap-2 text-slate-500 py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available users...
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="py-4 text-center text-slate-500">
                    <p className="text-sm">No available users to add.</p>
                    <p className="text-xs mt-1">All registered users are already team members.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-3 mb-3">
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md bg-white"
                      >
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      <select
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value as 'MEMBER' | 'LEAD' | 'MANAGER')}
                        className="px-3 py-2 border rounded-md bg-white"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                        <option value="LEAD">Lead</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isAddingMember || !selectedUserId}>
                        {isAddingMember ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Add Member
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* Members List */}
            <div className="space-y-2">
              {team.memberships.map((membership) => {
                const RoleIcon = roleIcons[membership.role]
                return (
                  <div
                    key={membership.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-medium">
                      {membership.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{membership.user.name}</p>
                      <p className="text-sm text-slate-500">{membership.user.email}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[membership.role]}`}>
                      <RoleIcon className="h-3 w-3" />
                      {membership.role.toLowerCase()}
                    </div>
                    {canManage && membership.user.id !== team.memberships.find(m => m.role === 'LEAD')?.user.id && (
                      <div className="flex items-center gap-1">
                        <select
                          value={membership.role}
                          onChange={(e) => handleChangeRole(membership.user.id, e.target.value as 'MEMBER' | 'LEAD' | 'MANAGER')}
                          className="text-xs px-2 py-1 border rounded bg-white"
                        >
                          <option value="MEMBER">Member</option>
                          <option value="MANAGER">Manager</option>
                          <option value="LEAD">Lead</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveMember(membership.user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
