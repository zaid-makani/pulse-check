# PulseCheck — Product Requirements Document

> **Version:** 1.0
> **Author:** Zaid Makani
> **Last updated:** March 2026

---

## 1. Product Vision

PulseCheck is an **AI-powered organizational health monitoring system**. It captures the pulse of engineering teams — what people are working on, where they're blocked, how they feel — and surfaces that intelligence at every altitude: from individual contributors to CTOs.

**One-liner:** Speak your update. AI does the rest.

### The Problem

Engineering managers run 16-person teams with daily syncs, Excel sheets (Quarter, Feature, Status, JIRA, Story Points, Sprint, Release Date, Comments), and manual follow-ups. This creates:

- **Friction for developers** — manual column filling, inconsistent adoption, duplicate data entry across tools
- **Lag for managers** — information is stale by the time it's aggregated, requires scheduling calls
- **Blindness for leadership** — no cross-team visibility without asking each manager individually

Previous attempt (Jira comment tags + JQL filters) failed because adoption was too high-friction.

### The Insight

Developers already give verbal updates in standups. PulseCheck captures that natural behavior (voice or text), lets AI extract the structure, and distributes intelligence to everyone who needs it — automatically, at the right altitude.

---

## 2. Core Concepts

### The Altitude Model

| Altitude | Who | What they need | PulseCheck feature |
|----------|-----|----------------|--------------------|
| **Ground** | Individual contributor | Low-friction way to share status | Submit (voice/text) |
| **Team** | Tech lead | Who's blocked, who's quiet, sprint health | Dashboard, Chat, Views |
| **Division** | Director/VP | Cross-team project health, dependencies | Heartbeat (planned) |
| **Org** | CTO/Exec | Portfolio view — which projects are healthy, at risk, stalled | Vital Signs (planned) |

### Design Principles

1. **AI-first, not AI-added** — AI does the heavy lifting. Extraction, summarization, insights, suggestions — the human confirms, not constructs.
2. **Friction-free for developers** — Speaking for 30 seconds or typing 2 sentences is the maximum ask. Everything else is derived.
3. **Intelligence at every altitude** — Same underlying data, different views for different roles.
4. **The update writes itself** — The goal is for PulseCheck to draft updates from passive signals (commits, PRs, ticket transitions), with the human just confirming.

---

## 3. User Personas

### Developer / QA (MEMBER)

**Goal:** Submit updates with minimal effort, track own work.
**Primary surfaces:** Submit, My Updates, Views (edit)
**Key behavior:** Records a 30-second voice update after standup, or types a quick summary. Edits Views during sprint calls.

### Tech Lead (LEAD)

**Goal:** Know who's blocked, what's at risk, prepare for standups.
**Primary surfaces:** Dashboard, Chat, Views (manage), My Updates (team view)
**Key behavior:** Opens Dashboard each morning, scans insights, asks Chat follow-up questions. Creates/maintains Views for sprint tracking.

### Engineering Manager (MANAGER)

**Goal:** Team health visibility without scheduling calls. Report up to leadership.
**Primary surfaces:** Dashboard, Chat, AI Digest, Views (view/filter)
**Key behavior:** Reads AI-generated digest via email/Slack. Uses Chat to investigate blockers. Shares Views in stakeholder meetings.

### Director / VP / CTO (future: ORG_ADMIN)

**Goal:** Cross-team portfolio health. Identify at-risk projects early.
**Primary surfaces:** Heartbeat view (planned), Cross-team Chat, Portfolio Views
**Key behavior:** Weekly review of project health across 10-15 projects. Drills into specific teams when signals are concerning.

---

## 4. Features — Current (Built)

### 4.1 Voice-First Status Submission

**Route:** `/submit`

Users record a voice update or type text. The pipeline:
1. Voice captured via browser MediaRecorder (WebM/Opus)
2. Audio sent to OpenAI Whisper for transcription
3. Transcript displayed in editable textarea (user can modify)
4. On submit, Claude extracts structured data:
   - `completed[]` — items finished
   - `inProgress[]` — items being worked on
   - `blockers[]` — things blocking progress
   - `needsHelp[]` — items needing assistance
   - `sentiment` — positive / neutral / negative / frustrated
   - `riskFlags[]` — AI-identified concerns
   - `summary` — concise summary
5. Extracted data stored as StatusUpdate, success screen shows AI summary

**Why it matters:** Converts 30 seconds of speech into structured, queryable data. No manual column filling.

### 4.2 AI Chat

**Route:** `/chat`

Natural language interface to query team status data. Scoped to current team's updates from the last 7 days.

- Pre-built suggested questions ("Who has blockers?", "Summarize this week's progress")
- Streaming Claude responses with markdown formatting
- Conversation context maintained within session, resets on team switch

**Why it matters:** Managers get answers to any question about their team without reading individual updates. "What is Rahul working on?" returns a synthesized answer from his actual updates.

### 4.3 Dashboard

**Route:** `/dashboard`

Manager's command center with:
- **Stats cards** — team members, active blockers, updates today
- **AI Insights** — proactive alerts (stale blockers 3+ days, missing updates 2+ days, negative sentiment, risk flags), severity-coded, dismissible
- **Team Pulse table** — all members sorted by blockers-first, expandable rows showing latest summary and active blockers
- **Recent Updates** — grid of StatusCard components
- **AI Digest** — on-demand team summary (accomplishments, WIP, blockers, action items, health assessment)

### 4.4 Views (Collaborative Grid)

**Route:** `/views`, `/views/[id]`

Spreadsheet-style grid for tracking deliverables, replacing manual Excel/Confluence maintenance.

- **System columns:** Title, Owner, Status (Backlog/In Progress/In Review/QA/Done/Blocked), Project, JIRA Link, Story Points, Sprint, Quarter (Q1-Q4), Release Date, Blocker Notes
- **Custom columns:** text, number, date, url, select, person — added on demand
- **Inline editing:** click any cell to edit with type-appropriate input
- **Client-side filtering:** by Status, Owner, Sprint, Quarter
- **AI Suggest:** analyzes recent team updates, suggests work items with confidence scores, bulk-add selected items

**Why it matters:** The CTO's "Confluence page tracking 10-15 projects" becomes a living document that updates itself from the pulse data flowing through the system.

### 4.5 My Updates

**Route:** `/my-updates`

Personal update history with:
- Table view with expandable rows showing full extracted data
- Edit (with AI re-extraction) and delete functionality
- LEAD/MANAGER can view other team members' updates via user selector

### 4.6 Team Management

**Routes:** `/teams/new`, `/teams/[id]/settings`

- Create teams, add/remove members, assign roles (MEMBER, LEAD, MANAGER)
- Team settings: reminder schedule (time + days), digest schedule (daily/weekly + time), timezone, Slack webhook
- Team selector in navigation for switching context

### 4.7 Notifications

- **Email reminders** — cron-triggered, sent to members without today's update at configured time/days
- **Email digests** — cron-triggered, sent to LEAD/MANAGER with AI-generated team summary
- **Slack digest** — posted to configured webhook with Block Kit formatting
- **Slack slash command** — `/pulsecheck <update text>` for submitting directly from Slack

### 4.8 Onboarding

**Route:** `/onboarding`

Two-step flow for new users:
1. Create a team or skip
2. Feature tips (voice updates, chat, views)

Middleware enforces completion before accessing protected routes.

---

## 5. Features — Planned

### 5.1 Dashboard Redesign

Simplify the dashboard from 5 components to a focused daily briefing:
- Elevate AI Insights to hero component (daily briefing, not dismissible alerts)
- Keep Team Pulse table as primary data view
- Remove stats cards (vanity metrics), remove Recent Updates tab (redundant with My Updates)
- Auto-display latest digest instead of manual generation

### 5.2 Views Enhancement

- **Auto-population** — Views update continuously from status updates, not just on-demand AI Suggest
- **Multi-team Views** — a View can span multiple teams for cross-functional tracking
- **Change tracking** — surface what changed since last visit ("3 items moved to Blocked yesterday")
- **Configurable column presets** — tech lead preset vs. CTO preset vs. custom

### 5.3 Input Diversification

Reduce dependence on manual user input:
- **Git integration** — daily cron pulls commits/PRs, auto-drafts update for user to confirm
- **Slack promotion** — make `/pulsecheck` the primary input path for Slack-native teams
- **JIRA/Linear integration** — ticket transitions auto-enrich status updates
- **Calendar-aware prompts** — post-meeting nudges ("How did sprint review go?")
- **Passive signal enrichment** — "Amit hasn't posted but merged 3 PRs today"

### 5.4 Heartbeat — Cross-Team View

The "Director altitude" feature:
- Organization layer above Teams
- Cross-team dashboard: red/yellow/green health per project, auto-derived from pulse data
- Cross-team dependency detection ("Team A blocked on Team B's API")
- Drill-down from project health into team-level detail

### 5.5 Federated Context via MCP

Each team connects their own MCP server (GitHub, Confluence, Jira, etc.). PulseCheck combines process context (blockers, updates) with product context (code, docs) for richer AI responses.

See: `docs/FUTURE-federated-context.md`

---

## 6. Technical Architecture

### Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Database | Prisma ORM, SQLite (dev), PostgreSQL (prod) |
| Auth | NextAuth.js v4, Credentials provider, JWT strategy |
| AI — LLM | Anthropic Claude (extraction, chat, digest, insights, suggest) |
| AI — Transcription | OpenAI Whisper |
| Styling | Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Email | Resend |
| Slack | @slack/web-api, @slack/oauth |
| Icons | lucide-react |

### Data Model (Key Entities)

```
User (email, password, name, role, onboardingCompleted, slackUserId)
  └── StatusUpdate (rawTranscript, completed, inProgress, blockers, needsHelp, sentiment, riskFlags, summary)
  └── TeamMembership (role: MEMBER|LEAD|MANAGER)
        └── Team (name, description)
              └── TeamSettings (reminderTime, reminderDays, digestEnabled, digestSchedule, timezone, slackChannelId)
              └── View (name, description)
                    └── ViewColumn (name, type, options, isSystem, order)
                    └── WorkItem (values JSON, order)
SlackInstallation (teamId, botToken, botUserId)
```

### Data Scoping

All features scope data by the selected team. Team context is managed client-side via `TeamProvider` (React Context + localStorage persistence). API routes verify team membership before returning data.

### Auth Flow

Signup → Login (NextAuth Credentials) → JWT issued → Middleware checks token on protected routes → Incomplete onboarding redirected to `/onboarding` → Session available via `useSession()`

---

## 7. Roles & Permissions

| Capability | MEMBER | LEAD | MANAGER |
|-----------|--------|------|---------|
| Submit updates | Yes | Yes | Optional |
| Edit own updates | Yes | Yes | Yes |
| View team dashboard | Yes | Yes | Yes |
| View other members' updates | No | Yes | Yes |
| Edit Views | Yes | Yes | Yes |
| Use Chat | Yes | Yes | Yes |
| Manage team settings | No | Yes | Yes |
| Add/remove members | No | Yes | Yes |
| Delete team | No | Yes | No |

Future: ORG_ADMIN role with cross-team visibility.

---

## 8. API Surface

### Auth
- `POST /api/auth/signup` — register
- `* /api/auth/[...nextauth]` — NextAuth handlers

### Status Updates
- `GET/POST /api/status` — list (filtered by team/user/days) / create
- `GET/PATCH/DELETE /api/status/[id]` — read / update (with optional AI re-extraction) / delete

### Chat
- `POST /api/chat` — streaming AI response scoped to team context

### Transcription
- `POST /api/transcribe` — audio blob → Whisper → text

### AI
- `GET /api/digest` — AI-generated team summary
- `GET /api/insights` — proactive health alerts

### Teams
- `GET/POST /api/teams` — list user's teams / create team
- `GET/PATCH/DELETE /api/teams/[id]` — team CRUD
- `GET/POST /api/teams/[id]/members` — list / add members
- `PATCH/DELETE /api/teams/[id]/members/[userId]` — change role / remove
- `GET/PATCH /api/teams/[id]/settings` — team configuration

### Views
- `GET/POST /api/views` — list / create (with system columns)
- `GET/PATCH/DELETE /api/views/[id]` — view CRUD
- `POST /api/views/[id]/suggest` — AI work item suggestions
- `* /api/views/[id]/columns/[colId]` — column CRUD
- `* /api/views/[id]/items/[itemId]` — work item CRUD

### Cron
- `POST /api/cron/reminders` — send reminder emails (CRON_SECRET secured)
- `POST /api/cron/digest` — send digest emails + Slack (CRON_SECRET secured)

### Slack
- `POST /api/slack/commands` — handle `/pulsecheck` slash command

### Users
- `GET/POST /api/users` — list / create
- `POST /api/user/onboarding` — mark onboarding complete

---

## 9. Success Metrics

| Metric | Target | Why |
|--------|--------|-----|
| Daily update submission rate | >80% of team | Proves low-friction input |
| Time from update to manager visibility | <1 minute | Proves real-time value |
| Manager daily dashboard visits | >1 per day | Proves dashboard utility |
| Chat queries per manager per week | >5 | Proves AI chat value |
| Views adopted per team | >1 active view | Proves spreadsheet replacement |
| Blocker resolution time | Decrease 30%+ | Proves early-warning value |
| Manual standup call duration | Decrease 50%+ | Proves async-first adoption |

---

## 10. Open Questions

1. **Pricing model** — per-user, per-team, free tier for small teams?
2. **Data retention** — how long to keep old updates? Archival policy?
3. **GDPR/export** — can users export/delete their data?
4. **Mobile** — PWA sufficient or native app needed?
5. **Heartbeat MVP** — what's the minimum viable cross-team view?
6. **Git integration scope** — which providers (GitHub, GitLab, Bitbucket)?
7. **Org model rollout** — self-service org creation or admin-provisioned?
