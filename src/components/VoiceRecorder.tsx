'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceRecorderProps {
  onTranscript: (text: string) => void
  onError?: (error: string) => void
  disabled?: boolean
}

export function VoiceRecorder({ onTranscript, onError, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const rec = new MediaRecorder(stream, { mimeType })
      recorderRef.current = rec
      chunksRef.current = []
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)

      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      rec.onstop = async () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        if (blob.size < 1000) { onError?.('That was too short to hear. Try again.'); return }
        setIsTranscribing(true)
        try {
          const fd = new FormData()
          fd.append('audio', blob, 'recording.webm')
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const data = await res.json()
          if (res.ok) onTranscript(data.text)
          else onError?.(data.error || 'Transcription failed')
        } catch {
          onError?.('Network error during transcription')
        } finally {
          setIsTranscribing(false)
          setSeconds(0)
        }
      }
      rec.start(1000)
      setIsRecording(true)
    } catch {
      onError?.('Could not access the microphone. Check browser permissions.')
    }
  }, [onTranscript, onError])

  const stop = useCallback(() => {
    if (recorderRef.current && isRecording) { recorderRef.current.stop(); setIsRecording(false) }
  }, [isRecording])

  const mm = Math.floor(seconds / 60)
  const ss = (seconds % 60).toString().padStart(2, '0')

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-pulse/30 animate-pulse-ring" />
            <span className="absolute inset-0 rounded-full bg-pulse/20 animate-pulse-ring [animation-delay:0.5s]" />
          </>
        )}
        <button
          onClick={isRecording ? stop : start}
          disabled={disabled || isTranscribing}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-full transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-pulse/30',
            isRecording ? 'bg-pulse text-paper shadow-lg shadow-pulse/30' : 'bg-ink text-paper hover:scale-[1.03]',
            (disabled || isTranscribing) && 'opacity-60',
          )}
        >
          {isTranscribing ? <Loader2 className="h-8 w-8 animate-spin" /> : isRecording ? <Square className="h-7 w-7" /> : <Mic className="h-9 w-9" />}
        </button>
      </div>
      <p className="h-5 text-[13px] text-ink-soft" aria-live="polite">
        {isTranscribing ? 'Listening back…' : isRecording ? <span className="font-mono tabular-nums text-pulse-ink">{mm}:{ss}</span> : 'Tap to talk'}
      </p>
    </div>
  )
}
