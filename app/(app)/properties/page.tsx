'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Building2, Search, X } from 'lucide-react'
import { useApiList } from '@/lib/hooks/use-api-list'
import { usePortfolioContext } from '@/lib/use-portfolio-context'

const PAGE_SIZE = 25

export default function PropertiesPage() {
  const { portfolioId } = usePortfolioContext()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  // Debounce search input
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

  // Reset page on filter/sort change
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
    if (portfolioId) p.portfolio_id = portfolioId
    if (debouncedSearch) p.city = debouncedSearch
    if (propertyType) p.property_type = propertyType
    if (stateFilter) p.state = stateFilter
    return p
  }, [page, sortKey, sortDir, portfolioId, debouncedSearch, propertyType, stateFilter])

  const { data, total, loading, error } = useApiList<Record<string, any>>({
    endpoint: '/api/v1/properties',
    params,
  })

  // Reset to page 1 when portfolio changes
  const [prevPortfolioId, setPrevPortfolioId] = useState(portfolioId)
  if (portfolioId !== prevPortfolioId) {
    setPrevPortfolioId(portfolioId)
    setPage(1)
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const hasFilters = debouncedSearch || propertyType || stateFilter
  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setPropertyType('')
    setStateFilter('')
    setPage(1)
  }

  // Summary stats from current page
  const totalValue = data.reduce((sum, p) => sum + (p.current_value || 0), 0)
  const totalSqft = data.reduce((sum, p) => sum + (p.total_sqft || 0), 0)
  const yearsBuilt = data.filter(p => p.year_built).map(p => p.year_built)
  const avgYearBuilt = yearsBuilt.length > 0 ? Math.round(yearsBuilt.reduce((a: number, b: number) => a + b, 0) / yearsBuilt.length) : null

  // Pagination
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
          <span className="text-warm-300 font-body text-sm">Loading properties...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-warm-white tracking-wide">Properties</h1>
        <p className="font-body text-warm-300 text-sm mt-1">
          {total} propert{total === 1 ? 'y' : 'ies'} in your portfolio
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-up stagger-1">
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Total Properties</p>
          <p className="text-warm-white text-2xl font-display tabular">{total}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Total Value</p>
          <p className="text-brass text-2xl font-display tabular">
            ${totalValue >= 1_000_000 ? `${(totalValue / 1_000_000).toFixed(1)}M` : totalValue.toLocaleString()}
          </p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Total Sqft</p>
          <p className="text-warm-white text-2xl font-display tabular">{totalSqft.toLocaleString()}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Avg Year Built</p>
          <p className="text-warm-white text-2xl font-display tabular">{avgYearBuilt ?? '\u2014'}</p>
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
            placeholder="Search by city..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm placeholder:text-warm-400 focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
          />
        </div>
        <select
          value={propertyType}
          onChange={e => handleFilterChange(setPropertyType, e.target.value)}
          className="px-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
        >
          <option value="">All Types</option>
          <option value="office">Office</option>
          <option value="retail">Retail</option>
          <option value="industrial">Industrial</option>
          <option value="mixed_use">Mixed Use</option>
          <option value="residential">Residential</option>
          <option value="medical">Medical</option>
          <option value="hospitality">Hospitality</option>
        </select>
        <select
          value={stateFilter}
          onChange={e => handleFilterChange(setStateFilter, e.target.value)}
          className="px-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
        >
          <option value="">All States</option>
          <option value="CA">California</option>
          <option value="NY">New York</option>
          <option value="TX">Texas</option>
          <option value="FL">Florida</option>
          <option value="IL">Illinois</option>
          <option value="GA">Georgia</option>
          <option value="WA">Washington</option>
          <option value="MA">Massachusetts</option>
          <option value="CO">Colorado</option>
          <option value="AZ">Arizona</option>
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
                <SortHeader label="Property" field="name" />
                <SortHeader label="Location" field="city" />
                <th className="table-header">Portfolio</th>
                <th className="table-header">Type</th>
                <SortHeader label="Sqft" field="total_sqft" align="right" />
                <SortHeader label="Value" field="current_value" align="right" />
                <th className="table-header text-right">Year Built</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors group"
                >
                  <td className="table-cell">
                    <Link
                      href={`/properties/${row.id}`}
                      className="font-semibold text-warm-white group-hover:text-brass transition-colors"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="table-cell text-warm-200">
                    <span>{row.city}</span>
                    {row.state && <span className="text-warm-400">, {row.state}</span>}
                  </td>
                  <td className="table-cell text-warm-300">{row.portfolio_name || '\u2014'}</td>
                  <td className="table-cell">
                    <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">
                      {row.property_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular">
                    {row.total_sqft?.toLocaleString() ?? '\u2014'}
                  </td>
                  <td className="table-cell text-right">
                    <span className="text-brass tabular font-medium">
                      {row.current_value
                        ? `$${(row.current_value / 1_000_000).toFixed(1)}M`
                        : '\u2014'}
                    </span>
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular">
                    {row.year_built ?? '\u2014'}
                  </td>
                </tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Building2 className="w-10 h-10 text-warm-500 mx-auto mb-3" />
                    <p className="text-warm-300 font-body text-sm">No properties found</p>
                    {hasFilters && (
                      <p className="text-warm-400 font-body text-xs mt-1">Try adjusting your filters</p>
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
            <p className="text-warm-400 text-xs font-body">
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
