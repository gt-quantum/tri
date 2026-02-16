'use client'

import { useState, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { FileText, ChevronDown, X } from 'lucide-react'
import { useApiList } from '@/lib/hooks/use-api-list'

const PAGE_SIZE = 25

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
  expired: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' },
  terminated: { bg: 'bg-red-400/10', text: 'text-red-300', border: 'border-red-400/20' },
  negotiating: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
  pending: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20' },
  renewed: { bg: 'bg-emerald-400/10', text: 'text-emerald-300', border: 'border-emerald-400/20' },
}

function isExpiringSoon(endDate: string | null): boolean {
  if (!endDate) return false
  const end = new Date(endDate)
  const sixMonths = new Date()
  sixMonths.setMonth(sixMonths.getMonth() + 6)
  return end <= sixMonths && end >= new Date()
}

function formatCurrency(value: number | null): string {
  if (value == null) return '\u2014'
  return `$${value.toLocaleString()}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeRemaining(endDate: string | null): string {
  if (!endDate) return '\u2014'
  const end = new Date(endDate)
  const now = new Date()
  if (end < now) return 'Expired'
  const months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
  if (months < 1) {
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return `${days} day${days === 1 ? '' : 's'}`
  }
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem > 0 ? `${years}y ${rem}mo` : `${years}y`
  }
  return `${months} mo`
}

export default function LeasesPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [leaseType, setLeaseType] = useState('')
  const [sortKey, setSortKey] = useState('end_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
    if (statusFilter) p.status = statusFilter
    if (leaseType) p.lease_type = leaseType
    return p
  }, [page, sortKey, sortDir, statusFilter, leaseType])

  const { data, total, loading, error } = useApiList<Record<string, any>>({
    endpoint: '/api/v1/leases',
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

  const hasFilters = statusFilter || leaseType
  function clearFilters() {
    setStatusFilter('')
    setLeaseType('')
    setPage(1)
  }

  // Summary stats
  const activeLeases = data.filter(l => l.status === 'active')
  const monthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)
  const expiringSoon = data.filter(l => l.status === 'active' && isExpiringSoon(l.end_date)).length
  const avgMonthlyRent = activeLeases.length > 0
    ? Math.round(monthlyRevenue / activeLeases.length)
    : 0

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
          <span className="text-warm-300 font-body text-sm">Loading leases...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-warm-white tracking-wide">Leases</h1>
        <p className="font-body text-warm-300 text-sm mt-1">
          {total} lease{total === 1 ? '' : 's'} across your portfolio
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 animate-fade-up stagger-1">
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Total Leases</p>
          <p className="text-warm-white text-2xl font-display tabular">{total}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Active</p>
          <p className="text-emerald-400 text-2xl font-display tabular">{activeLeases.length}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Monthly Revenue</p>
          <p className="text-brass text-2xl font-display tabular">{formatCurrency(monthlyRevenue)}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Expiring Soon</p>
          <p className={`text-2xl font-display tabular ${expiringSoon > 0 ? 'text-amber-400' : 'text-warm-white'}`}>{expiringSoon}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Avg Monthly Rent</p>
          <p className="text-warm-white text-2xl font-display tabular">{formatCurrency(avgMonthlyRent)}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-up stagger-2">
        <select
          value={statusFilter}
          onChange={e => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="terminated">Terminated</option>
          <option value="negotiating">Negotiating</option>
          <option value="pending">Pending</option>
          <option value="renewed">Renewed</option>
        </select>
        <select
          value={leaseType}
          onChange={e => handleFilterChange(setLeaseType, e.target.value)}
          className="px-3 py-2 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors"
        >
          <option value="">All Types</option>
          <option value="gross">Gross</option>
          <option value="net">Net</option>
          <option value="triple_net">Triple Net</option>
          <option value="modified_gross">Modified Gross</option>
          <option value="percentage">Percentage</option>
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
                <th className="table-header">Tenant</th>
                <th className="table-header">Property</th>
                <th className="table-header">Space</th>
                <th className="table-header">Type</th>
                <SortHeader label="Status" field="status" />
                <SortHeader label="Start" field="start_date" />
                <SortHeader label="End" field="end_date" />
                <SortHeader label="Monthly Rent" field="monthly_rent" align="right" />
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const status = statusColors[row.status] || statusColors.pending
                const expiring = row.status === 'active' && isExpiringSoon(row.end_date)
                const isExpanded = expandedId === row.id
                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`border-b border-obsidian-700/50 hover:bg-brass-faint/50 transition-colors group ${isExpanded ? 'bg-brass-faint/30' : ''}`}
                    >
                      <td className="table-cell">
                        <Link
                          href={`/tenants/${row.tenant_id}`}
                          className="font-semibold text-warm-white group-hover:text-brass transition-colors"
                        >
                          {row.tenant_name || '\u2014'}
                        </Link>
                      </td>
                      <td className="table-cell">
                        <Link
                          href={`/properties/${row.property_id}`}
                          className="text-warm-200 hover:text-brass transition-colors"
                        >
                          {row.property_name || '\u2014'}
                        </Link>
                      </td>
                      <td className="table-cell text-warm-300">{row.space_name || '\u2014'}</td>
                      <td className="table-cell">
                        <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">
                          {row.lease_type?.replace(/_/g, ' ') || '\u2014'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${status.bg} ${status.text} border ${status.border}`}>
                          {row.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="table-cell text-warm-200 tabular text-sm">{formatDate(row.start_date)}</td>
                      <td className="table-cell tabular text-sm">
                        <span className={expiring ? 'text-amber-400 font-medium' : 'text-warm-200'}>
                          {formatDate(row.end_date)}
                        </span>
                      </td>
                      <td className="table-cell text-right text-warm-100 tabular font-medium">
                        {formatCurrency(row.monthly_rent)}
                      </td>
                      <td className="table-cell text-center">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className="p-1 text-warm-400 hover:text-warm-100 transition-colors"
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-obsidian-900/60">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Annual Rent</p>
                              <p className="text-warm-white font-body text-sm tabular">{formatCurrency(row.annual_rent)}</p>
                            </div>
                            <div>
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Rent Escalation</p>
                              <p className="text-warm-white font-body text-sm tabular">
                                {row.rent_escalation_pct != null ? `${row.rent_escalation_pct}%` : '\u2014'}
                              </p>
                            </div>
                            <div>
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Security Deposit</p>
                              <p className="text-warm-white font-body text-sm tabular">{formatCurrency(row.security_deposit)}</p>
                            </div>
                            <div>
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Lease Type</p>
                              <p className="text-warm-white font-body text-sm capitalize">{row.lease_type?.replace(/_/g, ' ') || '\u2014'}</p>
                            </div>
                            <div>
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Time Remaining</p>
                              <p className={`font-body text-sm tabular ${
                                expiring ? 'text-amber-400 font-medium' : 'text-warm-white'
                              }`}>
                                {timeRemaining(row.end_date)}
                              </p>
                            </div>
                            <div>
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Renewal Options</p>
                              <p className="text-warm-white font-body text-sm">{row.renewal_options || '\u2014'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-warm-400 text-xs font-body uppercase tracking-wider mb-1">Terms / Notes</p>
                              <p className="text-warm-200 font-body text-sm">{row.terms || row.notes || '\u2014'}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <FileText className="w-10 h-10 text-warm-500 mx-auto mb-3" />
                    <p className="text-warm-300 font-body text-sm">No leases found</p>
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
