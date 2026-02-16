'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { PortfolioData } from '@/lib/use-dashboard-data'

export default function VacancyView({ data }: { data: PortfolioData }) {
  const { spaces, properties, leases, tenants } = data

  const vacantByProperty = useMemo(() => {
    const vacantSpaces = spaces
      .filter((s: any) => s.status === 'vacant')
      .map((s: any) => {
        const property = properties.find((p: any) => p.id === s.property_id)
        const negotiationLease = leases.find(
          (l: any) => l.space_id === s.id && l.status === 'under_negotiation'
        )
        const tenant = negotiationLease
          ? tenants.find((t: any) => t.id === negotiationLease.tenant_id)
          : null

        return {
          id: s.id,
          propertyId: property?.id,
          propertyName: property?.name || '',
          propertyCity: property?.city || '',
          spaceName: s.name,
          floor: s.floor,
          sqft: s.sqft,
          spaceType: s.space_type,
          negotiation: negotiationLease
            ? {
                tenantId: tenant?.id,
                tenant: tenant?.company_name || 'Unknown',
                monthlyRent: negotiationLease.monthly_rent,
                startDate: negotiationLease.start_date,
              }
            : null,
        }
      })

    const grouped: Record<string, any> = {}
    vacantSpaces.forEach((s: any) => {
      if (!grouped[s.propertyId]) {
        grouped[s.propertyId] = { name: s.propertyName, city: s.propertyCity, spaces: [], totalSqft: 0 }
      }
      grouped[s.propertyId].spaces.push(s)
      grouped[s.propertyId].totalSqft += s.sqft || 0
    })

    return Object.entries(grouped)
      .map(([id, group]: [string, any]) => ({ id, ...group }))
      .sort((a: any, b: any) => b.totalSqft - a.totalSqft)
  }, [spaces, properties, leases, tenants])

  const totalVacant = vacantByProperty.reduce((sum: number, p: any) => sum + p.spaces.length, 0)
  const totalSqft = vacantByProperty.reduce((sum: number, p: any) => sum + p.totalSqft, 0)
  const underNeg = vacantByProperty.reduce(
    (sum: number, p: any) => sum + p.spaces.filter((s: any) => s.negotiation).length,
    0
  )

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-400/60" />
          <span className="text-warm-300 text-xs font-body">
            <span className="text-warm-white font-medium tabular">{totalVacant - underNeg}</span> available
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400/60" />
          <span className="text-warm-300 text-xs font-body">
            <span className="text-warm-white font-medium tabular">{underNeg}</span> in negotiation
          </span>
        </div>
        <div className="text-warm-500 text-xs font-body">
          <span className="text-warm-300 tabular">{totalSqft.toLocaleString()}</span> sqft total
        </div>
      </div>

      {/* Grouped cards */}
      <div className="grid gap-3">
        {vacantByProperty.map((group: any) => (
          <div key={group.id} className="card-surface overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-brass-faint">
              <div>
                <Link
                  href={`/properties/${group.id}`}
                  className="font-body font-semibold text-warm-white text-sm hover:text-brass transition-colors"
                >
                  {group.name}
                </Link>
                <span className="text-warm-400 text-xs ml-2">{group.city}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-warm-300 text-[11px] font-body tabular">{group.spaces.length} vacant</span>
                <span className="text-warm-500 text-[11px]">·</span>
                <span className="text-warm-300 text-[11px] font-body tabular">
                  {group.totalSqft.toLocaleString()} sqft
                </span>
              </div>
            </div>

            <div className="divide-y divide-obsidian-700/40">
              {group.spaces
                .sort((a: any, b: any) => (b.sqft || 0) - (a.sqft || 0))
                .map((space: any) => (
                  <div
                    key={space.id}
                    className="flex items-center gap-4 px-5 py-2.5 hover:bg-brass-faint/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-warm-white text-sm font-body font-medium">{space.spaceName}</span>
                        <span className="badge bg-obsidian-700 text-warm-300 border border-obsidian-600 text-[9px]">
                          {space.spaceType}
                        </span>
                      </div>
                      {space.negotiation && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="badge bg-blue-400/10 text-blue-400 border border-blue-400/20 text-[9px]">
                            negotiating
                          </span>
                          {space.negotiation.tenantId ? (
                            <Link
                              href={`/tenants/${space.negotiation.tenantId}`}
                              className="text-warm-300 text-[11px] font-body hover:text-brass transition-colors"
                            >
                              {space.negotiation.tenant}
                            </Link>
                          ) : (
                            <span className="text-warm-300 text-[11px] font-body">{space.negotiation.tenant}</span>
                          )}
                          <span className="text-warm-500 text-[11px]">·</span>
                          <span className="text-warm-300 text-[11px] font-body tabular">
                            ${space.negotiation.monthlyRent?.toLocaleString()}/mo
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-warm-100 text-sm font-body tabular">{space.sqft?.toLocaleString()} sqft</div>
                      <div className="text-warm-500 text-[11px] font-body">Floor {space.floor}</div>
                    </div>
                    {!space.negotiation && <div className="w-2 h-2 rounded-full bg-red-400/40 shrink-0" />}
                    {space.negotiation && (
                      <div className="w-2 h-2 rounded-full bg-blue-400/50 animate-glow-pulse shrink-0" />
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
