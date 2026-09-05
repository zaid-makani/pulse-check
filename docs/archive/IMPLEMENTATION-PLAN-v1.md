# PulseCheck — Implementation Plan

> **Scope:** Post-MVP improvements based on product review
> **Approach:** Ship in focused phases. Each phase is independently valuable.

---

## Phase 8: Dashboard Redesign

**Goal:** Transform the dashboard from a cluttered 5-component page into a focused daily briefing that answers "what needs my attention?" in 5 seconds.

### Changes

| Action | Detail |
|--------|--------|
| **Remove** stats cards | "5 team members" and "3 updates today" are vanity metrics a manager already knows. Reclaim the space. |
| **Remove** Recent Updates tab | Redundant with My Updates page. Kills a tab, simplifies the page. |
| **Elevate** AI Insights | Make it the hero section at the top. Restyle from dismissible alerts to a "Daily Briefing" card — feels like an AI analyst reporting to you each morning. |
| **Auto-show** latest digest | Instead of a "Generate Digest" button, auto-fetch and display the most recent digest. Add a "Refresh" option for regeneration. |
| **Keep** Team Pulse table | This is the highest-value component — who's blocked, who's quiet. Keep it as the primary data view below the briefing. |

### Final layout

```
┌──────────────────────────────────────────┐
│  Daily Briefing (AI Insights)            │
│  "2 blockers need attention. Amit hasn't │
│   posted in 3 days. Sprint velocity is   │
│   tracking below target."                │
├──────────────────────────────────────────┤
│  Team Pulse                              │
│  ┌──────┬────────┬─────────┬──────────┐  │
│  │ Name │ Status │ Blockers│ Last Seen│  │
│  ├──────┼────────┼─────────┼──────────┤  │
│  │ ...  │ ...    │ ...     │ ...      │  │
│  └──────┴────────┴─────────┴──────────┘  │
├──────────────────────────────────────────┤
│  AI Digest (auto-loaded, collapsible)    │
│  Accomplishments | WIP | Blockers | ...  │
└──────────────────────────────────────────┘
```

### Files to modify
- `src/app/dashboard/page.tsx` — restructure layout, remove stats cards and Recent Updates tab
- `src/components/TeamPulseTable.tsx` — minor styling updates to work as standalone (not tabbed)

### Effort: Small (~1 session)

---

## Phase 9: Views Enhancement

**Goal:** Make Views a self-updating, cross-functional tracking tool that replaces Confluence pages and Excel sheets for leadership.

### 9a: Auto-population from updates

Currently AI Suggest is a manual button. Change it to:

1. When a View is opened, check if there are new status updates since last suggestion run
2. Show a non-intrusive banner: "3 new updates since last sync — Review suggestions?"
3. Clicking the banner opens the existing AISuggestPanel flow
4. Track `lastSuggestedAt` timestamp on the View model

**Files:**
- `prisma/schema.prisma` — add `lastSuggestedAt DateTime?` to View
- `src/app/views/[id]/page.tsx` — add new-updates detection and banner
- `src/components/views/AISuggestPanel.tsx` — update `lastSuggestedAt` after suggesting

### 9b: Change tracking

Surface what changed since the user's last visit:

1. Track `lastViewedAt` per user per View (new model: `ViewActivity`)
2. On open, compare WorkItem `updatedAt` against `lastViewedAt`
3. Highlight recently changed cells with a subtle accent (e.g. left border pulse)
4. Show summary: "5 items updated since your last visit"

**Files:**
- `prisma/schema.prisma` — add `ViewActivity` model (userId, viewId, lastViewedAt)
- `src/app/api/views/[id]/activity/route.ts` — GET/PATCH for tracking visits
- `src/app/views/[id]/page.tsx` — fetch activity, highlight changes
- `src/components/views/GridRow.tsx` — conditional highlight styling

### 9c: Multi-team Views

Allow a View to be linked to multiple teams:

1. Change View.teamId from single FK to a many-to-many relation (ViewTeam join table)
2. AI Suggest pulls updates from all linked teams
3. View creation dialog gets a multi-team selector
4. Person column dropdown shows members from all linked teams

**Files:**
- `prisma/schema.prisma` — add `ViewTeam` join model, update View relations
- `src/app/api/views/route.ts` — support multiple teamIds on create
- `src/app/api/views/[id]/suggest/route.ts` — aggregate updates from linked teams
- `src/components/views/CreateViewDialog.tsx` — multi-team selector UI

### 9d: Column presets

Pre-built column configurations for different use cases:

- **Sprint Tracker** (default, current): Title, Owner, Status, Sprint, Story Points, Blocker Notes
- **Project Portfolio** (CTO): Project, Owner, Health, % Complete, ETA, Risk, Quarter
- **Release Tracker**: Feature, Owner, Status, JIRA Link, Release Date, QA Status

Show preset selector in CreateViewDialog. Presets define which system columns to include and in what order.

**Files:**
- `src/lib/view-columns.ts` — add preset definitions
- `src/components/views/CreateViewDialog.tsx` — preset selector dropdown

### Effort: Medium (~3-4 sessions across 9a-9d)

---

## Phase 10: Input Diversification

**Goal:** The update should write itself. Reduce friction by gathering signals from where developers already work.

### 10a: Promote Slack as primary input

The Slack slash command already exists but is buried. Make it a first-class input:

1. Add Slack setup guidance to onboarding (Step 2)
2. In Team Settings, add a "Slack Integration" section with setup instructions and link test
3. Daily reminder emails include a note: "Or reply from Slack: /pulsecheck <your update>"

**Files:**
- `src/app/onboarding/page.tsx` — add Slack tip to Step 2
- `src/app/teams/[id]/settings/page.tsx` — Slack integration section with instructions
- `src/lib/email.ts` — add Slack tip to reminder email template

### 10b: Git-based draft updates

Daily cron job that generates draft updates from git activity:

1. New model: `GitIntegration` (teamId, provider, accessToken, repos[])
2. Team Settings UI: connect GitHub account, select repos
3. Cron job (`/api/cron/git-drafts`):
   - For each team with git integration, pull commits/PRs from last 24h per user
   - Send to Claude: "Summarize this developer's activity into a status update draft"
   - Store as a draft StatusUpdate (new `isDraft` flag)
4. User sees draft on Submit page: "We noticed you merged 2 PRs today — here's a draft:"
5. User can edit and confirm, or discard and write their own

**Files:**
- `prisma/schema.prisma` — add `GitIntegration` model, add `isDraft` to StatusUpdate
- `src/app/api/teams/[id]/git-integration/route.ts` — CRUD for git config
- `src/app/api/cron/git-drafts/route.ts` — cron job logic
- `src/lib/github.ts` — GitHub API wrapper (commits, PRs per user)
- `src/app/submit/page.tsx` — show draft if available
- `src/app/teams/[id]/settings/page.tsx` — git integration UI

### 10c: Passive signal enrichment

Enhance insights with passive data even when users don't submit:

1. For users with git integration: track activity vs. update submissions
2. AI Insights can say: "Amit hasn't posted in 3 days but has been active (4 commits, 1 PR merged)" vs. "Amit has gone silent"
3. This is additive context for existing insights — no new UI surface, just richer insight text

**Files:**
- `src/app/api/insights/route.ts` — enrich missing-update insights with git activity data
- `src/lib/ai.ts` — update insight generation prompts

### Effort: Large (~4-5 sessions, 10b is the biggest piece)

---

## Phase 11: Heartbeat — Cross-Team View

**Goal:** Give directors and CTOs a portfolio-level view of project health across teams, auto-derived from pulse data.

### 11a: Organization model

Add the org layer above teams:

1. New model: `Organization` (name, slug)
2. Link Teams to Organization
3. New role: `ORG_ADMIN` on Organization (cross-team visibility)
4. Migration script: create default org, assign existing teams

**Files:**
- `prisma/schema.prisma` — add Organization model, OrgMembership, update Team
- `prisma/migrations/` — migration + seed update
- `src/components/TeamProvider.tsx` — extend to include org context

### 11b: Project health derivation

Auto-calculate project health from underlying pulse data:

1. For each team: aggregate blockers, sentiment, update frequency, velocity
2. Derive a health score: GREEN (no blockers, positive sentiment, regular updates), YELLOW (some blockers or declining velocity), RED (stale blockers, negative sentiment, missing updates)
3. New API: `GET /api/org/[id]/health` — returns per-team health summary

**Files:**
- `src/app/api/org/[id]/health/route.ts` — health aggregation logic
- `src/lib/ai.ts` — add health scoring function

### 11c: Heartbeat dashboard

New page for org-level visibility:

1. Route: `/heartbeat`
2. Grid of team cards: team name, health indicator (R/Y/G), top blocker summary, update frequency, member count
3. Click to drill into team's dashboard
4. Optional: AI-generated cross-team summary at the top

**Files:**
- `src/app/heartbeat/page.tsx` — heartbeat page
- `src/components/TeamHealthCard.tsx` — individual team health card
- `src/components/Sidebar.tsx` — add Heartbeat nav item (conditional on ORG_ADMIN role)

### 11d: Cross-team dependency detection

AI scans updates across teams and identifies dependencies:

1. When generating org health, pass all teams' recent updates to Claude
2. Prompt: "Identify cross-team dependencies or blockers where one team's work affects another"
3. Surface on Heartbeat dashboard: "Team A is blocked on Team B's API deployment"

**Files:**
- `src/app/api/org/[id]/dependencies/route.ts` — dependency detection
- `src/app/heartbeat/page.tsx` — dependencies section
- `src/lib/ai.ts` — add dependency detection prompt

### Effort: Large (~5-6 sessions across 11a-11d)

---

## Phase 12: UI Polish

**Goal:** Make it feel like a next-gen AI application — not through flashy animations, but through intelligence that feels effortless.

### 12a: Chat improvements

- Remember last conversation context (persist to DB, not just session state)
- Show typing indicator with pulsing dots during streaming
- Add "Ask about this" quick actions from Dashboard items (blocker → chat with context)

### 12b: Sidebar refinements

- Profile/settings option on avatar (not just sign out)
- Role-based nav: show/hide Heartbeat based on org role
- Notification badge on Dashboard icon when new insights exist

### 12c: Smart defaults

- Default landing page based on role: MEMBER → Submit, LEAD → Dashboard, MANAGER → Dashboard
- Chat pre-populates context when navigated from an insight ("Tell me more about Priya's blocker")
- Views remember last-used filters per user

### 12d: Empty states

- Every page gets a purposeful empty state (not just "no data")
- Submit page with no teams → guide to create/join
- Dashboard with no updates → guide team to start submitting
- Views with no items → explain AI Suggest and guide first use

### Effort: Medium (~2-3 sessions)

---

## Recommended Sequencing

```
Phase 8:  Dashboard Redesign        ████░░░░░░  (~1 session)
Phase 9a: View auto-populate        ██░░░░░░░░  (~1 session)
Phase 9d: Column presets            █░░░░░░░░░  (~0.5 session)
Phase 10a: Promote Slack input      █░░░░░░░░░  (~0.5 session)
Phase 12d: Empty states             ██░░░░░░░░  (~1 session)
Phase 9b: Change tracking           ██░░░░░░░░  (~1 session)
Phase 12a: Chat improvements        ██░░░░░░░░  (~1 session)
Phase 12b: Sidebar refinements      █░░░░░░░░░  (~0.5 session)
Phase 12c: Smart defaults           █░░░░░░░░░  (~0.5 session)
Phase 9c: Multi-team Views          ██░░░░░░░░  (~1 session)
Phase 10b: Git-based drafts         █████░░░░░  (~2-3 sessions)
Phase 10c: Passive signals          █░░░░░░░░░  (~0.5 session)
Phase 11a: Organization model       ██░░░░░░░░  (~1 session)
Phase 11b: Health derivation        ██░░░░░░░░  (~1 session)
Phase 11c: Heartbeat dashboard      ██░░░░░░░░  (~1 session)
Phase 11d: Cross-team dependencies  ██░░░░░░░░  (~1 session)
```

### Why this order

1. **Phase 8 first** — highest-impact, lowest-effort. Instantly improves the most-visited page.
2. **Phase 9a + 9d** — makes Views feel alive without major schema changes.
3. **Phase 10a** — zero-code-change adoption boost (Slack is already built).
4. **Phase 12d** — empty states prevent new-user confusion, critical before wider rollout.
5. **Phase 9b + 12a-c** — polish that compounds. Each makes the app feel smarter.
6. **Phase 9c** — multi-team Views unlocks the CTO use case.
7. **Phase 10b-c** — git integration is the biggest bet. By this point, the core app is solid.
8. **Phase 11** — Heartbeat comes last because it requires the org model and enough teams to be meaningful.

---

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Git integration requires OAuth setup per provider | Start with GitHub only. Use personal access tokens for MVP, OAuth later. |
| Cross-team features need enough teams to test | Seed data with 3-4 teams. Test with real team after Phase 11a. |
| AI costs scale with org size | Add token budgets per team. Cache digests/insights (don't regenerate on every page load). |
| Health scoring accuracy | Start simple (blocker count + update frequency), iterate based on real data. Don't over-engineer the algorithm. |
| Multi-team Views complexity | Ship 9a and 9d first to validate the enhanced Views concept before adding multi-team. |

---

## What we're NOT doing

To keep focus, these are explicitly deferred:

- **Dark theme** — nice-to-have, not differentiating
- **GSAP/heavy animations** — the "next-gen" feel comes from AI intelligence, not motion
- **Mobile native app** — responsive web is sufficient for this user base
- **JIRA integration** — complex OAuth, unclear ROI vs. git integration
- **Export/import for Views** — useful but not before the core is solid
- **Advanced RBAC beyond current roles** — current 3-role model covers all use cases for now
