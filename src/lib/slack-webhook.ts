/**
 * Minimal Slack incoming-webhook delivery, used until the Slack app (Phase 2)
 * takes over with bot DMs. Converts our Markdown to Slack mrkdwn well enough.
 */
export function markdownToMrkdwn(md: string): string {
  return md
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<$2|$1>')
}

export async function postWebhook(url: string, opts: { title: string; markdown: string; link?: string }) {
  const body = {
    text: opts.title,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: opts.title.slice(0, 150) } },
      ...chunk(markdownToMrkdwn(opts.markdown), 2900).map((t) => ({ type: 'section', text: { type: 'mrkdwn', text: t } })),
      ...(opts.link ? [{ type: 'context', elements: [{ type: 'mrkdwn', text: `<${opts.link}|Open in PulseCheck>` }] }] : []),
    ],
  }
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`)
}

function chunk(text: string, size: number): string[] {
  const out: string[] = []
  let cur = ''
  for (const para of text.split('\n\n')) {
    if ((cur + '\n\n' + para).length > size && cur) { out.push(cur); cur = para } else cur = cur ? `${cur}\n\n${para}` : para
  }
  if (cur) out.push(cur)
  return out.length ? out : ['']
}
