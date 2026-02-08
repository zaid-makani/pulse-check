import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { NavHeader } from '@/components/NavHeader'
import { AuthProvider } from '@/components/AuthProvider'
import { TeamProvider } from '@/components/TeamProvider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'PulseCheck - Team Status Updates',
  description: 'AI-powered team status updates with voice-first input and intelligent insights',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <TeamProvider>
            <NavHeader />
            {children}
          </TeamProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
