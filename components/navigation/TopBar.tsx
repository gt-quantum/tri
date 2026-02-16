'use client'

import { useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Search, Menu } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { usePortfolioContext } from '@/lib/use-portfolio-context'
import { triggerMobileNav } from './CommandRail'

// Reactive breadcrumb name store — detail pages set names, TopBar subscribes
let breadcrumbNameStore: Record<string, string> = {}
let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

export function setBreadcrumbName(key: string, name: string) {
  if (breadcrumbNameStore[key] === name) return
  breadcrumbNameStore = { ...breadcrumbNameStore, [key]: name }
  emitChange()
}

export function clearBreadcrumbNames() {
  breadcrumbNameStore = {}
  emitChange()
}

function subscribeToBreadcrumbs(callback: () => void) {
  listeners.push(callback)
  return () => {
    listeners = listeners.filter(l => l !== callback)
  }
}

function getBreadcrumbSnapshot() {
  return breadcrumbNameStore
}

const segmentLabels: Record<string, string> = {
  properties: 'Properties',
  tenants: 'Tenants',
  leases: 'Leases',
  settings: 'Settings',
  profile: 'Profile',
  security: 'Security',
  organization: 'Organization',
  users: 'Users',
  invitations: 'Invitations',
  portfolios: 'Portfolios',
  'custom-fields': 'Custom Fields',
  picklists: 'Picklists',
  'api-keys': 'API Keys',
  'audit-log': 'Audit Log',
  integrations: 'Integrations',
  agent: 'Strata AI',
}

export default function TopBar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { portfolioId, portfolioName } = usePortfolioContext()
  const nameStore = useSyncExternalStore(subscribeToBreadcrumbs, getBreadcrumbSnapshot, getBreadcrumbSnapshot)

  const isSettings = pathname.startsWith('/settings')
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items
  const crumbs: { label: string; href: string | null }[] = []

  // Portfolio context (only on non-settings pages)
  if (!isSettings && portfolioId && portfolioName) {
    crumbs.push({ label: portfolioName, href: `/?portfolio=${portfolioId}` })
  }

  if (pathname === '/') {
    crumbs.push({ label: 'Dashboard', href: null })
  } else {
    let path = ''
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      path += `/${seg}`

      // Check if this is a UUID (entity detail page)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)

      if (isUuid) {
        // Use stored entity name or truncated ID
        const name = nameStore[seg] || `${seg.slice(0, 8)}...`
        crumbs.push({
          label: name,
          href: i === segments.length - 1 ? null : path,
        })
      } else {
        const label = segmentLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)
        crumbs.push({
          label,
          href: i === segments.length - 1 ? null : path,
        })
      }
    }
  }

  return (
    <div className="flex-shrink-0">
      <div className="h-[52px] flex items-center justify-between px-4 lg:px-6">
        {/* Left: Mobile hamburger + Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={triggerMobileNav}
            className="lg:hidden p-1.5 text-warm-400 hover:text-brass transition-colors"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 min-w-0">
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && (
                  <ChevronRight size={12} className="text-brass/30 flex-shrink-0" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-warm-400 hover:text-warm-200 text-sm font-body transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-warm-white font-medium text-sm font-body truncate">
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-4">
          {/* Search pill (placeholder) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('tri-search-open'))}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brass-faint text-warm-400 hover:text-warm-200 hover:border-brass/15 transition-colors"
          >
            <Search size={14} strokeWidth={1.5} />
            <span className="text-[13px] font-body hidden lg:inline">Search</span>
            <kbd className="hidden lg:inline text-[11px] font-body text-warm-400 bg-obsidian-800 px-1.5 py-0.5 rounded border border-brass-faint">
              &#8984;K
            </kbd>
          </button>
        </div>
      </div>

      {/* Bottom brass line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />
    </div>
  )
}
