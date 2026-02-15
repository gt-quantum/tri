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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-lg">
          <h2 className="text-red-400 font-semibold mb-2">Connection Error</h2>
          <p className="text-red-300 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-3">Check your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_KEY set.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 max-w-[1400px] mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white">Apex Capital Partners</h1>
        <p className="text-gray-500 text-sm">Southeast Commercial Portfolio Dashboard</p>
      </header>

      <SummaryCards data={data} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Properties</h2>
        <PropertiesTable data={data} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Tenants</h2>
        <TenantOverview data={data} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white mb-4">Lease Timeline</h2>
        <LeaseTimeline data={data} />
      </div>

      <div className="mt-8 mb-12">
        <h2 className="text-lg font-semibold text-white mb-4">Vacant Spaces</h2>
        <VacancyView data={data} />
      </div>
    </div>
  )
}
