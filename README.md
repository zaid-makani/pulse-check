# PulseCheck

A work memory for teams. People tell it what they did in whatever way costs them the least (a voice note, a Slack reply, a one-tap confirmation). It turns those signals into an always-current picture of who is doing what, where the risk is, and how work rolls up into quarterly commitments. Managers ask it questions instead of asking people. Individuals get their own record back at appraisal time.

- **Product requirements:** `docs/PRD.md`
- **Implementation plan:** `docs/IMPLEMENTATION-PLAN.md`
- **v1 history and superseded docs:** `docs/archive/`

## Running locally

```bash
cp .env.example .env         # fill in ANTHROPIC_API_KEY, OPENAI_API_KEY, NEXTAUTH_SECRET
docker compose up -d         # Postgres with pgvector on :5433
npm install
npm run db:migrate
npm run db:seed              # two teams, ten people, three weeks of updates
npm run db:backfill -- --link   # embeddings for the seed (needs the API keys)
npm run dev
```

Sign in as `zaid@example.com` / `Test1234!`.

Slack (optional, see `slack/README.md`): create the app from `slack/manifest.json`, put the tokens in `.env`, then `npm run slack:dev` in a second terminal.

## Scheduled jobs

`POST /api/cron/tick` with `Authorization: Bearer $CRON_SECRET`, every 15 minutes. It sends the nightly nudge, writes the morning briefing, and sends the Friday recap, each in the team's timezone. Add `?dry=1` to see what would run, or `?force=nudge|briefing|recap` to run one now.

## Deploying

Blocking order for a new environment: Postgres with the `vector` extension, then the deploy with secrets, then a scheduler for `/api/cron/tick`, then the Slack app (it needs the HTTPS hostname). Full steps in `docs/PROVISIONING.md`.

`Dockerfile` builds a standalone image that runs migrations on start. Required env: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, and the Slack tokens.
