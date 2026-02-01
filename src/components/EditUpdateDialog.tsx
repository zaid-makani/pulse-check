'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles } from 'lucide-react'

interface StatusUpdate {
  id: string
  rawTranscript: string
  summary: string | null
  completed: string[]
  inProgress: string[]
  blockers: string[]
  needsHelp: string[]
  sentiment: string | null
  createdAt: string
}

interface EditUpdateDialogProps {
  update: StatusUpdate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updated: StatusUpdate) => void
}

export function EditUpdateDialog({ update, open, onOpenChange, onSave }: EditUpdateDialogProps) {
  const [rawTranscript, setRawTranscript] = useState(update?.rawTranscript || '')
  const [summary, setSummary] = useState(update?.summary || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Reset form when update changes
  useEffect(() => {
    if (update) {
      setRawTranscript(update.rawTranscript)
      setSummary(update.summary || '')
    }
  }, [update])

  const handleSave = async () => {
    if (!update) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/status/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript,
          summary,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        onSave(updated)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error saving update:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!update) return

    setIsRegenerating(true)
    try {
      const response = await fetch(`/api/status/${update.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawTranscript,
          regenerate: true,
        }),
      })

      if (response.ok) {
        const updated = await response.json()
        setSummary(updated.summary || '')
        onSave(updated)
      }
    } catch (error) {
      console.error('Error regenerating:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!update) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Status Update</DialogTitle>
          <DialogDescription>
            Make changes to your update. You can edit the transcript and summary, or regenerate the
            AI summary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-2">Original Transcript</label>
            <Textarea
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              className="min-h-[100px]"
              placeholder="What you said..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">AI Summary</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating || isSaving}
              >
                {isRegenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Regenerate with AI
              </Button>
            </div>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="min-h-[80px]"
              placeholder="AI-generated summary..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Edit directly or click Regenerate to have AI re-analyze the transcript.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isRegenerating}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
