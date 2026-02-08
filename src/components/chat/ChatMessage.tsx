'use client'

import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export function ChatMessage({ role, content, isStreaming }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-gradient-to-br from-violet-500 to-indigo-600'
            : 'bg-slate-200'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-slate-600" />
        )}
      </div>
      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1 rounded-2xl px-4 py-3',
          isUser
            ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
            : 'bg-white border border-slate-200 shadow-sm'
        )}
      >
        {isUser ? (
          <p className="text-sm">{content}</p>
        ) : (
          <div
            className={cn(
              'prose prose-sm max-w-none prose-slate',
              // Paragraphs
              'prose-p:my-1.5 prose-p:leading-relaxed prose-p:text-slate-700',
              // Lists
              'prose-ul:my-2 prose-ul:pl-4 prose-ul:list-disc',
              'prose-ol:my-2 prose-ol:pl-4 prose-ol:list-decimal',
              'prose-li:my-1 prose-li:text-slate-700 prose-li:marker:text-slate-400',
              // Headings
              'prose-headings:text-slate-900 prose-headings:font-semibold',
              'prose-h1:text-base prose-h1:mt-4 prose-h1:mb-2',
              'prose-h2:text-sm prose-h2:mt-3 prose-h2:mb-1.5',
              'prose-h3:text-sm prose-h3:mt-2 prose-h3:mb-1',
              // Emphasis
              'prose-strong:font-semibold prose-strong:text-slate-800',
              'prose-em:italic prose-em:text-slate-600',
              // Code
              'prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-violet-600',
              'prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg prose-pre:text-xs',
              // Horizontal rules
              'prose-hr:my-3 prose-hr:border-slate-200',
              isStreaming && 'animate-pulse'
            )}
          >
            <ReactMarkdown>{content || '...'}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
