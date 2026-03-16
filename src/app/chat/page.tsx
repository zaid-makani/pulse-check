'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ChatInput } from '@/components/chat/ChatInput'
import { useTeam } from '@/components/TeamProvider'
import { MessageCircle, Sparkles, ChevronDown } from 'lucide-react'

type ChatScope = 'current' | 'all'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_QUESTIONS = [
  'Who has blockers this week?',
  'What did the team complete yesterday?',
  'How is the team sentiment overall?',
  'Summarize the team\'s progress',
]

export default function ChatPage() {
  const { currentTeam, teams } = useTeam()
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatScope, setChatScope] = useState<ChatScope>('current')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const effectiveTeamId = chatScope === 'all' ? undefined : currentTeam?.id

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Reset messages when team or scope changes
  useEffect(() => {
    setMessages([])
  }, [currentTeam?.id, chatScope])

  const sendMessage = async (content: string) => {
    if (chatScope === 'current' && !currentTeam) return

    const userMessage: Message = { role: 'user', content }
    setMessages((prev) => [...prev, userMessage])
    setIsStreaming(true)

    // Add empty assistant message for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages,
          days: 7,
          ...(effectiveTeamId ? { teamId: effectiveTeamId } : {}),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullContent += chunk

        // Update the last message with streamed content
        setMessages((prev) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: fullContent,
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Update the assistant message with error
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        }
        return newMessages
      })
    } finally {
      setIsStreaming(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    sendMessage(question)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container mx-auto max-w-4xl h-screen flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/25">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {chatScope === 'all'
                  ? 'All Teams Chat'
                  : currentTeam ? `${currentTeam.name} Chat` : 'Team Chat'}
              </h1>
              <p className="text-sm text-slate-500">
                {chatScope === 'all'
                  ? 'Ask questions across all your teams'
                  : currentTeam ? 'Ask questions about your team\'s status' : 'Select a team to start chatting'}
              </p>
            </div>
          </div>
          {/* Scope selector */}
          {teams.length > 0 && (
            <div className="relative">
              <select
                value={chatScope}
                onChange={(e) => setChatScope(e.target.value as ChatScope)}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-slate-700 hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer"
              >
                <option value="current">Current team</option>
                <option value="all">All my teams</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {messages.length === 0 ? (
            // Empty state with suggested questions
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 mb-4">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Ask about your team
              </h2>
              <p className="text-sm text-slate-500 text-center mb-6 max-w-md">
                I can help you understand team status, blockers, progress, and more based on recent status updates.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_QUESTIONS.map((question) => (
                  <Button
                    key={question}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-sm rounded-full hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            // Messages list
            <div className="flex-1 overflow-y-auto">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <ChatInput onSend={sendMessage} disabled={isStreaming || (chatScope === 'current' && !currentTeam)} />
        </Card>
      </div>
    </div>
  )
}
