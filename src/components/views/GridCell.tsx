'use client'

import { useState, useRef, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { StatusBadge } from './StatusBadge'
import { ExternalLink } from 'lucide-react'

interface GridCellProps {
  columnId: string
  columnName: string
  columnType: string
  columnOptions: string[]
  value: unknown
  users: Array<{ id: string; name: string }>
  onSave: (columnId: string, value: unknown) => void
}

export function GridCell({
  columnId,
  columnName,
  columnType,
  columnOptions,
  value,
  users,
  onSave,
}: GridCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value ?? '')
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleStartEdit = () => {
    setEditValue(value ?? '')
    setIsEditing(true)
  }

  const handleSave = () => {
    setIsEditing(false)
    if (editValue !== value) {
      onSave(columnId, editValue === '' ? null : editValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && columnType !== 'text') {
      handleSave()
    }
    if (e.key === 'Escape') {
      setEditValue(value ?? '')
      setIsEditing(false)
    }
  }

  const renderDisplay = () => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-slate-300">—</span>
    }

    switch (columnType) {
      case 'text':
        return <span className="text-sm">{String(value)}</span>

      case 'number':
        return <span className="text-sm font-mono">{Number(value)}</span>

      case 'date':
        try {
          const date = typeof value === 'string' ? parseISO(value) : new Date(value as string)
          return <span className="text-sm">{format(date, 'MMM d, yyyy')}</span>
        } catch {
          return <span className="text-sm">{String(value)}</span>
        }

      case 'url':
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate max-w-[120px]">{String(value).replace(/^https?:\/\//, '')}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )

      case 'select':
        const badgeType = columnName === 'Status' ? 'status' : columnName === 'Quarter' ? 'quarter' : 'default'
        return <StatusBadge value={String(value)} type={badgeType} />

      case 'person':
        const user = users.find((u) => u.id === value)
        if (user) {
          return (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                {user.name.charAt(0)}
              </div>
              <span className="text-sm">{user.name}</span>
            </div>
          )
        }
        return <span className="text-sm">{String(value)}</span>

      default:
        return <span className="text-sm">{String(value)}</span>
    }
  }

  const renderEditor = () => {
    switch (columnType) {
      case 'text':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        )

      case 'number':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={editValue === null || editValue === '' ? '' : Number(editValue)}
            onChange={(e) => setEditValue(e.target.value === '' ? '' : Number(e.target.value))}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        )

      case 'date':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={editValue ? String(editValue).split('T')[0] : ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        )

      case 'url':
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="url"
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            placeholder="https://"
          />
        )

      case 'select':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={String(editValue)}
            onChange={(e) => {
              setEditValue(e.target.value)
              // Immediately save on select change
              setTimeout(() => {
                setIsEditing(false)
                if (e.target.value !== value) {
                  onSave(columnId, e.target.value === '' ? null : e.target.value)
                }
              }, 0)
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          >
            <option value="">Select...</option>
            {columnOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'person':
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={String(editValue)}
            onChange={(e) => {
              setEditValue(e.target.value)
              setTimeout(() => {
                setIsEditing(false)
                if (e.target.value !== value) {
                  onSave(columnId, e.target.value === '' ? null : e.target.value)
                }
              }, 0)
            }}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          >
            <option value="">Select person...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        )

      default:
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={String(editValue)}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
          />
        )
    }
  }

  return (
    <div
      className="min-h-[32px] px-2 py-1 cursor-pointer hover:bg-slate-50"
      onClick={() => !isEditing && handleStartEdit()}
    >
      {isEditing ? renderEditor() : renderDisplay()}
    </div>
  )
}
