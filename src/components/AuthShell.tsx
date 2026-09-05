import Link from 'next/link'

function Mark() {
  return (
    <svg viewBox="0 0 32 32" width={36} height={36} aria-hidden>
      <rect x="0" y="0" width="32" height="32" rx="9" fill="var(--ink)" />
      <path d="M5 17h5l3-7 4 13 4-9 2 3h4" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" stroke="var(--pulse)" />
    </svg>
  )
}

/** Centered card layout for the signed-out and onboarding screens. */
export function AuthShell({ title, subtitle, children, footer, wide = false }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <Mark />
        <span className="text-[17px] font-semibold tracking-tight">PulseCheck</span>
      </Link>
      <div className={`w-full ${wide ? 'max-w-lg' : 'max-w-sm'} rounded-xl border border-line bg-surface p-7 shadow-sm`}>
        <h1 className="font-serif text-[26px] font-medium leading-tight tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13.5px] text-ink-soft">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <p className="mt-5 text-[13px] text-ink-soft">{footer}</p>}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

export const inputClass = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-[14px] placeholder:text-ink-faint focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-pulse/20'

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md bg-bad-soft px-3 py-2 text-[13px] text-bad">{children}</p>
}
