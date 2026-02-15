import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function TenantDetail({ data }) {
  const { id } = useParams()
  const { properties, spaces, tenants, leases, organization } = data
  const orgName = organization?.name || 'Portfolio'

  const tenant = tenants.find(t => t.id === id)

  const parentTenant = useMemo(() => {
    if (!tenant?.parent_tenant_id) return null
    return tenants.find(t => t.id === tenant.parent_tenant_id)
  }, [tenant, tenants])

  const subsidiaries = useMemo(() => {
    if (!tenant) return []
    return tenants.filter(t => t.parent_tenant_id === tenant.id)
  }, [tenant, tenants])

  const tenantLeases = useMemo(() => {
    if (!tenant) return []
    return leases.filter(l => l.tenant_id === tenant.id)
  }, [tenant, leases])

  const activeLeases = useMemo(() =>
    tenantLeases.filter(l => l.status === 'active'),
    [tenantLeases]
  )

  const expiredLeases = useMemo(() =>
    tenantLeases.filter(l => l.status === 'expired'),
    [tenantLeases]
  )

  const today = new Date()
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)

  // Portfolio footprint
  const propertyIds = useMemo(() =>
    new Set(activeLeases.map(l => l.property_id)),
    [activeLeases]
  )
  const totalSqft = useMemo(() =>
    activeLeases.reduce((sum, l) => {
      const space = spaces.find(s => s.id === l.space_id)
      return sum + (space?.sqft || 0)
    }, 0),
    [activeLeases, spaces]
  )
  const totalMonthlyRent = activeLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)
  const totalAnnualRent = activeLeases.reduce((sum, l) => sum + (l.annual_rent || 0), 0)

  const creditColors = {
    excellent: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
    good: { bg: 'bg-blue-400/10', text: 'text-blue-400', border: 'border-blue-400/20' },
    fair: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20' },
    poor: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' },
    not_rated: { bg: 'bg-warm-500/10', text: 'text-warm-400', border: 'border-warm-500/20' },
  }

  function formatCurrency(val) {
    if (!val) return '$0'
    return '$' + Number(val).toLocaleString()
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function timeRemaining(endDateStr) {
    if (!endDateStr) return '—'
    const end = new Date(endDateStr)
    const diffMs = end - today
    if (diffMs <= 0) return 'Expired'
    const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44))
    if (months >= 12) {
      const years = Math.floor(months / 12)
      const rem = months % 12
      return rem > 0 ? `${years}y ${rem}mo` : `${years}y`
    }
    return `${months}mo`
  }

  function isExpiringSoon(endDateStr) {
    if (!endDateStr) return false
    return new Date(endDateStr) <= sixMonthsOut && new Date(endDateStr) > today
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-surface p-8 text-center max-w-md">
          <h2 className="font-display text-lg text-warm-white mb-2">Tenant Not Found</h2>
          <p className="text-warm-300 text-sm mb-4">The requested tenant could not be found.</p>
          <Link to="/" className="text-brass hover:text-brass-light text-sm font-body transition-colors">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const credit = creditColors[tenant.credit_rating] || creditColors.not_rated

  return (
    <div className="min-h-screen">
      <div className="h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-warm-300 hover:text-brass text-sm font-body transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Tenant Header */}
        <header className="mb-8 animate-fade-up">
          <div className="flex items-start gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-3xl text-warm-white tracking-wide">{tenant.company_name}</h1>
                {tenant.industry && (
                  <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">
                    {tenant.industry.replace(/_/g, ' ')}
                  </span>
                )}
                <span className={`badge ${credit.bg} ${credit.text} border ${credit.border}`}>
                  {tenant.credit_rating?.replace(/_/g, ' ') || 'not rated'}
                </span>
              </div>

              {/* Contact info */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm font-body">
                {tenant.website && (
                  <a
                    href={tenant.website.startsWith('http') ? tenant.website : `https://${tenant.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brass hover:text-brass-light transition-colors"
                  >
                    {tenant.website}
                  </a>
                )}
                {tenant.primary_contact_name && (
                  <div>
                    <span className="text-warm-400 text-xs uppercase tracking-wider">Contact</span>
                    <span className="text-warm-white ml-2">{tenant.primary_contact_name}</span>
                  </div>
                )}
                {tenant.primary_contact_email && (
                  <div>
                    <span className="text-warm-400 text-xs uppercase tracking-wider">Email</span>
                    <span className="text-warm-200 ml-2">{tenant.primary_contact_email}</span>
                  </div>
                )}
                {tenant.primary_contact_phone && (
                  <div>
                    <span className="text-warm-400 text-xs uppercase tracking-wider">Phone</span>
                    <span className="text-warm-200 ml-2">{tenant.primary_contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Parent/Subsidiary Info */}
        {(parentTenant || subsidiaries.length > 0) && (
          <div className="mb-8 animate-fade-up stagger-1">
            <div className="card-surface p-5">
              {parentTenant && (
                <div className="flex items-center gap-2 text-sm font-body">
                  <span className="text-warm-400">Subsidiary of</span>
                  <Link
                    to={`/tenant/${parentTenant.id}`}
                    className="text-brass hover:text-brass-light transition-colors font-medium"
                  >
                    {parentTenant.company_name}
                  </Link>
                </div>
              )}
              {subsidiaries.length > 0 && (
                <div>
                  <div className="text-warm-400 text-xs uppercase tracking-wider font-body mb-2">Subsidiaries</div>
                  <div className="flex flex-wrap gap-2">
                    {subsidiaries.map(sub => (
                      <Link
                        key={sub.id}
                        to={`/tenant/${sub.id}`}
                        className="badge bg-brass/10 text-brass border border-brass/20 hover:bg-brass/20 transition-colors cursor-pointer"
                      >
                        {sub.company_name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio Footprint Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10 animate-fade-up stagger-2">
          <div className="card-surface-hover p-5">
            <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-[0.14em] mb-3">Active Leases</div>
            <div className="text-2xl font-body font-bold text-warm-white tabular">{activeLeases.length}</div>
          </div>
          <div className="card-surface-hover p-5">
            <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-[0.14em] mb-3">Properties</div>
            <div className="text-2xl font-body font-bold text-warm-white tabular">{propertyIds.size}</div>
          </div>
          <div className="card-surface-hover p-5">
            <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-[0.14em] mb-3">Total Sqft</div>
            <div className="text-2xl font-body font-bold text-warm-white tabular">{totalSqft.toLocaleString()}</div>
          </div>
          <div className="card-surface-hover p-5">
            <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-[0.14em] mb-3">Monthly Rent</div>
            <div className="text-2xl font-body font-bold text-brass tabular">{formatCurrency(totalMonthlyRent)}</div>
          </div>
          <div className="card-surface-hover p-5">
            <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-[0.14em] mb-3">Annual Rent</div>
            <div className="text-2xl font-body font-bold text-brass tabular">{formatCurrency(totalAnnualRent)}</div>
          </div>
        </div>

        {/* Active Leases Table */}
        <section className="mb-10 animate-fade-up stagger-3">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Active Leases</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{activeLeases.length} active</span>
          </div>
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-brass-faint">
                    <th className="table-header">Property</th>
                    <th className="table-header">Space</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Start</th>
                    <th className="table-header">End</th>
                    <th className="table-header text-right">Monthly</th>
                    <th className="table-header text-right">Annual</th>
                    <th className="table-header text-right">Escalation</th>
                    <th className="table-header text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLeases.map(lease => {
                    const prop = properties.find(p => p.id === lease.property_id)
                    const space = spaces.find(s => s.id === lease.space_id)
                    const expiring = isExpiringSoon(lease.end_date)
                    return (
                      <tr
                        key={lease.id}
                        className={`border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors ${expiring ? 'bg-amber-400/[0.03]' : ''}`}
                      >
                        <td className="table-cell">
                          {prop ? (
                            <Link
                              to={`/property/${prop.id}`}
                              className="font-semibold text-warm-white hover:text-brass transition-colors"
                            >
                              {prop.name}
                            </Link>
                          ) : (
                            <span className="text-warm-400">Unknown</span>
                          )}
                        </td>
                        <td className="table-cell text-warm-200">{space?.name || '—'}</td>
                        <td className="table-cell">
                          <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">
                            {lease.lease_type}
                          </span>
                        </td>
                        <td className="table-cell text-warm-200 tabular">{formatDate(lease.start_date)}</td>
                        <td className="table-cell tabular">
                          <span className={expiring ? 'text-amber-400 font-medium' : 'text-warm-200'}>
                            {formatDate(lease.end_date)}
                          </span>
                        </td>
                        <td className="table-cell text-right text-warm-100 tabular">{formatCurrency(lease.monthly_rent)}</td>
                        <td className="table-cell text-right text-warm-100 tabular">{formatCurrency(lease.annual_rent)}</td>
                        <td className="table-cell text-right text-warm-200 tabular">
                          {lease.rent_escalation ? `${lease.rent_escalation}%` : '—'}
                        </td>
                        <td className="table-cell text-right tabular">
                          <span className={expiring ? 'text-amber-400 font-medium' : 'text-warm-200'}>
                            {timeRemaining(lease.end_date)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {activeLeases.length === 0 && (
                    <tr><td colSpan={9} className="table-cell text-center text-warm-400">No active leases</td></tr>
                  )}
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
              <span className="text-warm-500 text-xs font-body tabular">{expiredLeases.length} expired</span>
            </div>
            <div className="card-surface overflow-hidden opacity-60">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-brass-faint">
                      <th className="table-header">Property</th>
                      <th className="table-header">Space</th>
                      <th className="table-header">Type</th>
                      <th className="table-header">Start</th>
                      <th className="table-header">End</th>
                      <th className="table-header text-right">Monthly</th>
                      <th className="table-header text-right">Annual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiredLeases.map(lease => {
                      const prop = properties.find(p => p.id === lease.property_id)
                      const space = spaces.find(s => s.id === lease.space_id)
                      return (
                        <tr key={lease.id} className="border-b border-obsidian-700/50 last:border-0">
                          <td className="table-cell">
                            {prop ? (
                              <Link
                                to={`/property/${prop.id}`}
                                className="text-warm-400 hover:text-brass transition-colors"
                              >
                                {prop.name}
                              </Link>
                            ) : (
                              <span className="text-warm-500">Unknown</span>
                            )}
                          </td>
                          <td className="table-cell text-warm-400">{space?.name || '—'}</td>
                          <td className="table-cell">
                            <span className="badge bg-obsidian-700/50 text-warm-400 border border-obsidian-600/50">
                              {lease.lease_type}
                            </span>
                          </td>
                          <td className="table-cell text-warm-400 tabular">{formatDate(lease.start_date)}</td>
                          <td className="table-cell text-warm-400 tabular">{formatDate(lease.end_date)}</td>
                          <td className="table-cell text-right text-warm-400 tabular">{formatCurrency(lease.monthly_rent)}</td>
                          <td className="table-cell text-right text-warm-400 tabular">{formatCurrency(lease.annual_rent)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/20 to-transparent" />
      <div className="text-center py-6">
        <p className="text-warm-500 text-[10px] font-body uppercase tracking-[0.2em]">{orgName} &middot; Portfolio Intelligence</p>
      </div>
    </div>
  )
}
