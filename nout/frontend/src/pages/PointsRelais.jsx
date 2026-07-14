import { useState, useEffect, useRef, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Search, LocateFixed } from 'lucide-react'
import { UBN_CITY_CP } from '../utils/ubn'

// Page publique « Points relais » — consultation SANS achat. Liste + carte OpenStreetMap côte à côte.
// Réutilise l'API points relais (chronopost-points-relais / ubn-points-relais) déjà branchée au checkout.

const REUNION_CENTER = [-21.115, 55.536]

// Correspondance CP → ville (974). Chronopost EXIGE cp + ville ; UBN se contente du CP.
// On dérive donc la ville à partir du CP saisi pour que Chronopost réponde aussi.
const CP_TO_VILLE = Object.fromEntries(Object.entries(UBN_CITY_CP).map(([ville, cp]) => [cp, ville]))

// Distance approximative (km) entre deux points géo — pour trier les relais par proximité.
function distanceKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1])
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Couleur par transporteur (cohérent avec les badges de la liste) : Chronopost bleu, UBN orange.
const CARRIER_COLOR = { chronopost: '#0E7FAB', ubn: '#B7791F' }

// Épingle colorée selon le transporteur. `active` = relais sélectionné (plus grand + halo) pour le repérer.
function pinIcon(carrier, active = false) {
  const color = CARRIER_COLOR[carrier] || '#0E7FAB'
  const size = active ? 40 : 26
  const halo = active
    ? `<circle cx="12" cy="12" r="11" fill="${color}" opacity="0.25"/>`
    : ''
  return L.divIcon({
    className: '',
    html: `<svg width="${size}" height="${size * 34 / 26}" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">${halo}<path d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20s12-12 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="5" fill="#fff"/></svg>`,
    iconSize: [size, size * 34 / 26], iconAnchor: [size / 2, size * 34 / 26],
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
  const [relais, setRelais] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [selectedId, setSelectedId] = useState(null)   // relais mis en évidence (clic dans la liste)

  const mapEl      = useRef(null)
  const mapRef     = useRef(null)
  const meMarker   = useRef(null)
  const markers    = useRef(new Map())   // key `${carrier}-${id}` → L.marker (pour retrouver au clic)

  const withCoords = useMemo(() => (relais ?? []).filter((p) => p.lat != null && p.lng != null), [relais])

  const keyOf = (p) => `${p.carrier}-${p.id}`

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
    markers.current.clear()
    withCoords.forEach((p) => {
      const carrierName = p.carrier === 'ubn' ? 'UBN' : 'Chronopost'
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p.carrier) })
        .addTo(map)
        .bindPopup(`<strong>${p.name}</strong><br>${p.address}<br><span style="color:${CARRIER_COLOR[p.carrier]};font-weight:700">${carrierName}</span>`)
      // Cliquer un marqueur met aussi en évidence la carte correspondante dans la liste.
      m.on('click', () => setSelectedId(keyOf(p)))
      markers.current.set(keyOf(p), m)
    })
    setSelectedId(null)
    setTimeout(() => {
      map.invalidateSize()
      if (withCoords.length) map.fitBounds(L.latLngBounds(withCoords.map((p) => [p.lat, p.lng])).pad(0.3), { maxZoom: 14 })
    }, 100)
  }, [withCoords])

  // Met en évidence le relais sélectionné : agrandit son épingle, centre la carte, ouvre sa bulle.
  useEffect(() => {
    if (!mapRef.current || !selectedId) return
    const p = withCoords.find((x) => keyOf(x) === selectedId)
    const m = markers.current.get(selectedId)
    if (!p || !m) return
    // Rétablit toutes les épingles à leur taille normale, puis agrandit la sélectionnée.
    markers.current.forEach((mk, key) => {
      const rp = withCoords.find((x) => keyOf(x) === key)
      if (rp) mk.setIcon(pinIcon(rp.carrier, key === selectedId))
    })
    m.setZIndexOffset(1000)
    mapRef.current.setView([p.lat, p.lng], 15, { animate: true })
    m.openPopup()
  }, [selectedId, withCoords])

  // Clic sur une carte de la liste → sélectionne (ou déselectionne si déjà actif).
  const selectRelais = (p) => {
    const k = keyOf(p)
    setSelectedId((cur) => (cur === k ? null : k))
  }

  useEffect(() => () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }, [])

  const search = async (e) => {
    e?.preventDefault()
    setError('')
    const q = cp.trim()
    if (!q) { setError('Indique un code postal (5 chiffres) ou une ville.'); return }

    // Un seul champ : soit un CP (5 chiffres), soit un nom de ville. Chronopost EXIGE cp + ville,
    // donc on complète l'autre via la table 974. Sinon Chronopost renvoie 400 et on ne verrait qu'UBN.
    const looksLikeCp = /^\d{5}$/.test(q)
    let cpFinal   = looksLikeCp ? q : ''
    let villeFinal = looksLikeCp ? '' : q
    if (cpFinal && !villeFinal && CP_TO_VILLE[cpFinal]) villeFinal = CP_TO_VILLE[cpFinal]
    if (villeFinal && !cpFinal) {
      // Retrouve le CP à partir de la ville, insensible à la casse / accents approximatifs.
      const match = Object.keys(UBN_CITY_CP).find((v) => v.toLowerCase() === villeFinal.toLowerCase())
      if (match) { cpFinal = UBN_CITY_CP[match]; villeFinal = match }
    }

    setLoading(true)
    try {
      const [chrono, ubn] = await Promise.all([
        fetchRelays('chronopost', cpFinal, villeFinal).catch(() => []),
        fetchRelays('ubn', cpFinal, villeFinal).catch(() => []),
      ])
      let all = [...chrono, ...ubn]

      // UBN renvoie souvent tous ses relais de l'île sans filtrer le CP → on trie par proximité
      // du point recherché (Chronopost donne déjà des coordonnées ; on prend le 1er relais géolocalisé
      // comme point d'ancrage de la zone) pour montrer les plus proches en premier.
      const anchor = all.find((p) => p.lat != null && p.lng != null)
      if (anchor) {
        const ref = [anchor.lat, anchor.lng]
        all = all.sort((a, b) => {
          const da = a.lat != null ? distanceKm(ref, [a.lat, a.lng]) : Infinity
          const db = b.lat != null ? distanceKm(ref, [b.lat, b.lng]) : Infinity
          return da - db
        })
      }

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

      {/* Un seul cadre blanc englobant, comme la maquette : recherche en haut + liste/carte côte à côte */}
      <div className="bg-white rounded-2xl shadow-sm p-5 sm:p-6">
        <form onSubmit={search} className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrer par ville, nom, code postal"
              value={cp}
              onChange={(e) => setCp(e.target.value)}
              className="input-field w-full pl-11"
            />
          </div>
          <button type="submit" disabled={loading}
            className="py-3 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }}>
            {loading ? 'Recherche…' : 'Rechercher'}
          </button>
          <button type="button" onClick={locateMe}
            className="py-3 px-5 rounded-xl border border-[#00C4B4] text-[#0E7FAB] text-sm font-semibold flex items-center justify-center gap-2 whitespace-nowrap hover:bg-[#00C4B4]/5">
            <LocateFixed className="w-4 h-4" />Près de moi
          </button>
        </form>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Liste */}
          <div className="order-2 md:order-1 space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {relais === null && <p className="text-sm text-gray-400 py-4">Tape ta ville ou ton code postal pour voir les points relais.</p>}
            {relais && relais.length > 0 && (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  {relais.length} point{relais.length > 1 ? 's' : ''} relais
                </p>
                {relais.map((r) => {
                  const k = `${r.carrier}-${r.id}`
                  const isSel = selectedId === k
                  const locatable = r.lat != null && r.lng != null
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => selectRelais(r)}
                      disabled={!locatable}
                      className={`w-full text-left border rounded-xl px-4 py-3 flex items-start justify-between gap-3 transition-colors ${
                        isSel
                          ? 'border-[#00C4B4] bg-[#00C4B4]/5 ring-1 ring-[#00C4B4]'
                          : 'border-gray-100 hover:border-[#00C4B4]/40'
                      } ${locatable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSel ? 'text-[#00C4B4]' : 'text-gray-300'}`} />
                        <div>
                          <p className="font-semibold text-nout-dark text-sm">{r.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{r.address}{r.city ? ` · ${r.postcode} ${r.city}` : ''}</p>
                        </div>
                      </div>
                      {carrierBadge(r.carrier)}
                    </button>
                  )
                })}
              </>
            )}
          </div>
          {/* Carte */}
          <div className="order-1 md:order-2">
            <div ref={mapEl} className="w-full h-[280px] md:h-[460px] rounded-xl overflow-hidden z-0" />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
        Les points relais sont fournis en direct par Chronopost et UBN. Au moment de l'achat, tu choisiras
        celui qui t'arrange le mieux.
      </p>
    </div>
  )
}
