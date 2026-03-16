import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase()

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (!user) {
      return successResponse
    }

    // Delete any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    })

    // Generate token using Web Crypto API
    const bytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(bytes)
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    })

    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`

    if (process.env.RESEND_API_KEY) {
      try {
        const { sendPasswordResetEmail } = await import('@/lib/email')
        const result = await sendPasswordResetEmail({
          to: normalizedEmail,
          userName: user.name,
          resetUrl,
        })
        console.log('Password reset email result:', JSON.stringify(result))
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
      }
    } else {
      console.log(`[DEV] Password reset link for ${normalizedEmail}: ${resetUrl}`)
    }

    return successResponse
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
