'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { PortfolioData } from '@/lib/use-dashboard-data'

export default function LeaseTimeline({ data }: { data: PortfolioData }) {
  const { leases, tenants, spaces, properties } = data
  const [filter, setFilter] = useState('all')

  const today = new Date()
  const sixMonthsOut = new Date(today)
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6)

  const items = useMemo(() => {
    return leases
      .filter((l: any) => l.end_date)
      .map((l: any) => {
        const tenant = tenants.find((t: any) => t.id === l.tenant_id)
        const space = spaces.find((s: any) => s.id === l.space_id)
        const property = properties.find((p: any) => p.id === l.property_id)
        const endDate = new Date(l.end_date)

        let category: string, color: string, barColor: string
        if (l.status === 'expired') {
          category = 'expired'; color = 'text-warm-400'; barColor = 'bg-warm-500/40'
        } else if (l.status === 'under_negotiation') {
          category = 'negotiating'; color = 'text-blue-400'; barColor = 'bg-blue-400/50'
        } else if (endDate <= sixMonthsOut) {
          category = 'expiring'; color = 'text-amber-400'; barColor = 'bg-amber-400/50'
        } else {
          category = 'active'; color = 'text-emerald-400'; barColor = 'bg-emerald-400/30'
        }

        return {
          id: l.id,
          tenantId: tenant?.id,
          tenant: tenant?.company_name || 'Unknown',
          space: space?.name || '',
          propertyId: property?.id,
          property: property?.name || '',
          endDate,
          endDateStr: l.end_date,
          status: l.status,
          monthlyRent: l.monthly_rent,
          category, color, barColor,
        }
      })
      .sort((a: any, b: any) => a.endDate.getTime() - b.endDate.getTime())
  }, [leases, tenants, spaces, properties, sixMonthsOut])

  const filtered = filter === 'all' ? items : items.filter((i: any) => i.category === filter)

  const counts = useMemo(
    () => ({
      all: items.length,
      expiring: items.filter((i: any) => i.category === 'expiring').length,
      negotiating: items.filter((i: any) => i.category === 'negotiating').length,
      expired: items.filter((i: any) => i.category === 'expired').length,
      active: items.filter((i: any) => i.category === 'active').length,
    }),
    [items]
  )

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'expiring', label: 'Expiring Soon', accent: 'text-amber-400' },
    { key: 'negotiating', label: 'Negotiating', accent: 'text-blue-400' },
    { key: 'active', label: 'Active', accent: 'text-emerald-400' },
    { key: 'expired', label: 'Expired', accent: 'text-warm-400' },
  ]

  return (
    <div className="card-surface overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-1 px-5 py-3 border-b border-brass-faint overflow-x-auto">
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-3 py-1 rounded text-[11px] font-body font-medium uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === btn.key
                ? 'bg-brass/15 text-brass border border-brass/20'
                : 'text-warm-400 hover:text-warm-200 border border-transparent'
            }`}
          >
            {btn.label}
            <span className={`ml-1.5 tabular ${filter === btn.key ? 'text-brass/70' : 'text-warm-500'}`}>
              {counts[btn.key as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline rows */}
      <div className="max-h-[460px] overflow-y-auto">
        <div className="divide-y divide-obsidian-700/40">
          {filtered.map((item: any) => {
            const monthsAway = (item.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
            const maxMonths = 72
            const widthPct =
              item.status === 'expired'
                ? 4
                : Math.max(6, Math.min(92, (Math.max(0, monthsAway) / maxMonths) * 92))

            return (
              <div
                key={item.id}
                className="flex items-center gap-4 px-5 py-2.5 hover:bg-brass-faint/30 transition-colors group"
              >
                <div className="w-36 shrink-0">
                  {item.tenantId ? (
                    <Link
                      href={`/tenants/${item.tenantId}`}
                      className="text-warm-white text-sm font-body font-medium truncate block group-hover:text-brass transition-colors"
                      title={item.tenant}
                    >
                      {item.tenant}
                    </Link>
                  ) : (
                    <div className="text-warm-white text-sm font-body font-medium truncate" title={item.tenant}>
                      {item.tenant}
                    </div>
                  )}
                </div>

                <div className="flex-1 relative h-5">
                  <div
                    className={`absolute inset-y-0 left-0 rounded ${item.barColor} flex items-center px-2 transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  >
                    <span
                      className={`text-[10px] font-body font-semibold uppercase tracking-wider ${item.color} truncate`}
                    >
                      {item.category === 'expiring'
                        ? 'Exp. Soon'
                        : item.category === 'negotiating'
                          ? 'Negotiating'
                          : item.category === 'expired'
                            ? 'Expired'
                            : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="w-44 shrink-0 text-right hidden md:block">
                  {item.propertyId ? (
                    <Link
                      href={`/properties/${item.propertyId}`}
                      className="text-warm-200 text-xs font-body hover:text-brass transition-colors"
                    >
                      {item.property}
                    </Link>
                  ) : (
                    <span className="text-warm-200 text-xs font-body">{item.property}</span>
                  )}
                  {item.space && <span className="text-warm-500 text-xs"> · {item.space}</span>}
                </div>

                <div className="w-20 shrink-0 text-right text-warm-200 text-xs font-body tabular hidden sm:block">
                  ${item.monthlyRent?.toLocaleString()}
                </div>

                <div className="w-24 shrink-0 text-right">
                  <span className="text-warm-300 text-xs font-body tabular">{item.endDateStr}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
