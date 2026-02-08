'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

/**
 * AuthProvider Component
 *
 * Wraps the application in NextAuth's SessionProvider.
 *
 * Why is this needed?
 * - SessionProvider gives components access to session state via useSession()
 * - It must be a Client Component (hence 'use client')
 * - But layout.tsx is a Server Component by default
 *
 * Solution: Create this wrapper Client Component and use it in layout.
 *
 * The SessionProvider:
 * - Handles session refresh automatically
 * - Shares session state across all components
 * - Triggers re-renders when session changes
 *
 * Usage in components:
 *
 * import { useSession } from 'next-auth/react'
 *
 * function MyComponent() {
 *   const { data: session, status } = useSession()
 *
 *   if (status === 'loading') return <Loading />
 *   if (!session) return <NotLoggedIn />
 *
 *   return <div>Welcome, {session.user.name}</div>
 * }
 */
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}
