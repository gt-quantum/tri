'use client'

import { SquarePen, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AgentHeaderProps {
  onClose: () => void
  onNewChat?: () => void
  onToggleHistory?: () => void
  showingHistory?: boolean
}

export default function AgentHeader({ onClose, onNewChat, onToggleHistory, showingHistory }: AgentHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-brass-faint/20 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full bg-brass/10 border border-brass/15 flex items-center justify-center flex-shrink-0">
          <span className="font-display text-[10px] text-brass">S</span>
        </div>
        <span className="font-display text-sm text-warm-white tracking-wide truncate">
          Strata AI
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        {onNewChat && (
          <button
            onClick={onNewChat}
            className="p-1.5 text-warm-500 hover:text-brass transition-colors"
            title="New chat"
          >
            <SquarePen size={13} strokeWidth={1.5} />
          </button>
        )}
        {onToggleHistory && (
          <button
            onClick={onToggleHistory}
            className={`p-1.5 transition-colors ${
              showingHistory ? 'text-brass' : 'text-warm-500 hover:text-brass'
            }`}
            title={showingHistory ? 'Back to chat' : 'Chat history'}
          >
            <Clock size={13} strokeWidth={1.5} />
          </button>
        )}
        <Link
          href="/agent"
          onClick={onClose}
          className="p-1.5 text-warm-500 hover:text-brass transition-colors"
          title="Open full page"
        >
          <ExternalLink size={13} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  )
}
