'use client'

import { useEffect, useCallback } from 'react'
import { Sparkles } from 'lucide-react'
import { useAgentChat } from '@/lib/ai/use-agent-chat'
import { useAuth } from '@/lib/auth-context'
import type { UIMessage } from 'ai'
import AgentMessageList from './AgentMessageList'
import AgentInput from './AgentInput'

interface AgentChatAreaProps {
  conversationId: string | null
}

const STARTERS = [
  'What\'s my portfolio occupancy rate?',
  'Show me leases expiring in the next 6 months',
  'Which tenants have the highest monthly rent?',
  'List all vacant spaces',
]

export default function AgentChatArea({ conversationId }: AgentChatAreaProps) {
  const { getToken } = useAuth()

  const {
    messages,
    setMessages,
    input,
    setInput,
    status,
    sendMessage,
    stop,
    error,
  } = useAgentChat({
    conversationId,
    context: { page: '/agent' },
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return
    }

    async function loadConversation() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch(`/api/v1/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const body = await res.json()
          const msgs = body.data?.messages || []
          setMessages(
            msgs.map((m: { role: string; content: string }, i: number) => ({
              id: `loaded-${i}`,
              role: m.role as UIMessage['role'],
              parts: [{ type: 'text' as const, text: m.content }],
            }))
          )
        }
      } catch {
        // Non-critical
      }
    }

    loadConversation()
  }, [conversationId, getToken, setMessages])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await sendMessage(text)
  }, [input, setInput, sendMessage])

  const handleStarter = useCallback(async (question: string) => {
    setInput('')
    await sendMessage(question)
  }, [setInput, sendMessage])

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {messages.length === 0 && !conversationId ? (
        // Welcome state — centered like Claude
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-12 h-12 rounded-full bg-brass/10 border border-brass/15 flex items-center justify-center mb-6">
            <Sparkles size={20} strokeWidth={1.5} className="text-brass" />
          </div>
          <h2 className="font-display text-2xl text-warm-white tracking-wide mb-2">
            Strata AI
          </h2>
          <p className="font-body text-[13px] text-warm-400 mb-8 max-w-sm text-center">
            Ask questions about your properties, tenants, leases, and portfolio in natural language.
          </p>
          <div className="grid grid-cols-2 gap-2.5 max-w-lg w-full">
            {STARTERS.map((q) => (
              <button
                key={q}
                onClick={() => handleStarter(q)}
                className="text-left px-4 py-3 rounded-xl border border-brass-faint/15 hover:border-brass/20 hover:bg-obsidian-800/50 transition-colors"
              >
                <span className="font-body text-[13px] text-warm-300 leading-snug line-clamp-2">
                  {q}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <AgentMessageList messages={messages} isStreaming={isStreaming} variant="page" />
      )}
      {error && (
        <div className="px-6 pb-2">
          <div className="max-w-3xl mx-auto px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="font-body text-[13px] text-red-400">{error.message}</p>
          </div>
        </div>
      )}
      <AgentInput
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={stop}
        isStreaming={isStreaming}
        placeholder="Message Strata AI..."
        variant="page"
      />
    </div>
  )
}
