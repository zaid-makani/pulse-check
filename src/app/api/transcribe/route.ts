import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    console.log('Received audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    // Convert the File to a format OpenAI accepts
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Create a file object that OpenAI can use
    const file = await toFile(buffer, 'audio.webm', { type: 'audio/webm' })

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
    })

    console.log('Transcription successful:', transcription.text.slice(0, 100))

    return NextResponse.json({ text: transcription.text })
  } catch (error) {
    console.error('Transcription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to transcribe: ${errorMessage}` }, { status: 500 })
  }
}
