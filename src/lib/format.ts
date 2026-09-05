import { formatDistanceToNowStrict, isToday, isYesterday, format } from 'date-fns'

export function relativeTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 36 * 3_600_000) return formatDistanceToNowStrict(d, { addSuffix: true })
  if (isYesterday(d)) return 'yesterday'
  return format(d, 'd MMM')
}

export function dayLabel(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'EEEE, d MMM')
}

export function timeLabel(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return format(d, 'h:mm a')
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function usd(n: number): string {
  if (n < 0.01 && n > 0) return `$${n.toFixed(4)}`
  return `$${n.toFixed(2)}`
}

export function daysSince(iso: string | Date): number {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}
