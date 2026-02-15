'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PortfolioData {
  organization: any
  portfolios: any[]
  properties: any[]
  spaces: any[]
  tenants: any[]
  leases: any[]
}

export interface UserInfo {
  email: string
  fullName: string
  role: string
  orgId: string
}

export function useDashboardData() {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [data, setData] = useState<PortfolioData | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const u = session.user
      const orgId = u.app_metadata?.org_id

      if (!orgId) {
        router.push('/onboarding')
        return
      }

      setUser({
        email: u.email!,
        fullName:
          u.user_metadata?.full_name || u.user_metadata?.name || u.email!,
        role: u.app_metadata?.role || 'viewer',
        orgId,
      })

      const headers = { Authorization: `Bearer ${session.access_token}` }

      try {
        const [propsRes, spacesRes, tenantsRes, leasesRes, portfoliosRes, schemaRes] =
          await Promise.all([
            fetch('/api/v1/properties?limit=100', { headers }),
            fetch('/api/v1/spaces?limit=100', { headers }),
            fetch('/api/v1/tenants?limit=100', { headers }),
            fetch('/api/v1/leases?limit=100', { headers }),
            fetch('/api/v1/portfolios?limit=100', { headers }),
            fetch('/api/v1/schema', { headers }),
          ])

        const [propsData, spacesData, tenantsData, leasesData, portfoliosData, schemaData] =
          await Promise.all([
            propsRes.ok ? propsRes.json() : null,
            spacesRes.ok ? spacesRes.json() : null,
            tenantsRes.ok ? tenantsRes.json() : null,
            leasesRes.ok ? leasesRes.json() : null,
            portfoliosRes.ok ? portfoliosRes.json() : null,
            schemaRes.ok ? schemaRes.json() : null,
          ])

        const name = schemaData?.data?.organization?.name || null
        setOrgName(name)

        setData({
          organization: name ? { name } : null,
          portfolios: portfoliosData?.data || [],
          properties: propsData?.data || [],
          spaces: spacesData?.data || [],
          tenants: tenantsData?.data || [],
          leases: leasesData?.data || [],
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      }

      setLoading(false)
    }

    load()
  }, [supabase, router])

  return { data, user, orgName, loading, error, logout }
}
