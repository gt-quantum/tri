import SummaryCards from '../components/SummaryCards'
import PropertiesTable from '../components/PropertiesTable'
import TenantOverview from '../components/TenantOverview'
import LeaseTimeline from '../components/LeaseTimeline'
import VacancyView from '../components/VacancyView'

export default function Dashboard({ data }) {
  return (
    <div className="min-h-screen">
      {/* Top accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-brass/40 to-transparent" />

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
        {/* Header */}
        <header className="mb-10 animate-fade-up">
          <div className="flex items-baseline gap-4 mb-1">
            <h1 className="font-display text-3xl text-warm-white tracking-wide">Apex Capital Partners</h1>
            <span className="badge bg-brass/10 text-brass border border-brass/20">REIT</span>
          </div>
          <p className="font-body text-warm-300 text-sm tracking-wide">Southeast Commercial Portfolio Overview</p>
        </header>

        {/* Summary Cards */}
        <div className="animate-fade-up stagger-1">
          <SummaryCards data={data} />
        </div>

        {/* Properties */}
        <section className="mt-12 animate-fade-up stagger-2">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Properties</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.properties.length} assets</span>
          </div>
          <PropertiesTable data={data} />
        </section>

        {/* Tenants */}
        <section className="mt-12 animate-fade-up stagger-3">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Tenants</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.tenants.length} companies</span>
          </div>
          <TenantOverview data={data} />
        </section>

        {/* Lease Timeline */}
        <section className="mt-12 animate-fade-up stagger-4">
          <div className="flex items-center gap-4 mb-5">
            <h2 className="section-heading">Lease Expirations</h2>
            <div className="flex-1 brass-line" />
            <span className="text-warm-400 text-xs font-body tabular">{data.leases.length} leases</span>
          </div>
          <LeaseTimeline data={data} />
        </section>

        {/* Vacancy View */}
        <section className="mt-12 mb-16 animate-fade-up stagger-5">
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
        <p className="text-warm-500 text-[10px] font-body uppercase tracking-[0.2em]">Apex Capital Partners &middot; Portfolio Intelligence</p>
      </div>
    </div>
  )
}
