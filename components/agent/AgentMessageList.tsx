'use client'

import { useRef, useEffect } from 'react'
import type { UIMessage } from 'ai'
import AgentMessage from './AgentMessage'

interface AgentMessageListProps {
  messages: UIMessage[]
  isStreaming: boolean
  variant?: 'page' | 'widget'
}

export default function AgentMessageList({ messages, isStreaming, variant = 'page' }: AgentMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isStreaming])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-brass/10 border border-brass/15 flex items-center justify-center">
            <span className="font-display text-lg text-brass">T</span>
          </div>
          <p className="font-body text-sm text-warm-300">
            Ask me about your properties, tenants, leases, or portfolio data.
          </p>
        </div>
      </div>
    )
  }

  const isPage = variant === 'page'

  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className={
          isPage
            ? 'max-w-3xl mx-auto px-6 py-6 space-y-6'
            : 'p-4 space-y-3'
        }
      >
        {messages.map((msg) => (
          <AgentMessage key={msg.id} message={msg} variant={variant} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
