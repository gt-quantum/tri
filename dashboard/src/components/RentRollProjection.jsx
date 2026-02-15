import { useMemo } from 'react'
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} '${y.slice(2)}`
}

function formatDollars(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toLocaleString()}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const d = payload[0]?.payload
  if (!d) return null

  const contracted = d.contracted ?? 0
  const escalated = d.escalated ?? 0
  const floor = d.floor ?? 0
  const currentTotal = d.currentTotal ?? contracted

  return (
    <div className="bg-obsidian-800 border border-brass/20 rounded-lg px-4 py-3 shadow-xl">
      <div className="text-warm-white text-sm font-body font-semibold mb-2">{monthLabel(label)}</div>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6 text-xs font-body">
          <span className="text-warm-300">Contracted</span>
          <span className="text-warm-white tabular">{formatDollars(contracted)}</span>
        </div>
        <div className="flex justify-between gap-6 text-xs font-body">
          <span style={{ color: '#10b981' }}>With Escalations</span>
          <span className="text-warm-200 tabular">{formatDollars(escalated)}</span>
        </div>
        <div className="flex justify-between gap-6 text-xs font-body">
          <span style={{ color: '#ef4444' }}>Guaranteed Floor</span>
          <span className="text-warm-200 tabular">{formatDollars(floor)}</span>
        </div>
        <div className="pt-1 border-t border-brass-faint">
          <div className="flex justify-between gap-6 text-xs font-body">
            <span className="text-warm-400">Revenue at Risk</span>
            <span className="text-amber-400 tabular font-semibold">{formatDollars(contracted - floor)}</span>
          </div>
          <div className="flex justify-between gap-6 text-xs font-body">
            <span className="text-warm-400">Delta from Today</span>
            <span className={`tabular font-semibold ${contracted < currentTotal ? 'text-red-400' : 'text-warm-200'}`}>
              {contracted < currentTotal ? '-' : ''}{formatDollars(Math.abs(currentTotal - contracted))}
            </span>
          </div>
          <div className="flex justify-between gap-6 text-xs font-body">
            <span className="text-warm-400">Active Leases</span>
            <span className="text-warm-200 tabular">{d.activeLeases}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RentRollProjection({ data }) {
  const { leases } = data

  const chartData = useMemo(() => {
    const now = new Date()
    const activeLeases = leases.filter(l => l.status === 'active' && l.end_date && l.start_date)

    // Precompute lease data
    const leaseInfos = activeLeases.map(l => ({
      startDate: new Date(l.start_date),
      endDate: new Date(l.end_date),
      monthlyRent: l.monthly_rent || 0,
      escalation: l.rent_escalation || 0, // annual % increase
    }))

    const points = []
    const currentTotalRent = leaseInfos.reduce((sum, l) => sum + l.monthlyRent, 0)

    for (let i = 0; i <= 18; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 15)
      const key = monthKey(targetDate)

      let contracted = 0
      let escalated = 0
      let floor = 0
      let activeCount = 0

      // 18-month horizon for floor calculation
      const horizonDate = new Date(now.getFullYear(), now.getMonth() + 18, 15)

      leaseInfos.forEach(lease => {
        // Is this lease active during this month?
        if (lease.startDate <= targetDate && lease.endDate >= targetDate) {
          activeCount++

          // Contracted: base rent, no escalations
          contracted += lease.monthlyRent

          // With escalations: apply annual escalation for each anniversary passed
          if (lease.escalation > 0) {
            const yearsElapsed = (targetDate - lease.startDate) / (365.25 * 24 * 60 * 60 * 1000)
            const fullYears = Math.floor(yearsElapsed)
            const escalatedRent = lease.monthlyRent * Math.pow(1 + lease.escalation / 100, fullYears)
            escalated += escalatedRent
          } else {
            escalated += lease.monthlyRent
          }

          // Floor: only leases that extend beyond the 18-month horizon
          if (lease.endDate > horizonDate) {
            floor += lease.monthlyRent
          }
        }
      })

      points.push({
        month: key,
        contracted,
        escalated,
        floor,
        activeLeases: activeCount,
        currentTotal: currentTotalRent,
      })
    }

    return points
  }, [leases])

  const currentRent = chartData[0]?.contracted ?? 0
  const endRent = chartData[chartData.length - 1]?.contracted ?? 0
  const floorRent = chartData[chartData.length - 1]?.floor ?? 0
  const atRisk = currentRent - floorRent

  return (
    <div className="card-surface p-5">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-display text-lg text-warm-white">Rent Roll Projection</h3>
          <p className="text-warm-400 text-xs font-body mt-0.5">Revenue trajectory based on current lease terms — 18-month outlook</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-wider">Revenue at Risk</div>
            <div className="text-amber-400 text-lg font-body font-bold tabular">{formatDollars(atRisk)}</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#c8a55a' }} />
          <span className="text-warm-300 text-[10px] font-body uppercase tracking-wider">Contracted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#10b981' }} />
          <span className="text-warm-300 text-[10px] font-body uppercase tracking-wider">With Escalations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-warm-300 text-[10px] font-body uppercase tracking-wider">Guaranteed Floor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)' }} />
          <span className="text-warm-300 text-[10px] font-body uppercase tracking-wider">Risk Area</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="riskAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(200, 165, 90, 0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tick={{ fill: '#7c7870', fontSize: 10, fontFamily: 'Outfit' }}
              axisLine={{ stroke: 'rgba(200, 165, 90, 0.1)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatDollars}
              tick={{ fill: '#7c7870', fontSize: 10, fontFamily: 'Outfit' }}
              axisLine={false}
              tickLine={false}
              width={65}
              domain={[dataMin => Math.floor(dataMin * 0.85), 'auto']}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(200, 165, 90, 0.15)' }} />

            {/* Risk area between contracted and floor */}
            <Area
              dataKey="contracted"
              type="monotone"
              stroke="none"
              fill="url(#riskAreaGradient)"
              fillOpacity={1}
              baseLine={chartData.map(d => d.floor)}
            />

            {/* Floor line */}
            <Area
              dataKey="floor"
              type="monotone"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill="none"
              dot={false}
            />

            {/* Contracted line */}
            <Area
              dataKey="contracted"
              type="monotone"
              stroke="#c8a55a"
              strokeWidth={2}
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: '#c8a55a', stroke: '#04040a', strokeWidth: 2 }}
            />

            {/* Escalated line */}
            <Area
              dataKey="escalated"
              type="monotone"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="none"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', stroke: '#04040a', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="bg-obsidian-800/50 rounded-lg p-3">
          <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-wider mb-0.5">Today</div>
          <div className="text-warm-white text-sm font-body font-bold tabular">{formatDollars(currentRent)}</div>
          <div className="text-warm-400 text-[10px] font-body">{chartData[0]?.activeLeases} active leases</div>
        </div>
        <div className="bg-obsidian-800/50 rounded-lg p-3">
          <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-wider mb-0.5">18-Month Contracted</div>
          <div className={`text-sm font-body font-bold tabular ${endRent < currentRent ? 'text-red-400' : 'text-warm-white'}`}>
            {formatDollars(endRent)}
          </div>
          <div className="text-warm-400 text-[10px] font-body">
            {endRent < currentRent ? `-${formatDollars(currentRent - endRent)}` : 'No change'}
          </div>
        </div>
        <div className="bg-obsidian-800/50 rounded-lg p-3">
          <div className="text-warm-400 text-[10px] font-body font-semibold uppercase tracking-wider mb-0.5">Guaranteed Floor</div>
          <div className="text-emerald-400 text-sm font-body font-bold tabular">{formatDollars(floorRent)}</div>
          <div className="text-warm-400 text-[10px] font-body">
            {((floorRent / currentRent) * 100).toFixed(0)}% of current
          </div>
        </div>
      </div>
    </div>
  )
}
