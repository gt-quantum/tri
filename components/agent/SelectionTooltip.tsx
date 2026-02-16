'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { useTextSelection } from '@/lib/ai/use-text-selection'

/**
 * Floating tooltip that appears when text is selected on any page.
 * Clicking it dispatches a tri-agent-ask event to open the widget with context.
 */
export default function SelectionTooltip() {
  const pathname = usePathname()
  const { selection, clear } = useTextSelection()
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  // Hide on /agent page (has its own full chat)
  const isAgentPage = pathname.startsWith('/agent')

  useEffect(() => {
    if (!selection) {
      setPosition(null)
      return
    }

    const { rect } = selection
    // Position above the selection, centered
    setPosition({
      top: rect.top + window.scrollY - 40,
      left: rect.left + window.scrollX + rect.width / 2,
    })
  }, [selection])

  if (isAgentPage || !selection || !position) return null

  function handleClick() {
    if (!selection) return

    // Walk up from selection to find data-ai-context
    const sel = window.getSelection()
    let aiContext: Record<string, unknown> | undefined
    if (sel?.anchorNode) {
      const el = sel.anchorNode instanceof Element
        ? sel.anchorNode
        : sel.anchorNode.parentElement
      const contextEl = el?.closest('[data-ai-context]')
      if (contextEl) {
        try {
          aiContext = JSON.parse(contextEl.getAttribute('data-ai-context') || '{}')
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.dispatchEvent(
      new CustomEvent('tri-agent-ask', {
        detail: {
          selectedText: selection.text,
          aiContext,
          page: pathname,
        },
      })
    )
    clear()
  }

  return (
    <div
      className="fixed z-[60] animate-in fade-in"
      data-selection-tooltip
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, 0)',
      }}
    >
      <button
        onMouseDown={(e) => e.preventDefault()} // Prevent clearing selection
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-obsidian-850 border border-brass/20 shadow-lg shadow-black/40 text-brass hover:bg-obsidian-800 hover:border-brass/30 transition-colors whitespace-nowrap"
      >
        <Sparkles size={13} strokeWidth={1.5} />
        <span className="font-body text-[12px] font-medium">Ask Strata AI</span>
      </button>
    </div>
  )
}
