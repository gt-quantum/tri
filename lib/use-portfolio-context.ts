'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export interface Portfolio {
  id: string
  name: string
  property_count?: number
}

export interface PortfolioContextValue {
  portfolioId: string | null
  portfolioName: string | null
  portfolios: Portfolio[]
  loading: boolean
  setPortfolio: (id: string | null) => void
}

export const PortfolioContext = createContext<PortfolioContextValue>({
  portfolioId: null,
  portfolioName: null,
  portfolios: [],
  loading: true,
  setPortfolio: () => {},
})

export function usePortfolioContext() {
  return useContext(PortfolioContext)
}

const STORAGE_KEY = 'tri-portfolio'

export function usePortfolioProvider(): PortfolioContextValue {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { getToken } = useAuth()

  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Initialize from URL param or localStorage
  useEffect(() => {
    const urlParam = searchParams.get('portfolio')
    if (urlParam) {
      setSelectedId(urlParam)
    } else {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSelectedId(stored)
      }
    }
  }, [searchParams])

  // Fetch portfolios
  useEffect(() => {
    async function fetchPortfolios() {
      try {
        const token = await getToken()
        if (!token) return

        const res = await fetch('/api/v1/portfolios?limit=100', {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          const items = (data.data || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            property_count: p.property_count,
          }))
          setPortfolios(items)

          // Validate stored portfolio ID
          if (selectedId && !items.find((p: Portfolio) => p.id === selectedId)) {
            setSelectedId(null)
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch {
        // Portfolio fetch failed — non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolios()
  }, [getToken, selectedId])

  const setPortfolio = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      if (id) {
        localStorage.setItem(STORAGE_KEY, id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }

      // Update URL param
      const params = new URLSearchParams(searchParams.toString())
      if (id) {
        params.set('portfolio', id)
      } else {
        params.delete('portfolio')
      }
      const paramStr = params.toString()
      router.push(paramStr ? `${pathname}?${paramStr}` : pathname)
    },
    [router, pathname, searchParams]
  )

  const selectedPortfolio = portfolios.find((p) => p.id === selectedId) || null

  return {
    portfolioId: selectedId,
    portfolioName: selectedPortfolio?.name || null,
    portfolios,
    loading,
    setPortfolio,
  }
}
