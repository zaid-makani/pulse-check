'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ViewCard } from '@/components/views/ViewCard'
import { CreateViewDialog } from '@/components/views/CreateViewDialog'
import { useTeam } from '@/components/TeamProvider'
import { Plus, LayoutGrid } from 'lucide-react'

interface View {
  id: string
  name: string
  description: string | null
  createdBy: {
    id: string
    name: string
  }
  createdAt: string
  _count?: {
    items: number
    columns: number
  }
  items?: unknown[]
}

export default function ViewsPage() {
  const router = useRouter()
  const { currentTeam } = useTeam()
  const [views, setViews] = useState<View[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const fetchViews = useCallback(async () => {
    try {
      const teamParam = currentTeam ? `?teamId=${currentTeam.id}` : ''
      const response = await fetch(`/api/views${teamParam}`)
      if (response.ok) {
        const data = await response.json()
        setViews(data)
      }
    } catch (error) {
      console.error('Error fetching views:', error)
    }
  }, [currentTeam])

  useEffect(() => {
    setIsLoading(true)
    fetchViews().finally(() => setIsLoading(false))
  }, [fetchViews])

  const handleViewCreated = (view: unknown) => {
    setViews((prev) => [view as View, ...prev])
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Views</h1>
            <p className="text-muted-foreground">Track team deliverables and work items</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create View
          </Button>
        </div>

        {/* Views Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading views...</div>
        ) : views.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <LayoutGrid className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No views yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a view to start tracking team deliverables.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First View
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {views.map((view) => (
              <ViewCard
                key={view.id}
                view={view}
                onClick={() => router.push(`/views/${view.id}`)}
              />
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <CreateViewDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          teamId={currentTeam?.id}
          onCreated={handleViewCreated}
        />
      </div>
    </div>
  )
}
