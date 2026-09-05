import { NextRequest, NextResponse } from 'next/server'
import { handle, HttpError, requireUserId } from '@/lib/authz'
import { transcribeAudio } from '@/lib/transcribe'

export const POST = handle(async (request: NextRequest) => {
  const me = await requireUserId()
  const formData = await request.formData()
  const audio = formData.get('audio')
  if (!(audio instanceof File)) throw new HttpError(400, 'No audio file provided')
  const text = await transcribeAudio(Buffer.from(await audio.arrayBuffer()), audio.name || 'audio.webm', { userId: me })
  return NextResponse.json({ text })
})
