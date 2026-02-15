import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom brass-tinted marker icon using SVG data URI
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

export default function PropertyMap({ data }) {
  const { properties, spaces, leases } = data
  const navigate = useNavigate()

  const markers = useMemo(() => {
    return properties
      .filter(p => p.lat && p.lng)
      .map(p => {
        const propSpaces = spaces.filter(s => s.property_id === p.id)
        const occupied = propSpaces.filter(s => s.status === 'occupied').length
        const total = propSpaces.length
        const occupancyPct = total > 0 ? (occupied / total) * 100 : 0

        const activeLeases = leases.filter(l => l.property_id === p.id && l.status === 'active')
        const monthlyRent = activeLeases.reduce((sum, l) => sum + (l.monthly_rent || 0), 0)

        return {
          id: p.id,
          name: p.name,
          city: p.city,
          state: p.state,
          lat: Number(p.lat),
          lng: Number(p.lng),
          type: p.property_type,
          occupancyPct,
          occupied,
          total,
          monthlyRent,
          value: p.current_value,
        }
      })
  }, [properties, spaces, leases])

  // Calculate map center from property positions
  const center = useMemo(() => {
    if (markers.length === 0) return [33.5, -82.5]
    const avgLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length
    const avgLng = markers.reduce((sum, m) => sum + m.lng, 0) / markers.length
    return [avgLat, avgLng]
  }, [markers])

  function occupancyColor(pct) {
    if (pct >= 90) return '#34d399' // emerald-400
    if (pct >= 70) return '#fbbf24' // amber-400
    return '#f87171' // red-400
  }

  if (markers.length === 0) return null

  return (
    <div className="card-surface overflow-hidden rounded-lg" style={{ height: '420px' }}>
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%', background: '#04040a' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        {markers.map(m => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon}>
            <Popup className="property-popup">
              <div style={{
                background: '#0c0c16',
                border: '1px solid rgba(200, 165, 90, 0.15)',
                borderRadius: '8px',
                padding: '12px 14px',
                minWidth: '200px',
                fontFamily: 'Outfit, system-ui, sans-serif',
              }}>
                <div
                  onClick={() => navigate(`/property/${m.id}`)}
                  style={{
                    color: '#ece8e0',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '2px',
                  }}
                  onMouseOver={e => e.target.style.color = '#c8a55a'}
                  onMouseOut={e => e.target.style.color = '#ece8e0'}
                >
                  {m.name}
                </div>
                <div style={{ color: '#7c7870', fontSize: '11px', marginBottom: '10px' }}>
                  {m.city}, {m.state}
                  <span style={{
                    marginLeft: '8px',
                    padding: '1px 6px',
                    background: '#1c1c28',
                    border: '1px solid #28283a',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#a8a498',
                  }}>
                    {m.type}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ color: '#5c5850', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Occupancy</div>
                    <div style={{ color: occupancyColor(m.occupancyPct), fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {m.occupancyPct.toFixed(0)}%
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#5c5850', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Monthly</div>
                    <div style={{ color: '#c8a55a', fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      ${m.monthlyRent.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div
                  onClick={() => navigate(`/property/${m.id}`)}
                  style={{
                    marginTop: '10px',
                    textAlign: 'center',
                    padding: '5px',
                    background: 'rgba(200, 165, 90, 0.08)',
                    border: '1px solid rgba(200, 165, 90, 0.15)',
                    borderRadius: '5px',
                    color: '#c8a55a',
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    cursor: 'pointer',
                  }}
                  onMouseOver={e => e.target.style.background = 'rgba(200, 165, 90, 0.15)'}
                  onMouseOut={e => e.target.style.background = 'rgba(200, 165, 90, 0.08)'}
                >
                  View Property
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
