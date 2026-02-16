'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { useAgentChat } from '@/lib/ai/use-agent-chat'
import { useAuth } from '@/lib/auth-context'
import { parsePageContext } from '@/lib/ai/agent-context'
import { usePortfolioContext } from '@/lib/use-portfolio-context'
import type { UIMessage } from 'ai'
import AgentHeader from './AgentHeader'
import AgentMessageList from './AgentMessageList'
import AgentInput from './AgentInput'

type VisualState = 'closed' | 'opening' | 'open' | 'closing'
type WidgetView = 'chat' | 'history'

interface WidgetConversation {
  id: string
  title: string
  updated_at: string
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m`

  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h`

  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AgentWidget() {
  const pathname = usePathname()
  const { portfolioId } = usePortfolioContext()
  const { getToken } = useAuth()
  const [visualState, setVisualState] = useState<VisualState>('closed')
  const [selectedText, setSelectedText] = useState<string | undefined>()
  const [widgetView, setWidgetView] = useState<WidgetView>('chat')
  const [conversationId, setConversationIdState] = useState<string | null>(null)
  const [conversations, setConversations] = useState<WidgetConversation[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const justCreatedRef = useRef(false)

  const isOpen = visualState === 'open' || visualState === 'opening'
  const isVisible = visualState !== 'closed'

  // Hide on /agent page
  const isAgentPage = pathname.startsWith('/agent')

  // Build page context
  const context = parsePageContext(pathname, portfolioId)
  if (selectedText) context.selectedText = selectedText

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
    context: isOpen ? context : null,
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  // --- Conversation management ---

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch('/api/v1/conversations?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const body = await res.json()
        setConversations(body.data || [])
      }
    } catch {
      // Non-critical
    } finally {
      setHistoryLoading(false)
    }
  }, [getToken])

  const loadConversation = useCallback(async (id: string) => {
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`/api/v1/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (res.ok) {
        const body = await res.json()
        const msgs = body.data?.messages || []
        setMessages(
          msgs.map((m: { role: string; content?: string; parts?: Array<Record<string, unknown>> }, i: number) => {
            if (Array.isArray(m.parts) && m.parts.length > 0) {
              return { id: `loaded-${i}`, role: m.role as UIMessage['role'], parts: m.parts }
            }
            const text = typeof m.content === 'string' ? m.content : ''
            return { id: `loaded-${i}`, role: m.role as UIMessage['role'], parts: [{ type: 'text' as const, text }] }
          })
        )
      }
    } catch {
      // Non-critical
    }
  }, [getToken, setMessages])

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
          source: 'widget',
        }),
      })

      if (res.ok) {
        const body = await res.json()
        const newId = body.data?.id
        if (newId) {
          justCreatedRef.current = true
          setConversationIdState(newId)
          setConversationId(newId)
        }
      }
    } catch {
      // Fall through — server will create conversation in onFinish as fallback
    }
  }, [conversationId, getToken, setConversationId])

  const handleNewChat = useCallback(() => {
    setConversationIdState(null)
    setConversationId(null)
    setMessages([])
    setWidgetView('chat')
    setSelectedText(undefined)
    setInput('')
  }, [setConversationId, setMessages, setInput])

  const handleSelectConversation = useCallback(async (id: string) => {
    setConversationIdState(id)
    setConversationId(id)
    setWidgetView('chat')
    await loadConversation(id)
  }, [setConversationId, loadConversation])

  const handleToggleHistory = useCallback(() => {
    if (widgetView === 'history') {
      setWidgetView('chat')
    } else {
      setWidgetView('history')
      fetchHistory()
    }
  }, [widgetView, fetchHistory])

  // --- Visual state handlers ---

  const handleOpen = useCallback(() => {
    setVisualState('opening')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisualState('open'))
    })
  }, [])

  const handleClose = useCallback(() => {
    setVisualState('closing')
    setSelectedText(undefined)
  }, [])

  const handleAnimationEnd = useCallback(() => {
    if (visualState === 'closing') {
      setVisualState('closed')
    }
  }, [visualState])

  const handleToggle = useCallback(() => {
    if (visualState === 'closed') {
      handleOpen()
    } else if (visualState === 'open' || visualState === 'opening') {
      handleClose()
    }
  }, [visualState, handleOpen, handleClose])

  // Listen for tri-agent-ask events (from highlight-to-ask)
  useEffect(() => {
    function handleAsk(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.selectedText) {
        setSelectedText(detail.selectedText)
        setWidgetView('chat')
        if (visualState === 'closed') handleOpen()
      }
    }
    window.addEventListener('tri-agent-ask', handleAsk)
    return () => window.removeEventListener('tri-agent-ask', handleAsk)
  }, [visualState, handleOpen])

  const handleSend = useCallback(async () => {
    if (!input.trim()) return
    const text = input
    setInput('')
    await ensureConversation(text)
    await sendMessage(text)
    setSelectedText(undefined)
  }, [input, setInput, sendMessage, ensureConversation])

  if (isAgentPage) return null

  const animClass = visualState === 'opening' || visualState === 'open'
    ? 'agent-chat-open'
    : visualState === 'closing'
      ? 'agent-chat-close'
      : ''

  return (
    <>
      {/* Chat window */}
      {isVisible && (
        <div
          ref={panelRef}
          onAnimationEnd={handleAnimationEnd}
          className={`fixed z-40 flex flex-col bg-obsidian-900 border border-brass-faint/20 shadow-2xl shadow-black/50 overflow-hidden
            inset-0
            md:inset-auto md:bottom-16 md:right-5 md:w-[380px] md:h-[520px] md:max-h-[70vh] md:rounded-xl md:origin-bottom-right
            ${animClass}`}
          data-agent-widget
        >
          <AgentHeader
            onClose={handleClose}
            onNewChat={handleNewChat}
            onToggleHistory={handleToggleHistory}
            showingHistory={widgetView === 'history'}
          />
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
              <p className="font-body text-[13px] text-red-400">{error.message}</p>
            </div>
          )}

          {widgetView === 'history' ? (
            /* History view */
            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-4 h-4 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <p className="font-body text-[13px] text-warm-500 text-center">
                    No conversations yet
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left px-4 py-2.5 hover:bg-obsidian-800/50 transition-colors ${
                        conversationId === conv.id ? 'bg-obsidian-800' : ''
                      }`}
                    >
                      <p className="font-body text-[13px] text-warm-200 truncate">
                        {conv.title}
                      </p>
                      <p className="font-body text-[11px] text-warm-500 mt-0.5">
                        {formatTime(conv.updated_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Chat view */
            <>
              <AgentMessageList messages={messages} isStreaming={isStreaming} variant="widget" />
              <AgentInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                onStop={stop}
                isStreaming={isStreaming}
                variant="widget"
              />
            </>
          )}
        </div>
      )}

      {/* FAB — always visible, toggles chat */}
      <button
        onClick={handleToggle}
        className={`fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-obsidian-850 border border-brass/20 shadow-lg shadow-black/30 flex items-center justify-center text-brass hover:bg-obsidian-800 hover:border-brass/30 hover:shadow-brass/10 transition-all duration-200 group ${
          isOpen ? 'rotate-0' : ''
        }`}
        title={isOpen ? 'Close Strata AI' : 'Open Strata AI'}
        data-agent-widget
      >
        <div className="relative w-4 h-4">
          {/* Sparkles icon — visible when closed */}
          <Sparkles
            size={16}
            strokeWidth={1.5}
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen
                ? 'opacity-0 rotate-90 scale-0'
                : 'opacity-100 rotate-0 scale-100 group-hover:scale-110'
            }`}
          />
          {/* X icon — visible when open */}
          <X
            size={16}
            strokeWidth={1.5}
            className={`absolute inset-0 transition-all duration-300 ${
              isOpen
                ? 'opacity-100 rotate-0 scale-100'
                : 'opacity-0 -rotate-90 scale-0'
            }`}
          />
        </div>
      </button>
    </>
  )
}
