import { WebClient } from '@slack/web-api'
import { prisma } from './db'

/**
 * Get a Slack WebClient for a specific workspace
 */
export async function getSlackClient(slackTeamId: string): Promise<WebClient | null> {
  const installation = await prisma.slackInstallation.findUnique({
    where: { teamId: slackTeamId },
  })

  if (!installation) {
    return null
  }

  return new WebClient(installation.botToken)
}

/**
 * Post a message to a Slack channel
 */
export async function postToSlack({
  slackTeamId,
  channel,
  text,
  blocks,
}: {
  slackTeamId: string
  channel: string
  text: string
  blocks?: unknown[]
}) {
  const client = await getSlackClient(slackTeamId)
  if (!client) {
    throw new Error('Slack not installed for this workspace')
  }

  return client.chat.postMessage({
    channel,
    text,
    blocks: blocks as never,
  })
}

/**
 * Post a digest message to Slack
 */
export async function postDigestToSlack({
  webhookUrl,
  teamName,
  summary,
  stats,
  memberUpdates,
}: {
  webhookUrl: string
  teamName: string
  summary: string
  stats: {
    totalMembers: number
    submittedToday: number
    blockers: number
  }
  memberUpdates: Array<{
    name: string
    summary: string | null
    hasBlockers: boolean
  }>
}) {
  // Build Slack blocks for rich formatting
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${teamName} Daily Digest`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: summary,
      },
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Updates:*\n${stats.submittedToday}/${stats.totalMembers}`,
        },
        {
          type: 'mrkdwn',
          text: `*Blockers:*\n${stats.blockers > 0 ? `:warning: ${stats.blockers}` : ':white_check_mark: None'}`,
        },
      ],
    },
    {
      type: 'divider',
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Team Updates:*',
      },
    },
    ...memberUpdates.slice(0, 10).map(member => ({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${member.name}*${member.hasBlockers ? ' :warning:' : ''}\n${member.summary || '_No update submitted_'}`,
      },
    })),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Sent by PulseCheck | <${process.env.NEXTAUTH_URL}/dashboard|View Dashboard>`,
        },
      ],
    },
  ]

  // Send via incoming webhook
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks, text: `${teamName} Daily Digest` }),
  })

  if (!response.ok) {
    throw new Error(`Failed to post to Slack: ${response.statusText}`)
  }

  return true
}

/**
 * Build a response for slash command showing update submission form
 */
export function buildSubmitUpdateResponse() {
  return {
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':memo: *Submit Your Status Update*\nType your update below. Include what you completed, what you\'re working on, and any blockers.',
        },
      },
      {
        type: 'input',
        block_id: 'update_input',
        element: {
          type: 'plain_text_input',
          action_id: 'update_text',
          multiline: true,
          placeholder: {
            type: 'plain_text',
            text: 'e.g., Finished the login page, now working on password reset. Blocked on API docs.',
          },
        },
        label: {
          type: 'plain_text',
          text: 'Your Update',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Submit Update',
            },
            style: 'primary',
            action_id: 'submit_update',
          },
        ],
      },
    ],
  }
}

/**
 * Build a success response after submitting update
 */
export function buildUpdateSuccessResponse(summary: string) {
  return {
    response_type: 'ephemeral',
    replace_original: true,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':white_check_mark: *Update Submitted!*',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI Summary:*\n${summary}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `<${process.env.NEXTAUTH_URL}/my-updates|View all your updates>`,
          },
        ],
      },
    ],
  }
}
