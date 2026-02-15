import { useMemo } from 'react'

export default function LeaseTimeline({ data }) {
  const { leases, tenants, spaces, properties } = data

  const today = new Date()
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)

  const items = useMemo(() => {
    return leases
      .filter(l => l.end_date)
      .map(l => {
        const tenant = tenants.find(t => t.id === l.tenant_id)
        const space = spaces.find(s => s.id === l.space_id)
        const property = properties.find(p => p.id === l.property_id)
        const endDate = new Date(l.end_date)

        let color, label
        if (l.status === 'expired') {
          color = 'bg-gray-700 text-gray-400'
          label = 'Expired'
        } else if (l.status === 'under_negotiation') {
          color = 'bg-blue-900/60 text-blue-400'
          label = 'Negotiating'
        } else if (endDate <= sixMonthsOut) {
          color = 'bg-yellow-900/60 text-yellow-400'
          label = 'Expiring Soon'
        } else {
          color = 'bg-emerald-900/60 text-emerald-400'
          label = 'Active'
        }

        return {
          id: l.id,
          tenant: tenant?.company_name || 'Unknown',
          space: space?.name || '',
          property: property?.name || '',
          endDate,
          endDateStr: l.end_date,
          status: l.status,
          monthlyRent: l.monthly_rent,
          color,
          label,
        }
      })
      .sort((a, b) => a.endDate - b.endDate)
  }, [leases, tenants, spaces, properties])

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 max-h-[500px] overflow-y-auto">
      <div className="space-y-1.5">
        {items.map(item => {
          const monthsAway = (item.endDate - today) / (1000 * 60 * 60 * 24 * 30.44)
          // Bar width: expired = thin, negotiation = medium, active = proportional to time remaining
          const maxMonths = 72 // 6 years
          const widthPct = item.status === 'expired'
            ? 5
            : Math.max(8, Math.min(95, (Math.max(0, monthsAway) / maxMonths) * 95))

          return (
            <div key={item.id} className="flex items-center gap-3 text-xs group">
              <div className="w-40 truncate text-gray-400 shrink-0" title={item.tenant}>
                {item.tenant}
              </div>
              <div className="flex-1 relative">
                <div
                  className={`h-6 rounded flex items-center px-2 ${item.color} transition-all`}
                  style={{ width: `${widthPct}%` }}
                >
                  <span className="truncate text-[10px] font-medium">{item.label}</span>
                </div>
              </div>
              <div className="w-40 text-right text-gray-500 shrink-0 hidden sm:block">
                <span className="text-gray-400">{item.property}</span>
                {item.space ? <span className="text-gray-600"> · {item.space}</span> : null}
              </div>
              <div className="w-20 text-right text-gray-500 tabular-nums shrink-0">
                {item.endDateStr}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
