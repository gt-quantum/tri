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
 * We deliberately do NOT pass `id` to useChat — using a single stable message store
 * and swapping messages via setMessages when switching conversations. This avoids
 * the cross-contamination issues with useChat's id-based internal store.
 *
 * conversationId is tracked via a ref so the transport body() always reads the
 * latest value without needing to recreate the transport instance.
 */
export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { getToken } = useAuth()
  const contextRef = useRef(options.context)
  contextRef.current = options.context ?? null
  const conversationIdRef = useRef(options.conversationId ?? null)
  conversationIdRef.current = options.conversationId ?? null
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
          conversationId: conversationIdRef.current ?? undefined,
          context: contextRef.current ?? undefined,
        }),
      }),
    [getToken]
  )

  const chat = useChat({
    transport,
    onError: (error) => {
      console.error('[Strata AI] Chat error:', error)
      options.onError?.(error)
    },
  })

  // Allow imperative update of conversationId ref (before sendMessage, before React re-renders)
  const setConversationId = useCallback((id: string | null) => {
    conversationIdRef.current = id
  }, [])

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
    setConversationId,
  }
}
