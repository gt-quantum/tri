'use client'

import { memo, useMemo, useState } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { PortfolioData } from '@/lib/use-dashboard-data'

const RISK_COLORS = {
  low: '#10b981',
  moderate: '#f59e0b',
  high: '#ef4444',
}

function classifyRisk(creditRating: string | null | undefined) {
  if (!creditRating) return 'high'
  const r = creditRating.toLowerCase()
  if (r === 'excellent' || r === 'good') return 'low'
  if (r === 'fair') return 'moderate'
  return 'high'
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`
}

function formatDollars(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null

  return (
    <div className="bg-obsidian-800 border border-brass/20 rounded-lg px-4 py-3 shadow-xl max-w-xs">
      <div className="text-warm-white text-sm font-body font-semibold mb-2">{monthLabel(label)}</div>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-[13px] font-body">
          <span className="text-warm-300">Total Expiring</span>
          <span className="text-warm-white tabular font-semibold">{formatDollars(data.total)}</span>
        </div>
        {data.lowRent > 0 && (
          <div className="flex justify-between gap-6 text-[13px] font-body">
            <span style={{ color: RISK_COLORS.low }}>Low Risk</span>
            <span className="text-warm-200 tabular">{formatDollars(data.lowRent)} ({data.lowCount} leases)</span>
          </div>
        )}
        {data.moderateRent > 0 && (
          <div className="flex justify-between gap-6 text-[13px] font-body">
            <span style={{ color: RISK_COLORS.moderate }}>Moderate Risk</span>
            <span className="text-warm-200 tabular">{formatDollars(data.moderateRent)} ({data.moderateCount} leases)</span>
          </div>
        )}
        {data.highRent > 0 && (
          <div className="flex justify-between gap-6 text-[13px] font-body">
            <span style={{ color: RISK_COLORS.high }}>High Risk</span>
            <span className="text-warm-200 tabular">{formatDollars(data.highRent)} ({data.highCount} leases)</span>
          </div>
        )}
        <div className="pt-1 border-t border-brass-faint flex justify-between gap-6 text-[13px] font-body">
          <span className="text-warm-300">Leases Expiring</span>
          <span className="text-warm-white tabular font-semibold">{data.leaseCount}</span>
        </div>
        {data.tenantNames?.length > 0 && (
          <div className="pt-1 text-xs text-warm-300 font-body">
            {data.tenantNames.slice(0, 5).join(', ')}
            {data.tenantNames.length > 5 && ` +${data.tenantNames.length - 5} more`}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(function LeaseExpirationChart({ data }: { data: PortfolioData }) {
  const { leases, tenants, properties } = data
  const [scopePropertyId, setScopePropertyId] = useState('all')

  const chartData = useMemo(() => {
    const now = new Date()
    const cutoff = new Date(now)
    cutoff.setMonth(cutoff.getMonth() + 24)

    const activeLeases = leases.filter((l: any) => {
      if (l.status !== 'active') return false
      if (!l.end_date) return false
      const end = new Date(l.end_date)
      if (end <= now || end > cutoff) return false
      if (scopePropertyId !== 'all' && l.property_id !== scopePropertyId) return false
      return true
    })

    const buckets: Record<string, any> = {}
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      const key = monthKey(d)
      buckets[key] = {
        month: key,
        lowRent: 0, moderateRent: 0, highRent: 0,
        lowCount: 0, moderateCount: 0, highCount: 0,
        leaseCount: 0, total: 0,
        tenantNames: [],
      }
    }

    activeLeases.forEach((lease: any) => {
      const end = new Date(lease.end_date)
      const key = monthKey(end)
      if (!buckets[key]) return

      const tenant = tenants.find((t: any) => t.id === lease.tenant_id)
      const risk = classifyRisk(tenant?.credit_rating)
      const rent = lease.monthly_rent || 0

      buckets[key][`${risk}Rent`] += rent
      buckets[key][`${risk}Count`] += 1
      buckets[key].leaseCount += 1
      buckets[key].total += rent
      if (tenant?.company_name) buckets[key].tenantNames.push(tenant.company_name)
    })

    return Object.values(buckets)
  }, [leases, tenants, scopePropertyId])

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-display text-lg text-warm-white">Lease Expiration Risk</h3>
          <p className="text-warm-300 text-[13px] font-body mt-0.5">Monthly rent exposure by tenant credit risk — next 24 months</p>
        </div>
        <select
          value={scopePropertyId}
          onChange={e => setScopePropertyId(e.target.value)}
          className="bg-obsidian-800 border border-brass-faint rounded px-3 py-1.5 text-[13px] font-body text-warm-200 focus:outline-none focus:border-brass/30 cursor-pointer"
        >
          <option value="all">All Properties</option>
          {properties.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-5 mb-4">
        {[
          { label: 'Low Risk (Excellent/Good)', color: RISK_COLORS.low },
          { label: 'Moderate Risk (Fair)', color: RISK_COLORS.moderate },
          { label: 'High Risk (Poor/Unrated)', color: RISK_COLORS.high },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-warm-300 text-[11px] font-body uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#c8a55a' }} />
          <span className="text-warm-300 text-[11px] font-body uppercase tracking-wider">Lease Count</span>
        </div>
      </div>

      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(200, 165, 90, 0.06)" vertical={false} />
            <XAxis
              dataKey="month" tickFormatter={monthLabel}
              tick={{ fill: '#7c7870', fontSize: 12, fontFamily: 'Outfit' }}
              axisLine={{ stroke: 'rgba(200, 165, 90, 0.1)' }} tickLine={false} interval={1}
            />
            <YAxis
              yAxisId="rent" tickFormatter={formatDollars}
              tick={{ fill: '#7c7870', fontSize: 12, fontFamily: 'Outfit' }}
              axisLine={false} tickLine={false} width={60}
            />
            <YAxis
              yAxisId="count" orientation="right"
              tick={{ fill: '#7c7870', fontSize: 12, fontFamily: 'Outfit' }}
              axisLine={false} tickLine={false} width={30} allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200, 165, 90, 0.04)' }} />
            <Bar yAxisId="rent" dataKey="lowRent" stackId="rent" fill={RISK_COLORS.low} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="rent" dataKey="moderateRent" stackId="rent" fill={RISK_COLORS.moderate} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="rent" dataKey="highRent" stackId="rent" fill={RISK_COLORS.high} radius={[2, 2, 0, 0]} />
            <Line
              yAxisId="count" dataKey="leaseCount" type="monotone"
              stroke="#c8a55a" strokeWidth={2} dot={false}
              activeDot={{ r: 4, fill: '#c8a55a', stroke: '#04040a', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
})
