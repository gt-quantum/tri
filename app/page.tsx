'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserInfo {
  email: string
  fullName: string
  role: string
  orgId: string
}

export default function Home() {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [user, setUser] = useState<UserInfo | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    properties: number
    tenants: number
    leases: number
    spaces: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

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

      // Fetch org name and stats
      const headers = { Authorization: `Bearer ${session.access_token}` }

      try {
        const [propsRes, tenantsRes, leasesRes, spacesRes] = await Promise.all([
          fetch('/api/v1/properties?limit=1', { headers }),
          fetch('/api/v1/tenants?limit=1', { headers }),
          fetch('/api/v1/leases?limit=1', { headers }),
          fetch('/api/v1/spaces?limit=1', { headers }),
        ])

        const [propsData, tenantsData, leasesData, spacesData] =
          await Promise.all([
            propsRes.ok ? propsRes.json() : null,
            tenantsRes.ok ? tenantsRes.json() : null,
            leasesRes.ok ? leasesRes.json() : null,
            spacesRes.ok ? spacesRes.json() : null,
          ])

        setStats({
          properties: propsData?.meta?.total ?? 0,
          tenants: tenantsData?.meta?.total ?? 0,
          leases: leasesData?.meta?.total ?? 0,
          spaces: spacesData?.meta?.total ?? 0,
        })

        // Get org name from first property's portfolio or direct query
        if (propsData?.data?.[0]) {
          // We have data — try to get org name from schema endpoint
          const schemaRes = await fetch('/api/v1/schema', { headers })
          if (schemaRes.ok) {
            const schema = await schemaRes.json()
            setOrgName(schema.data?.organization?.name || null)
          }
        }
      } catch {
        // Stats failed — still show page
      }

      setLoading(false)
    }

    load()
  }, [supabase, router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-warm-300 font-body text-sm animate-fade-in">
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Top Nav */}
      <header className="border-b border-brass-faint">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-lg text-warm-white tracking-wide">
              TRI Platform
            </h1>
            {orgName && (
              <>
                <div className="w-px h-5 bg-brass-faint" />
                <span className="font-body text-sm text-warm-300">
                  {orgName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/settings/team"
              className="font-body text-sm text-warm-300 hover:text-warm-white transition-colors"
            >
              Team
            </a>
            <a
              href="/api/v1/docs"
              className="font-body text-sm text-warm-300 hover:text-warm-white transition-colors"
            >
              API Docs
            </a>
            <div className="w-px h-5 bg-brass-faint" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-body text-sm text-warm-white">
                  {user?.fullName}
                </div>
                <div className="font-body text-[11px] text-warm-300">
                  {user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-brass-faint text-warm-300 font-body text-xs
                  hover:border-brass/20 hover:text-warm-white transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="font-display text-2xl text-warm-white tracking-wide mb-2">
            Dashboard
          </h2>
          <p className="font-body text-warm-300 text-sm">
            Welcome back, {user?.fullName}
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Properties" value={stats.properties} />
            <StatCard label="Spaces" value={stats.spaces} />
            <StatCard label="Tenants" value={stats.tenants} />
            <StatCard label="Active Leases" value={stats.leases} />
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            title="Properties"
            description="View and manage your property portfolio"
            href="/api/v1/properties"
            apiLink
          />
          <QuickAction
            title="Tenants"
            description="Manage tenant relationships"
            href="/api/v1/tenants"
            apiLink
          />
          <QuickAction
            title="Team Settings"
            description="Manage users and invitations"
            href="/settings/team"
          />
        </div>

        {/* API Info */}
        <div className="mt-12 card-surface p-6">
          <h3 className="font-display text-lg text-warm-white mb-3">
            API Access
          </h3>
          <p className="font-body text-sm text-warm-300 mb-4">
            All data is accessible via the REST API. The interactive
            documentation includes every endpoint, schema, and example.
          </p>
          <div className="flex gap-3">
            <a
              href="/api/v1/docs"
              className="px-4 py-2 rounded-lg bg-brass/10 border border-brass-faint text-brass font-body text-sm
                hover:bg-brass/15 hover:border-brass/20 transition-colors"
            >
              API Documentation
            </a>
            <a
              href="/api/v1/schema"
              className="px-4 py-2 rounded-lg border border-brass-faint text-warm-300 font-body text-sm
                hover:border-brass/20 hover:text-warm-white transition-colors"
            >
              Schema Discovery
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-surface p-4">
      <div className="font-body text-[11px] uppercase tracking-[0.12em] text-warm-300 mb-1">
        {label}
      </div>
      <div className="font-display text-2xl text-warm-white tabular">
        {value}
      </div>
    </div>
  )
}

function QuickAction({
  title,
  description,
  href,
  apiLink,
}: {
  title: string
  description: string
  href: string
  apiLink?: boolean
}) {
  return (
    <a
      href={href}
      target={apiLink ? '_blank' : undefined}
      className="card-surface-hover p-5 block"
    >
      <h4 className="font-body text-sm font-semibold text-warm-white mb-1">
        {title}
      </h4>
      <p className="font-body text-xs text-warm-300">{description}</p>
    </a>
  )
}
