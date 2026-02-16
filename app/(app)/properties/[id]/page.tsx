'use client'

import { useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEntityDetail } from '@/lib/hooks/use-entity-detail'
import { setBreadcrumbName } from '@/components/navigation/TopBar'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PropertyDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: property, loading, error } = useEntityDetail<any>('properties', id)

  useEffect(() => {
    if (property) {
      setBreadcrumbName(id, property.name)
    }
  }, [id, property])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
        <p className="font-body text-warm-300 text-sm tracking-wide">Loading property data...</p>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="card-surface p-8 text-center max-w-md">
          <h2 className="font-display text-lg text-warm-white mb-2">Property Not Found</h2>
          <p className="text-warm-300 text-sm mb-4">{error || 'The requested property could not be found.'}</p>
          <Link href="/properties" className="text-brass hover:text-brass-light text-sm font-body transition-colors">
            Back to Properties
          </Link>
        </div>
      </div>
    )
  }

  return <PropertyDetail property={property} />
}

function PropertyDetail({ property }: { property: any }) {
  // API returns spaces and leases pre-enriched with tenant_name and space_name
  const spaces = property.spaces || []
  const allLeases = property.leases || []

  const activeLeases = useMemo(() => allLeases.filter((l: any) => l.status === 'active'), [allLeases])
  const expiredLeases = useMemo(() => allLeases.filter((l: any) => l.status === 'expired'), [allLeases])

  const today = new Date()
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)

  const occupiedCount = spaces.filter((s: any) => s.status === 'occupied').length
  const vacantCount = spaces.filter((s: any) => s.status === 'vacant').length
  const occupancyRate = spaces.length > 0 ? (occupiedCount / spaces.length) * 100 : 0
  const totalMonthlyRent = activeLeases.reduce((sum: number, l: any) => sum + (l.monthly_rent || 0), 0)
  const totalAnnualRent = activeLeases.reduce((sum: number, l: any) => sum + (l.annual_rent || 0), 0)

  const appreciation =
    property.acquisition_price && property.current_value
      ? ((property.current_value - property.acquisition_price) / property.acquisition_price) * 100
      : null

  const spaceRows = useMemo(() => {
    return spaces
      .map((s: any) => {
        const activeLease = allLeases.find((l: any) => l.space_id === s.id && l.status === 'active')
        const negotiationLease = allLeases.find((l: any) => l.space_id === s.id && l.status === 'under_negotiation')
        return { ...s, activeLease, negotiationLease }
      })
      .sort((a: any, b: any) => {
        if (a.status === 'occupied' && b.status !== 'occupied') return -1
        if (a.status !== 'occupied' && b.status === 'occupied') return 1
        return (a.name || '').localeCompare(b.name || '')
      })
  }, [spaces, allLeases])

  function formatCurrency(val: any) {
    if (!val) return '$0'
    return '$' + Number(val).toLocaleString()
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '\u2014'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function timeRemaining(endDateStr: string | null | undefined) {
    if (!endDateStr) return '\u2014'
    const end = new Date(endDateStr)
    const diffMs = end.getTime() - today.getTime()
    if (diffMs <= 0) return 'Expired'
    const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
    if (months >= 12) {
      const years = Math.floor(months / 12)
      const rem = months % 12
      return rem > 0 ? `${years}y ${rem}mo` : `${years}y`
    }
    return `${months}mo`
  }

  function isExpiringSoon(endDateStr: string | null | undefined) {
    if (!endDateStr) return false
    return new Date(endDateStr) <= sixMonthsOut && new Date(endDateStr) > today
  }

  function occupancyColor(pct: number) {
    if (pct >= 90) return 'text-emerald-400'
    if (pct >= 70) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div>
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl text-warm-white tracking-wide">{property.name}</h1>
              <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">{property.property_type}</span>
            </div>
            <p className="font-body text-warm-300 text-sm">
              {property.address}, {property.city}, {property.state} {property.zip}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm font-body">
          {property.total_sqft && (
            <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Sqft</span><span className="text-warm-white ml-2 tabular">{Number(property.total_sqft).toLocaleString()}</span></div>
          )}
          {property.year_built && (
            <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Built</span><span className="text-warm-white ml-2 tabular">{property.year_built}</span></div>
          )}
          {property.acquisition_date && (
            <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Acquired</span><span className="text-warm-white ml-2">{formatDate(property.acquisition_date)}</span></div>
          )}
          {property.acquisition_price && (
            <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Acq. Price</span><span className="text-warm-white ml-2 tabular">{formatCurrency(property.acquisition_price)}</span></div>
          )}
          {property.current_value && (
            <div>
              <span className="text-warm-300 text-[13px] uppercase tracking-wider">Current Value</span>
              <span className="text-brass ml-2 font-medium tabular">{formatCurrency(property.current_value)}</span>
              {appreciation !== null && (
                <span className={`ml-2 text-[13px] tabular ${appreciation >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {appreciation >= 0 ? '+' : ''}{appreciation.toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10 animate-fade-up stagger-1">
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Total Spaces</div>
          <div className="text-2xl font-display text-warm-white tabular">{spaces.length}</div>
        </div>
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Occupied / Vacant</div>
          <div className="text-2xl font-display tabular">
            <span className="text-emerald-400">{occupiedCount}</span>
            <span className="text-warm-500 mx-1">/</span>
            <span className="text-red-400">{vacantCount}</span>
          </div>
        </div>
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Occupancy Rate</div>
          <div className={`text-2xl font-display tabular ${occupancyColor(occupancyRate)}`}>{occupancyRate.toFixed(1)}%</div>
          <div className="mt-2 h-1 rounded-full bg-warm-500/20">
            <div className={`h-full rounded-full transition-all duration-700 ${occupancyRate >= 90 ? 'bg-emerald-400' : occupancyRate >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${occupancyRate}%` }} />
          </div>
        </div>
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Monthly Rent</div>
          <div className="text-2xl font-display text-brass tabular">{formatCurrency(totalMonthlyRent)}</div>
        </div>
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Annual Rent</div>
          <div className="text-2xl font-display text-brass tabular">{formatCurrency(totalAnnualRent)}</div>
        </div>
      </div>

      {/* Spaces Table */}
      <section className="mb-10 animate-fade-up stagger-2">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="section-heading">Spaces</h2>
          <div className="flex-1 brass-line" />
          <span className="text-warm-300 text-[13px] font-body tabular">{spaces.length} total</span>
        </div>
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brass-faint">
                  <th className="table-header">Space</th><th className="table-header">Floor</th>
                  <th className="table-header text-right">Sqft</th><th className="table-header">Type</th>
                  <th className="table-header">Status</th><th className="table-header">Tenant</th>
                  <th className="table-header text-right">Monthly Rent</th><th className="table-header text-right">Lease Expires</th>
                </tr>
              </thead>
              <tbody>
                {spaceRows.map((row: any) => {
                  const isVacant = row.status === 'vacant'
                  const hasNegotiation = isVacant && row.negotiationLease
                  return (
                    <tr key={row.id} className={`border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors group ${isVacant ? 'bg-obsidian-900/40' : ''}`}>
                      <td className="table-cell"><span className={`font-semibold ${isVacant ? 'text-warm-300' : 'text-warm-white'}`}>{row.name}</span></td>
                      <td className="table-cell text-warm-200">{row.floor || '\u2014'}</td>
                      <td className="table-cell text-right text-warm-100 tabular">{row.sqft ? Number(row.sqft).toLocaleString() : '\u2014'}</td>
                      <td className="table-cell"><span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">{row.space_type}</span></td>
                      <td className="table-cell">
                        {isVacant ? (
                          <div className="flex items-center gap-2">
                            <span className="badge bg-red-400/10 text-red-400 border border-red-400/20">vacant</span>
                            {hasNegotiation && <span className="badge bg-blue-400/10 text-blue-400 border border-blue-400/20">negotiating</span>}
                          </div>
                        ) : <span className="badge bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">occupied</span>}
                      </td>
                      <td className="table-cell">
                        {row.activeLease?.tenant_name ? (
                          <Link href={`/tenants/${row.activeLease.tenant_id}`} className="text-warm-white hover:text-brass transition-colors">{row.activeLease.tenant_name}</Link>
                        ) : hasNegotiation && row.negotiationLease?.tenant_name ? (
                          <Link href={`/tenants/${row.negotiationLease.tenant_id}`} className="text-blue-400/80 hover:text-blue-400 transition-colors italic">{row.negotiationLease.tenant_name}</Link>
                        ) : <span className="text-warm-500">{'\u2014'}</span>}
                      </td>
                      <td className="table-cell text-right tabular">
                        {row.activeLease ? <span className="text-warm-100">{formatCurrency(row.activeLease.monthly_rent)}</span>
                          : row.negotiationLease ? <span className="text-blue-400/60 italic">{formatCurrency(row.negotiationLease.monthly_rent)}</span>
                          : <span className="text-warm-500">{'\u2014'}</span>}
                      </td>
                      <td className="table-cell text-right">
                        {row.activeLease?.end_date ? (
                          <span className={`tabular ${isExpiringSoon(row.activeLease.end_date) ? 'text-amber-400' : 'text-warm-200'}`}>{formatDate(row.activeLease.end_date)}</span>
                        ) : <span className="text-warm-500">{'\u2014'}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Active Leases */}
      <section className="mb-10 animate-fade-up stagger-3">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="section-heading">Active Leases</h2>
          <div className="flex-1 brass-line" />
          <span className="text-warm-300 text-[13px] font-body tabular">{activeLeases.length} active</span>
        </div>
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brass-faint">
                  <th className="table-header">Tenant</th><th className="table-header">Space</th>
                  <th className="table-header">Type</th><th className="table-header">Start</th>
                  <th className="table-header">End</th><th className="table-header text-right">Monthly</th>
                  <th className="table-header text-right">Annual</th><th className="table-header text-right">Escalation</th>
                  <th className="table-header text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {activeLeases.map((lease: any) => {
                  const expiring = isExpiringSoon(lease.end_date)
                  return (
                    <tr key={lease.id} className={`border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors ${expiring ? 'bg-amber-400/[0.03]' : ''}`}>
                      <td className="table-cell">
                        {lease.tenant_name ? <Link href={`/tenants/${lease.tenant_id}`} className="font-semibold text-warm-white hover:text-brass transition-colors">{lease.tenant_name}</Link> : <span className="text-warm-400">Unknown</span>}
                      </td>
                      <td className="table-cell text-warm-200">{lease.space_name || '\u2014'}</td>
                      <td className="table-cell"><span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">{lease.lease_type}</span></td>
                      <td className="table-cell text-warm-200 tabular">{formatDate(lease.start_date)}</td>
                      <td className="table-cell tabular"><span className={expiring ? 'text-amber-400 font-medium' : 'text-warm-200'}>{formatDate(lease.end_date)}</span></td>
                      <td className="table-cell text-right text-warm-100 tabular">{formatCurrency(lease.monthly_rent)}</td>
                      <td className="table-cell text-right text-warm-100 tabular">{formatCurrency(lease.annual_rent)}</td>
                      <td className="table-cell text-right text-warm-200 tabular">{lease.rent_escalation ? `${lease.rent_escalation}%` : '\u2014'}</td>
                      <td className="table-cell text-right tabular"><span className={expiring ? 'text-amber-400 font-medium' : 'text-warm-200'}>{timeRemaining(lease.end_date)}</span></td>
                    </tr>
                  )
                })}
                {activeLeases.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-warm-400">No active leases</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Lease History */}
      {expiredLeases.length > 0 && (
        <section className="mb-16 animate-fade-up stagger-4">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading text-warm-400">Lease History</h2>
            <div className="flex-1 brass-line opacity-40" />
            <span className="text-warm-400 text-[13px] font-body tabular">{expiredLeases.length} expired</span>
          </div>
          <div className="card-surface overflow-hidden opacity-60">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brass-faint">
                    <th className="table-header">Tenant</th><th className="table-header">Space</th>
                    <th className="table-header">Type</th><th className="table-header">Start</th>
                    <th className="table-header">End</th><th className="table-header text-right">Monthly</th>
                    <th className="table-header text-right">Annual</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredLeases.map((lease: any) => (
                    <tr key={lease.id} className="border-b border-obsidian-700/50 last:border-0">
                      <td className="table-cell">{lease.tenant_name ? <Link href={`/tenants/${lease.tenant_id}`} className="text-warm-400 hover:text-brass transition-colors">{lease.tenant_name}</Link> : <span className="text-warm-500">Unknown</span>}</td>
                      <td className="table-cell text-warm-400">{lease.space_name || '\u2014'}</td>
                      <td className="table-cell"><span className="badge bg-obsidian-700/50 text-warm-400 border border-obsidian-600/50">{lease.lease_type}</span></td>
                      <td className="table-cell text-warm-400 tabular">{formatDate(lease.start_date)}</td>
                      <td className="table-cell text-warm-400 tabular">{formatDate(lease.end_date)}</td>
                      <td className="table-cell text-right text-warm-400 tabular">{formatCurrency(lease.monthly_rent)}</td>
                      <td className="table-cell text-right text-warm-400 tabular">{formatCurrency(lease.annual_rent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
