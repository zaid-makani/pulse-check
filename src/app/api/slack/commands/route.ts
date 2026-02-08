import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { buildSubmitUpdateResponse } from '@/lib/slack'
import crypto from 'crypto'

/**
 * Verify that the request is from Slack
 */
function verifySlackRequest(request: NextRequest, body: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) return false

  const timestamp = request.headers.get('x-slack-request-timestamp')
  const slackSignature = request.headers.get('x-slack-signature')

  if (!timestamp || !slackSignature) return false

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 60 * 5) return false

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(slackSignature)
  )
}

/**
 * POST /api/slack/commands
 *
 * Handle Slack slash commands like /pulsecheck
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()

    // Verify request is from Slack
    if (process.env.SLACK_SIGNING_SECRET && !verifySlackRequest(request, body)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse form data
    const params = new URLSearchParams(body)
    const command = params.get('command')
    const text = params.get('text') || ''
    const slackUserId = params.get('user_id')
    const slackTeamId = params.get('team_id')
    const responseUrl = params.get('response_url')

    if (!slackUserId || !slackTeamId) {
      return NextResponse.json({ error: 'Missing user or team' }, { status: 400 })
    }

    // Find linked PulseCheck user
    const user = await prisma.user.findFirst({
      where: { slackUserId },
    })

    // Handle different commands
    if (command === '/pulsecheck' || command === '/update') {
      // If text is provided, submit directly
      if (text.trim()) {
        if (!user) {
          return NextResponse.json({
            response_type: 'ephemeral',
            text: ':warning: Your Slack account is not linked to PulseCheck. Please visit the web app to link your account.',
          })
        }

        // Submit the update in the background
        submitUpdateAsync(user.id, text.trim(), responseUrl || '')

        return NextResponse.json({
          response_type: 'ephemeral',
          text: ':hourglass_flowing_sand: Processing your update...',
        })
      }

      // No text provided, show the input form
      if (!user) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: ':warning: Your Slack account is not linked to PulseCheck.\n\nTo link your account:\n1. Log in to PulseCheck\n2. Go to Settings\n3. Click "Link Slack Account"\n\nOr submit updates directly with: `/pulsecheck Your update text here`',
        })
      }

      return NextResponse.json(buildSubmitUpdateResponse())
    }

    // Unknown command
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `Unknown command: ${command}`,
    })
  } catch (error) {
    console.error('Error handling Slack command:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Submit update asynchronously and respond via response_url
 */
async function submitUpdateAsync(userId: string, transcript: string, responseUrl: string) {
  try {
    // Call our own API to process the update
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use internal API key for server-to-server calls
        'x-internal-key': process.env.INTERNAL_API_KEY || '',
        'x-user-id': userId,
      },
      body: JSON.stringify({ transcript }),
    })

    const data = await response.json()

    // Send response back to Slack
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          replace_original: true,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: response.ok
                  ? `:white_check_mark: *Update Submitted!*\n\n*AI Summary:*\n${data.summary || 'Update recorded.'}`
                  : `:x: *Failed to submit update*\n${data.error || 'Please try again.'}`,
              },
            },
          ],
        }),
      })
    }
  } catch (error) {
    console.error('Error submitting update from Slack:', error)
    if (responseUrl) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: ':x: Failed to submit update. Please try again.',
        }),
      })
    }
  }
}
