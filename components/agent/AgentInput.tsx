'use client'

import { useRef, type KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'

interface AgentInputProps {
  input: string
  setInput: (value: string) => void
  onSend: () => void
  onStop: () => void
  isStreaming: boolean
  placeholder?: string
  variant?: 'page' | 'widget'
}

export default function AgentInput({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  placeholder = 'Ask about your portfolio...',
  variant = 'page',
}: AgentInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && input.trim()) {
        onSend()
        // Reset height after send
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, variant === 'page' ? 200 : 120) + 'px'
    }
  }

  const isPage = variant === 'page'

  // Widget: compact edge-to-edge input
  if (!isPage) {
    return (
      <div className="flex items-end gap-2 p-3 border-t border-brass-faint/20">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            handleInput()
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isStreaming}
          className="flex-1 resize-none bg-obsidian-800 border border-brass-faint/20 rounded-lg px-3 py-2 text-sm font-body text-warm-white placeholder:text-warm-500 focus:outline-none focus:border-brass/30 disabled:opacity-50 transition-colors"
          style={{ minHeight: '36px', maxHeight: '120px' }}
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            title="Stop generating"
          >
            <Square size={12} fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={!input.trim()}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-brass/15 text-brass hover:bg-brass/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <ArrowUp size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    )
  }

  // Page: centered pill input
  return (
    <div className="flex-shrink-0 pb-6 pt-2 px-6">
      <div className="max-w-3xl mx-auto relative">
        <div className="flex items-end gap-2 rounded-2xl border border-brass-faint/20 bg-obsidian-800/80 px-4 py-3 focus-within:border-brass/25 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              handleInput()
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm font-body text-warm-white placeholder:text-warm-500 focus:outline-none disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '200px' }}
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-warm-400 text-obsidian-950 hover:bg-warm-300 transition-colors"
              title="Stop generating"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!input.trim()}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-warm-200 text-obsidian-950 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
