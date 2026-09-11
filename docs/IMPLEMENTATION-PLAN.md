# PulseCheck — Implementation Plan (v2)

> **Goal:** Get 8 to 10 real people using PulseCheck for 3 weeks with as little new code as that requires, on a data model that will not need to be thrown away for Lifeline.
> **Companion:** `docs/PRD.md`

---

## Architecture decisions

| Area | Decision | Why |
|---|---|---|
| Framework | Keep Next.js 16 App Router, React 19, TypeScript | Working, familiar, deploys anywhere |
| Database | **PostgreSQL** from now on. Prisma stays. Local dev via Docker; pilot on the org's managed Postgres or Neon | SQLite cannot do the retrieval queries or concurrent Slack webhooks. JSON-string columns become real JSON and relations |
| Retrieval | pgvector embeddings on updates and thread summaries, plus Postgres full-text search | Thread linking and chat need "find by meaning" across months. No separate vector service |
| LLM | Anthropic SDK direct. Sonnet 5 for extraction, linking, and routine reports; Opus 5 for chat and long reports. Structured outputs via tool definitions, never `JSON.parse` on free text | Current code pins a 2025 Sonnet and parses raw JSON, which fails silently |
| Transcription | Keep OpenAI Whisper for web audio and Slack audio clips | Works; revisit only if cost or latency bites |
| Slack | Slack Bolt (or Vercel Chat SDK if it fits) with Socket Mode for dev and HTTP events in prod. One app: nightly DM, `/pulse`, `@Pulse` mentions, audio clip ingestion | Slack is the primary surface; the v1 slash command is too thin |
| Auth | NextAuth stays. Add **Sign in with Slack** as the pilot provider. Keep credentials for local dev. Okta provider added at org rollout | Zero new passwords, automatic Slack identity link |
| Scheduling | Cron routes stay, secured by `CRON_SECRET`, triggered by the host's scheduler | Already built |
| Observability | Log every LLM call (model, tokens, latency, purpose) to a table | Cost control and prompt debugging during the pilot |

## Data model (v2)

```
Organization ──< Team ──< TeamMembership >── User
                  │
                  ├──< Thread ──< ThreadLink >── Update >── User
                  │      │
                  │      └── summary, status, embedding, lastActivityAt
                  │
                  ├──< Report (type, subject, period, content, generatedAt)
                  └──< TeamSettings (nudgeTime, briefingTime, timezone, vocabulary)

Update: rawText, source (slack_dm | slack_command | slack_mention | web_voice | web_text),
        signals JSON {done[], inProgress[], blockers[], asks[], sentiment, risks[]},
        embedding, slackTs (for the confirm-and-fix loop)

Commitment (post-pilot): threadId, quarter, ownerTeamId, target, status
LlmCall: purpose, model, inputTokens, outputTokens, latencyMs, cost
```

What is removed from v1: `View`, `ViewColumn`, `WorkItem`, `PasswordResetToken` (kept only if credentials login stays for dev), the `Role` enum on `User` (roles live on memberships).

What is kept: `User`, `Team`, `TeamMembership`, `TeamSettings`, `SlackInstallation`.

## Progress (5 September 2026)

| Phase | State | Notes |
|---|---|---|
| 0 Foundation | Done | Postgres + pgvector, schema v2, structured extraction, cost log, new shell |
| 1 Threads | Done | AI linking, rolling summaries, merge/rename, backfill script |
| 2 Slack | Verified 11 Sep | Nudge DM, text and voice-clip replies, confirmation, spoken and typed questions answered. Tested on a personal workspace over Socket Mode with a polling safety net |
| 3 Ask | Done | Agent with tools, streaming web chat, Slack @mention and `/pulse ask` |
| 4 Reports | Done | Six templates, cron tick for briefings and recaps |
| 5 Pilot readiness | Partial | Dockerfile done and smoke-tested. Org deploy config, pilot instrumentation, journey test pending |
| Product review | Done | `docs/PRODUCT-REVIEW-2026-09-05.md`; role-split Today, report reuse, entry screens, Overview page, org admin management |

Everything is on the `v2` branch. Merge to `master` before cloning onto the office laptop.

## Phases

Each phase ends with something a human can try. Effort is in working sessions, not calendar days.

### Phase 0 — Foundation (2 sessions)

- Docker Compose with Postgres and pgvector. Switch Prisma datasource. Fresh migration set; v1 SQLite data is not migrated (it is seed data only).
- New schema above. Delete the Views routes, pages, and components. Delete the v1 seed; write a v2 seed with two teams, ten users, three weeks of realistic updates and threads (needed to develop chat and reports before real data exists).
- Upgrade the Anthropic SDK. Replace the three `JSON.parse` extraction paths with one `extract()` using a tool-defined schema. Add the `LlmCall` log.
- Keep the web voice submit page working end to end against the new schema. Commit the pending sidebar refactor as part of this.

**Try it:** submit a voice update on the web, see it stored with signals.

### Phase 1 — Threads (2 sessions)

- Embeddings on every update and thread summary.
- `linkUpdateToThreads()`: candidate threads by vector similarity within the team, Claude decides link / create / both, returns confidence. Refresh each touched thread's rolling summary and status.
- Threads page: list per team, status, participants, last activity, summary. Thread detail: timeline of linked updates. Rename and merge threads (the human correction path).
- Flags computed from threads and updates (stale blocker, silent member, negative sentiment, cross-team dependency).

**Try it:** submit five updates about two features, watch two threads appear with correct summaries.

### Phase 2 — Slack capture (3 sessions)

- Slack app manifest, Bolt handler route, Socket Mode for local dev.
- Sign in with Slack provider in NextAuth; auto-link `slackUserId`.
- Nightly nudge DM per team schedule. Thread replies (text or audio clip) become updates. Audio clips are fetched with the bot token and transcribed.
- `/pulse <text>` and DM-anytime paths.
- Confirmation reply: two-line summary plus linked threads. "fix: ..." re-extracts and re-links.

**Try it:** Zaid replies to the nudge from a phone with a voice clip; it lands as an update linked to the right thread.

### Phase 3 — Ask (2 sessions)

- Agent loop with tools: `search_threads`, `search_updates`, `person_timeline`, `team_flags`, `thread_detail`. Scope resolved from the asker's memberships; org admins can widen.
- Web chat rebuilt on the agent, streaming, with citations that link to updates.
- `@Pulse` mention in Slack calls the same agent and replies in thread.

**Try it:** "who is working on N1?" answered correctly across two seeded teams, with citations.

### Phase 4 — Reports (2 sessions)

- Report generator with four templates: daily briefing, 1-on-1 prep, self-review, your-week recap. Each is a prompt over thread summaries and linked updates for a subject and period, output as Markdown, stored as a `Report`.
- Web home page becomes the briefing for the selected team. Person page shows 1-on-1 prep and self-review with a period picker and "copy as Markdown" and "send to me on Slack".
- Cron: morning briefing DM to leads and managers, Friday recap DM to everyone.

**Try it:** open 1-on-1 prep for a seeded user and see a document you would actually bring to the meeting.

### Phase 5 — Pilot readiness (2 sessions)

- Deploy to the org's cloud (or a Vercel preview if IT allows for the pilot). Managed Postgres. Env and secrets.
- Slack app installed in the org workspace; pilot channel; onboarding message that explains the nudge and the recap in three lines.
- Instrumentation for the pilot measures in the PRD: updates per member per day by source, thread corrections, questions asked, report generations.
- Run the `docs/testing` core-journey script against the deployed build.

**Try it:** the pilot starts.

### After the pilot

Ordered by what the pilot is likely to show is needed first.

1. Passive signals (GitHub, Jira) drafted into the nudge.
2. Lifeline: commitments, quarter delivery draft, newsletter to Slack canvas, CTO cross-org view.
3. Okta provider and org-wide rollout.
4. Non-engineering vocabularies.
5. 1-on-1 feedback capture (FOG / SBIN).

## Risks

| Risk | Mitigation |
|---|---|
| People ignore the nudge | Phase 2 ships first among user-facing pieces so this is learned in week 1 of the pilot, not week 3. Passive signals are the next lever |
| Thread linking is wrong often enough to lose trust | Confidence threshold; low-confidence links shown as "maybe" in the confirmation reply; merge and rename are one click |
| LLM cost across 10 people times 3 weeks | Sonnet for everything routine; Opus only on chat and long reports; per-call log with a daily total in the admin page |
| Org IT blocks a Slack app or external hosting | Ask early (Phase 2 start). Fallback: web voice page plus email nudge for the pilot |
| Slack audio clips are not accessible via the API in this workspace tier | Verify in Phase 2 day 1; fallback is text replies plus the web voice page |

## Decisions Zaid needs to make

1. **Slack workspace for development.** A free personal workspace is enough for Phases 2 to 4. Say the word and I will draft the app manifest.
2. **Where the pilot runs.** Org cloud with managed Postgres, or Vercel plus Neon for the pilot with a move later. The code does not care; IT might.
3. **Sign in with Slack for the pilot.** Confirm IT will not object before Phase 2.
