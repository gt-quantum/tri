import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import SummaryCards from './components/SummaryCards'
import PropertiesTable from './components/PropertiesTable'
import TenantOverview from './components/TenantOverview'
import LeaseTimeline from './components/LeaseTimeline'
import VacancyView from './components/VacancyView'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [properties, spaces, tenants, leases] = await Promise.all([
          supabase.from('properties').select('*').is('deleted_at', null),
          supabase.from('spaces').select('*').is('deleted_at', null),
          supabase.from('tenants').select('*').is('deleted_at', null),
          supabase.from('leases').select('*').is('deleted_at', null),
        ])

        if (properties.error) throw properties.error
        if (spaces.error) throw spaces.error
        if (tenants.error) throw tenants.error
        if (leases.error) throw leases.error

        setData({
          properties: properties.data,
          spaces: spaces.data,
          tenants: tenants.data,
          leases: leases.data,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
        <p className="font-body text-warm-300 text-sm tracking-wide">Loading portfolio data...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card-surface max-w-md p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="font-display text-lg text-warm-white mb-2">Connection Failed</h2>
          <p className="text-warm-300 text-sm mb-4">{error}</p>
          <p className="text-warm-400 text-xs">Verify <code className="text-brass/80 bg-brass-faint px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> and <code className="text-brass/80 bg-brass-faint px-1.5 py-0.5 rounded">VITE_SUPABASE_KEY</code> in your .env file.</p>
        </div>
      </div>
    )
  }

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
