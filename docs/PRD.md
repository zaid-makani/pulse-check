# PulseCheck — Product Requirements (v2)

> **Status:** Draft for the team pilot
> **Authors:** Zaid Makani, Claude (co-founder / principal architect)
> **Date:** September 2026
> **Supersedes:** `docs/archive/PRD-v1.md` and the v1 planning docs

---

## 1. The problem, in one paragraph

A Director of Engineering runs two or three teams through staff engineers. When someone asks "who is working on the N1 integration?", answering takes 45 minutes of finding the right team and the right people, and those people are often on calls. The team is quiet by culture: the loudest engineers get noticed, the workhorses do not, and at appraisal time nobody remembers what they did in March. Every previous fix (Jira tags, an Excel sheet due by 9pm, a Confluence roadmap the CTO chases people to fill) failed for the same reason: it asked people to log in somewhere and type.

## 2. What PulseCheck is

PulseCheck is a **work memory for teams**. People tell it what they did in whatever way costs them the least (a voice note, a Slack reply, a one-tap confirmation of what it already noticed). It turns those signals into an always-current picture of who is doing what, where the risk is, and how work rolls up into quarterly commitments. Managers ask it questions instead of asking people. Individuals get their own record back at appraisal time.

**Pulse** is the ground-level heartbeat of a team. **Lifeline** is how those pulses connect into projects and quarters for VPs and the CTO.

It does not replace standups or 1-on-1s. It makes them shorter, because everyone arrives already knowing the context.

## 3. Design principles

These decide every scope argument.

1. **Capture where people already are.** Slack is the primary input surface, not the website. Nobody should have to open a browser to be counted.
2. **Confirm, don't compose.** Whenever PulseCheck can draft an update from signals it already has (PRs merged, tickets moved, yesterday's thread), it drafts and the person confirms or corrects. Typing from a blank box is the last resort.
3. **Threads are the spine.** Every update is linked by AI to one or more *work threads* (a feature, an integration, an incident, a deal). Threads span people, teams, and weeks. Every question, report, and rollup is a query over threads.
4. **Reports are generated, never maintained.** There is no grid anyone has to keep up to date. Briefings, 1-on-1 prep, self-reviews, and quarter summaries are produced on demand from the data and can be edited before sharing.
5. **Ask, don't browse.** The main manager interface is a question. It works in the web app and by mentioning the bot in Slack.
6. **Give something back to the submitter.** Every person gets a weekly "your week" recap and a self-review on demand. This is the adoption incentive in a culture where people do not broadcast.
7. **Vocabulary per team, not per product.** Engineering teams talk about blockers and tickets. BD teams talk about clients and deals. The thread model is shared; the extraction vocabulary is configurable per team.

## 4. Who uses it

| Persona | What they do | What they get |
|---|---|---|
| **Individual contributor** (engineer, QA, BD) | Replies to a nightly Slack DM by text or voice clip, or confirms a drafted update. Optionally uses the web voice page. | A weekly recap DM. A self-review document for any period, built from their own words. Their blockers surface without them having to escalate. |
| **Team lead / staff engineer** | Reads the morning briefing. Asks questions. Runs the DSM with the generated standup brief open. | Knows who to talk to before the DSM starts. |
| **Manager / Director** (primary buyer) | Asks "what is happening with X" and "what has Y been doing". Opens 1-on-1 prep before each 1-on-1. | Cross-team answers in seconds. Sentiment and blocker flags without a call. |
| **VP / CTO** (post-pilot) | Marks quarter commitments. Reads the quarter delivery draft. | The Confluence roadmap and the quarterly Slack canvas newsletter draft themselves; teams review instead of write. |

## 5. Core concepts

### Update
One person, one moment, raw text (from voice, Slack, or web). AI extracts a structured `Signal` set: items done, items in progress, blockers, asks for help, sentiment, risks. The raw text is always kept.

### Work thread
A named stream of work that outlives any single update. Created by AI when it first sees unfamiliar work, confirmed or renamed by a human. Has a team (or several), participants (derived), a status (derived from latest signals: active, blocked, done, stale), and a rolling AI summary that is refreshed when new updates link to it.

Examples: "N1 third-party integration", "Bulk upload v2", "Payments timeout incident", "Acme renewal".

### Commitment (post-pilot)
A thread that leadership has marked as a quarter deliverable. Carries the quarter, owner team, and a target. Lifeline views are commitments plus their threads.

### Report
A generated document. Types at pilot: daily briefing (per team, for leads/managers), standup brief (per team, before the DSM), 1-on-1 prep (per person, per period), self-review (per person, per period), quarter delivery draft (per team, per quarter). Reports are regenerable, editable, and exportable to Slack (message or canvas) and Markdown.

### Team and organization
Teams isolate data by default. Organizations group teams so that directors and above can query across them. Roles: member, lead, manager at team level; admin at org level.

## 6. Features for the pilot

The pilot is 8 to 10 people on Zaid's teams for 3 weeks. Everything below is required for the pilot; everything in section 7 is not.

### 6.1 Capture
- **Slack nightly nudge.** At the team's configured time the bot DMs each member: "What did you work on today?" The person replies in the thread with text or a Slack audio clip. Audio is transcribed. No login involved.
- **Slack anytime.** `/pulse <text>` or a DM to the bot at any time counts as an update.
- **Web voice page.** Kept from v1 for people who prefer it. Record, review the transcript, submit.
- **Confirmation loop.** After extraction the bot replies with a two-line summary and the threads it linked to. The person can reply "fix: ..." to correct. Silence means accepted.

### 6.2 Understand
- **Extraction** into signals using a per-team vocabulary (engineering vocabulary at pilot).
- **Thread linking** at ingest: match the update against the team's active threads by meaning, create new threads when nothing matches, refresh the rolling summary of each touched thread.
- **Flags:** blocker older than N days, no update for N days, negative sentiment, cross-team dependency mentioned.

### 6.3 Ask
- **Web chat** backed by an agent with tools: search threads, search updates, get a person's timeline, get a team's flags. Scope defaults to all teams the asker belongs to; answers cite the updates they came from.
- **Slack mention.** `@Pulse who is working on N1?` gives the same answer in Slack.

### 6.4 Reports
- **Daily briefing** for leads and managers: who to talk to first and why. Delivered as a Slack DM at a configured time and shown on the web home page.
- **1-on-1 prep** for a person over a period: what they did, what they were blocked on, sentiment trend, open questions to ask.
- **Self-review** for a person over a period: their accomplishments grouped by thread, in their own words, ready to paste into the appraisal form.
- **Your week** recap DM to every member on Friday.

### 6.5 Accounts
- **Sign in with Slack** for the pilot. It costs nobody a new password and links Slack identity automatically. Okta comes with org-wide rollout.
- Team and org management pages carried over from v1, simplified.

## 7. Explicitly after the pilot

Listed so nobody rebuilds them by accident.

- **Lifeline:** commitments, quarter roadmap tracking, CTO cross-org view, quarterly newsletter draft to a Slack canvas. Depends on threads existing and being trusted.
- **Passive signals:** GitHub PRs and Jira transitions drafted into the nightly nudge ("I saw you merged two PRs and moved JIRA-123 to review. Anything else?"). This is the biggest friction reducer and the biggest integration cost; it waits until the pilot proves people respond to the nudge at all.
- **Non-engineering vocabularies** (BD, marketing). The model supports them; the prompts and onboarding do not yet.
- **1-on-1 feedback capture:** transcript in, FOG check (Factual, Observable, Guiding), SBIN entries out (Situation, Behavior, Impact, Next steps). Private to manager and report. High org value because the org has trained managers on this, but not core.
- **Okta SSO**, audit logging, data retention policy.
- **Collaborative editable views.** The v1 grid is retired. If a team needs a shared editable surface after the pilot, it will be designed from what the pilot shows, not carried over.

## 8. What the pilot must teach us

| Question | Measure | Threshold to continue |
|---|---|---|
| Will people submit without being chased? | Share of members with at least one update on a working day | 70% by week 2, held in week 3 |
| Is Slack the right surface? | Share of updates arriving via Slack versus web | Informational; expect above 80% |
| Does the thread model hold up? | Share of AI thread links a human corrected | Under 20% |
| Do managers ask instead of call? | Questions asked per manager per week; managers' own report | At least 5, and "I skipped at least one status call" |
| Does anyone value the recap? | Replies or reactions to the Friday DM; self-review generated at least once by half the pilot | Informational |

## 9. Non-goals

- Replacing Jira, standups, or 1-on-1s.
- A public SaaS. Multi-org is designed in, but signup, billing, and marketing pages are not built.
- Mobile apps. Slack is the mobile surface.
- Real-time collaboration surfaces.
