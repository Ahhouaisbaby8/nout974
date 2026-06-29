import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getListingById } from '../services/listings'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatters'
import {
  SHIPPING_METHODS, SHIPPING_ORDER, getShippingFee, computeBuyerTotal, computeProtectionFee,
} from '../utils/shipping'
import { MapPin, Home as HomeIcon, Store, ShieldCheck, Lock, ChevronLeft } from 'lucide-react'
import { SAFE_ZONES, SAFE_TIPS } from '../utils/safeZones'
import { thumbUrl } from '../utils/image'
import Spinner from '../components/ui/Spinner'

const SHIP_ICONS = { hand: Store, relay: MapPin, home: HomeIcon }

export default function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [shipMethod, setShipMethod] = useState('hand')
  const [shipPhone, setShipPhone]       = useState(profile?.phone ?? '')
  const [shipAddress, setShipAddress]   = useState('')
  const [shipCity, setShipCity]         = useState(profile?.city ?? '')
  const [shipPostcode, setShipPostcode] = useState('')

  const [paying, setPaying]     = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (!user) { navigate(`/connexion?redirect=/commander/${id}`); return }
    getListingById(id)
      .then((l) => {
        if (!l) { setNotFound(true); return }
        if (l.is_sold) { setNotFound(true); return }
        setListing(l)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id, user, navigate])

  if (loading) return <div className="py-24 flex justify-center"><Spinner /></div>
  if (notFound) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-semibold text-nout-dark">Article indisponible</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6 px-8">Retour à l'accueil</button>
    </div>
  )

  // Article offert (0 €) : pas de paiement en ligne. On invite à contacter le vendeur.
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

  const portFee       = getShippingFee(shipMethod)
  const protectionFee = computeProtectionFee(listing.price)
  const totalAcheteur = computeBuyerTotal(listing.price, shipMethod)
  const isDelivery    = portFee > 0
  const imageUrl      = thumbUrl(listing.images?.[0] ?? null)

  const handlePay = async () => {
    if (isDelivery && (!shipPhone.trim() || !shipAddress.trim() || !shipCity.trim() || !shipPostcode.trim())) {
      setPayError('Renseigne ton téléphone et ton adresse complète pour la livraison.')
      return
    }
    setPaying(true)
    setPayError('')
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession?.access_token ?? ''}` },
        body: JSON.stringify({
          listingId: id, buyerId: user.id, shippingMethod: shipMethod,
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
              <p className="font-title font-semibold text-nout-texte mt-1">{formatPrice(listing.price)}</p>
            </div>
          </div>

          {/* Mode de livraison */}
          <div className="bg-white border border-[#ECEFF4] rounded-2xl p-4">
            <p className="font-semibold text-nout-texte mb-3">Mode de livraison</p>
            <div className="space-y-2">
              {SHIPPING_ORDER.map(mId => {
                const m = SHIPPING_METHODS[mId]
                const Icon = SHIP_ICONS[mId] ?? MapPin
                const fee = getShippingFee(mId)
                const active = shipMethod === mId
                return (
                  <button
                    key={mId}
                    type="button"
                    onClick={() => setShipMethod(mId)}
                    className={`w-full flex items-center gap-3 text-left rounded-xl border-2 px-3 py-3 transition-all ${active ? 'border-nout-primary bg-[#F0FFFE]' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${active ? 'bg-nout-primary text-white' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-nout-dark flex items-center gap-1.5">
                        {m.label}
                        {m.recommended && <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Conseillé</span>}
                      </p>
                      <p className="text-[11px] text-gray-400">{m.delay ? `${m.delay} · ` : ''}{m.sublabel}</p>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ${fee === 0 ? 'text-emerald-600' : 'text-nout-dark'}`}>
                      {fee === 0 ? 'Gratuit' : formatPrice(fee)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Adresse de livraison (si livraison) */}
          {isDelivery && (
            <div className="bg-white border border-[#ECEFF4] rounded-2xl p-4 space-y-3">
              <p className="flex items-center gap-2 font-semibold text-nout-texte">
                <MapPin className="w-4 h-4 text-nout-primary" /> Adresse de livraison
              </p>
              <input type="tel" value={shipPhone} onChange={(e) => setShipPhone(e.target.value)}
                     placeholder="Téléphone (pour le transporteur) *" className="input-field" />
              <input type="text" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)}
                     placeholder="Adresse (rue, numéro, complément) *" className="input-field" />
              <div className="flex gap-3">
                <input type="text" value={shipPostcode} onChange={(e) => setShipPostcode(e.target.value)}
                       placeholder="Code postal *" className="input-field w-32" />
                <input type="text" value={shipCity} onChange={(e) => setShipCity(e.target.value)}
                       placeholder="Ville *" className="input-field flex-1" />
              </div>
              <p className="text-[11px] text-gray-400">Ton téléphone est transmis au transporteur uniquement pour la livraison.</p>
            </div>
          )}

          {/* Conseils main propre (safe zones) */}
          {!isDelivery && (
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
                  {SAFE_ZONES.map(z => (
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

        {/* ── COLONNE DROITE : récap prix (sticky desktop) ── */}
        <div className="bg-white border border-[#ECEFF4] rounded-2xl p-5 lg:sticky lg:top-20">
          <h2 className="font-title text-lg font-bold text-nout-texte mb-4">Récapitulatif</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Article</span><span>{formatPrice(listing.price)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span className="flex items-center gap-1">Protection acheteur <span className="text-gray-400">(10 % + 0,25 €)</span></span>
              <span>{formatPrice(protectionFee)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{isDelivery ? `Livraison (${SHIPPING_METHODS[shipMethod].label.replace('Chronopost — ', '')})` : 'Remise en main propre'}</span>
              <span className={isDelivery ? '' : 'text-emerald-600 font-medium'}>{isDelivery ? formatPrice(portFee) : 'Gratuit'}</span>
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
    </div>
  )
}
