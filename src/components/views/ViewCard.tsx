'use client'

import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutGrid, User, Rows3 } from 'lucide-react'

interface ViewCardProps {
  view: {
    id: string
    name: string
    description: string | null
    createdBy: {
      id: string
      name: string
    }
    createdAt: string
    _count?: {
      items: number
      columns: number
    }
    items?: unknown[]
  }
  onClick: () => void
}

export function ViewCard({ view, onClick }: ViewCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50">
              <LayoutGrid className="h-4 w-4 text-blue-600" />
            </div>
            <CardTitle className="text-base">{view.name}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{view.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Rows3 className="h-3 w-3" />
            <span>{view._count?.items ?? view.items?.length ?? 0} items</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{view.createdBy.name}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Created {formatDistanceToNow(new Date(view.createdAt), { addSuffix: true })}
        </p>
      </CardContent>
    </Card>
  )
}
