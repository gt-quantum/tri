'use client'

import { memo } from 'react'
import { PortfolioData } from '@/lib/use-dashboard-data'

export default memo(function SummaryCards({ data }: { data: PortfolioData }) {
  const { properties, spaces, leases } = data

  const totalProperties = properties.length
  const totalSpaces = spaces.length
  const occupiedSpaces = spaces.filter((s: any) => s.status === 'occupied').length
  const vacantSpaces = totalSpaces - occupiedSpaces
  const occupancyRate = totalSpaces > 0 ? (occupiedSpaces / totalSpaces) * 100 : 0

  const activeLeases = leases.filter((l: any) => l.status === 'active')
  const totalMonthlyRevenue = activeLeases.reduce((sum: number, l: any) => sum + (l.monthly_rent || 0), 0)

  const today = new Date()
  const activeLeasesWithRemaining = activeLeases
    .filter((l: any) => l.end_date && new Date(l.end_date) > today)
    .map((l: any) => (new Date(l.end_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
  const avgMonthsRemaining =
    activeLeasesWithRemaining.length > 0
      ? activeLeasesWithRemaining.reduce((a: number, b: number) => a + b, 0) / activeLeasesWithRemaining.length
      : 0

  const totalValue = properties.reduce((sum: number, p: any) => sum + (p.current_value || 0), 0)

  const cards = [
    {
      label: 'Portfolio Value',
      metric: 'portfolio_value',
      value: `$${(totalValue / 1_000_000).toFixed(1)}M`,
      sub: `${totalProperties} properties`,
      accent: 'brass',
    },
    {
      label: 'Monthly Revenue',
      metric: 'monthly_revenue',
      value: `$${totalMonthlyRevenue.toLocaleString()}`,
      sub: `${activeLeases.length} active leases`,
      accent: 'brass',
    },
    {
      label: 'Occupancy',
      metric: 'occupancy_rate',
      value: `${occupancyRate.toFixed(1)}%`,
      sub: `${occupiedSpaces} of ${totalSpaces} spaces`,
      accent: occupancyRate >= 85 ? 'emerald' : occupancyRate >= 70 ? 'amber' : 'red',
      bar: occupancyRate,
    },
    {
      label: 'Vacant Spaces',
      metric: 'vacant_spaces',
      value: vacantSpaces,
      sub: `${spaces
        .filter((s: any) => s.status === 'vacant')
        .reduce((sum: number, s: any) => sum + (s.sqft || 0), 0)
        .toLocaleString()} sqft available`,
      accent: vacantSpaces > 10 ? 'red' : 'warm',
    },
    {
      label: 'Avg Lease Term',
      metric: 'avg_lease_term',
      value: `${(avgMonthsRemaining / 12).toFixed(1)}y`,
      sub: `${Math.round(avgMonthsRemaining)} months remaining`,
      accent: 'warm',
    },
  ]

  const accentColors: Record<string, { value: string; bar: string; barBg: string }> = {
    brass: { value: 'text-brass', bar: 'bg-brass', barBg: 'bg-brass/10' },
    emerald: { value: 'text-emerald-400', bar: 'bg-emerald-400', barBg: 'bg-emerald-400/10' },
    amber: { value: 'text-amber-400', bar: 'bg-amber-400', barBg: 'bg-amber-400/10' },
    red: { value: 'text-red-400', bar: 'bg-red-400', barBg: 'bg-red-400/10' },
    warm: { value: 'text-warm-white', bar: 'bg-warm-200', barBg: 'bg-warm-200/10' },
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, i) => {
        const colors = accentColors[card.accent] || accentColors.warm
        return (
          <div
            key={card.label}
            className="card-surface-hover p-5 group"
            style={{ animationDelay: `${i * 0.06}s` }}
            data-ai-context={JSON.stringify({ type: 'kpi', metric: card.metric })}
          >
            <div className="stat-label mb-3">
              {card.label}
            </div>
            <div className={`text-2xl font-display tabular ${colors.value}`}>
              {card.value}
            </div>
            {card.bar !== undefined && (
              <div className={`mt-3 h-1 rounded-full ${colors.barBg}`}>
                <div
                  className={`h-full rounded-full ${colors.bar} transition-all duration-1000 ease-out`}
                  style={{ width: `${card.bar}%` }}
                />
              </div>
            )}
            <div className="text-warm-300 text-xs font-body mt-2">{card.sub}</div>
          </div>
        )
      })}
    </div>
  )
})
