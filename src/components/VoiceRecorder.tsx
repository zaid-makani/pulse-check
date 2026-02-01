'use client'

import { useState, useRef, useCallback } from 'react'
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
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Try to use a format that Whisper supports well
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      setRecordingDuration(0)

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1)
      }, 1000)

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        stream.getTracks().forEach((track) => track.stop())

        if (audioBlob.size < 1000) {
          onError?.('Recording too short. Please try again.')
          return
        }

        // Send to transcription API
        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('audio', audioBlob, 'recording.webm')

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json()

          if (response.ok) {
            onTranscript(data.text)
          } else {
            console.error('Transcription failed:', data)
            onError?.(data.error || 'Transcription failed')
          }
        } catch (error) {
          console.error('Error transcribing:', error)
          onError?.('Network error during transcription')
        } finally {
          setIsTranscribing(false)
          setRecordingDuration(0)
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
      onError?.('Could not access microphone. Please check permissions.')
    }
  }, [onTranscript, onError])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Animated rings container */}
      <div className="relative">
        {/* Outer animated rings - only show when recording */}
        {isRecording && (
          <>
            <div className="absolute inset-0 -m-4 rounded-full bg-red-500/20 animate-ping" />
            <div className="absolute inset-0 -m-2 rounded-full bg-red-500/30 animate-pulse" />
          </>
        )}

        {/* Main button */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isTranscribing}
          className={cn(
            'relative h-28 w-28 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-offset-2',
            isRecording
              ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-500/40 focus:ring-red-500/50'
              : isTranscribing
                ? 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-lg shadow-slate-500/25'
                : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105 focus:ring-purple-500/50',
            (disabled || isTranscribing) && 'opacity-70 cursor-not-allowed'
          )}
        >
          {/* Inner glow */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/25 to-transparent" />

          {/* Icon */}
          {isTranscribing ? (
            <Loader2 className="h-12 w-12 text-white animate-spin relative z-10" />
          ) : isRecording ? (
            <Square className="h-10 w-10 text-white relative z-10" />
          ) : (
            <Mic className="h-12 w-12 text-white relative z-10" />
          )}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center">
        {isTranscribing ? (
          <p className="text-sm font-medium text-slate-600">Transcribing with Whisper...</p>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600">Recording</span>
            </div>
            <span className="text-lg font-mono font-bold text-slate-900">{formatDuration(recordingDuration)}</span>
            <span className="text-xs text-slate-500">Click to stop</span>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Click to start recording</p>
        )}
      </div>
    </div>
  )
}
