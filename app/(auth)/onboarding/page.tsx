'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface PicklistItem {
  value: string
  display_label: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('')
  const [industry, setIndustry] = useState('')
  const [orgTypes, setOrgTypes] = useState<PicklistItem[]>([])
  const [industries, setIndustries] = useState<PicklistItem[]>([])

  // Verify user is authenticated
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // If user already has an org, redirect to dashboard
      if (user.app_metadata?.org_id) {
        router.push('/')
        return
      }

      setLoading(false)
    }
    checkAuth()
  }, [supabase, router])

  // Fetch picklist values for dropdowns
  useEffect(() => {
    async function fetchPicklists() {
      try {
        // Fetch org types and industries from picklists API
        // These are public system picklists — but the API requires auth.
        // We'll use the supabase client directly for these system values.
        const { data: orgTypeData } = await supabase
          .from('picklist_definitions')
          .select('value, display_label')
          .eq('entity_type', 'organization')
          .eq('field_name', 'org_type')
          .is('org_id', null)
          .eq('is_active', true)
          .order('sort_order')

        const { data: industryData } = await supabase
          .from('picklist_definitions')
          .select('value, display_label')
          .eq('entity_type', 'organization')
          .eq('field_name', 'industry')
          .is('org_id', null)
          .eq('is_active', true)
          .order('sort_order')

        if (orgTypeData) setOrgTypes(orgTypeData)
        if (industryData) setIndustries(industryData)
      } catch {
        // Picklists failed to load — user can still type
      }
    }
    fetchPicklists()
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const res = await fetch('/api/v1/auth/create-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: orgName,
          org_type: orgType || undefined,
          industry: industry || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to create organization')
      }

      // Refresh the session to get updated JWT with org_id
      await supabase.auth.refreshSession()

      // Redirect to dashboard
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-warm-300 font-body text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brass/40 to-transparent mb-6" />
          <h1 className="font-display text-2xl text-warm-white tracking-wide mb-2">
            Create Your Organization
          </h1>
          <p className="font-body text-warm-300 text-sm">
            Set up your workspace to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="card-surface p-6 space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body">
                {error}
              </div>
            )}

            {/* Org Name */}
            <div>
              <label
                htmlFor="orgName"
                className="block font-body text-sm text-warm-200 mb-1.5"
              >
                Organization Name <span className="text-brass">*</span>
              </label>
              <input
                id="orgName"
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Apex Capital Partners"
                className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint
                  text-warm-white font-body text-sm placeholder:text-warm-400
                  focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20
                  transition-colors"
              />
            </div>

            {/* Org Type */}
            <div>
              <label
                htmlFor="orgType"
                className="block font-body text-sm text-warm-200 mb-1.5"
              >
                Organization Type <span className="text-brass">*</span>
              </label>
              <select
                id="orgType"
                required
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint
                  text-warm-white font-body text-sm
                  focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20
                  transition-colors"
              >
                <option value="">Select type...</option>
                {orgTypes.length > 0 ? (
                  orgTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.display_label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="reit">REIT</option>
                    <option value="property_manager">Property Manager</option>
                    <option value="owner">Property Owner</option>
                    <option value="firm">Commercial RE Firm</option>
                  </>
                )}
              </select>
            </div>

            {/* Industry (optional) */}
            <div>
              <label
                htmlFor="industry"
                className="block font-body text-sm text-warm-200 mb-1.5"
              >
                Industry{' '}
                <span className="text-warm-400 text-xs">(optional)</span>
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint
                  text-warm-white font-body text-sm
                  focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20
                  transition-colors"
              >
                <option value="">Select industry...</option>
                {industries.length > 0 ? (
                  industries.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.display_label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="commercial_real_estate">
                      Commercial Real Estate
                    </option>
                    <option value="residential">Residential</option>
                    <option value="mixed_use">Mixed Use</option>
                  </>
                )}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !orgName.trim() || !orgType}
              className="w-full py-2.5 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm
                hover:bg-brass-light transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>

        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brass/40 to-transparent mt-8" />
      </div>
    </div>
  )
}
