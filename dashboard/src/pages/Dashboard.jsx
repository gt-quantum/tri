import SummaryCards from '../components/SummaryCards'
import LeaseExpirationChart from '../components/LeaseExpirationChart'
import RevenueConcentration from '../components/RevenueConcentration'
import RentRollProjection from '../components/RentRollProjection'
import PropertyMap from '../components/PropertyMap'
import PropertiesTable from '../components/PropertiesTable'
import TenantOverview from '../components/TenantOverview'
import LeaseTimeline from '../components/LeaseTimeline'
import VacancyView from '../components/VacancyView'

export default function Dashboard({ data }) {
  const orgName = data.organization?.name || 'Portfolio'
  const portfolioName = data.portfolios?.[0]?.name || ''

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

        {/* Summary Cards */}
        <div className="animate-fade-up stagger-1">
          <SummaryCards data={data} />
        </div>

        {/* Lease Expiration Risk */}
        <section className="mt-12 animate-fade-up stagger-2">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Lease Expiration Risk</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">24-month outlook</span>
          </div>
          <LeaseExpirationChart data={data} />
        </section>

        {/* Revenue Concentration */}
        <section className="mt-12 animate-fade-up stagger-3">
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
        <section className="mt-12 animate-fade-up stagger-4">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Revenue Forecast</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">18-month projection</span>
          </div>
          <RentRollProjection data={data} />
        </section>

        {/* Portfolio Map */}
        <section className="mt-12 animate-fade-up stagger-5">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Portfolio Map</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.properties.filter(p => p.lat && p.lng).length} locations</span>
          </div>
          <PropertyMap data={data} />
        </section>

        {/* Properties */}
        <section className="mt-12 animate-fade-up stagger-6">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Properties</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.properties.length} assets</span>
          </div>
          <PropertiesTable data={data} />
        </section>

        {/* Tenants */}
        <section className="mt-12 animate-fade-up stagger-7">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Tenants</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.tenants.length} companies</span>
          </div>
          <TenantOverview data={data} />
        </section>

        {/* Lease Timeline */}
        <section className="mt-12 animate-fade-up stagger-8">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Lease Expirations</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.leases.length} leases</span>
          </div>
          <LeaseTimeline data={data} />
        </section>

        {/* Vacancy View */}
        <section className="mt-12 mb-16 animate-fade-up stagger-6">
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

      {/* Bottom accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/20 to-transparent" />
      <div className="text-center py-6">
        <p className="text-warm-500 text-[10px] font-body uppercase tracking-[0.2em]">{orgName} &middot; Portfolio Intelligence</p>
      </div>
    </div>
  )
}
