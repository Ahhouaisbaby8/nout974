import { useState, useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Search, LocateFixed } from 'lucide-react'
import { REUNION_CITIES } from '../utils/cities'

// Page publique « Points relais » — consultation SANS achat. Liste + carte OpenStreetMap côte à côte.
// Réutilise l'API points relais (chronopost-points-relais / ubn-points-relais) déjà branchée au checkout.

const REUNION_CENTER = [-21.115, 55.536]

function pinIcon() {
  return L.divIcon({
    className: '',
    html: `<svg width="26" height="34" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20s12-12 12-20C24 5.4 18.6 0 12 0z" fill="#0E7FAB"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`,
    iconSize: [26, 34], iconAnchor: [13, 34],
  })
}

// Normalise les points d'un transporteur (repris du checkout) — garde les coordonnées pour la carte.
async function fetchRelays(carrier, cp, ville) {
  if (carrier === 'ubn') {
    const res = await fetch(`/.netlify/functions/ubn-points-relais?cp=${encodeURIComponent(cp)}&ville=${encodeURIComponent(ville)}`)
    const d = await res.json()
    if (!d.configured) return []
    return (d.items || []).map((it) => ({
      id: String(it.id ?? it.value ?? ''), carrier: 'ubn',
      name: it.name || it.shop_name || it.label || 'Point relais',
      address: it.address || '', city: it.city || '', postcode: it.postcode || it.cp || '',
      lat: it.lat != null ? Number(it.lat) : null, lng: it.lng != null ? Number(it.lng) : null,
    })).filter((p) => p.id)
  }
  const res = await fetch(`/.netlify/functions/chronopost-points-relais?cp=${encodeURIComponent(cp)}&ville=${encodeURIComponent(ville)}`)
  const d = await res.json()
  if (!d.configured) return []
  return (d.points || []).map((p) => ({
    id: String(p.id ?? ''), carrier: 'chronopost',
    name: p.nom || 'Point relais',
    address: p.adresse || '', city: p.ville || '', postcode: p.codePostal || '',
    lat: p.latitude != null ? Number(p.latitude) : null, lng: p.longitude != null ? Number(p.longitude) : null,
  })).filter((p) => p.id)
}

export default function PointsRelais() {
  const [cp, setCp]         = useState('')
  const [ville, setVille]   = useState('')
  const [relais, setRelais] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const mapEl      = useRef(null)
  const mapRef     = useRef(null)
  const meMarker   = useRef(null)

  const withCoords = useMemo(() => (relais ?? []).filter((p) => p.lat != null && p.lng != null), [relais])

  // Init / mise à jour de la carte quand les résultats changent.
  useEffect(() => {
    if (!mapEl.current) return
    if (!mapRef.current) {
      mapRef.current = L.map(mapEl.current, { fadeAnimation: false }).setView(REUNION_CENTER, 10)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
      }).addTo(mapRef.current)
    }
    const map = mapRef.current
    // Retire les anciens marqueurs de relais (garde le fond + le marqueur "moi").
    map.eachLayer((layer) => { if (layer instanceof L.Marker && layer !== meMarker.current) map.removeLayer(layer) })
    withCoords.forEach((p) => { L.marker([p.lat, p.lng], { icon: pinIcon() }).addTo(map).bindPopup(`<strong>${p.name}</strong><br>${p.address}`) })
    setTimeout(() => {
      map.invalidateSize()
      if (withCoords.length) map.fitBounds(L.latLngBounds(withCoords.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 14 })
    }, 100)
  }, [withCoords])

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }, [])

  const search = async (e) => {
    e?.preventDefault()
    setError('')
    const cpTrim = cp.trim()
    if (cpTrim.length < 5 && !ville.trim()) { setError('Indique un code postal (5 chiffres) ou une ville.'); return }
    setLoading(true)
    try {
      const [chrono, ubn] = await Promise.all([
        fetchRelays('chronopost', cpTrim, ville.trim()).catch(() => []),
        fetchRelays('ubn', cpTrim, ville.trim()).catch(() => []),
      ])
      const all = [...chrono, ...ubn]
      setRelais(all)
      if (!all.length) setError('Aucun point relais trouvé pour cette zone. Essaie une ville proche.')
    } catch {
      setError('Recherche impossible pour le moment. Réessaie.'); setRelais([])
    } finally { setLoading(false) }
  }

  const locateMe = () => {
    if (!navigator.geolocation) { setError('Géolocalisation non disponible sur cet appareil.'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const map = mapRef.current
        if (!map) return
        const { latitude, longitude } = pos.coords
        if (meMarker.current) meMarker.current.remove()
        meMarker.current = L.circleMarker([latitude, longitude], { radius: 8, color: '#0E8C82', weight: 2, fillColor: '#0E8C82', fillOpacity: 0.4 }).addTo(map)
        map.setView([latitude, longitude], 12)
      },
      () => setError('Localisation refusée. Autorise-la dans ton navigateur, ou cherche par ville.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const carrierBadge = (c) =>
    c === 'ubn'
      ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E6] text-[#B7791F] whitespace-nowrap">UBN</span>
      : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF6F5] text-[#0E7FAB] whitespace-nowrap">Chronopost</span>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-6 h-6 text-[#00C4B4]" />
        <h1 className="text-2xl font-extrabold text-nout-dark">Points relais à La Réunion</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed max-w-2xl">
        Chronopost et UBN couvrent toute l'île. Tape ta ville ou ton code postal pour voir les points
        relais près de chez toi — avant même d'acheter.
      </p>

      <form onSubmit={search} className="bg-white rounded-xl shadow-sm p-5 flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text" inputMode="numeric" maxLength={5} placeholder="Code postal (ex : 97400)"
          value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))}
          className="input-field flex-1"
        />
        <select value={ville} onChange={(e) => setVille(e.target.value)} className="input-field flex-1 cursor-pointer">
          <option value="">Ou choisis ta ville…</option>
          {REUNION_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="submit" disabled={loading}
          className="py-3 px-5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }}>
          <Search className="w-4 h-4" />{loading ? 'Recherche…' : 'Rechercher'}
        </button>
        <button type="button" onClick={locateMe}
          className="py-3 px-4 rounded-xl border border-[#00C4B4] text-[#0E7FAB] text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap hover:bg-[#00C4B4]/5">
          <LocateFixed className="w-4 h-4" />Près de moi
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Liste + carte côte à côte (empilées sur mobile) */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="order-2 md:order-1 space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {relais === null && <p className="text-sm text-gray-400">Lance une recherche pour voir les points relais.</p>}
          {relais && relais.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {relais.length} point{relais.length > 1 ? 's' : ''} relais
              </p>
              {relais.map((r) => (
                <div key={`${r.carrier}-${r.id}`} className="bg-white rounded-xl shadow-sm px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-nout-dark text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.address}{r.city ? ` · ${r.postcode} ${r.city}` : ''}</p>
                  </div>
                  {carrierBadge(r.carrier)}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="order-1 md:order-2">
          <div ref={mapEl} className="w-full h-[300px] md:h-[520px] rounded-xl overflow-hidden shadow-sm z-0" />
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
        Les points relais sont fournis en direct par Chronopost et UBN. Au moment de l'achat, tu choisiras
        celui qui t'arrange le mieux.
      </p>
    </div>
  )
}
