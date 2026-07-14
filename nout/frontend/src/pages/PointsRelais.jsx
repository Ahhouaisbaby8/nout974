import { useState } from 'react'
import { MapPin, Search, LocateFixed } from 'lucide-react'
import { REUNION_CITIES } from '../utils/cities'

// Page publique « Points relais » — consultation SANS achat. Réutilise l'API points relais
// (chronopost-points-relais / ubn-points-relais) déjà branchée pour le checkout. Le visiteur
// tape sa ville ou son code postal et voit les relais près de chez lui (nom, adresse, transporteur).

// Normalise les points d'un transporteur vers une forme commune (repris du checkout).
async function fetchRelays(carrier, cp, ville) {
  if (carrier === 'ubn') {
    const res = await fetch(`/.netlify/functions/ubn-points-relais?cp=${encodeURIComponent(cp)}&ville=${encodeURIComponent(ville)}`)
    const d = await res.json()
    if (!d.configured) return []
    return (d.items || []).map((it) => ({
      id: String(it.id ?? it.value ?? ''), carrier: 'ubn',
      name: it.name || it.shop_name || it.label || 'Point relais',
      address: it.address || '', city: it.city || '', postcode: it.postcode || it.cp || '',
    })).filter((p) => p.id)
  }
  const res = await fetch(`/.netlify/functions/chronopost-points-relais?cp=${encodeURIComponent(cp)}&ville=${encodeURIComponent(ville)}`)
  const d = await res.json()
  if (!d.configured) return []
  return (d.points || []).map((p) => ({
    id: String(p.id ?? ''), carrier: 'chronopost',
    name: p.nom || 'Point relais',
    address: p.adresse || '', city: p.ville || '', postcode: p.codePostal || '',
  })).filter((p) => p.id)
}

export default function PointsRelais() {
  const [cp, setCp]         = useState('')
  const [ville, setVille]   = useState('')
  const [relais, setRelais] = useState(null)   // null = pas encore cherché
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const search = async (e) => {
    e?.preventDefault()
    setError('')
    const cpTrim = cp.trim()
    if (cpTrim.length < 5 && !ville.trim()) {
      setError('Indique un code postal (5 chiffres) ou une ville de La Réunion.')
      return
    }
    setLoading(true)
    try {
      // On interroge les deux transporteurs et on fusionne (Chronopost + UBN).
      const [chrono, ubn] = await Promise.all([
        fetchRelays('chronopost', cpTrim, ville.trim()).catch(() => []),
        fetchRelays('ubn', cpTrim, ville.trim()).catch(() => []),
      ])
      const all = [...chrono, ...ubn]
      setRelais(all)
      if (!all.length) setError('Aucun point relais trouvé pour cette zone. Essaie une ville proche.')
    } catch {
      setError('Recherche impossible pour le moment. Réessaie.')
      setRelais([])
    } finally {
      setLoading(false)
    }
  }

  const carrierBadge = (c) =>
    c === 'ubn'
      ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF4E6] text-[#B7791F]">UBN</span>
      : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EAF6F5] text-[#0E7FAB]">Chronopost</span>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-6 h-6 text-[#00C4B4]" />
        <h1 className="text-2xl font-extrabold text-nout-dark">Points relais à La Réunion</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Chronopost et UBN couvrent toute l'île. Tape ta ville ou ton code postal pour voir les points
        relais près de chez toi — avant même d'acheter.
      </p>

      <form onSubmit={search} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text" inputMode="numeric" maxLength={5}
            placeholder="Code postal (ex : 97400)"
            value={cp} onChange={(e) => setCp(e.target.value.replace(/\D/g, ''))}
            className="input-field flex-1"
          />
          <select value={ville} onChange={(e) => setVille(e.target.value)} className="input-field flex-1 cursor-pointer">
            <option value="">Ou choisis ta ville…</option>
            {REUNION_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #0E7FAB, #00C4B4)' }}
        >
          <Search className="w-4 h-4" />
          {loading ? 'Recherche…' : 'Voir les points relais'}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}

      {relais && relais.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            {relais.length} point{relais.length > 1 ? 's' : ''} relais trouvé{relais.length > 1 ? 's' : ''}
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
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
        Les points relais sont fournis en direct par Chronopost et UBN. La liste peut varier selon la
        zone. Au moment de l'achat, tu choisiras le relais qui t'arrange le mieux.
      </p>
    </div>
  )
}
