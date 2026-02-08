import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * NextAuth Middleware
 *
 * Middleware runs BEFORE a request is completed. It can:
 * - Redirect unauthenticated users to login
 * - Add headers to responses
 * - Rewrite URLs
 *
 * withAuth is NextAuth's middleware wrapper that:
 * 1. Checks for a valid session
 * 2. If no session and route is protected → redirects to signIn page
 * 3. If session exists → continues to the page
 *
 * The middleware function below runs AFTER auth check passes.
 * You can add additional logic here (role checks, etc.)
 */
export default withAuth(
  function middleware(req) {
    // This runs only if user is authenticated
    // You can add role-based access control here:
    //
    // const token = req.nextauth.token
    // if (req.nextUrl.pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
    //   return NextResponse.redirect(new URL('/unauthorized', req.url))
    // }

    return NextResponse.next()
  },
  {
    callbacks: {
      /**
       * AUTHORIZED CALLBACK
       *
       * Determines if the user is authorized to access the route.
       * Return true to allow, false to redirect to sign in.
       *
       * For now, we just check if token exists (user is logged in).
       */
      authorized: ({ token }) => !!token
    },
  }
)

/**
 * MATCHER CONFIG
 *
 * Defines which routes the middleware should run on.
 *
 * We EXCLUDE:
 * - /login, /signup (auth pages - must be accessible when logged out)
 * - /api/auth/* (NextAuth routes - must be accessible for auth to work)
 * - /_next/* (Next.js internals)
 * - /favicon.ico, /images/* (static assets)
 * - / (landing page - public)
 *
 * Everything else requires authentication.
 *
 * Matcher uses a subset of regex-like patterns:
 * - * matches any characters (non-greedy)
 * - :path* matches any path segment(s)
 */
export const config = {
  matcher: [
    /*
     * Protect these specific routes that require authentication.
     * Everything else (/, /login, /signup, /api/auth, static files) is public.
     */
    '/submit/:path*',
    '/my-updates/:path*',
    '/dashboard/:path*',
    '/views/:path*',
    '/chat/:path*',
    '/settings/:path*',
    '/api/status/:path*',
    '/api/users/:path*',
    '/api/digest/:path*',
    '/api/chat/:path*',
    '/api/views/:path*',
    '/api/transcribe/:path*',
  ]
}
