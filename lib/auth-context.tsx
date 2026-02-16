'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'manager' | 'viewer'
  orgId: string
  orgName: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  logout: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  getToken: async () => null,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }, [supabase, router])

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [supabase])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()

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

      let orgName: string | null = null
      try {
        const res = await fetch('/api/v1/schema', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          orgName = data?.data?.organization?.name || null
        }
      } catch {
        // Org name fetch failed — non-critical
      }

      setUser({
        id: u.id,
        email: u.email!,
        fullName: u.user_metadata?.full_name || u.user_metadata?.name || u.email!,
        role: (u.app_metadata?.role as 'admin' | 'manager' | 'viewer') || 'viewer',
        orgId,
        orgName,
      })

      setLoading(false)
    }

    load()
  }, [supabase, router])

  return (
    <AuthContext.Provider value={{ user, loading, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}
