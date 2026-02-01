import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // Convert Blob to File for OpenAI API
  const file = new File([audioBlob], 'audio.webm', { type: audioBlob.type })

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    language: 'en',
  })

  return transcription.text
}
