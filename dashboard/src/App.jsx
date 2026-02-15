import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import PropertyDetail from './pages/PropertyDetail'
import TenantDetail from './pages/TenantDetail'

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
    <Routes>
      <Route path="/" element={<Dashboard data={data} />} />
      <Route path="/property/:id" element={<PropertyDetail data={data} />} />
      <Route path="/tenant/:id" element={<TenantDetail data={data} />} />
    </Routes>
  )
}
