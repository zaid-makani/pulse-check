import { createHmac, timingSafeEqual } from 'node:crypto'
import { WebClient } from '@slack/web-api'

/**
 * Single-workspace Slack client for the pilot. Tokens come from env; the
 * SlackInstallation table is kept for a later multi-workspace OAuth flow.
 */

let _client: WebClient | null = null

export function slackEnabled(): boolean {
  return !!process.env.SLACK_BOT_TOKEN
}

export function slack(): WebClient {
  if (!_client) {
    if (!process.env.SLACK_BOT_TOKEN) throw new Error('SLACK_BOT_TOKEN is not set')
    _client = new WebClient(process.env.SLACK_BOT_TOKEN)
  }
  return _client
}

/** Verify an incoming request per https://api.slack.com/authentication/verifying-requests-from-slack */
export function verifySlackSignature(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret || !timestamp || !signature) return false
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false
  const base = `v0:${timestamp}:${rawBody}`
  const expected = `v0=${createHmac('sha256', secret).update(base).digest('hex')}`
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function appUrl(path = ''): string {
  return `${(process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')}${path}`
}
