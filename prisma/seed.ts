import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'rahul.sharma@company.com' },
      update: {},
      create: {
        email: 'rahul.sharma@company.com',
        name: 'Rahul Sharma',
        role: 'DEVELOPER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'priya.patel@company.com' },
      update: {},
      create: {
        email: 'priya.patel@company.com',
        name: 'Priya Patel',
        role: 'DEVELOPER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'amit.kumar@company.com' },
      update: {},
      create: {
        email: 'amit.kumar@company.com',
        name: 'Amit Kumar',
        role: 'LEAD',
      },
    }),
    prisma.user.upsert({
      where: { email: 'sneha.reddy@company.com' },
      update: {},
      create: {
        email: 'sneha.reddy@company.com',
        name: 'Sneha Reddy',
        role: 'TESTER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'vikram.singh@company.com' },
      update: {},
      create: {
        email: 'vikram.singh@company.com',
        name: 'Vikram Singh',
        role: 'DEVELOPER',
      },
    }),
  ])

  console.log(`Created ${users.length} users`)

  // Create sample status updates
  const statusUpdates = [
    {
      userId: users[0].id,
      rawTranscript:
        'Finished the auth refactor PR yesterday, waiting on review from Priya. Started looking at the payment bug today, it seems more complex than we initially thought. Might need to involve the platform team.',
      completed: JSON.stringify(['Auth refactor PR']),
      inProgress: JSON.stringify(['Payment bug investigation']),
      blockers: JSON.stringify(['Waiting on PR review from Priya']),
      needsHelp: JSON.stringify(['May need platform team involvement']),
      sentiment: 'concerned',
      riskFlags: JSON.stringify(['Payment bug scope may be larger than estimated']),
      summary: 'Completed auth refactor, investigating payment bug which may need escalation.',
    },
    {
      userId: users[1].id,
      rawTranscript:
        'Made good progress on the dashboard redesign. The new charts are looking great and performance is much better. Should be done by end of day tomorrow.',
      completed: JSON.stringify(['Dashboard chart implementation']),
      inProgress: JSON.stringify(['Dashboard redesign - final polish']),
      blockers: JSON.stringify([]),
      needsHelp: JSON.stringify([]),
      sentiment: 'positive',
      riskFlags: JSON.stringify([]),
      summary: 'Dashboard redesign progressing well, on track for completion.',
    },
    {
      userId: users[2].id,
      rawTranscript:
        'Spent most of today in meetings. Had the architecture review and sprint planning. Need to follow up on the database migration timeline with the DBA team.',
      completed: JSON.stringify(['Architecture review meeting', 'Sprint planning']),
      inProgress: JSON.stringify(['Database migration planning']),
      blockers: JSON.stringify(['Waiting on DBA team for migration timeline']),
      needsHelp: JSON.stringify([]),
      sentiment: 'neutral',
      riskFlags: JSON.stringify([]),
      summary: 'Meetings day, following up on database migration timeline.',
    },
    {
      userId: users[3].id,
      rawTranscript:
        'Finished testing the new user registration flow. Found 3 bugs, all logged in Jira. Starting on the payment flow testing tomorrow.',
      completed: JSON.stringify(['User registration flow testing', 'Bug reports logged (3)']),
      inProgress: JSON.stringify([]),
      blockers: JSON.stringify([]),
      needsHelp: JSON.stringify([]),
      sentiment: 'positive',
      riskFlags: JSON.stringify([]),
      summary: 'Completed registration testing, found and logged 3 bugs.',
    },
  ]

  for (const update of statusUpdates) {
    await prisma.statusUpdate.create({
      data: update,
    })
  }

  console.log(`Created ${statusUpdates.length} status updates`)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
