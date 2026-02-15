import { useMemo } from 'react'

export default function TenantOverview({ data }) {
  const { tenants, leases, properties } = data

  const rows = useMemo(() => {
    return tenants.map(t => {
      const tenantLeases = leases.filter(l => l.tenant_id === t.id && l.status === 'active')
      const totalMonthly = tenantLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)
      const propertyIds = new Set(tenantLeases.map(l => l.property_id))

      return {
        ...t,
        activeLeaseCount: tenantLeases.length,
        totalMonthly,
        propertyCount: propertyIds.size,
        multiProperty: propertyIds.size > 1,
      }
    })
  }, [tenants, leases])

  const grouped = useMemo(() => {
    const parents = rows.filter(t => !t.parent_tenant_id)
    const childMap = {}
    rows.filter(t => t.parent_tenant_id).forEach(t => {
      if (!childMap[t.parent_tenant_id]) childMap[t.parent_tenant_id] = []
      childMap[t.parent_tenant_id].push(t)
    })
    const result = []
    parents.forEach(p => {
      result.push({ ...p, isParent: !!childMap[p.id], isChild: false })
      if (childMap[p.id]) {
        childMap[p.id].forEach(c => {
          result.push({ ...c, isParent: false, isChild: true })
        })
      }
    })
    return result
  }, [rows])

  const creditColors = {
    excellent: { bg: 'bg-emerald-400/10', text: 'text-emerald-400', border: 'border-emerald-400/20' },
    good: { bg: 'bg-brass/10', text: 'text-brass', border: 'border-brass/20' },
    fair: { bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/20' },
    poor: { bg: 'bg-red-400/10', text: 'text-red-400', border: 'border-red-400/20' },
    not_rated: { bg: 'bg-warm-500/10', text: 'text-warm-400', border: 'border-warm-500/20' },
  }

  const totalRevenue = grouped.reduce((sum, t) => sum + t.totalMonthly, 0)

  return (
    <div className="card-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brass-faint">
              <th className="table-header">Company</th>
              <th className="table-header">Industry</th>
              <th className="table-header">Credit</th>
              <th className="table-header text-right">Leases</th>
              <th className="table-header text-right">Properties</th>
              <th className="table-header text-right">Monthly Rent</th>
              <th className="table-header text-right">Revenue Share</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(row => {
              const credit = creditColors[row.credit_rating] || creditColors.not_rated
              const revenueShare = totalRevenue > 0 ? (row.totalMonthly / totalRevenue) * 100 : 0

              return (
                <tr
                  key={row.id}
                  className={`border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors group ${
                    row.isChild ? 'bg-obsidian-900/40' : ''
                  }`}
                >
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {row.isChild && (
                        <span className="text-brass-dim ml-2 text-xs">└─</span>
                      )}
                      <span className={`font-semibold ${row.isChild ? 'text-warm-200' : 'text-warm-white'} group-hover:text-brass transition-colors`}>
                        {row.company_name}
                      </span>
                      {row.isParent && (
                        <span className="badge bg-brass/10 text-brass-dim border border-brass/15 text-[9px]">
                          parent
                        </span>
                      )}
                      {row.isChild && (
                        <span className="badge bg-obsidian-700 text-warm-300 border border-obsidian-600 text-[9px]">
                          subsidiary
                        </span>
                      )}
                      {row.multiProperty && (
                        <span className="badge bg-amber-400/8 text-amber-400/80 border border-amber-400/15 text-[9px]">
                          multi-site
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-warm-200 capitalize">
                    {row.industry?.replace(/_/g, ' ')}
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${credit.bg} ${credit.text} border ${credit.border}`}>
                      {row.credit_rating?.replace(/_/g, ' ') || '—'}
                    </span>
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular">
                    {row.activeLeaseCount}
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular">
                    {row.propertyCount}
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular font-medium">
                    ${row.totalMonthly.toLocaleString()}
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1 rounded-full bg-brass/10">
                        <div
                          className="h-full rounded-full bg-brass/60 transition-all duration-700"
                          style={{ width: `${Math.min(revenueShare, 100)}%` }}
                        />
                      </div>
                      <span className="text-warm-300 tabular text-xs">
                        {revenueShare.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
