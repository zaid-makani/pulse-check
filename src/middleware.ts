import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Every route listed in `config.matcher` requires a session. Signed-in
 * users who have not finished onboarding are sent there first.
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname
    if (token && !token.onboardingCompleted && !pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/onboarding', req.url))
    }
    return NextResponse.next()
  },
  { callbacks: { authorized: ({ token }) => !!token } },
)

export const config = {
  matcher: [
    '/home/:path*',
    '/capture/:path*',
    '/me/:path*',
    '/threads/:path*',
    '/ask/:path*',
    '/people/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/teams/:path*',
    '/onboarding/:path*',
    '/api/updates/:path*',
    '/api/users/:path*',
    '/api/threads/:path*',
    '/api/ask/:path*',
    '/api/reports/:path*',
    '/api/admin/:path*',
    '/api/transcribe/:path*',
    '/api/teams/:path*',
    '/api/user/:path*',
  ],
}
