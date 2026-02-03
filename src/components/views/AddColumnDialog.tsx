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
import { Loader2, Plus, X } from 'lucide-react'

interface Column {
  id: string
  name: string
  type: string
  options: string[]
  isSystem: boolean
  order: number
}

interface AddColumnDialogProps {
  viewId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onColumnAdded: (column: Column) => void
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Select (Dropdown)' },
  { value: 'person', label: 'Person' },
]

export function AddColumnDialog({ viewId, open, onOpenChange, onColumnAdded }: AddColumnDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [options, setOptions] = useState<string[]>([''])
  const [isCreating, setIsCreating] = useState(false)

  const handleAddOption = () => {
    setOptions([...options, ''])
  }

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreate = async () => {
    if (!name.trim()) return

    setIsCreating(true)
    try {
      const filteredOptions = type === 'select' ? options.filter((o) => o.trim()) : []

      const response = await fetch(`/api/views/${viewId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          type,
          options: filteredOptions,
        }),
      })

      if (response.ok) {
        const column = await response.json()
        onColumnAdded(column)
        onOpenChange(false)
        // Reset form
        setName('')
        setType('text')
        setOptions([''])
      }
    } catch (error) {
      console.error('Error creating column:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom Column</DialogTitle>
          <DialogDescription>
            Add a new column to track additional data. Custom columns can be deleted later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium block mb-2">Column Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Priority, Notes, Due Date"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Column Type</label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-white"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {COLUMN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Options for select type */}
          {type === 'select' && (
            <div>
              <label className="text-sm font-medium block mb-2">Options</label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                    {options.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => handleRemoveOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={handleAddOption}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              'Add Column'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
