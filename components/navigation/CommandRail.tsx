'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Sparkles,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import PortfolioSwitcher from './PortfolioSwitcher'

type NavLink = { type: 'link'; icon: any; label: string; path: string; match: (p: string) => boolean }
type NavDivider = { type: 'divider' }
type NavItem = NavLink | NavDivider

const navItems: NavItem[] = [
  { type: 'link', icon: LayoutDashboard, label: 'Dashboard', path: '/', match: (p) => p === '/' },
  { type: 'link', icon: Sparkles, label: 'Strata AI', path: '/agent', match: (p) => p.startsWith('/agent') },
  { type: 'divider' },
  { type: 'link', icon: Building2, label: 'Properties', path: '/properties', match: (p) => p.startsWith('/properties') },
  { type: 'link', icon: Users, label: 'Tenants', path: '/tenants', match: (p) => p.startsWith('/tenants') },
  { type: 'link', icon: FileText, label: 'Leases', path: '/leases', match: (p) => p.startsWith('/leases') },
]

export default function CommandRail() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>()
  const railRef = useRef<HTMLDivElement>(null)

  // Close mobile nav on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  function handleMouseEnter() {
    clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => setExpanded(true), 100)
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => setExpanded(false), 200)
  }

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  const roleBadgeClass =
    user?.role === 'admin'
      ? 'bg-brass/15 text-brass'
      : user?.role === 'manager'
        ? 'bg-blue-500/15 text-blue-300'
        : 'bg-warm-500/30 text-warm-200'

  return (
    <>
      {/* Desktop Rail */}
      <nav
        ref={railRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="command-rail hidden lg:flex border-r border-brass-faint/30 flex-shrink-0"
        style={{ width: expanded ? 200 : 60 }}
      >
        {/* TRI Monogram */}
        <Link href="/" className="rail-item py-4">
          <div className="w-5 h-5 border border-brass/15 rounded flex items-center justify-center flex-shrink-0">
            <span className="font-display text-xs text-brass">T</span>
          </div>
          {expanded && (
            <span className="font-display text-sm text-brass tracking-widest rail-label">
              TRI
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="rail-divider" />

        {/* Portfolio Switcher */}
        <PortfolioSwitcher expanded={expanded} />

        {/* Divider */}
        <div className="rail-divider" />

        {/* Nav Items */}
        <div className="flex flex-col flex-1">
          {navItems.map((item, i) => {
            if (item.type === 'divider') return <div key={i} className="rail-divider" />
            if (item.type !== 'link') return null

            const active = item.match(pathname)
            const Icon = item.icon

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`rail-item group ${active ? 'rail-item-active' : ''}`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={`flex-shrink-0 transition-colors duration-150 ${
                    active
                      ? 'text-brass'
                      : 'text-warm-500 group-hover:text-brass'
                  }`}
                  style={!active ? { filter: 'none' } : undefined}
                />
                {expanded && (
                  <span
                    className={`rail-label ${active ? 'text-brass' : 'text-warm-300'}`}
                    style={{ animationDelay: `${i * 15}ms` }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* User Avatar */}
        <div className="rail-divider" />
        <UserDropdown
          expanded={expanded}
          initials={initials}
          fullName={user?.fullName || ''}
          email={user?.email || ''}
          role={user?.role || 'viewer'}
          roleBadgeClass={roleBadgeClass}
          onLogout={logout}
        />
        <div className="h-3" />
      </nav>

      {/* Mobile Hamburger Button - rendered by TopBar, but we handle the overlay here */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-obsidian-950/95 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Mobile Nav */}
          <div className="relative flex flex-col h-full w-72 bg-obsidian-900 border-r border-brass-faint/30 animate-slide-in-left">
            {/* Close button */}
            <div className="flex items-center justify-between p-4">
              <span className="font-display text-sm text-brass tracking-widest">TRI</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 text-warm-400 hover:text-brass transition-colors"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="rail-divider" />

            {/* Portfolio Switcher */}
            <div className="px-2 py-2">
              <PortfolioSwitcher expanded={true} />
            </div>

            <div className="rail-divider" />

            {/* Nav Links */}
            <div className="flex flex-col flex-1 px-2 py-2">
              {navItems.map((item, i) => {
                if (item.type === 'divider') return <div key={i} className="rail-divider" />
                if (item.type !== 'link') return null

                const active = item.match(pathname)
                const Icon = item.icon

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? 'text-brass bg-brass-faint/50'
                        : 'text-warm-300 hover:text-warm-white hover:bg-brass-faint/30'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.5} className={active ? 'text-brass' : ''} />
                    <span className="font-body text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* User section */}
            <div className="rail-divider" />
            <div className="px-2 py-2 space-y-1">
              <Link
                href="/settings/profile"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-warm-300 hover:text-warm-white hover:bg-brass-faint/30 transition-colors"
              >
                <div className="w-7 h-7 rounded-full border border-brass/30 bg-obsidian-800 flex items-center justify-center">
                  <span className="font-body text-xs text-warm-200">{initials.charAt(0)}</span>
                </div>
                <span className="font-body text-sm truncate">{user?.fullName}</span>
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-warm-300 hover:text-warm-white hover:bg-brass-faint/30 transition-colors"
              >
                <span className="font-body text-sm">Settings</span>
              </Link>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-warm-300 hover:text-warm-white hover:bg-brass-faint/30 transition-colors"
              >
                <LogOut size={16} strokeWidth={1.5} />
                <span className="font-body text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expose mobile toggle for TopBar */}
      <MobileToggleProvider onToggle={() => setMobileOpen(true)} />
    </>
  )
}

/* ---- User Dropdown (desktop rail bottom) ---- */

function UserDropdown({
  expanded,
  initials,
  fullName,
  email,
  role,
  roleBadgeClass,
  onLogout,
}: {
  expanded: boolean
  initials: string
  fullName: string
  email: string
  role: string
  roleBadgeClass: string
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown when rail collapses
  useEffect(() => {
    if (!expanded) setOpen(false)
  }, [expanded])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="rail-item w-full group"
        style={{ paddingLeft: 16 }}
      >
        <div className="w-7 h-7 rounded-full border border-brass/30 bg-obsidian-800 flex items-center justify-center flex-shrink-0">
          <span className="font-body text-xs text-warm-200">{initials.charAt(0)}</span>
        </div>
        {expanded && (
          <span className="text-sm text-warm-300 font-body truncate rail-label">{fullName}</span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-50 card-surface min-w-[220px] py-2 shadow-2xl shadow-black/50">
          <div className="px-4 py-2">
            <div className="font-body text-sm text-warm-white font-medium">{fullName}</div>
            <div className="font-body text-[13px] text-warm-300 truncate">{email}</div>
            <span className={`badge text-[10px] mt-1 ${roleBadgeClass}`}>{role}</span>
          </div>
          <div className="rail-divider my-1" />
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-body text-warm-300 hover:text-warm-white hover:bg-brass-faint/50 transition-colors"
          >
            My Profile
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm font-body text-warm-300 hover:text-warm-white hover:bg-brass-faint/50 transition-colors"
          >
            Settings
          </Link>
          <div className="rail-divider my-1" />
          <button
            onClick={() => { setOpen(false); onLogout() }}
            className="w-full text-left px-4 py-2 text-sm font-body text-warm-300 hover:text-warm-white hover:bg-brass-faint/50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

/* ---- Mobile toggle communication via DOM event ---- */

import { createContext } from 'react'

export const MobileNavContext = createContext<(() => void) | null>(null)

function MobileToggleProvider({ onToggle }: { onToggle: () => void }) {
  useEffect(() => {
    function handler() {
      onToggle()
    }
    window.addEventListener('tri-mobile-nav-toggle', handler)
    return () => window.removeEventListener('tri-mobile-nav-toggle', handler)
  }, [onToggle])

  return null
}

export function triggerMobileNav() {
  window.dispatchEvent(new CustomEvent('tri-mobile-nav-toggle'))
}
