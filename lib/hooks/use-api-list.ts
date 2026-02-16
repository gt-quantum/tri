'use client'

import { useAuth } from '@/lib/auth-context'
import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiListOptions {
  endpoint: string
  params: Record<string, string>
}

interface UseApiListResult<T> {
  data: T[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useApiList<T = Record<string, unknown>>(
  options: UseApiListOptions
): UseApiListResult<T> {
  const { getToken } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchId = useRef(0)

  const serializedParams = JSON.stringify(options.params)
  const endpoint = options.endpoint

  const fetchData = useCallback(async () => {
    const id = ++fetchId.current
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) return

      const url = new URL(endpoint, window.location.origin)
      const params = JSON.parse(serializedParams) as Record<string, string>
      for (const [key, value] of Object.entries(params)) {
        if (value) url.searchParams.set(key, value)
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (id !== fetchId.current) return // stale request

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || `Request failed (${res.status})`)
      }

      const body = await res.json()
      setData(body.data || [])
      setTotal(body.meta?.total ?? 0)
    } catch (err) {
      if (id === fetchId.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    } finally {
      if (id === fetchId.current) {
        setLoading(false)
      }
    }
  }, [getToken, endpoint, serializedParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, total, loading, error, refetch: fetchData }
}
