# PulseCheck Slack app

## Create the app (once per workspace)

1. Go to https://api.slack.com/apps and choose **Create New App → From a manifest**.
2. Pick the workspace, paste `manifest.json`, create.
3. **Install to Workspace** (OAuth & Permissions). Copy the **Bot User OAuth Token** (`xoxb-…`) into `.env` as `SLACK_BOT_TOKEN`.
4. **Basic Information → App-Level Tokens → Generate** with scope `connections:write`. Copy it (`xapp-…`) into `.env` as `SLACK_APP_TOKEN`.
5. Copy the **Signing Secret** from Basic Information into `.env` as `SLACK_SIGNING_SECRET`.

## Local development (no public URL)

The manifest enables Socket Mode, so events reach your laptop over a websocket:

```bash
npm run dev          # the web app
npm run slack:dev    # the bot, in a second terminal
```

Then in Slack: DM the bot, mention `@PulseCheck` in a channel it is in, or type `/pulse`.

People are matched to PulseCheck accounts by email on first contact. Sign up on the web app with the same email as your Slack profile.

## Production (public URL)

Turn Socket Mode off in the app settings and point:

- **Event Subscriptions → Request URL** to `https://<host>/api/slack/events`
- **Slash Commands → /pulse → Request URL** to `https://<host>/api/slack/commands`

`SLACK_APP_TOKEN` is not needed in production. The scheduler must call `POST /api/cron/tick` every 15 minutes with `Authorization: Bearer $CRON_SECRET` for nudges, briefings, and recaps.

## What the bot does

| You do | It does |
|---|---|
| Reply to the nightly nudge (text or voice clip) | Records the update to the team named in the nudge and replies with what it understood |
| DM it any time | Same, to your most recent team. Prefix `Payments:` to target a team |
| Reply `fix: <whole update again>` | Replaces your latest update (last 36 hours) |
| DM `ask: who is on N1?` or `/pulse ask …` | Answers from your teams' updates |
| `@PulseCheck <question>` in a channel | Same, in a thread |
| `/pulse <update>` | Records an update from anywhere |
