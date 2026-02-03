'use client'

import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  'Backlog': 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'In Review': 'bg-purple-100 text-purple-700',
  'QA': 'bg-orange-100 text-orange-700',
  'Done': 'bg-green-100 text-green-700',
  'Blocked': 'bg-red-100 text-red-700',
}

const quarterColors: Record<string, string> = {
  'Q1': 'bg-cyan-100 text-cyan-700',
  'Q2': 'bg-emerald-100 text-emerald-700',
  'Q3': 'bg-amber-100 text-amber-700',
  'Q4': 'bg-violet-100 text-violet-700',
}

interface StatusBadgeProps {
  value: string
  type?: 'status' | 'quarter' | 'default'
  className?: string
}

export function StatusBadge({ value, type = 'default', className }: StatusBadgeProps) {
  let colorClass = 'bg-slate-100 text-slate-700'

  if (type === 'status' && statusColors[value]) {
    colorClass = statusColors[value]
  } else if (type === 'quarter' && quarterColors[value]) {
    colorClass = quarterColors[value]
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {value}
    </span>
  )
}
