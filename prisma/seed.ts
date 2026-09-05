import 'dotenv/config'
import { PrismaClient, type Sentiment, type ThreadStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * v2 seed: one org, two teams, ten people, three weeks of updates already
 * linked to threads. No model calls. Embeddings are filled by
 * `npm run db:backfill` (Phase 1) so that chat and linking work on seed data.
 *
 * Sign in as zaid@example.com / Test1234! (manager on both teams, org admin).
 */

const prisma = new PrismaClient()

type Sig = {
  done?: string[]
  inProgress?: string[]
  blockers?: { text: string; waitingOn: string | null; external: boolean }[]
  asks?: string[]
  risks?: string[]
  sentiment?: 'positive' | 'neutral' | 'concerned' | 'frustrated'
  summary: string
  threads: string[]
}

interface Story {
  user: string // email
  team: 'platform' | 'payments'
  dayOffset: number // working days ago (0 = today)
  raw: string
  sig: Sig
}

const people = [
  { email: 'zaid@example.com', name: 'Zaid Makani', teams: { platform: 'MANAGER', payments: 'MANAGER' }, orgAdmin: true },
  { email: 'ananya@example.com', name: 'Ananya Iyer', teams: { platform: 'LEAD' } },
  { email: 'rahul@example.com', name: 'Rahul Sharma', teams: { platform: 'MEMBER' } },
  { email: 'meera@example.com', name: 'Meera Nair', teams: { platform: 'MEMBER' } },
  { email: 'karan@example.com', name: 'Karan Mehta', teams: { platform: 'MEMBER' } },
  { email: 'sneha@example.com', name: 'Sneha Reddy', teams: { platform: 'MEMBER', payments: 'MEMBER' } },
  { email: 'vikram@example.com', name: 'Vikram Singh', teams: { payments: 'LEAD' } },
  { email: 'priya@example.com', name: 'Priya Patel', teams: { payments: 'MEMBER' } },
  { email: 'arjun@example.com', name: 'Arjun Das', teams: { payments: 'MEMBER' } },
  { email: 'fatima@example.com', name: 'Fatima Khan', teams: { payments: 'MEMBER' } },
] as const

const threads: Record<'platform' | 'payments', { name: string; status: ThreadStatus; summary: string; aliases?: string[] }[]> = {
  platform: [
    { name: 'N1 third-party integration', status: 'BLOCKED', summary: 'Integrating the N1 vendor API for identity verification. Auth handshake and sandbox flows done; waiting on N1 for the final webhook contract, which has slipped twice.', aliases: ['N1', 'N1 integration', 'N1 vendor'] },
    { name: 'Bulk upload v2', status: 'ACTIVE', summary: 'Rewriting bulk CSV upload to stream rows and validate asynchronously. Parser and validation done, progress UI in review, error export remaining.', aliases: ['bulk upload', 'CSV upload'] },
    { name: 'Postgres 16 migration', status: 'DONE', summary: 'Upgraded staging and production databases to Postgres 16 with zero downtime using logical replication.' },
    { name: 'Observability dashboards', status: 'ACTIVE', summary: 'Building Grafana dashboards and alert rules for API latency and error budgets.' },
    { name: 'Flaky CI on integration suite', status: 'ACTIVE', summary: 'Integration tests fail intermittently on CI due to shared test database state; being isolated per worker.' },
  ],
  payments: [
    { name: 'Payment timeout incident', status: 'ACTIVE', summary: 'Intermittent gateway timeouts on card payments over 5 seconds. Root cause traced to a hardcoded client timeout; retry with backoff being added.' },
    { name: 'UPI autopay mandates', status: 'BLOCKED', summary: 'Adding recurring UPI mandates. Mandate creation works in sandbox; waiting on the bank partner to enable production credentials.', aliases: ['UPI mandates', 'autopay'] },
    { name: 'Reconciliation report', status: 'ACTIVE', summary: 'Daily reconciliation between gateway settlements and ledger, with a diff report emailed to finance.' },
    { name: 'Refund API', status: 'DONE', summary: 'Partial and full refunds exposed via API with idempotency keys. Shipped and documented.' },
    { name: 'PCI audit prep', status: 'ACTIVE', summary: 'Collecting evidence and closing findings ahead of the annual PCI DSS audit.' },
  ],
}

const stories: Story[] = [
  // Platform
  { user: 'rahul@example.com', team: 'platform', dayOffset: 14, raw: 'Started on the N1 integration today. Got the auth handshake working against their sandbox. Their docs are a bit thin so I have pinged their support for the webhook contract.', sig: { done: ['N1 sandbox auth handshake'], inProgress: ['N1 integration'], asks: [], summary: 'Got the N1 sandbox auth handshake working and asked N1 support for the webhook contract.', threads: ['N1 third-party integration'], sentiment: 'neutral' } },
  { user: 'rahul@example.com', team: 'platform', dayOffset: 11, raw: 'N1 sandbox verification flow is done end to end. Still no reply from N1 on the webhook contract, so I cannot finish the callback handling. Picked up the CI flakiness in the meantime.', sig: { done: ['N1 sandbox verification flow'], inProgress: ['N1 webhook callback handling', 'CI flakiness investigation'], blockers: [{ text: 'Webhook contract not shared by N1', waitingOn: 'N1 vendor', external: true }], summary: 'Finished the N1 sandbox verification flow; webhook work is blocked on N1, so picked up the CI flakiness.', threads: ['N1 third-party integration', 'Flaky CI on integration suite'], sentiment: 'neutral' } },
  { user: 'rahul@example.com', team: 'platform', dayOffset: 7, raw: 'Found the CI flakiness. The integration tests share one test database and two workers were stepping on each other. Moving to one schema per worker. N1 finally replied but the contract they sent contradicts their docs, asked for clarification again.', sig: { done: ['Root-caused CI flakiness to shared test DB'], inProgress: ['Per-worker test schemas', 'N1 webhook contract clarification'], blockers: [{ text: 'N1 webhook contract contradicts their documentation', waitingOn: 'N1 vendor', external: true }], risks: ['N1 timeline slipping'], summary: 'Root-caused CI flakiness to a shared test database; N1 sent a contract that contradicts their docs.', threads: ['Flaky CI on integration suite', 'N1 third-party integration'], sentiment: 'concerned' } },
  { user: 'rahul@example.com', team: 'platform', dayOffset: 3, raw: 'Per worker schemas are in and CI has been green for three days. N1 has gone quiet again. Honestly I have been waiting on them for two weeks now and it is getting frustrating. I need someone with a relationship there to push.', sig: { done: ['Per-worker test schemas merged, CI green 3 days'], inProgress: ['N1 integration'], blockers: [{ text: 'N1 unresponsive on webhook contract for two weeks', waitingOn: 'N1 vendor', external: true }], asks: ['Someone with an N1 relationship to escalate'], summary: 'CI is stable after per-worker schemas; N1 integration remains blocked on the vendor and needs escalation.', threads: ['Flaky CI on integration suite', 'N1 third-party integration'], sentiment: 'frustrated' } },
  { user: 'rahul@example.com', team: 'platform', dayOffset: 1, raw: 'Still nothing from N1. I have written the callback handler against the contract they sent and stubbed the parts that contradict the docs so at least we can test our side.', sig: { inProgress: ['N1 callback handler against draft contract'], blockers: [{ text: 'N1 webhook contract still unconfirmed', waitingOn: 'N1 vendor', external: true }], summary: 'Wrote the N1 callback handler against the draft contract with stubs where it contradicts the docs.', threads: ['N1 third-party integration'], sentiment: 'concerned' } },

  { user: 'meera@example.com', team: 'platform', dayOffset: 14, raw: 'Kicked off bulk upload v2. The plan is to stream the CSV instead of loading it all into memory, and validate rows asynchronously. Wrote the streaming parser today.', sig: { done: ['Streaming CSV parser'], inProgress: ['Bulk upload v2'], summary: 'Started bulk upload v2 with a streaming CSV parser.', threads: ['Bulk upload v2'], sentiment: 'positive' } },
  { user: 'meera@example.com', team: 'platform', dayOffset: 10, raw: 'Async validation for bulk upload is done, with a job per 1000 rows. Tested with a 2 million row file, took 4 minutes, memory flat. Starting the progress UI tomorrow.', sig: { done: ['Async row validation jobs', 'Load test with 2M rows'], inProgress: ['Bulk upload progress UI'], summary: 'Async validation for bulk upload done and load tested with 2M rows; starting the progress UI.', threads: ['Bulk upload v2'], sentiment: 'positive' } },
  { user: 'meera@example.com', team: 'platform', dayOffset: 6, raw: 'Progress UI for bulk upload is in review, Ananya is looking at it. Also helped Karan with the Grafana alert thresholds for an hour.', sig: { done: ['Bulk upload progress UI in review'], inProgress: ['Bulk upload v2'], summary: 'Bulk upload progress UI is in review; helped Karan with Grafana alert thresholds.', threads: ['Bulk upload v2', 'Observability dashboards'], sentiment: 'neutral' } },
  { user: 'meera@example.com', team: 'platform', dayOffset: 2, raw: 'Addressed review comments on the progress UI. Last piece of bulk upload is the error export, where users download the rows that failed with reasons. Should be done this week.', sig: { done: ['Progress UI review comments addressed'], inProgress: ['Bulk upload error export'], summary: 'Addressed review on the bulk upload progress UI; error export is the last piece.', threads: ['Bulk upload v2'], sentiment: 'positive' } },

  { user: 'karan@example.com', team: 'platform', dayOffset: 13, raw: 'Finished the Postgres 16 migration on staging using logical replication, no downtime. Production is scheduled for Thursday night with the DBA.', sig: { done: ['Postgres 16 on staging via logical replication'], inProgress: ['Production Postgres 16 cutover'], summary: 'Migrated staging to Postgres 16 with no downtime; production cutover scheduled with the DBA.', threads: ['Postgres 16 migration'], sentiment: 'positive' } },
  { user: 'karan@example.com', team: 'platform', dayOffset: 9, raw: 'Production is on Postgres 16. Cutover took 40 seconds of read-only. Starting on the observability dashboards now, first the API latency panels.', sig: { done: ['Production Postgres 16 cutover'], inProgress: ['API latency Grafana panels'], summary: 'Production is on Postgres 16 after a 40 second read-only cutover; started observability dashboards.', threads: ['Postgres 16 migration', 'Observability dashboards'], sentiment: 'positive' } },
  { user: 'karan@example.com', team: 'platform', dayOffset: 4, raw: 'Latency and error budget dashboards are up. Alert rules are half done. I am a bit worried the thresholds will be noisy in the first week, want to review them with Ananya before enabling paging.', sig: { done: ['Latency and error budget dashboards'], inProgress: ['Alert rules'], risks: ['Alert thresholds may be noisy initially'], asks: ['Review alert thresholds with Ananya before paging'], summary: 'Latency and error budget dashboards are live; alert rules half done and need threshold review before paging.', threads: ['Observability dashboards'], sentiment: 'concerned' } },

  { user: 'ananya@example.com', team: 'platform', dayOffset: 12, raw: 'Mostly reviews and planning this week. Reviewed Meera\'s parser, paired with Rahul on N1 auth. Sprint planning done, we committed to bulk upload and observability for this sprint.', sig: { done: ['Reviewed bulk upload parser', 'Sprint planning'], inProgress: ['Pairing on N1 auth'], summary: 'Reviews and sprint planning; committed the sprint to bulk upload and observability.', threads: ['Bulk upload v2', 'N1 third-party integration'], sentiment: 'neutral' } },
  { user: 'ananya@example.com', team: 'platform', dayOffset: 5, raw: 'Reviewed the bulk upload progress UI, a few comments. Escalated the N1 delay to our vendor manager, no answer yet. Reviewed Karan\'s alert thresholds, we agreed to start with warnings only.', sig: { done: ['Reviewed bulk upload progress UI', 'Reviewed alert thresholds'], inProgress: ['N1 escalation via vendor manager'], blockers: [{ text: 'N1 escalation pending with vendor manager', waitingOn: 'vendor manager', external: false }], summary: 'Reviewed bulk upload UI and alert thresholds; escalated the N1 delay to the vendor manager.', threads: ['Bulk upload v2', 'N1 third-party integration', 'Observability dashboards'], sentiment: 'neutral' } },

  { user: 'sneha@example.com', team: 'platform', dayOffset: 8, raw: 'Wrote the QA plan for bulk upload v2. Covered large files, bad encodings, and partial failures. Will start executing once the progress UI lands.', sig: { done: ['QA plan for bulk upload v2'], inProgress: ['Bulk upload QA'], summary: 'Wrote the QA plan for bulk upload v2 covering large files, encodings, and partial failures.', threads: ['Bulk upload v2'], sentiment: 'neutral' } },

  // Payments
  { user: 'priya@example.com', team: 'payments', dayOffset: 14, raw: 'Looking into the payment timeout incident. About 2 percent of card payments over 5 seconds fail. Suspect our gateway client timeout is too tight.', sig: { inProgress: ['Payment timeout investigation'], risks: ['2% of slow card payments failing'], summary: 'Investigating the payment timeout incident; suspects a tight gateway client timeout.', threads: ['Payment timeout incident'], sentiment: 'concerned' } },
  { user: 'priya@example.com', team: 'payments', dayOffset: 10, raw: 'Confirmed it. There is a hardcoded 5 second timeout in the gateway client. Raising it is not enough because the gateway sometimes takes 8. Adding retry with exponential backoff and an idempotency key so we never double charge.', sig: { done: ['Root-caused timeout to hardcoded 5s client timeout'], inProgress: ['Retry with backoff and idempotency'], summary: 'Root-caused the payment timeouts to a hardcoded 5 second client timeout; adding retry with backoff and idempotency.', threads: ['Payment timeout incident'], sentiment: 'neutral' } },
  { user: 'priya@example.com', team: 'payments', dayOffset: 4, raw: 'Retry with backoff is in staging. Failure rate on slow payments dropped from 2 percent to 0.1 in the soak test. Need Vikram to sign off before prod since it touches charging.', sig: { done: ['Retry with backoff in staging', 'Soak test: failures 2% to 0.1%'], asks: ['Vikram sign-off before production'], summary: 'Retry with backoff is in staging and cut slow-payment failures to 0.1%; needs sign-off for production.', threads: ['Payment timeout incident'], sentiment: 'positive' } },
  { user: 'priya@example.com', team: 'payments', dayOffset: 1, raw: 'Timeout fix is in production since yesterday, monitoring looks clean. Picking up PCI evidence collection for the access control section.', sig: { done: ['Timeout fix in production'], inProgress: ['PCI access control evidence'], summary: 'Timeout fix is live and clean; picking up PCI access control evidence.', threads: ['Payment timeout incident', 'PCI audit prep'], sentiment: 'positive' } },

  { user: 'arjun@example.com', team: 'payments', dayOffset: 13, raw: 'UPI autopay mandates. Mandate creation and first debit work in the bank sandbox. Asked the bank partner for production credentials.', sig: { done: ['UPI mandate creation and first debit in sandbox'], inProgress: ['UPI autopay mandates'], summary: 'UPI mandate creation and first debit work in sandbox; asked the bank for production credentials.', threads: ['UPI autopay mandates'], sentiment: 'positive' } },
  { user: 'arjun@example.com', team: 'payments', dayOffset: 8, raw: 'Bank partner says production credentials need a compliance review on their side, two to three weeks. That pushes autopay out of this quarter unless someone can speed it up. Meanwhile building the mandate revoke flow.', sig: { inProgress: ['Mandate revoke flow'], blockers: [{ text: 'Production UPI credentials pending bank compliance review, 2 to 3 weeks', waitingOn: 'bank partner', external: true }], risks: ['UPI autopay may miss the quarter'], summary: 'UPI production credentials are held up by the bank\'s compliance review, risking the quarter; building the revoke flow meanwhile.', threads: ['UPI autopay mandates'], sentiment: 'concerned' } },
  { user: 'arjun@example.com', team: 'payments', dayOffset: 2, raw: 'Revoke flow done and tested in sandbox. Still waiting on the bank. Also fixed a rounding bug Fatima found in the reconciliation diff.', sig: { done: ['Mandate revoke flow', 'Rounding bug in reconciliation diff'], blockers: [{ text: 'Production UPI credentials', waitingOn: 'bank partner', external: true }], summary: 'Mandate revoke flow done; still blocked on bank credentials; fixed a reconciliation rounding bug.', threads: ['UPI autopay mandates', 'Reconciliation report'], sentiment: 'neutral' } },

  { user: 'fatima@example.com', team: 'payments', dayOffset: 12, raw: 'Shipped the refund API with partial refunds and idempotency keys. Docs are on the developer portal. Starting reconciliation report next.', sig: { done: ['Refund API shipped', 'Refund API docs'], inProgress: ['Reconciliation report'], summary: 'Shipped the refund API with partial refunds and idempotency; starting the reconciliation report.', threads: ['Refund API', 'Reconciliation report'], sentiment: 'positive' } },
  { user: 'fatima@example.com', team: 'payments', dayOffset: 7, raw: 'Reconciliation job pulls gateway settlements and compares to the ledger daily. Found a rounding mismatch on multi-currency, handed to Arjun. Finance wants the diff emailed as CSV.', sig: { done: ['Daily reconciliation job'], inProgress: ['Reconciliation diff email'], summary: 'Daily reconciliation job is running; found a multi-currency rounding mismatch; finance wants a CSV diff by email.', threads: ['Reconciliation report'], sentiment: 'neutral' } },
  { user: 'fatima@example.com', team: 'payments', dayOffset: 3, raw: 'Diff CSV goes out to finance every morning now. They are happy. I am spending the rest of the week on PCI evidence, mostly logging and encryption sections.', sig: { done: ['Reconciliation diff CSV to finance'], inProgress: ['PCI logging and encryption evidence'], summary: 'Reconciliation diff now emails finance daily; moving to PCI logging and encryption evidence.', threads: ['Reconciliation report', 'PCI audit prep'], sentiment: 'positive' } },

  { user: 'vikram@example.com', team: 'payments', dayOffset: 11, raw: 'Reviewed Priya\'s timeout analysis, agree with the retry approach. Kicked off PCI audit prep, assigned sections. Talked to the bank about UPI credentials, they are slow.', sig: { done: ['Reviewed timeout analysis', 'PCI prep kickoff'], inProgress: ['Bank follow-up on UPI credentials'], summary: 'Agreed with the timeout retry approach, kicked off PCI prep, and chased the bank on UPI credentials.', threads: ['Payment timeout incident', 'PCI audit prep', 'UPI autopay mandates'], sentiment: 'neutral' } },
  { user: 'vikram@example.com', team: 'payments', dayOffset: 3, raw: 'Signed off on the timeout fix for production. PCI evidence is about 60 percent collected. The UPI credential delay is now the biggest risk to the quarter and I have asked Zaid to raise it with the bank\'s relationship manager.', sig: { done: ['Signed off timeout fix'], inProgress: ['PCI evidence collection 60%'], risks: ['UPI credential delay is the biggest risk to the quarter'], asks: ['Zaid to raise UPI delay with the bank relationship manager'], summary: 'Signed off the timeout fix; PCI evidence at 60%; asked Zaid to escalate the UPI credential delay.', threads: ['Payment timeout incident', 'PCI audit prep', 'UPI autopay mandates'], sentiment: 'concerned' } },

  { user: 'sneha@example.com', team: 'payments', dayOffset: 5, raw: 'Regression tested the refund API against the new retry logic to make sure retries never produce double refunds. All good.', sig: { done: ['Regression tested refunds against retry logic'], summary: 'Regression tested the refund API against the new retry logic; no double refunds.', threads: ['Refund API', 'Payment timeout incident'], sentiment: 'positive' } },
]

function workingDaysAgo(n: number, hour: number): Date {
  const d = new Date()
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0)
  let left = n
  while (left > 0) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) left--
  }
  return d
}

async function main() {
  console.log('Seeding v2 data…')
  await prisma.$transaction([
    prisma.llmCall.deleteMany(),
    prisma.report.deleteMany(),
    prisma.threadLink.deleteMany(),
    prisma.update.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.teamMembership.deleteMany(),
    prisma.teamSettings.deleteMany(),
    prisma.team.deleteMany(),
    prisma.orgMembership.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ])

  const password = await bcrypt.hash('Test1234!', 12)
  const org = await prisma.organization.create({ data: { name: 'Acme', slug: 'acme' } })

  const teamIds: Record<'platform' | 'payments', string> = {
    platform: (await prisma.team.create({ data: { orgId: org.id, name: 'Platform', description: 'Core platform, integrations, and infrastructure', settings: { create: {} } } })).id,
    payments: (await prisma.team.create({ data: { orgId: org.id, name: 'Payments', description: 'Checkout, gateways, and reconciliation', settings: { create: {} } } })).id,
  }

  const userIds = new Map<string, string>()
  for (const p of people) {
    const u = await prisma.user.create({
      data: {
        email: p.email,
        name: p.name,
        password,
        onboardingCompleted: true,
        orgMemberships: { create: { orgId: org.id, role: 'orgAdmin' in p && p.orgAdmin ? 'ADMIN' : 'MEMBER' } },
        teamMemberships: {
          create: Object.entries(p.teams).map(([t, role]) => ({ teamId: teamIds[t as 'platform' | 'payments'], role: role as 'MEMBER' | 'LEAD' | 'MANAGER' })),
        },
      },
    })
    userIds.set(p.email, u.id)
  }

  const threadIds = new Map<string, string>()
  for (const team of ['platform', 'payments'] as const) {
    for (const t of threads[team]) {
      const created = await prisma.thread.create({
        data: { teamId: teamIds[team], name: t.name, status: t.status, summary: t.summary, aliases: t.aliases ?? [], createdByAi: true },
      })
      threadIds.set(t.name, created.id)
    }
  }

  const lastActivity = new Map<string, Date>()
  for (const s of stories) {
    const createdAt = workingDaysAgo(s.dayOffset, 18)
    const signals = {
      done: s.sig.done ?? [],
      inProgress: s.sig.inProgress ?? [],
      blockers: s.sig.blockers ?? [],
      asks: s.sig.asks ?? [],
      risks: s.sig.risks ?? [],
      mentions: { people: [], teams: [], tickets: [] },
      sentiment: s.sig.sentiment ?? 'neutral',
      summary: s.sig.summary,
      workItems: s.sig.threads,
    }
    await prisma.update.create({
      data: {
        userId: userIds.get(s.user)!,
        teamId: teamIds[s.team],
        source: 'SEED',
        rawText: s.raw,
        signals,
        sentiment: signals.sentiment.toUpperCase() as Sentiment,
        summary: s.sig.summary,
        createdAt,
        links: { create: s.sig.threads.map((name) => ({ threadId: threadIds.get(name)!, confidence: 1 })) },
      },
    })
    for (const name of s.sig.threads) {
      const prev = lastActivity.get(name)
      if (!prev || prev < createdAt) lastActivity.set(name, createdAt)
    }
  }
  for (const [name, at] of lastActivity) {
    await prisma.thread.update({ where: { id: threadIds.get(name)! }, data: { lastActivityAt: at } })
  }

  console.log(`Seeded ${people.length} people, 2 teams, ${threads.platform.length + threads.payments.length} threads, ${stories.length} updates.`)
  console.log('Sign in: zaid@example.com / Test1234!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
