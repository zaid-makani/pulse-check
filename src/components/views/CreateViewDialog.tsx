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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Users, Kanban, Settings, ArrowLeft, Plus, X } from 'lucide-react'
import { VIEW_TEMPLATES, ViewType, ColumnType } from '@/lib/view-columns'

interface TeamMember {
  id: string
  name: string
  email: string
}

interface CustomColumn {
  name: string
  type: ColumnType
  options: string[]
}

interface CreateViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamId?: string
  onCreated: (view: unknown) => void
}

const TEMPLATE_ICONS = {
  'one-on-one': Users,
  sprint: Kanban,
  custom: Settings,
}

const TIME_RANGES = [
  { value: '1w', label: 'Last week' },
  { value: '2w', label: 'Last 2 weeks' },
  { value: '1m', label: 'Last month' },
  { value: '3m', label: 'Last 3 months' },
]

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown' },
  { value: 'person', label: 'Person' },
]

export function CreateViewDialog({ open, onOpenChange, teamId, onCreated }: CreateViewDialogProps) {
  const [step, setStep] = useState<'template' | 'configure'>('template')
  const [selectedType, setSelectedType] = useState<ViewType | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // 1-on-1 specific
  const [targetUserId, setTargetUserId] = useState('')
  const [timeRange, setTimeRange] = useState('2w')
  const [availableUsers, setAvailableUsers] = useState<TeamMember[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // Custom specific
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([
    { name: '', type: 'text', options: [] },
  ])

  // Fetch users when 1-on-1 is selected
  useEffect(() => {
    if (selectedType === 'one-on-one' && step === 'configure') {
      setIsLoadingUsers(true)
      // Fetch users from all teams the current user is in
      fetch('/api/users')
        .then((r) => r.json())
        .then((data) => setAvailableUsers(data))
        .catch(console.error)
        .finally(() => setIsLoadingUsers(false))
    }
  }, [selectedType, step])

  const handleSelectTemplate = (type: ViewType) => {
    setSelectedType(type)
    const template = VIEW_TEMPLATES[type]
    setName(template.label === 'Custom' ? '' : template.label)
    setDescription('')
    setTargetUserId('')
    setTimeRange('2w')
    setCustomColumns([{ name: '', type: 'text', options: [] }])
    setStep('configure')
  }

  const handleBack = () => {
    setStep('template')
    setSelectedType(null)
  }

  const handleAddCustomColumn = () => {
    setCustomColumns([...customColumns, { name: '', type: 'text', options: [] }])
  }

  const handleRemoveCustomColumn = (index: number) => {
    setCustomColumns(customColumns.filter((_, i) => i !== index))
  }

  const handleUpdateCustomColumn = (index: number, field: string, value: string) => {
    const updated = [...customColumns]
    if (field === 'name') updated[index].name = value
    if (field === 'type') {
      updated[index].type = value as ColumnType
      if (value !== 'select') updated[index].options = []
    }
    setCustomColumns(updated)
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    if (selectedType === 'one-on-one' && !targetUserId) return

    setIsCreating(true)
    try {
      // Build columns for custom views
      const columnsPayload = selectedType === 'custom'
        ? customColumns
            .filter((c) => c.name.trim())
            .map((c, i) => ({
              name: c.name.trim(),
              type: c.type,
              order: i,
              ...(c.type === 'select' && c.options.length > 0 ? { options: c.options.filter(Boolean) } : {}),
            }))
        : undefined

      const response = await fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          teamId,
          type: selectedType,
          targetUserId: selectedType === 'one-on-one' ? targetUserId : undefined,
          timeRange: selectedType === 'one-on-one' ? timeRange : undefined,
          columns: columnsPayload,
        }),
      })

      if (response.ok) {
        const view = await response.json()

        // Auto-populate for 1-on-1 views
        if (selectedType === 'one-on-one') {
          try {
            await fetch(`/api/views/${view.id}/populate`, { method: 'POST' })
          } catch {
            // Non-fatal: view created, population can be retried
          }
        }

        onCreated(view)
        onOpenChange(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error creating view:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setStep('template')
    setSelectedType(null)
    setName('')
    setDescription('')
    setTargetUserId('')
    setTimeRange('2w')
    setCustomColumns([{ name: '', type: 'text', options: [] }])
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm()
    onOpenChange(open)
  }

  const selectedUserName = availableUsers.find((u) => u.id === targetUserId)?.name

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        {step === 'template' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create a View</DialogTitle>
              <DialogDescription>Choose a template to get started</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {(Object.entries(VIEW_TEMPLATES) as [ViewType, typeof VIEW_TEMPLATES[ViewType]][]).map(
                ([type, template]) => {
                  const Icon = TEMPLATE_ICONS[type]
                  return (
                    <button
                      key={type}
                      onClick={() => handleSelectTemplate(type)}
                      className="w-full flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-violet-300 hover:bg-violet-50/30 transition-colors text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <Icon className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{template.label}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{template.description}</p>
                      </div>
                    </button>
                  )
                }
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button onClick={handleBack} className="p-1 hover:bg-slate-100 rounded">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <DialogTitle>
                    {selectedType === 'one-on-one' && '1-on-1 Prep'}
                    {selectedType === 'sprint' && 'Sprint Board'}
                    {selectedType === 'custom' && 'Custom View'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedType === 'one-on-one' && 'Select a person and time range to auto-populate'}
                    {selectedType === 'sprint' && 'Track sprint work items and deliverables'}
                    {selectedType === 'custom' && 'Define your own columns'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium block mb-2">View Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    selectedType === 'one-on-one'
                      ? `1-on-1 with ${selectedUserName || '...'}`
                      : selectedType === 'sprint'
                      ? 'e.g., Sprint 42'
                      : 'e.g., Q1 OKR Tracker'
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Description (optional)</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this view for?"
                  className="min-h-[60px]"
                />
              </div>

              {/* 1-on-1 specific fields */}
              {selectedType === 'one-on-one' && (
                <>
                  <div>
                    <label className="text-sm font-medium block mb-2">Team Member</label>
                    {isLoadingUsers ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading team members...
                      </div>
                    ) : (
                      <select
                        value={targetUserId}
                        onChange={(e) => {
                          setTargetUserId(e.target.value)
                          const user = availableUsers.find((u) => u.id === e.target.value)
                          if (user && !name) {
                            setName(`1-on-1 with ${user.name}`)
                          }
                        }}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">Select a person...</option>
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-2">Time Range</label>
                    <div className="flex gap-2">
                      {TIME_RANGES.map((range) => (
                        <button
                          key={range.value}
                          onClick={() => setTimeRange(range.value)}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            timeRange === range.value
                              ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Custom column definition */}
              {selectedType === 'custom' && (
                <div>
                  <label className="text-sm font-medium block mb-2">Columns</label>
                  <div className="space-y-2">
                    {customColumns.map((col, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={col.name}
                          onChange={(e) => handleUpdateCustomColumn(index, 'name', e.target.value)}
                          placeholder="Column name"
                          className="flex-1"
                        />
                        <select
                          value={col.type}
                          onChange={(e) => handleUpdateCustomColumn(index, 'type', e.target.value)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-2 text-sm"
                        >
                          {COLUMN_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        {customColumns.length > 1 && (
                          <button
                            onClick={() => handleRemoveCustomColumn(index)}
                            className="p-1.5 text-slate-400 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={handleAddCustomColumn}
                      className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium mt-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add column
                    </button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  isCreating ||
                  !name.trim() ||
                  (selectedType === 'one-on-one' && !targetUserId) ||
                  (selectedType === 'custom' && customColumns.every((c) => !c.name.trim()))
                }
              >
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
