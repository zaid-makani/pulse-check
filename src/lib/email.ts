import { Resend } from 'resend'

// Lazy-initialize Resend client to avoid crashing at import if key is missing
let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set. Get one at https://resend.com')
    }
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

// Default from address - update to your verified domain
export const FROM_EMAIL = process.env.FROM_EMAIL || 'PulseCheck <notifications@pulsecheck.dev>'

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
}: {
  to: string
  userName: string
  resetUrl: string
}) {
  const subject = 'Reset your PulseCheck password'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">PulseCheck</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

    <p style="margin-bottom: 20px;">
      We received a request to reset your password. Click the button below to choose a new password.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}"
         style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Reset Password
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>Sent by PulseCheck</p>
  </div>
</body>
</html>
  `

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })
}

/**
 * Send an update reminder email to a team member
 */
export async function sendReminderEmail({
  to,
  userName,
  teamName,
}: {
  to: string
  userName: string
  teamName: string
}) {
  const subject = `Reminder: Submit your daily update for ${teamName}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">PulseCheck</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>

    <p style="margin-bottom: 20px;">
      This is a friendly reminder to submit your daily status update for <strong>${teamName}</strong>.
    </p>

    <p style="margin-bottom: 24px;">
      Sharing your progress helps your team stay aligned and identifies blockers early.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL}/submit"
         style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Submit Your Update
      </a>
    </div>

    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      You can speak naturally about what you're working on, and AI will extract the key details.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
    <p>Sent by PulseCheck</p>
  </div>
</body>
</html>
  `

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })
}

/**
 * Send a team digest email to a manager
 */
export async function sendDigestEmail({
  to,
  managerName,
  teamName,
  summary,
  stats,
  memberUpdates,
}: {
  to: string
  managerName: string
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
    sentiment: string | null
    hasBlockers: boolean
  }>
}) {
  const subject = `${teamName} Daily Digest - ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`

  const memberRows = memberUpdates.map(member => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
        <strong>${member.name}</strong>
        ${member.hasBlockers ? '<span style="background: #fef2f2; color: #dc2626; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">BLOCKED</span>' : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">
        ${member.summary || '<em>No update submitted</em>'}
      </td>
    </tr>
  `).join('')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #334155; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Team Digest</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${teamName}</p>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${managerName},</p>

    <p style="margin-bottom: 24px;">${summary}</p>

    <!-- Stats -->
    <div style="display: flex; gap: 16px; margin-bottom: 30px;">
      <div style="flex: 1; background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #8b5cf6;">${stats.submittedToday}/${stats.totalMembers}</div>
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Updates</div>
      </div>
      <div style="flex: 1; background: ${stats.blockers > 0 ? '#fef2f2' : '#f0fdf4'}; padding: 16px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: ${stats.blockers > 0 ? '#dc2626' : '#16a34a'};">${stats.blockers}</div>
        <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Blockers</div>
      </div>
    </div>

    <!-- Member Updates -->
    <h3 style="margin-bottom: 16px; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">Team Updates</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Member</th>
          <th style="padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #64748b;">Summary</th>
        </tr>
      </thead>
      <tbody>
        ${memberRows}
      </tbody>
    </table>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.NEXTAUTH_URL}/home"
         style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        View Full Dashboard
      </a>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: #f8fafc;">
    <p style="margin: 0;">Sent by PulseCheck</p>
  </div>
</body>
</html>
  `

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })
}
