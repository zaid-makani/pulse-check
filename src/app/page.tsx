import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { Mic, MessageCircle, FileText, ArrowRight } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/button'

function Mark() {
  return (
    <svg viewBox="0 0 32 32" width={40} height={40} aria-hidden>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="var(--ink)" />
      <path d="M5 17h5l3-7 4 13 4-9 2 3h4" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" stroke="var(--pulse)" />
    </svg>
  )
}

export default async function Landing() {
  const session = await getServerSession(authOptions)
  if (session?.user) redirect('/home')

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="flex items-center gap-2.5"><Mark /><span className="text-[17px] font-semibold tracking-tight">PulseCheck</span></span>
        <nav className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/signup"><Button size="sm">Create account</Button></Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-pulse-ink">A work memory for teams</p>
          <h1 className="mt-3 max-w-3xl font-serif text-[52px] font-medium leading-[1.05] tracking-tight">Say what you did.<br />PulseCheck remembers, connects, and reports.</h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-soft">
            People tell it what they worked on in thirty seconds, by voice or from Slack. It turns that into an always-current picture of who is doing what and where the risk is. Managers ask it questions instead of asking people. Everyone gets their own record back at review time.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/signup"><Button size="lg">Get started <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link href="/login"><Button size="lg" variant="outline">Sign in</Button></Link>
          </div>
        </section>

        <section className="grid gap-6 border-t border-line py-16 md:grid-cols-3">
          <Feature icon={Mic} title="Capture in thirty seconds" body="Talk like you would in standup. A voice note here, a reply to the nightly Slack nudge, or a line of text. Nothing to fill in." />
          <Feature icon={MessageCircle} title="Ask, don't chase" body="Who is working on the vendor integration? What is blocked on another team? What has Priya been doing? Answers come from people's own words, with sources." />
          <Feature icon={FileText} title="Documents that write themselves" body="A morning briefing for leads. 1-on-1 prep for managers. A self-review draft for every person. Quarter delivery notes for the CTO." />
        </section>

        <section className="border-t border-line py-16">
          <blockquote className="max-w-2xl font-serif text-[24px] leading-snug tracking-tight text-ink">
            &ldquo;It is not another sheet to fill. It is the thing that fills the sheets.&rdquo;
          </blockquote>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-8 text-[12.5px] text-ink-faint">PulseCheck · built for the teams that use it</footer>
    </div>
  )
}

function Feature({ icon: Icon, title, body }: { icon: typeof Mic; title: string; body: string }) {
  return (
    <div>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-pulse-soft text-pulse-ink"><Icon className="h-4 w-4" /></span>
      <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  )
}
