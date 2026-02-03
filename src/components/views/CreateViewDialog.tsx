'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

interface CreateViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: Array<{ id: string; name: string }>
  onCreated: (view: unknown) => void
}

export function CreateViewDialog({ open, onOpenChange, users, onCreated }: CreateViewDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createdById, setCreatedById] = useState(users[0]?.id || '')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim() || !createdById) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          createdById,
        }),
      })

      if (response.ok) {
        const view = await response.json()
        onCreated(view)
        onOpenChange(false)
        setName('')
        setDescription('')
      }
    } catch (error) {
      console.error('Error creating view:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New View</DialogTitle>
          <DialogDescription>
            Create a view to track team deliverables. System columns will be added automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-2">View Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 42 Deliverables"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this view tracking?"
              className="min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Created By</label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-white"
              value={createdById}
              onChange={(e) => setCreatedById(e.target.value)}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim() || !createdById}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              'Create View'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
