'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

/**
 * Fetch a single entity from the API by ID.
 * Uses the auth token from AuthProvider.
 */
export function useEntityDetail<T = Record<string, unknown>>(
  endpoint: string,
  id: string
) {
  const { getToken } = useAuth()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchIdRef = useRef(0)

  useEffect(() => {
    const currentFetch = ++fetchIdRef.current

    async function load() {
      setLoading(true)
      setError(null)

      const token = await getToken()
      if (!token) return

      try {
        const res = await fetch(`/api/v1/${endpoint}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        // Discard stale responses
        if (currentFetch !== fetchIdRef.current) return

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          setError(err?.error?.message || `Failed to load ${endpoint}`)
          setData(null)
        } else {
          const json = await res.json()
          setData(json.data as T)
        }
      } catch (err: unknown) {
        if (currentFetch !== fetchIdRef.current) return
        setError(err instanceof Error ? err.message : 'Network error')
      }

      setLoading(false)
    }

    load()
  }, [getToken, endpoint, id])

  return { data, loading, error }
}
