'use client'

import { useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useEntityDetail } from '@/lib/hooks/use-entity-detail'
import { setBreadcrumbName } from '@/components/navigation/TopBar'

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function TenantDetailPage() {
  const params = useParams()
  const id = params.id as string
  const { data: tenant, loading, error } = useEntityDetail<any>('tenants', id)

  useEffect(() => {
    if (tenant) {
      setBreadcrumbName(id, tenant.company_name)
    }
  }, [id, tenant])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
        <p className="font-body text-warm-300 text-sm tracking-wide">Loading tenant data...</p>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="card-surface p-8 text-center max-w-md">
          <h2 className="font-display text-lg text-warm-white mb-2">Tenant Not Found</h2>
          <p className="text-warm-300 text-sm mb-4">{error || 'The requested tenant could not be found.'}</p>
          <Link href="/tenants" className="text-brass hover:text-brass-light text-sm font-body transition-colors">
            Back to Tenants
          </Link>
        </div>
      </div>
    )
  }

  return <TenantDetail tenant={tenant} />
}

function TenantDetail({ tenant }: { tenant: any }) {
  // API returns leases pre-enriched with property_name, space_name
  // Also returns parent_tenant_name and subsidiaries
  const allLeases = tenant.leases || []
  const subsidiaries = tenant.subsidiaries || []

  const activeLeases = useMemo(() => allLeases.filter((l: any) => l.status === 'active'), [allLeases])
  const expiredLeases = useMemo(() => allLeases.filter((l: any) => l.status === 'expired'), [allLeases])

  const today = new Date()
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)

  const propertyIds = useMemo(() => new Set(activeLeases.map((l: any) => l.property_id)), [activeLeases])
  const totalMonthlyRent = activeLeases.reduce((sum: number, l: any) => sum + (l.monthly_rent || 0), 0)
  const totalAnnualRent = activeLeases.reduce((sum: number, l: any) => sum + (l.annual_rent || 0), 0)

  const creditColors: Record<string, { bg: string; text: string; border: string }> = {
    excellent: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
    good: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
    fair: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20' },
    poor: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' },
    not_rated: { bg: 'bg-warm-500/10', text: 'text-warm-400', border: 'border-warm-500/20' },
  }

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

  const credit = creditColors[tenant.credit_rating] || creditColors.not_rated

  return (
    <div>
      {/* Header */}
      <header className="mb-8 animate-fade-up">
        <div className="flex items-start gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl text-warm-white tracking-wide">{tenant.company_name}</h1>
              {tenant.industry && <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">{tenant.industry.replace(/_/g, ' ')}</span>}
              <span className={`badge ${credit.bg} ${credit.text} border ${credit.border}`}>{tenant.credit_rating?.replace(/_/g, ' ') || 'not rated'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm font-body">
              {tenant.website && (
                <a href={tenant.website.startsWith('http') ? tenant.website : `https://${tenant.website}`} target="_blank" rel="noopener noreferrer" className="text-brass hover:text-brass-light transition-colors">
                  {tenant.website}
                </a>
              )}
              {tenant.primary_contact_name && (
                <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Contact</span><span className="text-warm-white ml-2">{tenant.primary_contact_name}</span></div>
              )}
              {tenant.primary_contact_email && (
                <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Email</span><span className="text-warm-200 ml-2">{tenant.primary_contact_email}</span></div>
              )}
              {tenant.primary_contact_phone && (
                <div><span className="text-warm-300 text-[13px] uppercase tracking-wider">Phone</span><span className="text-warm-200 ml-2">{tenant.primary_contact_phone}</span></div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Parent/Subsidiary Info */}
      {(tenant.parent_tenant_name || subsidiaries.length > 0) && (
        <div className="mb-8 animate-fade-up stagger-1">
          <div className="card-surface p-5">
            {tenant.parent_tenant_name && (
              <div className="flex items-center gap-2 text-sm font-body">
                <span className="text-warm-400">Subsidiary of</span>
                <Link href={`/tenants/${tenant.parent_tenant_id}`} className="text-brass hover:text-brass-light transition-colors font-medium">
                  {tenant.parent_tenant_name}
                </Link>
              </div>
            )}
            {subsidiaries.length > 0 && (
              <div>
                <div className="text-warm-300 text-[13px] uppercase tracking-wider font-body mb-2">Subsidiaries</div>
                <div className="flex flex-wrap gap-2">
                  {subsidiaries.map((sub: any) => (
                    <Link key={sub.id} href={`/tenants/${sub.id}`} className="badge bg-brass/10 text-brass border border-brass/20 hover:bg-brass/20 transition-colors cursor-pointer">
                      {sub.company_name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Portfolio Footprint */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 animate-fade-up stagger-2">
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Active Leases</div>
          <div className="text-2xl font-display text-warm-white tabular">{activeLeases.length}</div>
        </div>
        <div className="card-surface-hover p-5">
          <div className="stat-label mb-3">Properties</div>
          <div className="text-2xl font-display text-warm-white tabular">{propertyIds.size}</div>
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
                  <th className="table-header">Property</th><th className="table-header">Space</th>
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
                      <td className="table-cell">{lease.property_name ? <Link href={`/properties/${lease.property_id}`} className="font-semibold text-warm-white hover:text-brass transition-colors">{lease.property_name}</Link> : <span className="text-warm-400">Unknown</span>}</td>
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
                    <th className="table-header">Property</th><th className="table-header">Space</th>
                    <th className="table-header">Type</th><th className="table-header">Start</th>
                    <th className="table-header">End</th><th className="table-header text-right">Monthly</th>
                    <th className="table-header text-right">Annual</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredLeases.map((lease: any) => (
                    <tr key={lease.id} className="border-b border-obsidian-700/50 last:border-0">
                      <td className="table-cell">{lease.property_name ? <Link href={`/properties/${lease.property_id}`} className="text-warm-400 hover:text-brass transition-colors">{lease.property_name}</Link> : <span className="text-warm-500">Unknown</span>}</td>
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
