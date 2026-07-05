import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListingById } from '../services/listings'
import { getOfferById } from '../services/offers'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatters'
import {
  DELIVERY_OPTIONS, DELIVERY_ORDER, getDeliveryOption, getDeliveryFee,
  computeBuyerTotal, computeProtectionFee,
} from '../utils/shipping'
import { MapPin, Home as HomeIcon, Store, ShieldCheck, Lock, ChevronLeft, Truck, Info } from 'lucide-react'
import { SAFE_ZONES, SAFE_TIPS } from '../utils/safeZones'
import { thumbUrl } from '../utils/image'
import Spinner from '../components/ui/Spinner'
import ProtectionInfoModal from '../components/ui/ProtectionInfoModal'

const OPTION_ICON = { hand: Store, ubn_relay: MapPin, chrono_relay: MapPin, ubn_home: HomeIcon, chrono_home: Truck }

// Normalise les points relais des deux transporteurs vers une forme commune pour l'UI.
async function fetchRelays(carrier, cp, ville) {
  if (carrier === 'ubn') {
    const res = await fetch(`/.netlify/functions/ubn-points-relais?cp=${encodeURIComponent(cp)}&ville=${encodeURIComponent(ville)}`)
    const d = await res.json()
    if (!d.configured) return { ok: false, reason: 'Points relais UBN indisponibles pour le moment.' }
    const points = (d.items || []).map((it) => ({
      id:       String(it.id ?? it.ubn_pr_user_id ?? it.value ?? ''),
      name:     it.name || it.shop_name || it.label || 'Point relais',
      address:  it.address || '',
      city:     it.city || '',
      postcode: it.postcode || it.cp || '',
    })).filter((p) => p.id)
    return { ok: true, points }
  }
  const res = await fetch(`/.netlify/functions/chronopost-points-relais?cp=${encodeURIComponent(cp)}&ville=${encodeURIComponent(ville)}`)
  const d = await res.json()
  if (!d.configured) return { ok: false, reason: 'Points relais Chronopost indisponibles pour le moment.' }
  const points = (d.points || []).map((p) => ({
    id:       String(p.id ?? ''),
    name:     p.nom || 'Point relais',
    address:  p.adresse || '',
    city:     p.ville || '',
    postcode: p.codePostal || '',
  })).filter((p) => p.id)
  return { ok: true, points }
}

export default function Checkout() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const offerId = searchParams.get('offre')
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [listing, setListing] = useState(null)
  const [offer, setOffer]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [deliveryId, setDeliveryId] = useState('hand')
  const [shipPhone, setShipPhone]       = useState(profile?.phone ?? '')
  const [shipAddress, setShipAddress]   = useState('')
  const [shipCity, setShipCity]         = useState(profile?.city ?? '')
  const [shipPostcode, setShipPostcode] = useState('')

  const [relays, setRelays]             = useState([])
  const [relaysLoading, setRelaysLoading] = useState(false)
  const [relaysError, setRelaysError]   = useState('')
  const [selectedRelayId, setSelectedRelayId] = useState('')

  const [paying, setPaying]     = useState(false)
  const [payError, setPayError] = useState('')
  const [showProtection, setShowProtection] = useState(false)

  useEffect(() => {
    if (!user) { navigate(`/connexion?redirect=/commander/${id}`); return }
    getListingById(id)
      .then((l) => {
        if (!l || l.is_sold) { setNotFound(true); return }
        setListing(l)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    if (offerId) getOfferById(offerId).then(setOffer).catch(() => {})
  }, [id, user, navigate, offerId])

  const option      = getDeliveryOption(deliveryId)
  const needsRelay  = option.needsRelay
  const needsAddress = option.needsAddress
  const cpOk        = /^\d{5}$/.test(shipPostcode.trim())
  const locationOk  = cpOk && shipCity.trim().length > 0

  // Charge les points relais du transporteur choisi dès que le code postal + la ville sont valides.
  useEffect(() => {
    if (!needsRelay || !locationOk) { setRelays([]); setSelectedRelayId(''); setRelaysError(''); return }
    let cancelled = false
    setRelaysLoading(true); setRelaysError(''); setSelectedRelayId('')
    fetchRelays(option.carrier, shipPostcode.trim(), shipCity.trim())
      .then((r) => {
        if (cancelled) return
        if (!r.ok) { setRelays([]); setRelaysError(r.reason); return }
        if (!r.points.length) { setRelays([]); setRelaysError('Aucun point relais trouvé pour ce code postal.'); return }
        setRelays(r.points)
      })
      .catch(() => { if (!cancelled) { setRelays([]); setRelaysError('Impossible de charger les points relais.') } })
      .finally(() => { if (!cancelled) setRelaysLoading(false) })
    return () => { cancelled = true }
  }, [needsRelay, option.carrier, shipPostcode, shipCity, locationOk])

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>
  if (notFound) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-semibold text-nout-dark">Article indisponible</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  if (Number(listing.price) === 0) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <p className="text-lg font-semibold text-nout-dark">Article offert</p>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">
        Cet article est proposé gratuitement : il n'y a pas de paiement en ligne. Contacte le vendeur
        depuis l'annonce pour organiser la remise en main propre.
      </p>
      <button onClick={() => navigate(`/annonce/${id}`)} className="btn-primary mt-6 px-8">
        Voir l'annonce et contacter le vendeur
      </button>
    </div>
  )

  const offerValid    = offer && offer.status === 'accepted' && offer.listing_id === id && offer.buyer_id === user.id
  const prix          = offerValid ? Number(offer.amount) : Number(listing.price)
  const portFee       = getDeliveryFee(deliveryId)
  const protectionFee = computeProtectionFee(prix)
  const totalAcheteur = computeBuyerTotal(prix, deliveryId)
  const imageUrl      = thumbUrl(listing.images?.[0] ?? null)

  const handlePay = async () => {
    setPayError('')
    if (needsAddress && (!shipPhone.trim() || !shipAddress.trim() || !shipCity.trim() || !cpOk)) {
      setPayError('Renseigne ton téléphone et ton adresse complète (code postal à 5 chiffres) pour la livraison.')
      return
    }
    if (needsRelay && (!locationOk || !selectedRelayId)) {
      setPayError('Indique ton code postal et ta ville, puis choisis un point relais.')
      return
    }
    setPaying(true)
    try {
      const chosenRelay = relays.find((r) => r.id === selectedRelayId) || null
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession?.access_token ?? ''}` },
        body: JSON.stringify({
          listingId: id, buyerId: user.id,
          deliveryId, carrier: option.carrier, mode: option.mode,
          offerId: offerValid ? offer.id : null,
          relayId: needsRelay ? selectedRelayId : null,
          relayName: chosenRelay?.name || null,
          shippingPhone: shipPhone.trim(), shippingAddress: shipAddress.trim(),
          shippingCity: shipCity.trim(), shippingPostcode: shipPostcode.trim(),
        }),
      })
      const data = await res.json()
      if (data.error) { setPayError(data.error); return }
      window.location.href = data.url
    } catch {
      setPayError('Erreur de connexion. Réessaie.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-nout-muted hover:text-nout-texte mb-4">
        <ChevronLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="font-title text-[22px] font-bold text-nout-texte mb-5">Finaliser ma commande</h1>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* ── COLONNE GAUCHE ── */}
        <div className="space-y-5">

          {/* Article */}
          <div className="bg-white border border-[#ECEFF4] rounded-2xl p-4 flex gap-4">
            <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
              {imageUrl && <img src={imageUrl} alt={listing.title} className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-nout-texte truncate">{listing.title}</p>
              {listing.brand && <p className="text-sm text-gray-500">{listing.brand}</p>}
              {listing.size && <p className="text-sm text-gray-500">{listing.size}</p>}
              <p className="font-title font-semibold text-nout-texte mt-1">
                {formatPrice(prix)}
                {offerValid && <span className="ml-2 text-[11px] font-semibold text-[#0E7FAB]">offre acceptée</span>}
              </p>
            </div>
          </div>

          {/* Mode de livraison */}
          <div className="bg-white border border-[#ECEFF4] rounded-2xl p-4">
            <p className="font-semibold text-nout-texte mb-3">Mode de livraison</p>
            <div className="space-y-2">
              {DELIVERY_ORDER.map((oId) => {
                const o = getDeliveryOption(oId)
                const Icon = OPTION_ICON[oId] ?? MapPin
                const fee = getDeliveryFee(oId)
                const active = deliveryId === oId
                return (
                  <button
                    key={oId}
                    type="button"
                    onClick={() => setDeliveryId(oId)}
                    className={`w-full flex items-center gap-3 text-left rounded-xl border-2 px-3 py-3 transition-all ${active ? 'border-nout-primary bg-[#F0FFFE]' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-nout-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nout-dark flex items-center gap-1.5">
                        {o.label}
                        {o.recommended && <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Conseillé</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{o.delay ? `${o.delay} · ` : ''}{o.sublabel}</p>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${fee === 0 ? 'text-emerald-600' : 'text-nout-dark'}`}>
                      {fee === 0 ? 'Gratuit' : formatPrice(fee)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Localisation + point relais (modes relais) */}
          {needsRelay && (
            <div className="bg-white border border-[#ECEFF4] rounded-2xl p-4 space-y-3">
              <p className="flex items-center gap-2 font-semibold text-nout-texte">
                <MapPin className="w-4 h-4 text-nout-primary" /> Choisis ton point relais
              </p>
              <div className="flex gap-3">
                <input type="text" value={shipPostcode} onChange={(e) => setShipPostcode(e.target.value)}
                       placeholder="Code postal *" className="input-field w-32" inputMode="numeric" />
                <input type="text" value={shipCity} onChange={(e) => setShipCity(e.target.value)}
                       placeholder="Ville *" className="input-field flex-1" />
              </div>
              <input type="tel" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)}
                     placeholder="Téléphone (pour le retrait) *" className="input-field" />

              {!locationOk && <p className="text-[12px] text-gray-400">Entre ton code postal (5 chiffres) et ta ville pour voir les points relais proches.</p>}
              {relaysLoading && <p className="text-[13px] text-gray-500 flex items-center gap-2"><Spinner /> Recherche des points relais…</p>}
              {relaysError && <p className="text-[13px] text-amber-600">{relaysError}</p>}

              {relays.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {relays.map((r) => {
                    const active = selectedRelayId === r.id
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRelayId(r.id)}
                        className={`w-full text-left rounded-xl border-2 px-3 py-2.5 transition-all ${active ? 'border-nout-primary bg-[#F0FFFE]' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <p className="text-sm font-semibold text-nout-dark">{r.name}</p>
                        <p className="text-[12px] text-gray-500">{r.address}{r.postcode ? ` · ${r.postcode}` : ''} {r.city}</p>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Adresse de livraison (modes domicile) */}
          {needsAddress && (
            <div className="bg-white border border-[#ECEFF4] rounded-2xl p-4 space-y-3">
              <p className="flex items-center gap-2 font-semibold text-nout-texte">
                <HomeIcon className="w-4 h-4 text-nout-primary" /> Adresse de livraison
              </p>
              <input type="tel" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)}
                     placeholder="Téléphone (pour le transporteur) *" className="input-field" />
              <input type="text" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)}
                     placeholder="Adresse (rue, numéro, complément) *" className="input-field" />
              <div className="flex gap-3">
                <input type="text" value={shipPostcode} onChange={(e) => setShipPostcode(e.target.value)}
                       placeholder="Code postal *" className="input-field w-32" inputMode="numeric" />
                <input type="text" value={shipCity} onChange={(e) => setShipCity(e.target.value)}
                       placeholder="Ville *" className="input-field flex-1" />
              </div>
              <p className="text-[11px] text-gray-400">Ton téléphone est transmis au transporteur uniquement pour la livraison.</p>
            </div>
          )}

          {/* Conseils main propre (safe zones) */}
          {deliveryId === 'hand' && (
            <div className="bg-[#EAF6F5] border border-[#B9E5E1] rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#0E7FAB] mb-1.5">
                <ShieldCheck className="w-4 h-4" /> Remise en lieu public conseillée
              </p>
              <ul className="text-[12px] text-gray-600 space-y-1">
                {SAFE_TIPS.map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-[#0E7FAB]">•</span>{t}</li>)}
              </ul>
              <details className="text-[12px] mt-2">
                <summary className="cursor-pointer text-[#0E7FAB] font-medium">Voir des lieux sûrs par zone</summary>
                <div className="mt-2 space-y-2">
                  {SAFE_ZONES.map((z) => (
                    <div key={z.zone}>
                      <p className="font-semibold text-nout-texte text-[11px] uppercase tracking-wide">{z.zone}</p>
                      <ul className="text-gray-500 text-[12px]">{z.lieux.map((l, i) => <li key={i}>· {l}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* ── COLONNE DROITE : récap prix ── */}
        <div className="bg-white border border-[#ECEFF4] rounded-2xl p-5 lg:sticky lg:top-20">
          <h2 className="font-title text-lg font-bold text-nout-texte mb-4">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Article</span><span>{formatPrice(prix)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span className="flex items-center gap-1">Protection acheteur <button type="button" onClick={() => setShowProtection(true)} aria-label="En savoir plus sur la protection acheteur" className="text-nout-primary/70 hover:text-nout-primary"><Info className="w-3.5 h-3.5" /></button></span>
              <span>{formatPrice(protectionFee)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{portFee > 0 ? `Livraison (${option.label})` : 'Remise en main propre'}</span>
              <span className={portFee > 0 ? '' : 'text-emerald-600 font-medium'}>{portFee > 0 ? formatPrice(portFee) : 'Gratuit'}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-nout-texte text-base">
              <span>Total</span><span>{formatPrice(totalAcheteur)}</span>
            </div>
          </div>

          {payError && <p className="text-[13px] text-red-500 mt-3">{payError}</p>}

          <button onClick={handlePay} disabled={paying}
                  className={`btn-primary w-full py-3.5 mt-4 ${paying ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {paying ? 'Redirection…' : `Payer ${formatPrice(totalAcheteur)}`}
          </button>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-3">
            <Lock className="w-3 h-3" /> Paiement chiffré et sécurisé · PCI-DSS
          </p>
        </div>
      </div>

      <ProtectionInfoModal open={showProtection} onClose={() => setShowProtection(false)} />
    </div>
  )
}
