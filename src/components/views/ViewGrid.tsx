'use client'

import { useState, useMemo } from 'react'
import { GridRow } from './GridRow'
import { Button } from '@/components/ui/button'
import { Plus, Filter, X } from 'lucide-react'

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

interface ViewGridProps {
  columns: Column[]
  items: WorkItem[]
  users: Array<{ id: string; name: string }>
  onCellChange: (itemId: string, columnId: string, value: unknown) => void
  onAddRow: () => void
  onDeleteRow: (itemId: string) => void
  onAddColumn: () => void
}

export function ViewGrid({
  columns,
  items,
  users,
  onCellChange,
  onAddRow,
  onDeleteRow,
  onAddColumn,
}: ViewGridProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<{
    status: string[]
    owner: string[]
    sprint: string
    quarter: string[]
  }>({
    status: [],
    owner: [],
    sprint: '',
    quarter: [],
  })

  // Get column IDs for filtering
  const statusColumn = columns.find((c) => c.name === 'Status')
  const ownerColumn = columns.find((c) => c.name === 'Owner')
  const sprintColumn = columns.find((c) => c.name === 'Sprint')
  const quarterColumn = columns.find((c) => c.name === 'Quarter')

  // Filter items client-side
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (filters.status.length > 0 && statusColumn) {
        const itemStatus = item.values[statusColumn.id]
        if (!itemStatus || !filters.status.includes(String(itemStatus))) {
          return false
        }
      }

      // Owner filter
      if (filters.owner.length > 0 && ownerColumn) {
        const itemOwner = item.values[ownerColumn.id]
        if (!itemOwner || !filters.owner.includes(String(itemOwner))) {
          return false
        }
      }

      // Sprint filter
      if (filters.sprint && sprintColumn) {
        const itemSprint = item.values[sprintColumn.id]
        if (!itemSprint || !String(itemSprint).toLowerCase().includes(filters.sprint.toLowerCase())) {
          return false
        }
      }

      // Quarter filter
      if (filters.quarter.length > 0 && quarterColumn) {
        const itemQuarter = item.values[quarterColumn.id]
        if (!itemQuarter || !filters.quarter.includes(String(itemQuarter))) {
          return false
        }
      }

      return true
    })
  }, [items, filters, statusColumn, ownerColumn, sprintColumn, quarterColumn])

  const hasActiveFilters = filters.status.length > 0 || filters.owner.length > 0 || filters.sprint || filters.quarter.length > 0

  const clearFilters = () => {
    setFilters({ status: [], owner: [], sprint: '', quarter: [] })
  }

  const toggleFilter = (type: 'status' | 'owner' | 'quarter', value: string) => {
    setFilters((prev) => {
      const current = prev[type] as string[]
      if (current.includes(value)) {
        return { ...prev, [type]: current.filter((v) => v !== value) }
      }
      return { ...prev, [type]: [...current, value] }
    })
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {filters.status.length + filters.owner.length + (filters.sprint ? 1 : 0) + filters.quarter.length}
              </span>
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onAddColumn}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Column
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap gap-4">
          {/* Status Filter */}
          {statusColumn && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Status</label>
              <div className="flex flex-wrap gap-1">
                {statusColumn.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleFilter('status', option)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      filters.status.includes(option)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Owner Filter */}
          {ownerColumn && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Owner</label>
              <div className="flex flex-wrap gap-1">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleFilter('owner', user.id)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      filters.owner.includes(user.id)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {user.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sprint Filter */}
          {sprintColumn && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Sprint</label>
              <input
                type="text"
                placeholder="Filter by sprint..."
                className="px-2 py-1 text-xs border rounded"
                value={filters.sprint}
                onChange={(e) => setFilters((prev) => ({ ...prev, sprint: e.target.value }))}
              />
            </div>
          )}

          {/* Quarter Filter */}
          {quarterColumn && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">Quarter</label>
              <div className="flex flex-wrap gap-1">
                {quarterColumn.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleFilter('quarter', option)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      filters.quarter.includes(option)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b">
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-r border-slate-100 last:border-r-0"
                >
                  <div className="flex items-center gap-1">
                    {column.name}
                    {!column.isSystem && (
                      <span className="text-slate-400 normal-case font-normal">(custom)</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  {items.length === 0
                    ? 'No work items yet. Add one or use AI Suggest.'
                    : 'No items match the current filters.'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <GridRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  users={users}
                  onCellChange={onCellChange}
                  onDelete={onDeleteRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Button */}
      <div className="px-4 py-3 border-t">
        <Button variant="ghost" size="sm" onClick={onAddRow} className="text-muted-foreground">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Row
        </Button>
      </div>
    </div>
  )
}
