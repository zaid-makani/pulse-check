'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send, Check, AlertCircle, History } from 'lucide-react'

interface SubmittedUpdate {
  summary: string
  completed: string[]
  inProgress: string[]
  blockers: string[]
}

export default function SubmitPage() {
  const { data: session } = useSession()
  const [transcript, setTranscript] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedUpdate, setSubmittedUpdate] = useState<SubmittedUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleTranscript = (text: string) => {
    setError(null)
    setTranscript((prev) => (prev ? `${prev} ${text}` : text))
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleSubmit = async () => {
    if (!transcript.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSubmitted(true)
        setSubmittedUpdate({
          summary: data.summary,
          completed: data.completed,
          inProgress: data.inProgress,
          blockers: data.blockers,
        })
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to submit update')
      }
    } catch (err) {
      console.error('Error submitting status:', err)
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewUpdate = () => {
    setTranscript('')
    setSubmitted(false)
    setSubmittedUpdate(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Submit Update</h1>
          <p className="text-muted-foreground">Share your status with the team</p>
        </div>

        {/* Success State */}
        {submitted && submittedUpdate ? (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-green-700">Update Submitted!</CardTitle>
              <CardDescription>
                Your status has been recorded and analyzed by AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show AI Summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
                <p className="text-sm text-blue-900">{submittedUpdate.summary}</p>
              </div>

              {/* Show extracted items */}
              <div className="grid gap-2 text-sm">
                {submittedUpdate.completed.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-green-600 font-medium">Completed:</span>
                    <span className="text-muted-foreground">
                      {submittedUpdate.completed.join(', ')}
                    </span>
                  </div>
                )}
                {submittedUpdate.inProgress.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-medium">In Progress:</span>
                    <span className="text-muted-foreground">
                      {submittedUpdate.inProgress.join(', ')}
                    </span>
                  </div>
                )}
                {submittedUpdate.blockers.length > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-600 font-medium">Blockers:</span>
                    <span className="text-muted-foreground">
                      {submittedUpdate.blockers.join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button onClick={handleNewUpdate} className="flex-1">
                  Submit Another Update
                </Button>
                <Link href="/my-updates" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <History className="mr-2 h-4 w-4" />
                    View My Updates
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Recording State */
          <Card>
            <CardHeader>
              <CardTitle>Record Your Update</CardTitle>
              <CardDescription>
                Click the microphone and speak naturally about what you&apos;re working on, any
                blockers, or help you need. You can also type directly below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submitting as indicator */}
              {session?.user && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-sm font-medium">
                    {session.user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{session.user.name}</p>
                    <p className="text-xs text-slate-500">{session.user.email}</p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {/* Voice Recorder */}
              <div className="flex justify-center py-4">
                <VoiceRecorder
                  onTranscript={handleTranscript}
                  onError={handleError}
                  disabled={isSubmitting}
                />
              </div>

              {/* Transcript Editor */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Your Update:
                </label>
                <Textarea
                  placeholder="Click the mic to record, or type your update here..."
                  className="min-h-[120px]"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Mention what you completed, what you&apos;re working on, and any blockers.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!transcript.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Update
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
