export type ColumnType = 'text' | 'number' | 'date' | 'url' | 'select' | 'person'

export type ViewType = 'one-on-one' | 'sprint' | 'custom'

export interface TemplateColumn {
  name: string
  type: ColumnType
  order: number
  options?: string[]
}

export const VIEW_TEMPLATES: Record<ViewType, {
  label: string
  description: string
  icon: string
  columns: TemplateColumn[]
}> = {
  'one-on-one': {
    label: '1-on-1 Prep',
    description: 'Prepare for 1-on-1 meetings with auto-populated updates from a team member',
    icon: 'Users',
    columns: [
      { name: 'Period', type: 'text', order: 0 },
      { name: 'Completed', type: 'text', order: 1 },
      { name: 'In Progress', type: 'text', order: 2 },
      { name: 'Blockers', type: 'text', order: 3 },
      { name: 'Sentiment', type: 'select', order: 4, options: ['positive', 'neutral', 'concerned', 'frustrated'] },
      { name: 'Notes', type: 'text', order: 5 },
    ],
  },
  sprint: {
    label: 'Sprint Board',
    description: 'Track sprint work items, story points, and blockers',
    icon: 'Kanban',
    columns: [
      { name: 'Title', type: 'text', order: 0 },
      { name: 'Owner', type: 'person', order: 1 },
      { name: 'Status', type: 'select', order: 2, options: ['Backlog', 'In Progress', 'In Review', 'QA', 'Done', 'Blocked'] },
      { name: 'Project', type: 'text', order: 3 },
      { name: 'JIRA Link', type: 'url', order: 4 },
      { name: 'Story Points', type: 'number', order: 5 },
      { name: 'Sprint', type: 'text', order: 6 },
      { name: 'Quarter', type: 'select', order: 7, options: ['Q1', 'Q2', 'Q3', 'Q4'] },
      { name: 'Release Date', type: 'date', order: 8 },
      { name: 'Blocker Notes', type: 'text', order: 9 },
    ],
  },
  custom: {
    label: 'Custom',
    description: 'Start from scratch with your own columns',
    icon: 'Settings',
    columns: [], // User defines columns after creation
  },
}

// Keep backward compat for existing code that imports SYSTEM_COLUMNS
export const SYSTEM_COLUMNS = VIEW_TEMPLATES.sprint.columns
