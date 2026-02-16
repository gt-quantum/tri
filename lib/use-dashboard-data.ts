'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'

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

/** Cache TTL in ms — skip refetch if data is less than 60s old */
const CACHE_TTL = 60_000

export function useDashboardData(portfolioId?: string | null) {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [data, setData] = useState<PortfolioData | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cache tracking
  const cacheRef = useRef<{ portfolioId: string | null; timestamp: number }>({
    portfolioId: undefined as unknown as string | null,
    timestamp: 0,
  })

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  useEffect(() => {
    async function load() {
      // Skip if data is fresh and portfolio hasn't changed
      const now = Date.now()
      if (
        data &&
        cacheRef.current.portfolioId === (portfolioId ?? null) &&
        now - cacheRef.current.timestamp < CACHE_TTL
      ) {
        return
      }

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

      // Build portfolio-filtered URLs
      const portfolioParam = portfolioId ? `&portfolio_id=${portfolioId}` : ''

      try {
        const [propsRes, spacesRes, tenantsRes, leasesRes, portfoliosRes, schemaRes] =
          await Promise.all([
            fetch(`/api/v1/properties?limit=100${portfolioParam}`, { headers }),
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

        const newData = {
          organization: name ? { name } : null,
          portfolios: portfoliosData?.data || [],
          properties: propsData?.data || [],
          spaces: spacesData?.data || [],
          tenants: tenantsData?.data || [],
          leases: leasesData?.data || [],
        }

        // Client-side portfolio filtering for spaces and leases
        // (these endpoints don't have direct portfolio_id filters,
        //  so we filter by the property IDs in the selected portfolio)
        if (portfolioId && propsData?.data) {
          const propertyIds = new Set((propsData.data as any[]).map((p: any) => p.id))
          newData.spaces = (spacesData?.data || []).filter((s: any) => propertyIds.has(s.property_id))
          newData.leases = (leasesData?.data || []).filter((l: any) => propertyIds.has(l.property_id))
        }

        setData(newData)
        cacheRef.current = { portfolioId: portfolioId ?? null, timestamp: Date.now() }
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      }

      setLoading(false)
    }

    load()
  }, [supabase, router, portfolioId])

  return { data, user, orgName, loading, error, logout }
}
