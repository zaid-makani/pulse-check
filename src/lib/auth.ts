import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

// Extend the built-in session types to include our custom fields
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
    }
  }
  interface User {
    id: string
    email: string
    name: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
  }
}

/**
 * NextAuth Configuration
 *
 * This is the core configuration for authentication in the app.
 *
 * Key concepts:
 * 1. Providers - Methods users can use to authenticate (credentials, OAuth, etc.)
 * 2. Session Strategy - How we store session data (JWT or database)
 * 3. Callbacks - Functions that run at various points in the auth lifecycle
 * 4. Pages - Custom pages for sign-in, sign-out, error, etc.
 */
export const authOptions: NextAuthOptions = {
  /**
   * PROVIDERS
   *
   * Define how users can authenticate. We use CredentialsProvider for
   * email/password login. This is flexible - we can add Okta, Google, etc. later
   * by adding more providers to this array.
   *
   * Example of adding Okta later:
   *
   * import OktaProvider from 'next-auth/providers/okta'
   *
   * OktaProvider({
   *   clientId: process.env.OKTA_CLIENT_ID!,
   *   clientSecret: process.env.OKTA_CLIENT_SECRET!,
   *   issuer: process.env.OKTA_ISSUER!,
   * })
   */
  providers: [
    CredentialsProvider({
      name: 'credentials',

      // Define the fields shown on the default sign-in page
      // (we override with custom page, but NextAuth needs this)
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },

      /**
       * AUTHORIZE FUNCTION
       *
       * This is where the actual authentication happens.
       * Called when signIn('credentials', { email, password }) is invoked.
       *
       * Returns:
       * - User object if credentials are valid (goes into JWT/session)
       * - null if credentials are invalid (triggers error)
       */
      async authorize(credentials) {
        // Validate input exists
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        })

        // User doesn't exist or has no password (OAuth-only user)
        if (!user || !user.password) {
          return null
        }

        // Compare provided password with stored hash
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isValidPassword) {
          return null
        }

        // Return user data that will be encoded in the JWT
        // Don't include password or sensitive data here!
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],

  /**
   * SESSION STRATEGY
   *
   * Two options:
   * - 'jwt': Session data stored in encrypted cookie (stateless, no DB queries)
   * - 'database': Session stored in DB, cookie only has session ID
   *
   * JWT is simpler for our use case - no session table needed.
   * The trade-off: can't invalidate sessions server-side (user stays logged in
   * until token expires, even if you want to force logout).
   */
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  /**
   * CUSTOM PAGES
   *
   * Override NextAuth's default pages with our own.
   * If not specified, NextAuth provides basic functional pages.
   */
  pages: {
    signIn: '/login',
    // signOut: '/logout',  // We'll handle logout inline
    // error: '/auth/error', // Can add custom error page later
  },

  /**
   * CALLBACKS
   *
   * Functions that run at specific points in the auth flow.
   * Used to customize tokens, sessions, and authorization.
   */
  callbacks: {
    /**
     * JWT CALLBACK
     *
     * Called whenever a JWT is created or updated:
     * - On sign in (user object is available)
     * - On session access (only token is available)
     *
     * Use this to add custom data to the token.
     */
    async jwt({ token, user }) {
      // On initial sign in, user object is available
      // Add user.id to the token so we can access it later
      if (user) {
        token.id = user.id
      }
      return token
    },

    /**
     * SESSION CALLBACK
     *
     * Called whenever session is checked (getServerSession, useSession).
     *
     * The session object is what your app code sees.
     * Use this to expose token data to your app.
     */
    async session({ session, token }) {
      // Add user ID from token to session
      if (session.user) {
        session.user.id = token.id
      }
      return session
    },
  },

  // Secret used to encrypt JWT - must be set in production
  secret: process.env.NEXTAUTH_SECRET,
}

/**
 * HELPER: Hash a password
 *
 * Used during signup to hash the password before storing.
 * bcrypt automatically handles salting.
 *
 * The number (12) is the "cost factor" - higher = more secure but slower.
 * 10-12 is a good balance for most applications.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * HELPER: Verify a password
 *
 * Compares a plain text password with a stored hash.
 * Returns true if they match.
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}
