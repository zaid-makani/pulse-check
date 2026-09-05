# PulseCheck - Project Context

## What This Is
AI-powered team status update tool. Developers speak/type updates, AI extracts structured data, managers see team pulse at a glance.

## Core Value Proposition
- **For developers**: Speak naturally, AI structures it. No manual column filling.
- **For managers**: Real-time pulse on team without scheduling calls or reading Excel sheets.
- **Key insight**: Piggybacks on existing standup behavior - devs can record while giving DSM updates.

## Current State (v0.1)
- Voice recording → Whisper transcription → Claude extraction
- Submit page, My Updates page, Dashboard with Team Pulse/Recent Updates/AI Digest
- SQLite database with User and StatusUpdate models
- Seeded test data for 5 users

## This Iteration (v0.2)
1. Edit/Delete for status updates
2. Compact table view for My Updates
3. Global navigation header
4. Modern visual refresh
5. Fix markdown rendering in AI Digest
6. Dashboard click-through improvements

## Parked for Future
- **Chat interface (KILLER FEATURE)**: Let managers query all team data via natural language chat. "What is Rahul working on?" "What blockers does the team have?" Build this AFTER data model is stable.
- **Login/Auth**: Okta integration for org deployment
- **Enhanced AI extraction**: JIRA tickets, Sprint numbers, Story Points, Release dates, Quarter
- **Jira integration**: Auto-link mentioned tickets, optionally push comments
- **Filtering**: By project, role, date range, blocker status
- **Trend data**: Velocity charts, historical comparisons
- **Export**: Copy/export digests for stakeholder reports

## Design Principles
1. **Friction-free for developers** - Don't make them do extra work
2. **AI does the heavy lifting** - Structuring, summarizing, extracting
3. **Token awareness** - Be smart about AI calls, don't re-run unnecessarily
4. **Modern, next-gen feel** - Clean, professional, feels like 2025+ app

## User's Current Process (What We're Replacing)
- Daily 2pm sync call with 16 people
- Excel sheet with columns: Quarter, Feature, Status, JIRA, Story Points, Sprint, Release Date, Comments
- Pain: Manual entry, inconsistent adoption, tedious to maintain and read
- Failed alternative: Jira comment tags + JQL filters (good technically, but no one adopted it)

## Technical Stack
- Next.js 15 (App Router)
- TypeScript
- Prisma + SQLite (will migrate to Postgres for prod)
- Tailwind CSS + ShadCN UI
- OpenAI Whisper (transcription)
- Claude API (extraction, summarization)
