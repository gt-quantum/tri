'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useAuth } from '@/lib/auth-context'
import type { PageContext } from './agent-context'

interface UseAgentChatOptions {
  conversationId?: string | null
  context?: PageContext | null
  onError?: (error: Error) => void
}

/**
 * Custom hook wrapping useChat() with TRI-specific additions.
 * Handles auth token injection, context passing, input state, and conversation ID.
 *
 * AI SDK v6's useChat() does NOT return input/setInput — we manage that locally
 * and expose a simplified sendMessage(text) that wraps the SDK's { text } signature.
 *
 * AI SDK v6 uses transport objects instead of api/headers/body options.
 */
export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { getToken } = useAuth()
  const contextRef = useRef(options.context)
  contextRef.current = options.context ?? null
  const [input, setInput] = useState('')

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/v1/chat',
        headers: async (): Promise<Record<string, string>> => {
          const token = await getToken()
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
        body: () => ({
          conversationId: options.conversationId ?? undefined,
          context: contextRef.current ?? undefined,
        }),
      }),
    [getToken, options.conversationId]
  )

  const chat = useChat({
    id: options.conversationId ?? undefined,
    transport,
    onError: (error) => {
      console.error('[Strata AI] Chat error:', error)
      options.onError?.(error)
    },
  })

  // Wrap sendMessage to accept a plain string
  const sendMessageText = useCallback(
    async (text: string) => {
      await chat.sendMessage({ text })
    },
    [chat.sendMessage]
  )

  return {
    messages: chat.messages,
    setMessages: chat.setMessages,
    status: chat.status,
    stop: chat.stop,
    error: chat.error,
    input,
    setInput,
    sendMessage: sendMessageText,
  }
}
