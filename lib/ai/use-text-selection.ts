'use client'

import { useState, useEffect, useCallback } from 'react'

interface TextSelection {
  text: string
  rect: DOMRect
}

/**
 * Hook that detects text selection on the page.
 * Returns the selected text and bounding rect for tooltip positioning.
 * Clears on new mousedown.
 */
export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null)

  const handleMouseUp = useCallback(() => {
    // Small delay to let the selection finalize
    requestAnimationFrame(() => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        return
      }

      const text = sel.toString().trim()
      if (!text || text.length < 2 || text.length > 500) {
        return
      }

      // Don't trigger inside agent widget or input elements
      const anchorNode = sel.anchorNode
      if (anchorNode) {
        const el = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
        if (el?.closest('[data-agent-widget], textarea, input, [contenteditable]')) {
          return
        }
      }

      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()

      setSelection({ text, rect })
    })
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Don't clear selection when clicking inside the tooltip itself
    const target = e.target as Element
    if (target?.closest('[data-selection-tooltip]')) return
    setSelection(null)
  }, [])

  // Handle Escape key to dismiss
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSelection(null)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleMouseUp, handleMouseDown, handleKeyDown])

  const clear = useCallback(() => setSelection(null), [])

  return { selection, clear }
}
