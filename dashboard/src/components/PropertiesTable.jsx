import { useState, useMemo } from 'react'

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
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function SortHeader({ label, field }) {
    const active = sortKey === field
    return (
      <th
        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 select-none"
        onClick={() => handleSort(field)}
      >
        {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
      </th>
    )
  }

  function occupancyColor(pct) {
    if (pct >= 90) return 'text-emerald-400'
    if (pct >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-lg">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800">
          <tr>
            <SortHeader label="Property" field="name" />
            <SortHeader label="City" field="city" />
            <SortHeader label="State" field="state" />
            <SortHeader label="Type" field="property_type" />
            <SortHeader label="Sqft" field="total_sqft" />
            <SortHeader label="Spaces" field="totalSpaces" />
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occ / Vac</th>
            <SortHeader label="Occupancy" field="occupancyPct" />
            <SortHeader label="Monthly Rent" field="monthlyRent" />
            <SortHeader label="Current Value" field="current_value" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {sorted.map(row => (
            <tr key={row.id} className="hover:bg-gray-800/30">
              <td className="px-3 py-2 font-medium text-white">{row.name}</td>
              <td className="px-3 py-2 text-gray-400">{row.city}</td>
              <td className="px-3 py-2 text-gray-400">{row.state}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-300">{row.property_type}</span>
              </td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">{row.total_sqft?.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">{row.totalSpaces}</td>
              <td className="px-3 py-2 text-gray-400 tabular-nums">{row.occupied} / {row.vacant}</td>
              <td className={`px-3 py-2 font-medium tabular-nums ${occupancyColor(row.occupancyPct)}`}>
                {row.occupancyPct.toFixed(0)}%
              </td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">${row.monthlyRent.toLocaleString()}</td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">${row.current_value?.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
