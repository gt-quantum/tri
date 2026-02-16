'use client'

import { useState, useRef, useEffect } from 'react'
import { Briefcase, ChevronDown, Check } from 'lucide-react'
import Link from 'next/link'
import { usePortfolioContext } from '@/lib/use-portfolio-context'
import { useAuth } from '@/lib/auth-context'

interface PortfolioSwitcherProps {
  expanded: boolean
}

export default function PortfolioSwitcher({ expanded }: PortfolioSwitcherProps) {
  const { portfolioId, portfolioName, portfolios, setPortfolio } = usePortfolioContext()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const canManage = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rail-item w-full hover:text-brass transition-colors duration-150 group"
      >
        <Briefcase size={20} strokeWidth={1.5} className="flex-shrink-0 text-warm-500 group-hover:text-brass transition-colors" />
        {expanded && (
          <div className="flex items-center gap-2 min-w-0 flex-1 rail-label">
            <span className="truncate text-warm-200 text-sm">
              {portfolioName || 'All Portfolios'}
            </span>
            <ChevronDown size={14} className="flex-shrink-0 text-warm-500" />
          </div>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 card-surface min-w-[260px] py-2"
          style={expanded ? { top: 0, left: '100%', marginLeft: 4 } : { top: 0, left: '100%', marginLeft: 4 }}
        >
          {/* All Portfolios */}
          <button
            onClick={() => { setPortfolio(null); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body hover:bg-brass-faint/50 transition-colors"
          >
            <span className="w-4 flex-shrink-0">
              {!portfolioId && <Check size={14} className="text-brass" />}
            </span>
            <span className={portfolioId ? 'text-warm-200' : 'text-brass font-medium'}>
              All Portfolios
            </span>
          </button>

          {/* Divider */}
          <div className="rail-divider my-1" />

          {/* Portfolio list */}
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => { setPortfolio(p.id); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-body hover:bg-brass-faint/50 transition-colors"
            >
              <span className="w-4 flex-shrink-0">
                {portfolioId === p.id && <Check size={14} className="text-brass" />}
              </span>
              <span className={`truncate ${portfolioId === p.id ? 'text-brass font-medium' : 'text-warm-200'}`}>
                {p.name}
              </span>
              {p.property_count !== undefined && (
                <span className="ml-auto text-warm-400 text-xs flex-shrink-0">
                  {p.property_count}
                </span>
              )}
            </button>
          ))}

          {portfolios.length === 0 && (
            <div className="px-4 py-3 text-warm-400 text-xs font-body">
              No portfolios found
            </div>
          )}

          {/* Manage link */}
          {canManage && (
            <>
              <div className="rail-divider my-1" />
              <Link
                href="/settings/portfolios"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-body text-warm-400 hover:text-brass transition-colors"
              >
                Manage Portfolios
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
