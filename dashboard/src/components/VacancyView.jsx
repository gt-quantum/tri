import { useMemo } from 'react'

export default function VacancyView({ data }) {
  const { spaces, properties, leases, tenants } = data

  const vacantSpaces = useMemo(() => {
    return spaces
      .filter(s => s.status === 'vacant')
      .map(s => {
        const property = properties.find(p => p.id === s.property_id)
        const negotiationLease = leases.find(
          l => l.space_id === s.id && l.status === 'under_negotiation'
        )
        const tenant = negotiationLease
          ? tenants.find(t => t.id === negotiationLease.tenant_id)
          : null

        return {
          id: s.id,
          propertyName: property?.name || '',
          propertyCity: property?.city || '',
          spaceName: s.name,
          floor: s.floor,
          sqft: s.sqft,
          spaceType: s.space_type,
          negotiation: negotiationLease
            ? {
                tenant: tenant?.company_name || 'Unknown',
                monthlyRent: negotiationLease.monthly_rent,
                startDate: negotiationLease.start_date,
              }
            : null,
        }
      })
      .sort((a, b) => (b.sqft || 0) - (a.sqft || 0))
  }, [spaces, properties, leases, tenants])

  return (
    <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-lg">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sqft</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {vacantSpaces.map(row => (
            <tr key={row.id} className="hover:bg-gray-800/30">
              <td className="px-3 py-2">
                <div className="text-white font-medium">{row.propertyName}</div>
                <div className="text-gray-600 text-xs">{row.propertyCity}</div>
              </td>
              <td className="px-3 py-2 text-gray-300">{row.spaceName}</td>
              <td className="px-3 py-2 text-gray-400">{row.floor}</td>
              <td className="px-3 py-2 text-gray-300 tabular-nums">{row.sqft?.toLocaleString()}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-400">{row.spaceType}</span>
              </td>
              <td className="px-3 py-2">
                {row.negotiation ? (
                  <div>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-900/50 text-blue-400">Under Negotiation</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {row.negotiation.tenant} · ${row.negotiation.monthlyRent?.toLocaleString()}/mo · starts {row.negotiation.startDate}
                    </div>
                  </div>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-400">Vacant</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-xs text-gray-600 border-t border-gray-800">
        {vacantSpaces.length} vacant spaces · {vacantSpaces.reduce((sum, s) => sum + (s.sqft || 0), 0).toLocaleString()} total sqft
      </div>
    </div>
  )
}
