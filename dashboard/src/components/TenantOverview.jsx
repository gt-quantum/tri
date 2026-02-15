import { useMemo } from 'react'

export default function TenantOverview({ data }) {
  const { tenants, leases, properties } = data

  const rows = useMemo(() => {
    return tenants.map(t => {
      const tenantLeases = leases.filter(l => l.tenant_id === t.id && l.status === 'active')
      const totalMonthly = tenantLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)
      const propertyIds = new Set(tenantLeases.map(l => l.property_id))
      const multiProperty = propertyIds.size > 1

      return {
        ...t,
        activeLeaseCount: tenantLeases.length,
        totalMonthly,
        propertyCount: propertyIds.size,
        multiProperty,
      }
    })
  }, [tenants, leases])

  // Group into parent/children
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

  const ratingColors = {
    excellent: 'bg-emerald-900/50 text-emerald-400',
    good: 'bg-blue-900/50 text-blue-400',
    fair: 'bg-yellow-900/50 text-yellow-400',
    poor: 'bg-red-900/50 text-red-400',
    not_rated: 'bg-gray-800 text-gray-500',
  }

  return (
    <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-lg">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Leases</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rent</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {grouped.map(row => (
            <tr key={row.id} className="hover:bg-gray-800/30">
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {row.isChild && <span className="text-gray-600 ml-4">└</span>}
                  <span className={`font-medium ${row.isChild ? 'text-gray-400' : 'text-white'}`}>
                    {row.company_name}
                  </span>
                  {row.isParent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/50 text-purple-400">parent</span>
                  )}
                  {row.isChild && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-500">subsidiary</span>
                  )}
                  {row.multiProperty && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-900/50 text-amber-400">multi-property</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-gray-400">{row.industry?.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded text-xs ${ratingColors[row.credit_rating] || ratingColors.not_rated}`}>
                  {row.credit_rating?.replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">{row.activeLeaseCount}</td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">{row.propertyCount}</td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">${row.totalMonthly.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
