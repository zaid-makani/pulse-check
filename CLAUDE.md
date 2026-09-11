# CLAUDE.md — working notes for any Claude session on PulseCheck

Read this first. It is the handoff between sessions and machines. The
product spec is `docs/PRD.md`, the plan and progress table is
`docs/IMPLEMENTATION-PLAN.md`, the last product review is
`docs/PRODUCT-REVIEW-2026-09-05.md`. Do not re-derive what is written there.

## What this is

PulseCheck is a work memory for teams. People say what they worked on
(voice on the web, or a reply to a nightly Slack nudge, text or voice clip).
Claude extracts signals, links each update to a work thread, keeps rolling
thread summaries, answers questions across teams (Ask), and writes documents
(morning briefing, standup brief, 1-on-1 prep, self-review, week recap,
delivery report). Nobody maintains a sheet; the sheets are generated.

## Who you are working with

Zaid is a Director of Engineering in India running two or three teams. He
built v1 alone, abandoned it, and in September 2026 asked Claude to act as
co-founder and principal architect: bring your own ideas, defend a direction,
keep scope to what a 10-person, 3-week pilot needs, and do not reintroduce
v1 ideas (the editable Views grid is retired on purpose). He dictates by
voice; expect long spoken-style messages. Confirm only irreversible or
org-facing actions (deploys, Slack installs, deleting data).

Before calling any screen done, walk it in the browser as two personas
(a manager, a member with no reports) and ask of every element: who is it
for, what does it do, what happens on a second press, how does a human read
it cold. That review found the biggest defects so far. Write findings to
`docs/PRODUCT-REVIEW-<date>.md` and fix them.

## State (September 2026)

Branch `v2` holds the rebuild (15 commits over `master`). Verified with real
use: web capture, thread linking and summaries, Ask agent, all six reports,
cost page, Docker image, and the Slack loop end to end (nudge, text and
voice updates, typed and spoken questions). Not done: org deploy config
(CircleCI + ArgoCD on the org's AWS; Zaid will supply a sample from another
internal app), pilot instrumentation, journey test on the deployed build,
org Slack app (needs an IT ticket; use `slack/manifest.json`).

Parked until after the pilot, on purpose: Lifeline (quarter commitments,
CTO newsletter), passive signals from GitHub/Jira, Okta SSO, FOG/SBIN
1-on-1 feedback capture, non-engineering report wording, MCP federation.

## Architecture map

- `src/lib/llm.ts` — the only place model calls are made. `MODELS.fast`
  (claude-sonnet-5: extraction, linking, summaries) and `MODELS.smart`
  (claude-opus-5: ask, reports), both overridable by env. Every call is
  logged to `LlmCall` with cost; `/admin/costs` shows it. Never call the
  SDK elsewhere.
- `src/lib/extract.ts` — structured extraction (Zod schema, per-team
  vocabulary). `src/lib/updates.ts` — `ingestUpdate()` is the single entry
  for every source. `src/lib/threads.ts` — linking, rolling summaries,
  merge. `src/lib/embeddings.ts` — OpenAI embeddings + pgvector queries.
- `src/lib/ask.ts` — the agent (tools over threads/updates/people), used by
  the web chat and the Slack bot. `src/lib/reports.ts` — report templates.
- `src/lib/authz.ts` — scope is the sum of memberships: team role
  MEMBER/LEAD/MANAGER, plus `OrgMembership.ADMIN` for org-wide read. No
  director object. `visibleTeamIds()` is the one source of truth.
- `src/lib/slack/handlers.ts` — everything the bot does, shared by the HTTP
  routes (`/api/slack/*`, production) and `scripts/slack-dev.ts` (Socket
  Mode + DM polling, development).
- `src/app/api/cron/tick` — call every 15 min with `Bearer $CRON_SECRET`;
  sends nudges, writes briefings, sends Friday recaps per team timezone.
  `?force=nudge|briefing|recap` for manual runs, `?dry=1` to preview.
- Client role awareness: `/api/me` via `TeamProvider` (`me.isManager`,
  `managesCurrent`). Today (`/home`) renders a manager view or a member view.

## Conventions

- TypeScript strict, `npx tsc --noEmit -p .` and `npm run lint` must pass
  before a commit. React 19 lint rules: no synchronous setState in effects
  (derive loading from a "loaded for key" state instead).
- Reports never silently regenerate: `ReportAction` shows the latest and
  makes "Write new" explicit; briefing/standup/recap reuse the day's copy.
- A 1-on-1 prep is the manager's document; its subject never sees it.
- Design tokens in `src/app/globals.css` (paper, ink, pulse, ok/warn/bad).
  Serif for document titles and report bodies, sans for UI.
- Commit messages: imperative summary, body explains why; trailer
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Running it

```
docker compose up -d            # Postgres + pgvector on :5433
npm install && npm run db:migrate && npm run db:seed
npm run db:backfill -- --link   # embeddings for seed data
npm run dev                     # web on :3000
npm run slack:dev               # bot, second terminal (needs SLACK_* in .env)
```

Seed sign-in: the manager account (org admin) and `Test1234!`; on Zaid's
personal machine its email was changed to his Gmail to match Slack.

## Gotchas learned the hard way

- Never delete `.next` while `next dev` is running; it kills the server.
- Inside Claude Code's sandboxed shell the Slack websocket drops every 30s;
  run `npm run slack:dev` with the sandbox disabled (or from a normal
  terminal). The dev bot also polls DMs every 20s as a safety net because
  Slack Event Subscriptions may not push events.
- All outbound model calls have timeouts (Anthropic 90s, OpenAI 60s). Reply
  to the user as soon as an update is linked; summaries refresh afterwards.
- Slack replies are threaded on the user's message; the poller dedupes by
  `reply_count`, so never delete the bot's reply if you want to avoid a
  re-answer on restart.
- Questions typed or spoken to the bot are answered, not recorded; the
  heuristic falls back to a one-second model intent check.

## What the org must provision (in blocking order)

Step-by-step, with manifests and the IT ticket wording: `docs/PROVISIONING.md`.

1. Postgres 15/16 with the `vector` extension permitted and a DB user allowed
   to `CREATE EXTENSION` (or the DBA pre-creates it). The first migration
   creates the extension and fails without it.
2. Secrets in the deploy environment per `.env.example`: DATABASE_URL,
   NEXTAUTH_URL (public URL), NEXTAUTH_SECRET, ANTHROPIC_API_KEY,
   OPENAI_API_KEY (Whisper + embeddings only; swappable if the org has no
   OpenAI key), CRON_SECRET, SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET,
   PULSE_KEY_OWNER. No SLACK_APP_TOKEN in production.
3. A scheduler calling `POST /api/cron/tick` every 15 minutes with
   `Authorization: Bearer $CRON_SECRET` (a Kubernetes CronJob running curl).
4. An HTTPS hostname before the Slack app can be completed: Slack pushes to
   `/api/slack/events` and `/api/slack/commands`. Order is Postgres, deploy,
   then Slack.
5. Slack scope `users:read.email` (matches people by profile email). If IT
   refuses it, add a DM-once linking fallback.
6. Resend (RESEND_API_KEY) is optional; without it password reset emails do
   not send. Fine for a pilot with passwords set by hand.

Not needed: Redis, a queue, object storage, a separate vector service.

## Next on the office laptop

1. `git checkout master && git merge --ff-only v2`, push to the org Bitbucket.
2. Get the CircleCI/ArgoCD sample config from Zaid; add pipeline files.
   The `Dockerfile` builds a standalone image that runs migrations on start.
3. Provision Postgres with the `vector` extension; set env per `.env.example`.
4. IT ticket for the org Slack app from `slack/manifest.json`; in the org,
   Socket Mode off and request URLs pointed at the deployed host.
5. Auth for the pilot stays username/password; Okta at org rollout.
