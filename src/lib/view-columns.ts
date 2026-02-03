export const SYSTEM_COLUMNS = [
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
] as const

export type ColumnType = 'text' | 'number' | 'date' | 'url' | 'select' | 'person'

export interface SystemColumn {
  name: string
  type: ColumnType
  order: number
  options?: string[]
}
