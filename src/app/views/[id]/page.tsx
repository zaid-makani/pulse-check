'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ViewGrid } from '@/components/views/ViewGrid'
import { AddColumnDialog } from '@/components/views/AddColumnDialog'
import { AISuggestPanel } from '@/components/views/AISuggestPanel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Pencil, Trash2, Sparkles, Loader2, RefreshCw } from 'lucide-react'

interface Column {
  id: string
  name: string
  type: string
  options: string[]
  isSystem: boolean
  order: number
}

interface WorkItem {
  id: string
  values: Record<string, unknown>
  order: number
}

interface View {
  id: string
  name: string
  description: string | null
  type: string
  targetUserId: string | null
  timeRange: string | null
  createdBy: {
    id: string
    name: string
  }
  columns: Column[]
  items: WorkItem[]
}

interface User {
  id: string
  name: string
  email: string
}

export default function ViewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const viewId = params.id as string

  const [view, setView] = useState<View | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false)
  const [showAISuggest, setShowAISuggest] = useState(false)
  const [isPopulating, setIsPopulating] = useState(false)

  const handlePopulate = async () => {
    if (!view) return
    setIsPopulating(true)
    try {
      await fetch(`/api/views/${viewId}/populate`, { method: 'POST' })
      await fetchView()
    } catch (error) {
      console.error('Error populating view:', error)
    } finally {
      setIsPopulating(false)
    }
  }

  const fetchView = useCallback(async () => {
    try {
      const response = await fetch(`/api/views/${viewId}`)
      if (response.ok) {
        const data = await response.json()
        setView(data)
        setEditName(data.name)
        setEditDescription(data.description || '')
      } else if (response.status === 404) {
        router.push('/views')
      }
    } catch (error) {
      console.error('Error fetching view:', error)
    }
  }, [viewId, router])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchView(), fetchUsers()]).finally(() => setIsLoading(false))
  }, [fetchView, fetchUsers])

  const handleSaveViewInfo = async () => {
    if (!view) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/views/${viewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDescription || null,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setView(updated)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error saving view:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteView = async () => {
    try {
      const response = await fetch(`/api/views/${viewId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/views')
      }
    } catch (error) {
      console.error('Error deleting view:', error)
    }
  }

  const handleCellChange = async (itemId: string, columnId: string, value: unknown) => {
    if (!view) return

    // Optimistic update
    setView((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) => {
          if (item.id === itemId) {
            return {
              ...item,
              values: { ...item.values, [columnId]: value },
            }
          }
          return item
        }),
      }
    })

    // Get current item values
    const item = view.items.find((i) => i.id === itemId)
    if (!item) return

    try {
      await fetch(`/api/views/${viewId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: { ...item.values, [columnId]: value },
        }),
      })
    } catch (error) {
      console.error('Error updating cell:', error)
      // Revert on error
      fetchView()
    }
  }

  const handleAddRow = async () => {
    if (!view) return

    try {
      const response = await fetch(`/api/views/${viewId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: {} }),
      })

      if (response.ok) {
        const newItem = await response.json()
        setView((prev) => {
          if (!prev) return prev
          return { ...prev, items: [...prev.items, newItem] }
        })
      }
    } catch (error) {
      console.error('Error adding row:', error)
    }
  }

  const handleDeleteRow = async () => {
    if (!deletingItemId) return

    try {
      const response = await fetch(`/api/views/${viewId}/items/${deletingItemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setView((prev) => {
          if (!prev) return prev
          return { ...prev, items: prev.items.filter((i) => i.id !== deletingItemId) }
        })
      }
    } catch (error) {
      console.error('Error deleting row:', error)
    } finally {
      setDeletingItemId(null)
    }
  }

  const handleColumnAdded = (column: Column) => {
    setView((prev) => {
      if (!prev) return prev
      return { ...prev, columns: [...prev.columns, column] }
    })
  }

  const handleSuggestionsAdded = (newItems: WorkItem[]) => {
    setView((prev) => {
      if (!prev) return prev
      return { ...prev, items: [...prev.items, ...newItems] }
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="text-center py-12 text-muted-foreground">Loading view...</div>
        </div>
      </div>
    )
  }

  if (!view) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Back Button */}
        <Link href="/views" className="inline-flex items-center text-sm text-muted-foreground hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Views
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3 max-w-md">
                <input
                  type="text"
                  className="text-2xl font-bold text-slate-900 bg-white border rounded px-2 py-1 w-full"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="View name"
                />
                <textarea
                  className="text-muted-foreground bg-white border rounded px-2 py-1 w-full resize-none"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveViewInfo} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900">{view.name}</h1>
                {view.description && <p className="text-muted-foreground mt-1">{view.description}</p>}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {view.type === 'one-on-one' && (
              <Button variant="outline" size="sm" onClick={handlePopulate} disabled={isPopulating}>
                {isPopulating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                )}
                Refresh Data
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAISuggest(true)}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI Suggest
            </Button>
            {!isEditing && (
              <>
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Grid */}
        <ViewGrid
          columns={view.columns}
          items={view.items}
          users={users}
          viewName={view.name}
          onCellChange={handleCellChange}
          onAddRow={handleAddRow}
          onDeleteRow={(itemId) => setDeletingItemId(itemId)}
          onAddColumn={() => setShowAddColumnDialog(true)}
        />

        {/* Delete View Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete View</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{view.name}&rdquo;? This will also delete all work items and
                columns. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteView}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Row Dialog */}
        <AlertDialog open={!!deletingItemId} onOpenChange={(open) => !open && setDeletingItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Work Item</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this work item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRow}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Add Column Dialog */}
        <AddColumnDialog
          viewId={viewId}
          open={showAddColumnDialog}
          onOpenChange={setShowAddColumnDialog}
          onColumnAdded={handleColumnAdded}
        />

        {/* AI Suggest Panel */}
        <AISuggestPanel
          viewId={viewId}
          columns={view.columns}
          open={showAISuggest}
          onOpenChange={setShowAISuggest}
          onSuggestionsAdded={handleSuggestionsAdded}
        />
      </div>
    </div>
  )
}
