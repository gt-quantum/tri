'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useDashboardData } from '@/lib/use-dashboard-data'
import { useAuth } from '@/lib/auth-context'
import SummaryCards from '@/components/dashboard/SummaryCards'
import LeaseExpirationChart from '@/components/dashboard/LeaseExpirationChart'
import RevenueConcentration from '@/components/dashboard/RevenueConcentration'
import RentRollProjection from '@/components/dashboard/RentRollProjection'
import PropertiesTable from '@/components/dashboard/PropertiesTable'
import TenantOverview from '@/components/dashboard/TenantOverview'
import LeaseTimeline from '@/components/dashboard/LeaseTimeline'
import VacancyView from '@/components/dashboard/VacancyView'
import { BarChart3, Table } from 'lucide-react'

const PropertyMap = dynamic(() => import('@/components/dashboard/PropertyMap'), {
  ssr: false,
  loading: () => <div className="card-surface rounded-lg" style={{ height: '420px' }} />,
})

const TABS = [
  { key: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { key: 'data', label: 'Data', Icon: Table },
]

export default function Home() {
  const { data, loading, error } = useDashboardData()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('analytics')

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
        <p className="font-body text-warm-300 text-sm tracking-wide">Loading portfolio data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="card-surface max-w-md p-8 text-center">
          <h2 className="font-display text-lg text-warm-white mb-2">Connection Failed</h2>
          <p className="text-warm-300 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const orgName = user?.orgName || ''
  const portfolioName = data.portfolios?.[0]?.name || ''

  return (
    <div>
      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <div className="mb-1">
          <h2 className="font-display text-3xl text-warm-white tracking-wide">
            {orgName || 'Portfolio'}
          </h2>
        </div>
        {portfolioName && (
          <p className="font-body text-warm-200 text-sm tracking-wide">{portfolioName} Overview</p>
        )}
      </header>

      {/* Summary Cards */}
      <div className="animate-fade-up stagger-1">
        <SummaryCards data={data} />
      </div>

      {/* Tab Navigation */}
      <div className="mt-10 mb-8 animate-fade-up stagger-2">
        <div className="flex items-center gap-1 border-b border-brass-faint">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-body font-medium tracking-wide transition-all relative ${
                activeTab === tab.key ? 'text-brass' : 'text-warm-400 hover:text-warm-200'
              }`}
            >
              <tab.Icon size={16} strokeWidth={1.5} />
              {tab.label}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-px bg-brass" />}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-12 animate-fade-up">
          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Lease Expiration Risk</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">24-month outlook</span>
            </div>
            <LeaseExpirationChart data={data} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Tenant Diversification</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">
                {data.leases.filter((l: any) => l.status === 'active').length} active leases
              </span>
            </div>
            <RevenueConcentration data={data} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Revenue Forecast</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">18-month projection</span>
            </div>
            <RentRollProjection data={data} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Portfolio Map</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">
                {data.properties.filter((p: any) => p.lat && p.lng).length} locations
              </span>
            </div>
            <PropertyMap data={data} />
          </section>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === 'data' && (
        <div className="space-y-12 animate-fade-up">
          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Properties</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">{data.properties.length} assets</span>
            </div>
            <PropertiesTable data={data} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Tenants</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">{data.tenants.length} companies</span>
            </div>
            <TenantOverview data={data} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Lease Expirations</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">{data.leases.length} leases</span>
            </div>
            <LeaseTimeline data={data} />
          </section>

          <section>
            <div className="flex items-center gap-4 mb-5">
              <h2 className="section-heading">Vacancies</h2>
              <div className="flex-1 brass-line" />
              <span className="text-warm-300 text-[13px] font-body tabular">
                {data.spaces.filter((s: any) => s.status === 'vacant').length} open
              </span>
            </div>
            <VacancyView data={data} />
          </section>
        </div>
      )}
    </div>
  )
}
