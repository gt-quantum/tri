'use client'

import { useMemo, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PortfolioData } from '@/lib/use-dashboard-data'

const markerIcon = new L.DivIcon({
  className: '',
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="#c8a55a" fill-opacity="0.9"/>
    <circle cx="14" cy="14" r="6" fill="#04040a" fill-opacity="0.6"/>
    <circle cx="14" cy="14" r="3" fill="#c8a55a"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -36],
})

function occupancyColor(pct: number) {
  if (pct >= 90) return '#34d399'
  if (pct >= 70) return '#fbbf24'
  return '#f87171'
}

function popupHtml(m: { id: string; name: string; city: string; state: string; type: string; occupancyPct: number; monthlyRent: number }) {
  return `
    <div style="background:#0c0c16;border:1px solid rgba(200,165,90,0.15);border-radius:8px;padding:12px 14px;min-width:200px;font-family:Outfit,system-ui,sans-serif;">
      <div data-property-id="${m.id}" style="color:#ece8e0;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:2px;">${m.name}</div>
      <div style="color:#7c7870;font-size:11px;margin-bottom:10px;">
        ${m.city}, ${m.state}
        <span style="margin-left:8px;padding:1px 6px;background:#1c1c28;border:1px solid #28283a;border-radius:4px;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#a8a498;">${m.type}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:16px;">
        <div>
          <div style="color:#5c5850;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Occupancy</div>
          <div style="color:${occupancyColor(m.occupancyPct)};font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;">${m.occupancyPct.toFixed(0)}%</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#5c5850;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Monthly</div>
          <div style="color:#c8a55a;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;">$${m.monthlyRent.toLocaleString()}</div>
        </div>
      </div>
      <div data-property-id="${m.id}" style="margin-top:10px;text-align:center;padding:5px;background:rgba(200,165,90,0.08);border:1px solid rgba(200,165,90,0.15);border-radius:5px;color:#c8a55a;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;">View Property</div>
    </div>`
}

export default function PropertyMap({ data }: { data: PortfolioData }) {
  const { properties, spaces, leases } = data
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  const markers = useMemo(() => {
    return properties
      .filter((p: any) => p.lat && p.lng)
      .map((p: any) => {
        const propSpaces = spaces.filter((s: any) => s.property_id === p.id)
        const occupied = propSpaces.filter((s: any) => s.status === 'occupied').length
        const total = propSpaces.length
        const occupancyPct = total > 0 ? (occupied / total) * 100 : 0

        const activeLeases = leases.filter((l: any) => l.property_id === p.id && l.status === 'active')
        const monthlyRent = activeLeases.reduce((sum: number, l: any) => sum + (l.monthly_rent || 0), 0)

        return {
          id: p.id, name: p.name, city: p.city, state: p.state,
          lat: Number(p.lat), lng: Number(p.lng), type: p.property_type,
          occupancyPct, occupied, total, monthlyRent, value: p.current_value,
        }
      })
  }, [properties, spaces, leases])

  const center = useMemo(() => {
    if (markers.length === 0) return [33.5, -82.5] as [number, number]
    const avgLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length
    const avgLng = markers.reduce((sum, m) => sum + m.lng, 0) / markers.length
    return [avgLat, avgLng] as [number, number]
  }, [markers])

  // Event delegation for popup clicks
  const handleClick = useCallback((e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[data-property-id]') as HTMLElement | null
    if (target) {
      router.push(`/property/${target.dataset.propertyId}`)
    }
  }, [router])

  useEffect(() => {
    const el = containerRef.current
    if (!el || markers.length === 0) return

    // Initialize map
    const map = L.map(el, {
      center,
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO',
    }).addTo(map)

    markers.forEach(m => {
      const marker = L.marker([m.lat, m.lng], { icon: markerIcon }).addTo(map)
      marker.bindPopup(popupHtml(m), {
        className: 'property-popup',
        closeButton: true,
      })
    })

    mapRef.current = map

    // Popup click delegation
    el.addEventListener('click', handleClick)

    return () => {
      el.removeEventListener('click', handleClick)
      map.remove()
      mapRef.current = null
    }
  }, [markers, center, handleClick])

  if (markers.length === 0) return null

  return (
    <div className="card-surface overflow-hidden rounded-lg" style={{ height: '420px' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%', background: '#04040a' }} />
    </div>
  )
}
