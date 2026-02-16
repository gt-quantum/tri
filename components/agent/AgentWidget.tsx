'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles, X } from 'lucide-react'
import { useAgentChat } from '@/lib/ai/use-agent-chat'
import { parsePageContext } from '@/lib/ai/agent-context'
import { usePortfolioContext } from '@/lib/use-portfolio-context'
import AgentHeader from './AgentHeader'
import AgentMessageList from './AgentMessageList'
import AgentInput from './AgentInput'

type VisualState = 'closed' | 'opening' | 'open' | 'closing'

export default function AgentWidget() {
  const pathname = usePathname()
  const { portfolioId } = usePortfolioContext()
  const [visualState, setVisualState] = useState<VisualState>('closed')
  const [selectedText, setSelectedText] = useState<string | undefined>()
  const panelRef = useRef<HTMLDivElement>(null)

  const isOpen = visualState === 'open' || visualState === 'opening'
  const isVisible = visualState !== 'closed'

  // Hide on /agent page
  const isAgentPage = pathname.startsWith('/agent')

  // Build page context
  const context = parsePageContext(pathname, portfolioId)
  if (selectedText) context.selectedText = selectedText

  const {
    messages,
    input,
    setInput,
    status,
    sendMessage,
    stop,
  } = useAgentChat({
    context: isOpen ? context : null,
  })

  const isStreaming = status === 'streaming' || status === 'submitted'

  // Handle open
  const handleOpen = useCallback(() => {
    setVisualState('opening')
    // Let the opening animation class apply, then mark as fully open
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisualState('open'))
    })
  }, [])

  // Handle close with exit animation
  const handleClose = useCallback(() => {
    setVisualState('closing')
    setSelectedText(undefined)
  }, [])

  // Remove from DOM after closing animation ends
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
    await sendMessage(text)
    setSelectedText(undefined)
  }, [input, setInput, sendMessage])

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
          <AgentHeader onClose={handleClose} />
          <AgentMessageList messages={messages} isStreaming={isStreaming} variant="widget" />
          <AgentInput
            input={input}
            setInput={setInput}
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
            variant="widget"
          />
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
