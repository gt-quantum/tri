import { useState } from 'react'
import SummaryCards from '../components/SummaryCards'
import LeaseExpirationChart from '../components/LeaseExpirationChart'
import RevenueConcentration from '../components/RevenueConcentration'
import RentRollProjection from '../components/RentRollProjection'
import PropertyMap from '../components/PropertyMap'
import PropertiesTable from '../components/PropertiesTable'
import TenantOverview from '../components/TenantOverview'
import LeaseTimeline from '../components/LeaseTimeline'
import VacancyView from '../components/VacancyView'

const TABS = [
  { key: 'analytics', label: 'Analytics', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { key: 'data', label: 'Data', icon: 'M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c0 .621.504 1.125 1.125 1.125m0-1.5c.621 0 1.125.504 1.125 1.125m-3.375 1.5c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m2.625-2.625c0 .621.504 1.125 1.125 1.125' },
]

export default function Dashboard({ data }) {
  const orgName = data.organization?.name || 'Portfolio'
  const portfolioName = data.portfolios?.[0]?.name || ''
  const [activeTab, setActiveTab] = useState('analytics')

  return (
    <div className="min-h-screen">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        {/* Header */}
        <header className="mb-10 animate-fade-up">
          <div className="mb-1">
            <h1 className="font-display text-3xl text-warm-white tracking-wide">{orgName}</h1>
          </div>
          {portfolioName && (
            <p className="font-body text-warm-300 text-sm tracking-wide">{portfolioName} Overview</p>
          )}
        </header>

        {/* Summary Cards — always visible */}
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
                  activeTab === tab.key
                    ? 'text-brass'
                    : 'text-warm-400 hover:text-warm-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-brass" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-12 animate-fade-up">
            {/* Lease Expiration Risk */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Lease Expiration Risk</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">24-month outlook</span>
              </div>
              <LeaseExpirationChart data={data} />
            </section>

            {/* Revenue Concentration */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Tenant Diversification</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">
                  {data.leases.filter(l => l.status === 'active').length} active leases
                </span>
              </div>
              <RevenueConcentration data={data} />
            </section>

            {/* Rent Roll Projection */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Revenue Forecast</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">18-month projection</span>
              </div>
              <RentRollProjection data={data} />
            </section>

            {/* Portfolio Map */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Portfolio Map</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">{data.properties.filter(p => p.lat && p.lng).length} locations</span>
              </div>
              <PropertyMap data={data} />
            </section>
          </div>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <div className="space-y-12 animate-fade-up">
            {/* Properties */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Properties</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">{data.properties.length} assets</span>
              </div>
              <PropertiesTable data={data} />
            </section>

            {/* Tenants */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Tenants</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">{data.tenants.length} companies</span>
              </div>
              <TenantOverview data={data} />
            </section>

            {/* Lease Timeline */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Lease Expirations</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">{data.leases.length} leases</span>
              </div>
              <LeaseTimeline data={data} />
            </section>

            {/* Vacancy View */}
            <section>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="section-heading">Vacancies</h2>
                <div className="flex-1 brass-line" />
                <span className="text-warm-400 text-xs font-body tabular">
                  {data.spaces.filter(s => s.status === 'vacant').length} open
                </span>
              </div>
              <VacancyView data={data} />
            </section>
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-16" />
      </div>

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/20 to-transparent" />
      <div className="text-center py-6">
        <p className="text-warm-500 text-[10px] font-body uppercase tracking-[0.2em]">{orgName} &middot; Portfolio Intelligence</p>
      </div>
    </div>
  )
}
