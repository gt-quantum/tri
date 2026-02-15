export default function SummaryCards({ data }) {
  const { properties, spaces, leases } = data

  const totalProperties = properties.length
  const totalSpaces = spaces.length
  const occupiedSpaces = spaces.filter(s => s.status === 'occupied').length
  const occupancyRate = totalSpaces > 0 ? ((occupiedSpaces / totalSpaces) * 100).toFixed(1) : 0

  const activeLeases = leases.filter(l => l.status === 'active')
  const totalMonthlyRevenue = activeLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)

  const today = new Date()
  const activeLeasesWithRemaining = activeLeases
    .filter(l => l.end_date && new Date(l.end_date) > today)
    .map(l => {
      const end = new Date(l.end_date)
      const diffMs = end - today
      return diffMs / (1000 * 60 * 60 * 24 * 30.44) // months
    })
  const avgMonthsRemaining = activeLeasesWithRemaining.length > 0
    ? activeLeasesWithRemaining.reduce((a, b) => a + b, 0) / activeLeasesWithRemaining.length
    : 0
  const avgYears = (avgMonthsRemaining / 12).toFixed(1)

  const cards = [
    { label: 'Total Properties', value: totalProperties, sub: `${totalSpaces} spaces` },
    { label: 'Total Spaces', value: totalSpaces, sub: `${occupiedSpaces} occupied` },
    { label: 'Occupancy Rate', value: `${occupancyRate}%`, sub: `${totalSpaces - occupiedSpaces} vacant`, color: occupancyRate >= 85 ? 'text-emerald-400' : occupancyRate >= 70 ? 'text-yellow-400' : 'text-red-400' },
    { label: 'Monthly Revenue', value: `$${totalMonthlyRevenue.toLocaleString()}`, sub: `${activeLeases.length} active leases` },
    { label: 'Avg Lease Remaining', value: `${avgYears} yrs`, sub: `${avgMonthsRemaining.toFixed(0)} months` },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color || 'text-white'}`}>{card.value}</div>
          <div className="text-gray-600 text-xs mt-1">{card.sub}</div>
        </div>
      ))}
    </div>
  )
}
