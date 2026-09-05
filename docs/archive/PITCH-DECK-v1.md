# PulseCheck

### The intelligent layer between your engineering teams and leadership.

---

## The Problem You Already Feel

Your engineering org runs on status updates. Daily standups, weekly syncs, Excel trackers, Confluence pages, Slack threads, 1:1s — all different ways of answering the same questions:

- *What is everyone working on?*
- *Who's blocked?*
- *Are we going to hit the deadline?*
- *Which projects need my attention?*

Today, getting those answers requires **manual effort at every level:**

| Role | What they do today | Time spent |
|------|--------------------|------------|
| Developer | Fills Excel columns, attends 30-min standup, duplicates info across Jira/Slack/email | ~45 min/day |
| Tech Lead | Reads individual updates, aggregates in spreadsheets, follows up on blockers manually | ~1 hr/day |
| Manager | Schedules sync calls, reads through Slack threads, asks leads for summaries | ~1 hr/day |
| VP / CTO | Asks each manager individually, reads Confluence pages, pieces together project health | ~2 hrs/week per project |

With 16 people across multiple projects, that's **hundreds of hours per month** spent collecting, formatting, and relaying information that already exists — in people's heads.

And the real cost isn't time. It's **latency**. A blocker that exists on Monday doesn't surface until Thursday's sync call. By then, a 1-day fix has become a 4-day delay.

---

## What PulseCheck Does

PulseCheck replaces the entire status collection and distribution chain with AI.

**Developers speak for 30 seconds. AI does the rest.**

```
Developer speaks:        "Finished the auth migration, working on the payment
                          timeout fix, blocked on staging access from DevOps"

AI extracts:             ✅ Completed: Auth migration
                         🔄 In Progress: Payment timeout fix
                         🚫 Blocker: Staging access (DevOps dependency)
                         😐 Sentiment: Neutral
                         ⚠️ Risk: Cross-team dependency

Available instantly to:  Tech Lead (dashboard)
                         Manager (digest + chat)
                         CTO (portfolio health view)
```

No Excel. No manual aggregation. No waiting for the next sync call.

---

## How It Works — By Role

### For Developers: Frictionless Input

Developers submit updates in the way that's easiest for them:

- **Voice** — Record a 30-second update from the browser. AI transcribes and structures it.
- **Text** — Type a quick summary. AI extracts the same structured data.
- **Slack** — Type `/pulsecheck finished auth work, blocked on staging` directly from Slack. Done.

**What changes for them:** Instead of filling 8 columns in a spreadsheet, they talk for 30 seconds. Instead of attending a 30-minute standup to relay 2 minutes of information, they submit asynchronously.

**Time saved:** ~30 min/day per developer.

---

### For Tech Leads: Real-Time Team Pulse

A single dashboard answers every question a lead asks in standup:

- **Who's blocked?** — Blockers surfaced automatically, sorted by age. A 3-day-old blocker gets flagged before you have to ask.
- **Who hasn't posted?** — Missing updates detected. "Amit hasn't posted in 2 days" — is he stuck, on leave, or just forgot?
- **What's the team sentiment?** — AI reads between the lines. Frustrated language patterns get flagged before they become attrition.
- **AI Chat** — Ask any question in natural language. *"What has Priya been working on this week?"* — get an instant synthesized answer from her actual updates. No Slack archaeology.

**What changes for them:** Morning routine becomes: open PulseCheck, scan the briefing, follow up on flags. Standups become optional or 10 minutes instead of 30.

**Time saved:** ~45 min/day.

---

### For Managers: Intelligence Without Meetings

Managers don't need to attend every standup or read every update. PulseCheck delivers intelligence:

- **AI Digest** — A daily/weekly summary delivered to email or Slack: what the team accomplished, what's in progress, what's blocked, and what needs your action. Read it in 2 minutes over coffee.
- **AI Chat** — Ask questions across all your team's data. *"Are there any cross-dependencies between the payment and auth workstreams?"* — get an answer in seconds, not after 3 Slack threads.
- **Views** — Collaborative grids that replace Excel/Confluence trackers. AI auto-suggests rows from team updates. The spreadsheet fills itself.

**What changes for them:** Weekly status aggregation that took 2 hours happens automatically. Follow-ups are targeted (you know exactly who to talk to and about what). Reporting to leadership takes minutes, not hours.

**Time saved:** ~4 hrs/week.

---

### For VPs and CTOs: Portfolio Health at a Glance

Leadership manages 10-15 projects across multiple teams. Today, understanding health requires asking each manager individually. PulseCheck provides:

- **Portfolio Health Dashboard** — Every project shows a health signal (green/yellow/red) derived from real data, not opinions. Red means: stale blockers, negative sentiment, missing updates. You see it the same day, not next week.
- **Cross-Team Dependencies** — AI identifies when Team A is blocked on Team B automatically. *"Backend team's API delay is blocking both Mobile and Frontend teams"* — visible before anyone escalates.
- **Drill-Down** — Click any project to see team-level detail. Click any team member to see their actual updates. Full transparency without micromanaging.
- **Trend Visibility** — Is velocity improving or declining? Are blockers being resolved faster or piling up? Patterns emerge from data, not gut feel.

**What changes for them:** The Confluence page that nobody updates gets replaced by a living dashboard. The Monday "project health" email you write manually gets generated automatically. You spot risks weeks earlier.

**Time saved:** ~2 hrs/week. But the real value is **decisions made faster with better data.**

---

## The AI Advantage

PulseCheck isn't a form with AI bolted on. AI is the core engine:

| Capability | What the AI does |
|------------|------------------|
| **Extraction** | Turns unstructured speech into structured data — completed items, blockers, risks, sentiment — automatically |
| **Insights** | Proactively detects stale blockers, missing updates, negative sentiment, and risk patterns without anyone asking |
| **Chat** | Answers any natural language question about team status, synthesizing across all updates |
| **Digest** | Generates executive summaries with accomplishments, risks, and recommended actions |
| **Suggest** | Auto-populates project tracking grids from team updates — the spreadsheet that fills itself |
| **Health Scoring** | Derives project health signals from actual data patterns, not self-reported status |

Every AI feature is scoped to your team's data. No information leaks between teams. No data leaves your organization's context.

---

## What Replaces What

| Today | With PulseCheck |
|-------|-----------------|
| 30-min daily standup with 16 people | 30-second async voice updates. Standups become optional 10-min blockers-only calls |
| Excel sheet with 8 manual columns | AI-populated Views that update from spoken updates |
| Confluence project tracker for CTO | Live portfolio dashboard with auto-derived health signals |
| "Hey, what's the status on X?" Slack messages | AI Chat: ask any question, get an instant synthesized answer |
| Weekly status email manually written by managers | Auto-generated AI digest delivered to email/Slack |
| Finding out about a blocker 3 days late | AI flags blockers on day 1, escalates on day 3 |
| Guessing which projects are at risk | Health scores derived from real signals — update frequency, blocker age, sentiment |

---

## Real Example

Here's what happened when we piloted PulseCheck with a 16-person engineering team:

**Before:**
> Manager schedules daily 2pm sync. 16 people join for 30 minutes. Each person gives a 2-minute update. Manager takes notes in Excel. After the call, manually updates Confluence. On Friday, writes a status email to the VP. Total weekly overhead: ~10 hours for the manager, ~2.5 hours per developer.

**After:**
> Developers submit voice updates after their morning standup (30 seconds each via Slack or browser). AI extracts structured data instantly. Manager opens PulseCheck at 9am, reads the AI briefing in 2 minutes, follows up on 2 flagged blockers. VP checks the portfolio dashboard on Monday morning — all projects green except one (flagged: "3-day blocker on staging access, cross-team dependency with DevOps"). VP pings the DevOps lead directly. Resolved by noon.

**That 3-day blocker? Under the old process, it would have surfaced at Thursday's sync.**

---

## Where We Are Today

### Built and Working

- Voice and text update submission with AI extraction
- AI Chat scoped to team data with streaming responses
- Dashboard with AI insights, team pulse, and digest generation
- Collaborative Views with inline editing and AI-suggested rows
- Multi-team support with role-based access
- Email reminders and digests (daily/weekly)
- Slack integration (slash command + digest posting)
- Onboarding flow for new users

### On the Roadmap

| Feature | Value | Timeline |
|---------|-------|----------|
| Dashboard redesign | Focused daily briefing instead of cluttered page | Next |
| Smart Views | Auto-populating grids with change tracking | Near-term |
| Git-based draft updates | "We noticed you merged 3 PRs — here's a draft update" | Near-term |
| Portfolio Health (Heartbeat) | Cross-team dashboard for leadership | Medium-term |
| Federated Context (MCP) | Connect team tools (GitHub, Jira, Confluence) for richer AI answers | Future |

---

## The Big Picture

PulseCheck captures status at the ground level and distributes intelligence at every altitude:

```
                    ┌─────────────────────┐
                    │    CTO / VP         │
                    │  Portfolio health    │  ← "Which projects need attention?"
                    │  Cross-team risks    │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │    Managers          │
                    │  AI digests          │  ← "What happened this week?"
                    │  Chat queries        │
                    │  Automated reports   │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │    Tech Leads        │
                    │  Dashboard briefing  │  ← "Who needs my help today?"
                    │  Team pulse          │
                    │  Views management    │
                    └─────────┬───────────┘
                              │
                    ┌─────────▼───────────┐
                    │    Developers        │
                    │  30-second voice     │  ← "Here's what I did today"
                    │  update              │
                    └─────────────────────┘
```

Information flows up automatically. Intelligence flows down to whoever needs it.

---

## Why Now

1. **AI capability has matured.** Two years ago, extracting structured data from speech reliably wasn't possible. Today, Claude and Whisper make it production-grade.

2. **The tooling gap is real.** Jira tracks tickets, not people. Slack has information but no structure. Excel has structure but no intelligence. PulseCheck sits in the gap.

3. **Remote and hybrid teams need async-first tools.** The 16-person daily sync call doesn't scale. Async status with AI synthesis does.

4. **Your team is already doing the work.** They already give updates. PulseCheck just captures them smarter and distributes them further.

---

## What We Need

To take PulseCheck from pilot to org-wide adoption:

1. **Expand the pilot** — 2-3 more teams using PulseCheck for 4 weeks to validate cross-team patterns
2. **Leadership access** — VP/CTO accounts to test the portfolio health view once built
3. **Slack workspace approval** — org-wide Slack app installation for frictionless developer input
4. **GitHub access** — read-only API tokens for git-based draft updates (optional, per-team)
5. **Feedback loop** — bi-weekly check-in on what's working and what's not

**The ask is small. The upside is organizational visibility that's always current, always structured, and available to everyone who needs it — without adding work for anyone.**

---

*PulseCheck — Stop chasing updates. Start reading the pulse.*
