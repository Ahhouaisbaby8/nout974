import { useEffect, useRef, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, MapPin, LocateFixed, Search } from 'lucide-react'

// Centre de La Réunion (repli quand aucun point n'est géolocalisé).
const REUNION_CENTER = [-21.115, 55.536]

// Marqueur en divIcon (HTML) → pas de dépendance aux images d'icônes par défaut de Leaflet
// (qui cassent avec les bundlers). Le point sélectionné est plus grand et en teal.
function pinIcon(active) {
  const color = active ? '#0E8C82' : '#1A3A8F'
  const w = active ? 32 : 26
  const h = active ? 42 : 34
  return L.divIcon({
    className: '',
    html: `<svg width="${w}" height="${h}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20s12-12 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  })
}

// Modal « Point de retrait » façon Vinted : carte OpenStreetMap zoomable + marqueurs cliquables,
// liste des points, recherche, bouton « près de moi ». Sélectionner un point met à jour selectedId
// (dans le parent) ; « Valider » ferme le modal.
export default function RelayMapPicker({ open, onClose, points = [], selectedId, onSelect }) {
  const mapEl        = useRef(null)
  const mapRef       = useRef(null)
  const markersRef   = useRef({})
  const meMarkerRef  = useRef(null)
  const [query, setQuery]       = useState('')
  const [locating, setLocating] = useState(false)

  const withCoords = useMemo(() => points.filter((p) => p.lat != null && p.lng != null), [points])

  // Init de la carte à l'ouverture (Leaflet est impératif → on le pilote via des refs).
  useEffect(() => {
    if (!open || !mapEl.current) return
    const map = L.map(mapEl.current).setView(REUNION_CENTER, 10)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map)
    mapRef.current = map
    markersRef.current = {}
    withCoords.forEach((p) => {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p.id === selectedId) }).addTo(map)
      m.on('click', () => onSelect(p.id))
      markersRef.current[p.id] = m
    })
    if (withCoords.length) {
      map.fitBounds(L.latLngBounds(withCoords.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 14 })
    }
    // Le conteneur est mesuré à 0 tant que le modal s'ouvre → on force un recalcul.
    const t = setTimeout(() => map.invalidateSize(), 120)
    return () => { clearTimeout(t); map.remove(); mapRef.current = null; markersRef.current = {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, withCoords])

  // Sélection : met à jour les icônes + recentre doucement.
  useEffect(() => {
    if (!mapRef.current) return
    Object.entries(markersRef.current).forEach(([id, m]) => m.setIcon(pinIcon(id === selectedId)))
    const sel = withCoords.find((p) => p.id === selectedId)
    if (sel) mapRef.current.panTo([sel.lat, sel.lng])
  }, [selectedId, withCoords])

  const locateMe = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const map = mapRef.current
        if (!map) return
        const { latitude, longitude } = pos.coords
        if (meMarkerRef.current) meMarkerRef.current.remove()
        meMarkerRef.current = L.circleMarker([latitude, longitude], {
          radius: 8, color: '#0E8C82', weight: 2, fillColor: '#0E8C82', fillOpacity: 0.4,
        }).addTo(map)
        map.setView([latitude, longitude], 12)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return points
    return points.filter((p) => `${p.name} ${p.city} ${p.postcode} ${p.address}`.toLowerCase().includes(q))
  }, [points, query])

  // La recherche filtre la LISTE → on masque aussi les marqueurs hors filtre (cohérence liste/carte).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const visible = new Set(filtered.map((p) => p.id))
    Object.entries(markersRef.current).forEach(([id, m]) => {
      if (visible.has(id)) { if (!map.hasLayer(m)) m.addTo(map) }
      else if (map.hasLayer(m)) m.remove()
    })
  }, [filtered])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-stretch sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-3xl sm:rounded-2xl shadow-xl flex flex-col h-full sm:h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-title font-bold text-nout-texte">Point de retrait</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recherche + géoloc */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {/* text-base (16px) → pas de zoom auto iOS */}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer par ville, nom, code postal"
              className="flex-1 bg-transparent text-base outline-none text-nout-dark placeholder:text-gray-400"
            />
          </div>
          <button
            type="button"
            onClick={locateMe}
            className="flex items-center gap-1.5 text-sm font-medium text-[#0E7FAB] px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 flex-shrink-0"
          >
            <LocateFixed className="w-4 h-4" /> {locating ? '…' : 'Près de moi'}
          </button>
        </div>

        {/* Corps : liste + carte */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0">
          {/* Liste */}
          <div className="overflow-y-auto sm:w-72 sm:border-r border-gray-100 order-2 sm:order-1 flex-1 min-h-0">
            {filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun point relais.</p>
            ) : filtered.map((p) => {
              const active = p.id === selectedId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 transition-colors ${active ? 'bg-[#F0FFFE]' : 'hover:bg-gray-50'}`}
                >
                  <p className="text-sm font-semibold text-nout-dark flex items-center gap-1.5">
                    <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-nout-primary' : 'text-gray-300'}`} />
                    {p.name}
                  </p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{p.address}{p.postcode ? ` · ${p.postcode}` : ''} {p.city}</p>
                  {p.lat == null && <p className="text-[11px] text-amber-600 mt-0.5">Adresse non localisée sur la carte</p>}
                </button>
              )
            })}
          </div>

          {/* Carte */}
          <div ref={mapEl} className="order-1 sm:order-2 h-56 sm:h-auto sm:flex-1 flex-shrink-0 bg-gray-100 z-0" />
        </div>

        {/* Valider */}
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            disabled={!selectedId}
            onClick={onClose}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedId ? 'Valider ce point relais' : 'Choisis un point relais'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
