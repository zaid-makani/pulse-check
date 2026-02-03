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
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import { StatusBadge } from './StatusBadge'

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

interface Suggestion {
  title: string
  suggestedOwner: string | null
  suggestedStatus: string
  suggestedBlocker: string | null
  suggestedJira: string | null
  confidence: 'high' | 'medium' | 'low'
  sourceUpdateIds: string[]
}

interface AISuggestPanelProps {
  viewId: string
  columns: Column[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuggestionsAdded: (items: WorkItem[]) => void
}

const confidenceColors = {
  high: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-slate-100 text-slate-600',
}

export function AISuggestPanel({
  viewId,
  columns,
  open,
  onOpenChange,
  onSuggestionsAdded,
}: AISuggestPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isAdding, setIsAdding] = useState(false)
  const [days, setDays] = useState(7)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchSuggestions = async () => {
    setIsLoading(true)
    setHasFetched(true)
    try {
      const response = await fetch(`/api/views/${viewId}/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
        // Select high confidence suggestions by default
        const highConfidenceIndices = new Set<number>()
        data.suggestions?.forEach((s: Suggestion, i: number) => {
          if (s.confidence === 'high') {
            highConfidenceIndices.add(i)
          }
        })
        setSelected(highConfidenceIndices)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelected(new Set(suggestions.map((_, i) => i)))
  }

  const selectNone = () => {
    setSelected(new Set())
  }

  const handleAddSelected = async () => {
    if (selected.size === 0) return

    setIsAdding(true)
    const newItems: WorkItem[] = []

    // Find column IDs
    const titleCol = columns.find((c) => c.name === 'Title')
    const ownerCol = columns.find((c) => c.name === 'Owner')
    const statusCol = columns.find((c) => c.name === 'Status')
    const blockerCol = columns.find((c) => c.name === 'Blocker Notes')
    const jiraCol = columns.find((c) => c.name === 'JIRA Link')

    try {
      for (const index of Array.from(selected)) {
        const suggestion = suggestions[index]
        if (!suggestion) continue

        const values: Record<string, unknown> = {}
        if (titleCol) values[titleCol.id] = suggestion.title
        if (ownerCol && suggestion.suggestedOwner) values[ownerCol.id] = suggestion.suggestedOwner
        if (statusCol) values[statusCol.id] = suggestion.suggestedStatus
        if (blockerCol && suggestion.suggestedBlocker) values[blockerCol.id] = suggestion.suggestedBlocker
        if (jiraCol && suggestion.suggestedJira) values[jiraCol.id] = suggestion.suggestedJira

        const response = await fetch(`/api/views/${viewId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        })

        if (response.ok) {
          const item = await response.json()
          newItems.push(item)
        }
      }

      if (newItems.length > 0) {
        onSuggestionsAdded(newItems)
        onOpenChange(false)
        // Reset state
        setSuggestions([])
        setSelected(new Set())
        setHasFetched(false)
      }
    } catch (error) {
      console.error('Error adding suggestions:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state when closing
    setSuggestions([])
    setSelected(new Set())
    setHasFetched(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Suggest Work Items
          </DialogTitle>
          <DialogDescription>
            Analyze recent status updates to suggest work items for this view.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col py-4">
          {/* Options */}
          {!hasFetched && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">Analyze updates from the last</label>
                <select
                  className="px-3 py-2 border rounded-md bg-white"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <Button onClick={fetchSuggestions} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing updates...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-muted-foreground">Analyzing status updates...</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && hasFetched && (
            <>
              {suggestions.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-muted-foreground">No work items could be extracted from recent updates.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setHasFetched(false)}>
                    Try Different Settings
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground">
                      {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} found
                    </p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={selectAll}>
                        Select All
                      </Button>
                      <Button variant="ghost" size="sm" onClick={selectNone}>
                        Select None
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selected.has(index) ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50'
                        }`}
                        onClick={() => toggleSelection(index)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                            selected.has(index) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                          }`}>
                            {selected.has(index) && <CheckCircle2 className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900">{suggestion.title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <StatusBadge value={suggestion.suggestedStatus} type="status" />
                              <span className={`px-1.5 py-0.5 text-xs rounded ${confidenceColors[suggestion.confidence]}`}>
                                {suggestion.confidence} confidence
                              </span>
                            </div>
                            {suggestion.suggestedBlocker && (
                              <p className="text-xs text-red-600 mt-1.5">
                                Blocker: {suggestion.suggestedBlocker}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>
            Cancel
          </Button>
          {hasFetched && suggestions.length > 0 && (
            <Button onClick={handleAddSelected} disabled={isAdding || selected.size === 0}>
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                `Add ${selected.size} Item${selected.size !== 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
