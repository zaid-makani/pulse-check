import type { Metadata } from 'next'
import { Geist, Geist_Mono, Newsreader } from 'next/font/google'
import { AppShell } from '@/components/AppShell'
import { AuthProvider } from '@/components/AuthProvider'
import { TeamProvider } from '@/components/TeamProvider'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const serif = Newsreader({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'PulseCheck',
  description: 'A work memory for teams. Say what you did; PulseCheck remembers, connects, and reports.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} antialiased`}>
        <AuthProvider>
          <TeamProvider>
            <AppShell>{children}</AppShell>
          </TeamProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
