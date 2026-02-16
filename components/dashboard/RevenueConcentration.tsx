'use client'

import { memo, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { PortfolioData } from '@/lib/use-dashboard-data'

const SLICE_COLORS = [
  '#c8a55a', '#10b981', '#6366f1', '#f59e0b', '#ec4899', '#64748b',
]

function formatDollars(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-obsidian-800 border border-brass/20 rounded-lg px-4 py-3 shadow-xl">
      <div className="text-warm-white text-sm font-body font-semibold">{d.name}</div>
      <div className="flex justify-between gap-6 mt-1 text-[13px] font-body">
        <span className="text-warm-300">Monthly Rent</span>
        <span className="text-warm-white tabular">{formatDollars(d.value)}</span>
      </div>
      <div className="flex justify-between gap-6 text-[13px] font-body">
        <span className="text-warm-300">Share</span>
        <span className="text-warm-white tabular">{d.pct.toFixed(1)}%</span>
      </div>
      {d.leaseCount && (
        <div className="flex justify-between gap-6 text-[13px] font-body">
          <span className="text-warm-300">Active Leases</span>
          <span className="text-warm-white tabular">{d.leaseCount}</span>
        </div>
      )}
    </div>
  )
}

export default memo(function RevenueConcentration({ data }: { data: PortfolioData }) {
  const { leases, tenants } = data

  const { slices, metrics } = useMemo(() => {
    const activeLeases = leases.filter((l: any) => l.status === 'active')

    const tenantRent: Record<string, number> = {}
    const tenantLeaseCount: Record<string, number> = {}
    activeLeases.forEach((l: any) => {
      const tid = l.tenant_id
      tenantRent[tid] = (tenantRent[tid] || 0) + (l.monthly_rent || 0)
      tenantLeaseCount[tid] = (tenantLeaseCount[tid] || 0) + 1
    })

    const totalRent = Object.values(tenantRent).reduce((a, b) => a + b, 0)

    const sorted = Object.entries(tenantRent)
      .map(([tid, rent]) => ({
        id: tid,
        name: tenants.find((t: any) => t.id === tid)?.company_name || 'Unknown',
        value: rent,
        pct: totalRent > 0 ? (rent / totalRent) * 100 : 0,
        leaseCount: tenantLeaseCount[tid] || 0,
      }))
      .sort((a, b) => b.value - a.value)

    const top5 = sorted.slice(0, 5)
    const others = sorted.slice(5)
    const othersRent = others.reduce((sum, t) => sum + t.value, 0)
    const othersCount = others.length

    const sliceData: any[] = [...top5]
    if (othersRent > 0) {
      sliceData.push({
        name: `All Others (${othersCount})`,
        value: othersRent,
        pct: totalRent > 0 ? (othersRent / totalRent) * 100 : 0,
        leaseCount: others.reduce((sum, t) => sum + t.leaseCount, 0),
      })
    }

    const largest = sorted[0] || { name: '—', pct: 0 }
    let cumulative = 0
    let tenantsFor50 = 0
    for (const t of sorted) {
      cumulative += t.pct
      tenantsFor50++
      if (cumulative >= 50) break
    }

    const hhi = sorted.reduce((sum, t) => sum + Math.pow(t.pct, 2), 0)
    let hhiLabel: string, hhiColor: string
    if (hhi < 1500) { hhiLabel = 'Diversified'; hhiColor = 'text-emerald-400' }
    else if (hhi < 2500) { hhiLabel = 'Moderate'; hhiColor = 'text-amber-400' }
    else { hhiLabel = 'Concentrated'; hhiColor = 'text-red-400' }

    return {
      slices: sliceData,
      metrics: {
        totalRent, largestName: largest.name, largestPct: largest.pct,
        tenantsFor50, totalTenants: sorted.length,
        hhi: Math.round(hhi), hhiLabel, hhiColor,
      },
    }
  }, [leases, tenants])

  return (
    <div className="card-surface p-5">
      <h3 className="font-display text-lg text-warm-white mb-1">Revenue Concentration</h3>
      <p className="text-warm-300 text-[13px] font-body mb-5">Tenant diversification across active lease revenue</p>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="w-full lg:w-1/2 h-[280px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices} cx="50%" cy="50%"
                innerRadius="55%" outerRadius="85%" paddingAngle={2}
                dataKey="value" stroke="none"
              >
                {slices.map((_: any, i: number) => (
                  <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="text-warm-white text-xl font-display tabular">{formatDollars(metrics.totalRent)}</div>
              <div className="text-warm-400 text-[11px] font-body uppercase tracking-wider">Monthly</div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-obsidian-800/50 rounded-lg p-3">
              <div className="text-warm-400 text-[11px] font-body font-semibold uppercase tracking-wider mb-1">Largest Tenant</div>
              <div className="text-warm-white text-sm font-body font-semibold truncate">{metrics.largestName}</div>
              <div className="text-brass text-lg font-display tabular">{metrics.largestPct.toFixed(1)}%</div>
            </div>
            <div className="bg-obsidian-800/50 rounded-lg p-3">
              <div className="text-warm-400 text-[11px] font-body font-semibold uppercase tracking-wider mb-1">50% Revenue</div>
              <div className="text-warm-white text-sm font-body font-semibold">{metrics.tenantsFor50} tenants</div>
              <div className="text-warm-200 text-[13px] font-body">of {metrics.totalTenants} total</div>
            </div>
            <div className="bg-obsidian-800/50 rounded-lg p-3 col-span-2">
              <div className="text-warm-400 text-[11px] font-body font-semibold uppercase tracking-wider mb-1">Concentration Index (HHI)</div>
              <div className="flex items-baseline gap-2">
                <span className="text-warm-white text-lg font-display tabular">{metrics.hhi.toLocaleString()}</span>
                <span className={`text-[13px] font-body font-semibold ${metrics.hhiColor}`}>{metrics.hhiLabel}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-obsidian-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, (metrics.hhi / 5000) * 100)}%`,
                    backgroundColor: metrics.hhi < 1500 ? '#10b981' : metrics.hhi < 2500 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {slices.map((s: any, i: number) => (
              <div key={s.name} className="flex items-center gap-2 text-[13px] font-body">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }} />
                <span className="text-warm-200 truncate flex-1">{s.name}</span>
                <span className="text-warm-300 tabular">{s.pct.toFixed(1)}%</span>
                <span className="text-warm-400 tabular">{formatDollars(s.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})
