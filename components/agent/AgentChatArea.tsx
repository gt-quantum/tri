'use client'

import { useEffect, useCallback, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import { useAgentChat } from '@/lib/ai/use-agent-chat'
import { useAuth } from '@/lib/auth-context'
import type { UIMessage } from 'ai'
import AgentMessageList from './AgentMessageList'
import AgentInput from './AgentInput'

interface AgentChatAreaProps {
  conversationId: string | null
  onConversationCreated?: (id: string) => void
  onConversationUpdate?: () => void
}

const STARTERS = [
  'What\'s my portfolio occupancy rate?',
  'Show me leases expiring in the next 6 months',
  'Which tenants have the highest monthly rent?',
  'List all vacant spaces',
]

export default function AgentChatArea({ conversationId, onConversationCreated, onConversationUpdate }: AgentChatAreaProps) {
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
    setConversationId,
  } = useAgentChat({
    conversationId,
    context: { page: '/agent' },
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  // Track whether we just created a conversation (skip loading its empty messages)
  const justCreatedRef = useRef(false)

  // Refresh sidebar when streaming completes (conversation saved/updated server-side)
  const prevStatusRef = useRef<string>(status)
  useEffect(() => {
    const wasActive = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    if (wasActive && status === 'ready') {
      onConversationUpdate?.()
    }
    prevStatusRef.current = status
  }, [status, onConversationUpdate])

  // Load conversation messages on mount or when conversationId changes (eager creation)
  // Note: sidebar switching is handled by key-based remount in the parent, so this
  // effect mainly handles: initial mount with a conversationId, and the null→id
  // transition during eager creation (where justCreatedRef skips the load).
  useEffect(() => {
    if (!conversationId) return

    if (justCreatedRef.current) {
      justCreatedRef.current = false
      return
    }

    async function loadConversation() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch(`/api/v1/conversations/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const body = await res.json()
          const msgs = body.data?.messages || []
          // Load as text-only — tool invocation parts are session artifacts
          // that cause API errors when re-sent to Anthropic
          setMessages(
            msgs.map((m: { role: string; content?: string; parts?: Array<{ type: string; text?: string }> }, i: number) => {
              let text = ''
              if (Array.isArray(m.parts)) {
                text = m.parts
                  .filter((p) => p.type === 'text' && p.text)
                  .map((p) => p.text)
                  .join('')
              } else if (typeof m.content === 'string') {
                text = m.content
              }
              return {
                id: `loaded-${i}`,
                role: m.role as UIMessage['role'],
                parts: [{ type: 'text' as const, text }],
              }
            })
          )
        }
      } catch {
        // Non-critical
      }
    }

    loadConversation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Create conversation eagerly before first message, so the server always does an UPDATE
  const ensureConversation = useCallback(async (firstMessageText: string): Promise<void> => {
    if (conversationId) return

    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch('/api/v1/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: firstMessageText.slice(0, 80),
          source: 'page',
        }),
      })

      if (res.ok) {
        const body = await res.json()
        const newId = body.data?.id
        if (newId) {
          justCreatedRef.current = true
          setConversationId(newId)
          onConversationCreated?.(newId)
        }
      }
    } catch {
      // Fall through — server will create conversation in onFinish as fallback
    }
  }, [conversationId, getToken, setConversationId, onConversationCreated])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await ensureConversation(text)
    await sendMessage(text)
  }, [input, setInput, sendMessage, ensureConversation])

  const handleStarter = useCallback(async (question: string) => {
    setInput('')
    await ensureConversation(question)
    await sendMessage(question)
  }, [setInput, sendMessage, ensureConversation])

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {messages.length === 0 && !conversationId ? (
        // Welcome state
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
