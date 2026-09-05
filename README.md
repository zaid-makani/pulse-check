# PulseCheck

A work memory for teams. People tell it what they did in whatever way costs them the least (a voice note, a Slack reply, a one-tap confirmation). It turns those signals into an always-current picture of who is doing what, where the risk is, and how work rolls up into quarterly commitments. Managers ask it questions instead of asking people. Individuals get their own record back at appraisal time.

- **Product requirements:** `docs/PRD.md`
- **Implementation plan:** `docs/IMPLEMENTATION-PLAN.md`
- **v1 history and superseded docs:** `docs/archive/`

## Running locally

```bash
cp .env.example .env   # fill in keys
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The v2 plan moves the database to PostgreSQL. Until Phase 0 lands, the app still runs on SQLite as configured in `.env.example`.
