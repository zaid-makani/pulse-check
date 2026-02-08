import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * NextAuth API Route Handler
 *
 * This is a "catch-all" route that handles all auth-related API endpoints:
 *
 * - GET/POST /api/auth/signin     - Sign in page/action
 * - GET/POST /api/auth/signout    - Sign out page/action
 * - GET      /api/auth/session    - Get current session
 * - GET      /api/auth/csrf       - Get CSRF token
 * - GET      /api/auth/providers  - List available providers
 * - POST     /api/auth/callback/* - OAuth callback handling
 *
 * The [...nextauth] folder name tells Next.js to route all
 * /api/auth/* requests to this handler.
 *
 * We export both GET and POST as the same handler because
 * NextAuth needs to handle both methods for various endpoints.
 */
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
