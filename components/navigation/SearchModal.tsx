'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Building2,
  Users,
  LayoutDashboard,
  FileText,
  Sparkles,
  Settings,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface SearchResult {
  id: string
  label: string
  subtitle: string
  href: string
  type: 'property' | 'tenant'
}

interface QuickNavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const quickNavItems: QuickNavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={16} strokeWidth={1.5} /> },
  { label: 'Properties', href: '/properties', icon: <Building2 size={16} strokeWidth={1.5} /> },
  { label: 'Tenants', href: '/tenants', icon: <Users size={16} strokeWidth={1.5} /> },
  { label: 'Leases', href: '/leases', icon: <FileText size={16} strokeWidth={1.5} /> },
  { label: 'Strata AI', href: '/agent', icon: <Sparkles size={16} strokeWidth={1.5} /> },
  { label: 'Settings', href: '/settings/profile', icon: <Settings size={16} strokeWidth={1.5} /> },
]

export default function SearchModal() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()
  const { getToken } = useAuth()

  // Total selectable items count
  const itemCount = query.trim() ? results.length : quickNavItems.length

  const closeModal = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setActiveIndex(0)
    setLoading(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()
  }, [])

  const navigate = useCallback((href: string) => {
    closeModal()
    router.push(href)
  }, [closeModal, router])

  // Cmd+K listener + custom event listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }

    function handleCustomOpen() {
      setOpen(true)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('tri-search-open', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('tri-search-open', handleCustomOpen)
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!open) return

    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      setActiveIndex(0)
      return
    }

    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const token = await getToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`

        const [propsRes, tenantsRes] = await Promise.all([
          fetch(`/api/v1/properties?search=${encodeURIComponent(trimmed)}&limit=5`, {
            headers,
            signal: controller.signal,
          }),
          fetch(`/api/v1/tenants?search=${encodeURIComponent(trimmed)}&limit=5`, {
            headers,
            signal: controller.signal,
          }),
        ])

        if (controller.signal.aborted) return

        const [propsData, tenantsData] = await Promise.all([
          propsRes.ok ? propsRes.json() : { data: [] },
          tenantsRes.ok ? tenantsRes.json() : { data: [] },
        ])

        const combined: SearchResult[] = []

        for (const p of propsData.data || []) {
          combined.push({
            id: p.id,
            label: p.name,
            subtitle: [p.city, p.state].filter(Boolean).join(', '),
            href: `/properties/${p.id}`,
            type: 'property',
          })
        }

        for (const t of tenantsData.data || []) {
          combined.push({
            id: t.id,
            label: t.company_name,
            subtitle: t.industry || 'Tenant',
            href: `/tenants/${t.id}`,
            type: 'tenant',
          })
        }

        setResults(combined)
        setActiveIndex(0)
      } catch {
        // AbortError or network error — ignore
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open, getToken])

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeModal()
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % Math.max(itemCount, 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (query.trim()) {
        if (results[activeIndex]) {
          navigate(results[activeIndex].href)
        }
      } else {
        if (quickNavItems[activeIndex]) {
          navigate(quickNavItems[activeIndex].href)
        }
      }
    }
  }

  if (!open) return null

  // Split results by type for categorized display
  const propertyResults = results.filter(r => r.type === 'property')
  const tenantResults = results.filter(r => r.type === 'tenant')
  let flatIndex = 0

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-obsidian-950/80 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="w-full max-w-lg mx-4 mt-[20vh] h-fit search-modal-enter"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="card-surface overflow-hidden">
          {/* Search input row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Search size={18} strokeWidth={1.5} className="text-warm-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search properties, tenants..."
              className="flex-1 bg-transparent text-warm-white text-sm font-body placeholder:text-warm-400/60 outline-none"
            />
            <kbd className="text-[11px] font-body text-warm-400 bg-obsidian-800 px-1.5 py-0.5 rounded border border-brass-faint flex-shrink-0">
              Esc
            </kbd>
          </div>

          {/* Divider */}
          <div className="h-px bg-brass-faint" />

          {/* Results area */}
          <div className="max-h-[320px] overflow-y-auto py-2">
            {!query.trim() ? (
              /* Quick navigation */
              <div>
                <div className="px-4 py-1.5">
                  <span className="text-[11px] font-body font-semibold uppercase tracking-[0.14em] text-warm-400">
                    Quick Navigation
                  </span>
                </div>
                {quickNavItems.map((item, i) => (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                      i === activeIndex
                        ? 'bg-brass/10 text-warm-white'
                        : 'text-warm-300 hover:bg-brass/5 hover:text-warm-200'
                    }`}
                  >
                    <span className={i === activeIndex ? 'text-brass' : 'text-warm-400'}>{item.icon}</span>
                    <span className="text-sm font-body">{item.label}</span>
                  </button>
                ))}
              </div>
            ) : loading ? (
              /* Loading spinner */
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
              </div>
            ) : results.length === 0 ? (
              /* No results */
              <div className="text-center py-8">
                <p className="text-warm-400 text-sm font-body">No results for &ldquo;{query}&rdquo;</p>
              </div>
            ) : (
              /* Categorized results */
              <div>
                {propertyResults.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5">
                      <span className="text-[11px] font-body font-semibold uppercase tracking-[0.14em] text-warm-400">
                        Properties
                      </span>
                    </div>
                    {propertyResults.map(result => {
                      const idx = flatIndex++
                      return (
                        <button
                          key={result.id}
                          onClick={() => navigate(result.href)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            idx === activeIndex
                              ? 'bg-brass/10 text-warm-white'
                              : 'text-warm-300 hover:bg-brass/5 hover:text-warm-200'
                          }`}
                        >
                          <Building2 size={16} strokeWidth={1.5} className={idx === activeIndex ? 'text-brass' : 'text-warm-400'} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-body truncate">{result.label}</div>
                            <div className="text-[12px] font-body text-warm-400 truncate">{result.subtitle}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                {tenantResults.length > 0 && (
                  <div>
                    <div className="px-4 py-1.5 mt-1">
                      <span className="text-[11px] font-body font-semibold uppercase tracking-[0.14em] text-warm-400">
                        Tenants
                      </span>
                    </div>
                    {tenantResults.map(result => {
                      const idx = flatIndex++
                      return (
                        <button
                          key={result.id}
                          onClick={() => navigate(result.href)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            idx === activeIndex
                              ? 'bg-brass/10 text-warm-white'
                              : 'text-warm-300 hover:bg-brass/5 hover:text-warm-200'
                          }`}
                        >
                          <Users size={16} strokeWidth={1.5} className={idx === activeIndex ? 'text-brass' : 'text-warm-400'} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-body truncate">{result.label}</div>
                            <div className="text-[12px] font-body text-warm-400 truncate">{result.subtitle}</div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="h-px bg-brass-faint" />
          <div className="flex items-center gap-4 px-4 py-2">
            <span className="flex items-center gap-1.5 text-[11px] font-body text-warm-400">
              <ArrowUp size={12} />
              <ArrowDown size={12} />
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-body text-warm-400">
              <CornerDownLeft size={12} />
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-body text-warm-400">
              <kbd className="text-[10px] bg-obsidian-800 px-1 py-0.5 rounded border border-brass-faint">Esc</kbd>
              <span>Close</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
