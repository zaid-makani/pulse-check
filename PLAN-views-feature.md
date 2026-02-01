# Views Feature - Implementation Plan

## Overview

Build a collaborative, editable grid system for tracking team deliverables. Views are decoupled from individual updates but can be seeded via AI Suggest.

---

## Data Model

### New Prisma Schema

```prisma
model View {
  id          String       @id @default(cuid())
  name        String       // "Sprint 23 Tracker", "Q1 All Projects"
  description String?      // Purpose of this view
  createdById String
  createdBy   User         @relation(fields: [createdById], references: [id])
  columns     ViewColumn[]
  items       WorkItem[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model ViewColumn {
  id        String   @id @default(cuid())
  viewId    String
  view      View     @relation(fields: [viewId], references: [id], onDelete: Cascade)
  name      String   // "JIRA Link", "Story Points", "My Custom Field"
  type      String   // text, number, date, url, select, person
  options   String   @default("[]") // JSON array for select options
  isSystem  Boolean  @default(false) // true = fixed column, false = custom
  order     Int      // display order
  width     Int?     // optional column width
  createdAt DateTime @default(now())
}

model WorkItem {
  id        String   @id @default(cuid())
  viewId    String
  view      View     @relation(fields: [viewId], references: [id], onDelete: Cascade)
  values    String   @default("{}") // JSON: { columnId: value, ... }
  order     Int      // row order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### System Columns (Auto-created for each view)

| Name | Type | Options |
|------|------|---------|
| Title | text | - |
| Owner | person | - |
| Status | select | Backlog, In Progress, In Review, QA, Done, Blocked |
| Project | text | - |
| JIRA Link | url | - |
| Story Points | number | - |
| Sprint | text | - |
| Quarter | select | Q1, Q2, Q3, Q4 |
| Release Date | date | - |
| Blocker Notes | text | - |

---

## API Endpoints

### Views

```
GET    /api/views              - List all views
POST   /api/views              - Create new view (auto-creates system columns)
GET    /api/views/[id]         - Get view with columns and items
PATCH  /api/views/[id]         - Update view name/description
DELETE /api/views/[id]         - Delete view (cascades to columns and items)
```

### Columns

```
POST   /api/views/[id]/columns      - Add custom column
PATCH  /api/views/[id]/columns/[colId] - Update column (name, options, order)
DELETE /api/views/[id]/columns/[colId] - Delete column (only custom)
```

### Work Items

```
POST   /api/views/[id]/items        - Add new row
PATCH  /api/views/[id]/items/[itemId] - Update row values
DELETE /api/views/[id]/items/[itemId] - Delete row
PATCH  /api/views/[id]/items/reorder - Reorder rows
```

### AI Suggest

```
POST   /api/views/[id]/suggest      - Get AI suggestions from recent updates
  Request: { days?: number }        - How far back to look (default 7)
  Response: { suggestions: [...] }  - Proposed work items with pre-filled values
```

---

## UI Components

### Pages

1. **`/views`** - Views list
   - Cards showing all views
   - Create new view button
   - Click to open view

2. **`/views/[id]`** - View detail (the grid)
   - Toolbar: View name, description, filters, AI Suggest button, Add Column
   - Editable grid with inline editing
   - Add Row button
   - Click row to expand (optional: show related updates in future)

### Components

```
src/components/views/
├── ViewCard.tsx          - Card for views list
├── CreateViewDialog.tsx  - Modal to create new view
├── ViewGrid.tsx          - The main editable grid
├── GridCell.tsx          - Editable cell (handles different types)
├── AddColumnDialog.tsx   - Modal to add custom column
├── AISuggestPanel.tsx    - Slide-out panel showing AI suggestions
├── ColumnHeader.tsx      - Column header with resize/menu
└── StatusBadge.tsx       - Colored status indicator
```

---

## Implementation Phases

### Phase 1: Data Foundation
- [ ] Add Prisma schema for View, ViewColumn, WorkItem
- [ ] Run migration
- [ ] Create API routes for Views CRUD
- [ ] Create API routes for Columns CRUD
- [ ] Create API routes for WorkItems CRUD

### Phase 2: Basic UI
- [ ] Create `/views` page with list of views
- [ ] Create `CreateViewDialog` component
- [ ] Create `/views/[id]` page with basic grid
- [ ] Implement `ViewGrid` with inline editing
- [ ] Implement `GridCell` for each column type (text, number, date, url, select, person)

### Phase 3: Grid Polish
- [ ] Add row button + new row creation
- [ ] Column reordering (drag & drop or arrows)
- [ ] Row reordering
- [ ] Delete row with confirmation
- [ ] Filter dropdowns (by status, owner, sprint)

### Phase 4: Custom Columns
- [ ] Create `AddColumnDialog` component
- [ ] API for adding custom columns
- [ ] Render custom columns in grid
- [ ] Delete custom column option

### Phase 5: AI Suggest
- [ ] Create `/api/views/[id]/suggest` endpoint
- [ ] AI prompt to extract work items from recent updates
- [ ] Create `AISuggestPanel` component
- [ ] Accept/reject suggestions flow
- [ ] Bulk add selected suggestions

### Phase 6: Navigation & Polish
- [ ] Add "Views" to global nav
- [ ] Empty states
- [ ] Loading states
- [ ] Error handling
- [ ] Keyboard navigation in grid

---

## AI Suggest Logic

### Prompt Strategy

```
Given these recent status updates from team members:

[List of updates with user names, summaries, blockers]

Extract potential WORK ITEMS that should be tracked in a delivery view.

For each work item, provide:
- title: Clear, concise name for the deliverable
- suggestedOwner: Who mentioned this work
- suggestedStatus: Based on context (In Progress, Blocked, Done, etc.)
- suggestedBlocker: Any blockers mentioned
- confidence: How confident you are this is a distinct work item (high/medium/low)

Rules:
- Only extract items that represent concrete deliverables
- Skip routine activities (meetings, code reviews, small fixes)
- Combine related updates into single work items
- If someone mentioned "JIRA-XXX", include it as suggestedJira
```

### Response Format

```json
{
  "suggestions": [
    {
      "title": "Auth Refactor",
      "suggestedOwner": "user_id_here",
      "suggestedStatus": "Blocked",
      "suggestedBlocker": "Waiting on PR review from Priya",
      "suggestedJira": "JIRA-456",
      "confidence": "high",
      "sourceUpdates": ["update_id_1", "update_id_2"]
    }
  ]
}
```

---

## Grid Cell Types

| Type | Render | Edit |
|------|--------|------|
| text | Plain text | Input field |
| number | Number | Number input |
| date | Formatted date | Date picker |
| url | Clickable link | Input field |
| select | Badge/chip | Dropdown |
| person | Avatar + name | User dropdown |

---

## Filters (Phase 3)

Quick filters at top of grid:
- **Status**: Multi-select dropdown
- **Owner**: Multi-select dropdown
- **Sprint**: Single-select dropdown
- **Quarter**: Single-select dropdown

Filters apply client-side for fast interaction.

---

## Open Questions (Decide as we build)

1. **Row expansion** - Should clicking a row expand to show more details/linked updates?
2. **Bulk actions** - Select multiple rows, bulk status change?
3. **Export** - Export view to CSV?
4. **Permissions** - Can anyone edit any view, or only creator?
5. **View templates** - Pre-made templates (Sprint Tracker, Project Board)?

---

## Files to Create/Modify

### Schema
- `prisma/schema.prisma` - Add View, ViewColumn, WorkItem models

### API Routes
- `src/app/api/views/route.ts` - List, Create views
- `src/app/api/views/[id]/route.ts` - Get, Update, Delete view
- `src/app/api/views/[id]/columns/route.ts` - Add column
- `src/app/api/views/[id]/columns/[colId]/route.ts` - Update, Delete column
- `src/app/api/views/[id]/items/route.ts` - Add item
- `src/app/api/views/[id]/items/[itemId]/route.ts` - Update, Delete item
- `src/app/api/views/[id]/suggest/route.ts` - AI suggestions

### Pages
- `src/app/views/page.tsx` - Views list
- `src/app/views/[id]/page.tsx` - View detail with grid

### Components
- `src/components/views/ViewCard.tsx`
- `src/components/views/CreateViewDialog.tsx`
- `src/components/views/ViewGrid.tsx`
- `src/components/views/GridCell.tsx`
- `src/components/views/AddColumnDialog.tsx`
- `src/components/views/AISuggestPanel.tsx`
- `src/components/views/ColumnHeader.tsx`
- `src/components/views/StatusBadge.tsx`

### Navigation
- Update `src/components/NavHeader.tsx` - Add Views link

---

## Estimated Scope

- **Phase 1-2**: Core foundation - Views work, basic grid editing
- **Phase 3-4**: Polish - Filters, custom columns, better UX
- **Phase 5**: AI magic - The differentiator
- **Phase 6**: Production ready

Ready to start with Phase 1?
