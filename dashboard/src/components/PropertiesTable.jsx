import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'

export default function PropertiesTable({ data }) {
  const { properties, spaces, leases } = data
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const rows = useMemo(() => {
    return properties.map(p => {
      const propSpaces = spaces.filter(s => s.property_id === p.id)
      const occupied = propSpaces.filter(s => s.status === 'occupied').length
      const vacant = propSpaces.filter(s => s.status === 'vacant').length
      const total = propSpaces.length
      const occupancyPct = total > 0 ? (occupied / total) * 100 : 0

      const activeLeases = leases.filter(l => l.property_id === p.id && l.status === 'active')
      const monthlyRent = activeLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)

      return {
        ...p,
        totalSpaces: total,
        occupied,
        vacant,
        occupancyPct,
        monthlyRent,
      }
    })
  }, [properties, spaces, leases])

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av = a[sortKey]
      let bv = b[sortKey]
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [rows, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortIndicator({ field }) {
    if (sortKey !== field) return <span className="text-warm-500 ml-1 opacity-0 group-hover/th:opacity-100 transition-opacity">↕</span>
    return <span className="text-brass ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  function SortHeader({ label, field, align }) {
    return (
      <th
        className={`table-header cursor-pointer select-none group/th hover:text-warm-100 transition-colors ${align === 'right' ? 'text-right' : ''}`}
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center">
          {label}
          <SortIndicator field={field} />
        </span>
      </th>
    )
  }

  function occupancyColor(pct) {
    if (pct >= 90) return 'emerald'
    if (pct >= 70) return 'amber'
    return 'red'
  }

  const colorMap = {
    emerald: { text: 'text-emerald-400', bar: 'bg-emerald-400', bg: 'bg-emerald-400/10' },
    amber: { text: 'text-amber-400', bar: 'bg-amber-400', bg: 'bg-amber-400/10' },
    red: { text: 'text-red-400', bar: 'bg-red-400', bg: 'bg-red-400/10' },
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brass-faint">
              <SortHeader label="Property" field="name" />
              <SortHeader label="Location" field="city" />
              <SortHeader label="Type" field="property_type" />
              <SortHeader label="Sqft" field="total_sqft" align="right" />
              <SortHeader label="Spaces" field="totalSpaces" align="right" />
              <SortHeader label="Occupancy" field="occupancyPct" align="right" />
              <SortHeader label="Monthly Rent" field="monthlyRent" align="right" />
              <SortHeader label="Value" field="current_value" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const occ = occupancyColor(row.occupancyPct)
              const colors = colorMap[occ]
              return (
                <tr
                  key={row.id}
                  className="border-b border-obsidian-700/50 last:border-0 hover:bg-brass-faint/50 transition-colors group"
                >
                  <td className="table-cell">
                    <Link
                      to={`/property/${row.id}`}
                      className="font-semibold text-warm-white group-hover:text-brass transition-colors"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="table-cell text-warm-200">
                    <span>{row.city}</span>
                    <span className="text-warm-400">, {row.state}</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge bg-obsidian-700 text-warm-200 border border-obsidian-600">
                      {row.property_type}
                    </span>
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular">
                    {row.total_sqft?.toLocaleString()}
                  </td>
                  <td className="table-cell text-right">
                    <span className="text-warm-100 tabular">{row.occupied}</span>
                    <span className="text-warm-500 mx-0.5">/</span>
                    <span className="text-warm-300 tabular">{row.totalSpaces}</span>
                  </td>
                  <td className="table-cell text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <div className={`w-16 h-1 rounded-full ${colors.bg}`}>
                        <div
                          className={`h-full rounded-full ${colors.bar} transition-all duration-700`}
                          style={{ width: `${row.occupancyPct}%` }}
                        />
                      </div>
                      <span className={`font-semibold tabular ${colors.text}`}>
                        {row.occupancyPct.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="table-cell text-right text-warm-100 tabular">
                    ${row.monthlyRent.toLocaleString()}
                  </td>
                  <td className="table-cell text-right">
                    <span className="text-brass tabular font-medium">
                      ${(row.current_value / 1_000_000).toFixed(1)}M
                    </span>
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
