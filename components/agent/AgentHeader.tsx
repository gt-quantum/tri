'use client'

import { ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface AgentHeaderProps {
  onClose: () => void
}

export default function AgentHeader({ onClose }: AgentHeaderProps) {
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
