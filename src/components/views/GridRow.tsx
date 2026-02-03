'use client'

import { GridCell } from './GridCell'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

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

interface GridRowProps {
  item: WorkItem
  columns: Column[]
  users: Array<{ id: string; name: string }>
  onCellChange: (itemId: string, columnId: string, value: unknown) => void
  onDelete: (itemId: string) => void
}

export function GridRow({ item, columns, users, onCellChange, onDelete }: GridRowProps) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 group">
      {columns.map((column) => (
        <td key={column.id} className="border-r border-slate-100 last:border-r-0">
          <GridCell
            columnId={column.id}
            columnName={column.name}
            columnType={column.type}
            columnOptions={column.options}
            value={item.values[column.id]}
            users={users}
            onSave={(columnId, value) => onCellChange(item.id, columnId, value)}
          />
        </td>
      ))}
      <td className="w-10 px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  )
}
