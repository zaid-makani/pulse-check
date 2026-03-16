'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { GridRow } from './GridRow'
import { Button } from '@/components/ui/button'
import { Plus, Filter, X, Search, Maximize2, Minimize2, Download } from 'lucide-react'

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
  viewName: string
  onCellChange: (itemId: string, columnId: string, value: unknown) => void
  onAddRow: () => void
  onDeleteRow: (itemId: string) => void
  onAddColumn: () => void
}

export function ViewGrid({
  columns,
  items,
  users,
  viewName,
  onCellChange,
  onAddRow,
  onDeleteRow,
  onAddColumn,
}: ViewGridProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [filters, setFilters] = useState<Record<string, string[]>>({})

  // Get select-type columns for filtering
  const filterableColumns = columns.filter((c) => c.type === 'select' && c.options.length > 0)

  // Handle sort
  const handleSort = useCallback(
    (columnId: string) => {
      if (sortColumn === columnId) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortColumn(columnId)
        setSortDirection('asc')
      }
    },
    [sortColumn]
  )

  // Filter and sort items
  const processedItems = useMemo(() => {
    let result = [...items]

    // Global search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) =>
        Object.values(item.values).some((val) => {
          if (!val) return false
          const str = String(val).toLowerCase()
          // Also resolve person IDs to names for search
          const user = users.find((u) => u.id === val)
          return str.includes(query) || (user && user.name.toLowerCase().includes(query))
        })
      )
    }

    // Column filters
    for (const [colId, selectedValues] of Object.entries(filters)) {
      if (selectedValues.length > 0) {
        result = result.filter((item) => {
          const val = item.values[colId]
          return val && selectedValues.includes(String(val))
        })
      }
    }

    // Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const aVal = String(a.values[sortColumn] || '')
        const bVal = String(b.values[sortColumn] || '')
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
        return sortDirection === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [items, searchQuery, filters, sortColumn, sortDirection, users])

  const hasActiveFilters = Object.values(filters).some((v) => v.length > 0) || searchQuery.trim() !== ''

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  const toggleFilter = (columnId: string, value: string) => {
    setFilters((prev) => {
      const current = prev[columnId] || []
      if (current.includes(value)) {
        return { ...prev, [columnId]: current.filter((v) => v !== value) }
      }
      return { ...prev, [columnId]: [...current, value] }
    })
  }

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  // CSV export
  const handleExport = useCallback(() => {
    const headers = columns.map((c) => c.name)
    const rows = items.map((item) =>
      columns.map((col) => {
        const val = item.values[col.id]
        if (!val) return ''
        // Resolve person IDs to names
        if (col.type === 'person') {
          const user = users.find((u) => u.id === val)
          return user ? user.name : String(val)
        }
        return String(val)
      })
    )

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${viewName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [columns, items, users, viewName])

  return (
    <div
      ref={containerRef}
      className={`border rounded-lg bg-white overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md w-48 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            />
          </div>

          <Button
            variant={showFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                {Object.values(filters).reduce((a, v) => a + v.length, 0) + (searchQuery ? 1 : 0)}
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} title="Export CSV">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={onAddColumn}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Column
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && filterableColumns.length > 0 && (
        <div className="px-4 py-3 border-b bg-slate-50 flex flex-wrap gap-4 shrink-0">
          {filterableColumns.map((col) => (
            <div key={col.id}>
              <label className="text-xs font-medium text-slate-600 block mb-1.5">{col.name}</label>
              <div className="flex flex-wrap gap-1">
                {col.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => toggleFilter(col.id, option)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      (filters[col.id] || []).includes(option)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="sticky top-0 z-10">
            <tr className="bg-slate-50 border-b">
              {columns.map((column) => (
                <th
                  key={column.id}
                  className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wider border-r border-slate-100 last:border-r-0 cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap"
                  onClick={() => handleSort(column.id)}
                >
                  <div className="flex items-center gap-1">
                    {column.name}
                    {sortColumn === column.id && (
                      <span className="text-violet-600">{sortDirection === 'asc' ? '\u2191' : '\u2193'}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-10 bg-slate-50"></th>
            </tr>
          </thead>
          <tbody>
            {processedItems.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  {items.length === 0
                    ? 'No items yet. Add a row or use AI Suggest.'
                    : 'No items match the current search or filters.'}
                </td>
              </tr>
            ) : (
              processedItems.map((item) => (
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
      <div className="px-4 py-3 border-t shrink-0">
        <Button variant="ghost" size="sm" onClick={onAddRow} className="text-muted-foreground">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Row
        </Button>
      </div>
    </div>
  )
}
