'use client'

import { useState } from 'react'
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
import { Loader2 } from 'lucide-react'

interface DeleteUpdateDialogProps {
  updateId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}

export function DeleteUpdateDialog({
  updateId,
  open,
  onOpenChange,
  onDeleted,
}: DeleteUpdateDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!updateId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/status/${updateId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onDeleted(updateId)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error deleting update:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Status Update</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this status update? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
