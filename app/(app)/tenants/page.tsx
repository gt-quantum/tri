'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Users, Search, X } from 'lucide-react'
import { useApiList } from '@/lib/hooks/use-api-list'

const PAGE_SIZE = 25

const creditColors: Record<string, { bg: string; text: string; border: string }> = {
  excellent: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
  good: { bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20' },
  fair: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20' },
  poor: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' },
  not_rated: { bg: 'bg-warm-500/10', text: 'text-warm-400', border: 'border-warm-500/20' },
}

export default function TenantsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [creditRating, setCreditRating] = useState('')
  const [sortKey, setSortKey] = useState('company_name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    setDebounceTimer(
      setTimeout(() => {
        setDebouncedSearch(value)
        setPage(1)
      }, 300)
    )
  }

  function handleFilterChange(setter: (v: string) => void, value: string) {
    setter(value)
    setPage(1)
  }

  const params = useMemo(() => {
    const p: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      sort: sortKey,
      order: sortDir,
    }
    if (debouncedSearch) p.search = debouncedSearch
    if (industry) p.industry = industry
    if (creditRating) p.credit_rating = creditRating
    return p
  }, [page, sortKey, sortDir, debouncedSearch, industry, creditRating])

  const { data, total, loading, error } = useApiList<Record<string, any>>({
    endpoint: '/api/v1/tenants',
    params,
  })

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const hasFilters = debouncedSearch || industry || creditRating
  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setIndustry('')
    setCreditRating('')
    setPage(1)
  }

  // Summary stats
  const industries = new Set(data.map(t => t.industry).filter(Boolean))
  const subsidiaryCount = data.filter(t => t.parent_tenant_id).length

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function SortIndicator({ field }: { field: string }) {
    if (sortKey !== field) return <span className="text-warm-500 ml-1 opacity-0 group-hover/th:opacity-100 transition-opacity">&updownarrow;</span>
    return <span className="text-brass ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
  }

  function SortHeader({ label, field, align }: { label: string; field: string; align?: string }) {
    return (
      <th
        className={`table-header cursor-pointer select-none group/th hover:text-warm-100 transition-colors ${align === 'right' ? 'text-right' : ''}`}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center">
          {label}
          <SortIndicator field={field} />
        </span>
      </th>
    )
  }

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
          <span className="text-warm-300 font-body text-sm">Loading tenants...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-warm-white tracking-wide">Tenants</h1>
        <p className="font-body text-warm-300 text-sm mt-1">
          {total} tenant{total === 1 ? '' : 's'} in your organization
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up stagger-1">
        <div className="card-surface p-4">
          <p className="text-warm-300 text-[13px] font-body uppercase tracking-wider mb-1">Total Tenants</p>
          <p className="text-warm-white text-2xl font-display tabular">{total}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-300 text-[13px] font-body uppercase tracking-wider mb-1">Industries</p>
          <p className="text-warm-white text-2xl font-display tabular">{industries.size}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-300 text-[13px] font-body uppercase tracking-wider mb-1">Subsidiaries</p>
          <p className="text-warm-white text-2xl font-display tabular">{subsidiaryCount}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-300 text-[13px] font-body uppercase tracking-wider mb-1">Credit Distribution</p>
          <div className="flex items-center gap-1 mt-1">
            {(['excellent', 'good', 'fair', 'poor'] as const).map(rating => {
              const count = data.filter(t => t.credit_rating === rating).length
              if (count === 0) return null
              const colors = creditColors[rating]
              return (
                <span key={rating} className={`badge ${colors.bg} ${colors.text} border ${colors.border} text-[10px]`}>
                  {count} {rating}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-up stagger-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by company name..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm placeholder:text-warm-400 focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
          />
        </div>
        <select
          value={industry}
          onChange={e => handleFilterChange(setIndustry, e.target.value)}
          className="px-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
        >
          <option value="">All Industries</option>
          <option value="technology">Technology</option>
          <option value="finance">Finance</option>
          <option value="healthcare">Healthcare</option>
          <option value="retail">Retail</option>
          <option value="legal">Legal</option>
          <option value="consulting">Consulting</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="education">Education</option>
          <option value="food_beverage">Food & Beverage</option>
          <option value="media">Media</option>
        </select>
        <select
          value={creditRating}
          onChange={e => handleFilterChange(setCreditRating, e.target.value)}
          className="px-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
        >
          <option value="">All Ratings</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="fair">Fair</option>
          <option value="poor">Poor</option>
          <option value="not_rated">Not Rated</option>
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-warm-300 hover:text-warm-100 font-body text-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card-surface overflow-hidden animate-fade-up stagger-3">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brass-faint">
                <SortHeader label="Company" field="company_name" />
                <SortHeader label="Industry" field="industry" />
                <SortHeader label="Credit Rating" field="credit_rating" />
                <th className="table-header">Contact</th>
                <th className="table-header">Parent</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const credit = creditColors[row.credit_rating] || creditColors.not_rated
                return (
                  <tr
                    key={row.id}
                    className="border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors group"
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tenants/${row.id}`}
                          className="font-semibold text-warm-white group-hover:text-brass transition-colors"
                        >
                          {row.company_name}
                        </Link>
                        {row.parent_tenant_id && (
                          <span className="badge bg-obsidian-700 text-warm-300 border border-obsidian-600 text-[10px]">subsidiary</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-warm-200 capitalize">
                      {row.industry?.replace(/_/g, ' ') || '\u2014'}
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${credit.bg} ${credit.text} border ${credit.border}`}>
                        {row.credit_rating?.replace(/_/g, ' ') || '\u2014'}
                      </span>
                    </td>
                    <td className="table-cell">
                      {row.primary_contact_name ? (
                        <div>
                          <p className="text-warm-200 text-sm">{row.primary_contact_name}</p>
                          {row.primary_contact_email && (
                            <p className="text-warm-300 text-[13px]">{row.primary_contact_email}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-warm-400">&mdash;</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {row.parent_tenant_name ? (
                        <Link
                          href={`/tenants/${row.parent_tenant_id}`}
                          className="text-warm-200 hover:text-brass text-sm transition-colors"
                        >
                          {row.parent_tenant_name}
                        </Link>
                      ) : (
                        <span className="text-warm-500">&mdash;</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Users className="w-10 h-10 text-warm-500 mx-auto mb-3" />
                    <p className="text-warm-300 font-body text-sm">No tenants found</p>
                    {hasFilters && (
                      <p className="text-warm-300 font-body text-[13px] mt-1">Try adjusting your filters</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-brass-faint">
            <p className="text-warm-300 text-[13px] font-body">
              Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded text-sm font-body text-warm-300 hover:text-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              {paginationRange(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-warm-500 text-sm">&hellip;</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-8 h-8 rounded text-sm font-body transition-colors ${
                      page === p
                        ? 'bg-brass/15 text-brass border border-brass/20'
                        : 'text-warm-300 hover:text-warm-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded text-sm font-body text-warm-300 hover:text-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function paginationRange(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | string)[] = []
  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }
  return pages
}
