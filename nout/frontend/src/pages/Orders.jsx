import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMyOrders } from '../services/orders'
import { formatPrice, formatDate } from '../utils/formatters'
import { trackingUrl, orderDeliveryLabel } from '../utils/shipping'
import Spinner from '../components/ui/Spinner'
import EscrowConfirm from '../components/EscrowConfirm'
import { supabase } from '../services/supabase'

const STATUS_LABELS = {
  pending:        { label: 'En attente',          color: 'bg-yellow-100 text-yellow-700' },
  paid:           { label: 'Paiement reçu',        color: 'bg-blue-100 text-blue-700' },
  completed:      { label: 'Remise faite',          color: 'bg-green-100 text-green-700' },
  payout_pending: { label: 'Virement en attente',  color: 'bg-orange-100 text-orange-700' },
  refunded:       { label: 'Remboursé',             color: 'bg-gray-100 text-gray-500' },
  shipped:        { label: 'Expédié',               color: 'bg-purple-100 text-purple-700' },
  delivered:      { label: 'Livré',                 color: 'bg-green-100 text-green-700' },
  cancelled:      { label: 'Annulé',                color: 'bg-gray-100 text-gray-500' },
  disputed:       { label: 'Litige',                color: 'bg-red-100 text-red-600' },
}

const STAR_LABELS = ['', 'Très décevant', 'Décevant', 'Correct', 'Bien', 'Excellent !']

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value
  return (
    <div className="flex justify-center gap-2">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          className="p-1 transition-transform hover:scale-110"
        >
          <svg
            className={`w-9 h-9 transition-colors ${i <= display ? 'fill-[#0E7FAB] stroke-[#0E7FAB]' : 'fill-none stroke-gray-300'}`}
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function ReviewModal({ order, onClose, onSubmitted }) {
  const [rating, setRating]     = useState(0)
  const [comment, setComment]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/submit-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ order_id: order.id, rating, comment: comment.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      onSubmitted()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="font-title font-extrabold text-[18px] text-nout-dark mb-1">
          Comment s'est passée la transaction ?
        </h3>
        <p className="text-xs text-gray-400 mb-5">{order.listing?.title ?? 'Article'}</p>

        <StarPicker value={rating} onChange={setRating} />

        {rating > 0 ? (
          <p className="text-center text-sm font-semibold text-[#0E7FAB] mt-2 mb-4">
            {STAR_LABELS[rating]}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        <textarea
          rows={3}
          placeholder="Décris ton expérience (optionnel)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          className="input-field resize-none mb-1 text-sm"
        />
        <p className="text-xs text-gray-400 text-right mb-4">{comment.length}/500</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="flex-1 py-3 rounded-xl bg-[#1A3A8F] text-white text-sm font-semibold hover:bg-[#0E7FAB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Publication…' : 'Publier mon avis'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BuyerEscrowCode({ orderId }) {
  const [code, setCode] = useState(null)

  useEffect(() => {
    supabase
      .from('escrow_codes')
      .select('code')
      .eq('order_id', orderId)
      .single()
      .then(({ data }) => { if (data?.code) setCode(data.code) })
  }, [orderId])

  if (!code) return null

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Mon code de remise
      </p>
      <p
        className="text-center font-extrabold font-mono py-2 mb-2"
        style={{ fontSize: '32px', color: '#007A6E', letterSpacing: '0.2em' }}
      >
        {code.split('').join(' ')}
      </p>
      <p className="text-xs text-gray-500 text-center mb-3 leading-relaxed">
        Présente ce code au vendeur lors de la remise pour confirmer que tu as bien reçu ton article.
      </p>
      <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
        <p className="text-xs text-orange-700 leading-relaxed">
          <strong>Ne donne ce code QU'APRÈS</strong> avoir vérifié et récupéré ton article. Ce code libère le paiement au vendeur.
        </p>
      </div>
    </div>
  )
}

// ── Bordereau UBN ────────────────────────────────────────────────────────────────
// Chronopost renvoie son étiquette en data URI persisté sur la commande (chronopost_label_url)
// → un simple <a href> suffit. UBN, lui, expose le bordereau derrière un endpoint AUTHENTIFIÉ
// (ubn-bordereau vérifie le JWT + que l'appelant est bien le VENDEUR, puis proxifie le HUB) :
// on ne peut donc pas y pointer un lien. Il faut fetch avec le token, puis déclencher le
// téléchargement du blob. Sans ça, le vendeur en livraison UBN n'a AUCUN moyen de récupérer
// son étiquette → colis bloqué (même symptôme que le bug étiquette Chronopost du 13/07).
async function downloadUbnBordereau(orderId) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/.netlify/functions/ubn-bordereau?order_id=${orderId}`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}))
    throw new Error(msg.error ?? 'Bordereau indisponible pour le moment.')
  }
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `bordereau-${orderId}.${blob.type.includes('zip') ? 'zip' : 'pdf'}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Bouton de téléchargement du bordereau UBN. Le HUB peut répondre « pas encore généré »
// (bordereau_unavailable) juste après la création : on affiche le message et le vendeur
// retente — le bouton reste disponible en permanence dans le bloc « Colis expédié ».
function UbnBordereauButton({ orderId }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleDownload = async () => {
    setError('')
    setLoading(true)
    try {
      await downloadUbnBordereau(orderId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={`text-sm font-semibold rounded-lg px-4 py-2 transition-colors ${
          loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#0E7FAB] text-white hover:bg-[#0A6A8F]'
        }`}
      >
        {loading ? 'Récupération…' : 'Télécharger le bordereau (PDF)'}
      </button>
      {error && <p className="w-full text-xs text-red-600 mt-1">{error}</p>}
    </>
  )
}

function SellerShippingPanel({ order, onShipped }) {
  const { user } = useAuth()
  const [trackingNumber, setTrackingNumber] = useState('')
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [success, setSuccess]               = useState(false)
  const [labelUrl, setLabelUrl]             = useState(null)

  // Uniquement pour les commandes en livraison (pas la remise en main propre)
  const isLivraison = order.shipping_method === 'relay' || order.shipping_method === 'home'
  if (!user || order.seller_id !== user.id || order.status !== 'paid' || !isLivraison) return null

  // Transporteur choisi par l'acheteur au checkout → génération d'étiquette automatique.
  const carrier = order.carrier // 'ubn' | 'chronopost' | null
  const isAuto = carrier === 'ubn' || carrier === 'chronopost'

  // ── Génère l'étiquette automatiquement via le bon transporteur ──
  const handleGenerate = async () => {
    setError('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const endpoint = carrier === 'chronopost'
        ? '/.netlify/functions/chronopost-create-shipment'
        : '/.netlify/functions/ubn-create-shipment'
      // UBN attend service + point relais ; Chronopost déduit tout de la commande.
      const payload = carrier === 'chronopost'
        ? { order_id: order.id }
        : {
            order_id: order.id,
            service: order.delivery_option === 'ubn_home' ? 'express' : 'relais',
            ubn_pr_user_id: order.ubn_pr_user_id || order.relay_id,
            ubn_pr_label: order.relay_label,
          }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      if (data.label_url) setLabelUrl(data.label_url)
      setSuccess(true)
      setTimeout(() => onShipped?.(), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Repli : saisie manuelle du numéro de suivi (transporteur non géré) ──
  const handleManual = async () => {
    if (!trackingNumber.trim()) { setError('Saisis le numéro de suivi.'); return }
    setError('')
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/update-order-shipping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ order_id: order.id, tracking_number: trackingNumber.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      setSuccess(true)
      setTimeout(() => onShipped?.(), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mt-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <p className="text-sm font-semibold text-green-700">Commande expédiée</p>
        <div className="flex flex-wrap items-center gap-4 mt-2">
          {labelUrl && (
            <a href={labelUrl} download={`etiquette-${order.id}.pdf`}
               className="text-sm font-semibold text-[#0E7FAB] underline">
              Télécharger l'étiquette (PDF)
            </a>
          )}
          {/* UBN ne renvoie pas d'étiquette à la création : elle se récupère via le HUB. */}
          {carrier === 'ubn' && <UbnBordereauButton orderId={order.id} />}
          {trackingUrl(order.carrier, order.chronopost_tracking_number || order.tracking_number) && (
            <a
              href={trackingUrl(order.carrier, order.chronopost_tracking_number || order.tracking_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-[#0E7FAB] underline"
            >
              Suivre le colis
            </a>
          )}
        </div>
      </div>
    )
  }

  const carrierName = carrier === 'chronopost' ? 'Chronopost' : carrier === 'ubn' ? 'UBN' : 'notre service de livraison'

  return (
    <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden">
      <div className="bg-blue-50 px-4 pt-4 pb-3 border-b border-blue-100">
        <h3 className="font-semibold text-nout-dark text-sm">Expédier cette commande</h3>
        <p className="text-xs text-gray-500 mt-0.5">Via {carrierName}</p>
      </div>
      <div className="px-4 py-4 bg-white flex flex-col gap-3">
        {/* Adresse de livraison fournie par l'acheteur (pour préparer le colis) */}
        {order.shipping_address && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Adresse de livraison</p>
            <p className="text-nout-texte">{order.buyer?.username}</p>
            <p className="text-nout-texte">{order.shipping_address}</p>
            <p className="text-nout-texte">{order.shipping_postcode} {order.shipping_city}</p>
            {order.relay_label && <p className="text-nout-texte mt-0.5">Point relais : {order.relay_label}</p>}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {isAuto ? (
          // Génération automatique de l'étiquette (UBN ou Chronopost)
          <>
            <p className="text-xs text-gray-500">
              Génère l'étiquette, imprime-la, colle-la sur ton colis et dépose-le.
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#0E7FAB] text-white hover:bg-[#0A6A8F]'
              }`}
            >
              {loading ? 'Génération…' : `Générer l'étiquette ${carrierName}`}
            </button>
          </>
        ) : (
          // Repli : saisie manuelle du numéro de suivi
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
                Numéro de suivi transporteur
              </label>
              <input
                type="text"
                placeholder="Ex : 974-XXXXXX"
                value={trackingNumber}
                onChange={(e) => { setTrackingNumber(e.target.value); setError('') }}
                maxLength={100}
                className="input-field text-sm"
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleManual}
              disabled={loading || !trackingNumber.trim()}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                loading || !trackingNumber.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#0E7FAB] text-white hover:bg-[#0A6A8F]'
              }`}
            >
              {loading ? 'Enregistrement…' : 'Marquer comme expédiée'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function BuyerTrackingPanel({ order, onConfirmed }) {
  const [loading, setLoading] = useState(false)   // 'received' | 'problem' | false
  const [error, setError]     = useState('')

  const callAction = async (action) => {
    setError('')
    setLoading(action)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/confirm-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ order_id: order.id, action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      onConfirmed?.()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      {order.tracking_number && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-nout-dark mb-2">Ton colis est en route</p>
          <p className="text-xs text-gray-500 mb-1">Numéro de suivi</p>
          <p className="text-sm font-mono font-bold text-[#0E7FAB] break-all">{order.tracking_number}</p>
          {trackingUrl(order.carrier, order.tracking_number) && (
            <a
              href={trackingUrl(order.carrier, order.tracking_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2.5 text-sm font-semibold text-white bg-[#0E7FAB] hover:bg-[#0A6A8F] rounded-lg px-4 py-2 transition-colors"
            >
              Suivre mon colis
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2">{error}</div>
      )}

      <p className="text-[12px] text-gray-500 text-center leading-relaxed">
        La réception est validée automatiquement via le suivi du transporteur. Ton paiement reste protégé
        jusque-là, tu n'as rien à faire.
      </p>
      <button
        type="button"
        onClick={() => callAction('problem')}
        disabled={!!loading}
        className="w-full text-[12px] text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        {loading === 'problem' ? 'Envoi…' : 'Signaler un problème avec ma commande'}
      </button>
    </div>
  )
}

export default function Orders() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())
  const [reviewTarget, setReviewTarget]   = useState(null)

  const tab = searchParams.get('tab') === 'ventes' ? 'ventes' : 'achats'
  const setTab = (t) => {
    setSearchParams({ tab: t }, { replace: true })
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    getMyOrders(user.id)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [user.id])

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('reviews')
      .select('order_id')
      .eq('buyer_id', user.id)
      .then(({ data }) => setReviewedOrderIds(new Set((data ?? []).map(r => r.order_id))))
  }, [user.id])

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  const achats = orders.filter(o => o.buyer_id === user.id)
  const ventes = orders.filter(o => o.seller_id === user.id)
  const liste  = tab === 'achats' ? achats : ventes

  return (
    <>
      {reviewTarget && (
        <ReviewModal
          order={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={() => {
            setReviewedOrderIds(prev => new Set([...prev, reviewTarget.id]))
            setReviewTarget(null)
          }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Mes commandes</h1>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 border-b border-nout-border">
          <button
            onClick={() => setTab('achats')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'achats' ? 'border-nout-primary text-nout-primary' : 'border-transparent text-gray-400'
            }`}
          >
            Mes achats ({achats.length})
          </button>
          <button
            onClick={() => setTab('ventes')}
            className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${
              tab === 'ventes' ? 'border-nout-primary text-nout-primary' : 'border-transparent text-gray-400'
            }`}
          >
            Mes ventes ({ventes.length})
          </button>
        </div>

        {liste.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">{tab === 'achats' ? '' : ''}</p>
            <p className="text-base font-semibold text-nout-dark">
              {tab === 'achats' ? "Tu n'as pas encore effectué d'achat." : "Tu n'as pas encore réalisé de vente."}
            </p>
            {tab === 'achats' && (
              <Link to="/recherche" className="btn-primary mt-6 px-8 inline-block">
                Parcourir les annonces
              </Link>
            )}
            {tab === 'ventes' && (
              <Link to="/publier" className="btn-primary mt-6 px-8 inline-block">
                Publier une annonce
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {liste.map(order => {
              const status = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-500' }
              const image  = order.listing?.images?.[0]
              const other  = tab === 'achats' ? order.seller : order.buyer
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link to={`/annonce/${order.listing?.id}`} className="flex-shrink-0">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                        {image ? (
                          <img src={image} alt={order.listing?.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300"></div>
                        )}
                      </div>
                    </Link>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/annonce/${order.listing?.id}`} className="flex-1 min-w-0">
                          <p className="font-semibold text-nout-dark text-sm truncate hover:text-nout-primary transition-colors">
                            {order.listing?.title ?? 'Article supprimé'}
                          </p>
                        </Link>
                        <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      {/* Achats : ce que l'acheteur a payé (prix + protection + port).
                          Ventes : ce que le vendeur reçoit (prix plein = seller_payout). */}
                      <p className="text-nout-primary font-extrabold mt-0.5">
                        {formatPrice(tab === 'achats'
                          ? order.total_price
                          : (order.seller_payout ?? order.listing?.price ?? order.total_price))}
                      </p>
                      {other && (
                        <p className="text-xs text-gray-400 mt-1">
                          {tab === 'achats' ? 'Vendeur' : 'Acheteur'} : {other.username}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
                      {orderDeliveryLabel(order) && (
                        <span className="inline-block mt-1 text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {orderDeliveryLabel(order)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confirmation escrow — vendeur, statut paid (remise en main propre) */}
                  <EscrowConfirm
                    order={order}
                    onConfirmed={() => getMyOrders(user.id).then(setOrders).catch(() => {})}
                  />

                  {/* Expédition — vendeur, statut paid (envoi par coursier) */}
                  <SellerShippingPanel
                    order={order}
                    onShipped={() => getMyOrders(user.id).then(setOrders).catch(() => {})}
                  />

                  {/* Vendeur : accès PERMANENT à l'étiquette (persistée en base) + suivi, dès qu'elle
                      existe et tant que la commande n'est pas annulée/remboursée. Corrige le bug où
                      l'étiquette n'était accessible qu'au 1er clic (perdue au refresh) → colis bloqué. */}
                  {tab === 'ventes'
                    && ['shipped', 'delivered', 'completed', 'payout_pending'].includes(order.status)
                    && (order.chronopost_label_url || order.tracking_number) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                        <p className="text-sm font-semibold text-nout-dark mb-1">Colis expédié</p>
                        {order.tracking_number && (
                          <>
                            <p className="text-xs text-gray-500 mb-1">Numéro de suivi</p>
                            <p className="text-sm font-mono font-bold text-[#0E7FAB] break-all mb-2">{order.tracking_number}</p>
                          </>
                        )}
                        <div className="flex flex-wrap items-center gap-4">
                          {order.chronopost_label_url && (
                            <a href={order.chronopost_label_url} download={`etiquette-${order.id}.pdf`}
                               className="text-sm font-semibold text-white bg-[#0E7FAB] hover:bg-[#0A6A8F] rounded-lg px-4 py-2 transition-colors">
                              Télécharger l'étiquette (PDF)
                            </a>
                          )}
                          {/* UBN : le bordereau vit chez le HUB → bouton (fetch authentifié),
                              disponible en permanence pour survivre au refresh. */}
                          {order.carrier === 'ubn' && <UbnBordereauButton orderId={order.id} />}
                          {trackingUrl(order.carrier, order.chronopost_tracking_number || order.tracking_number) && (
                            <a href={trackingUrl(order.carrier, order.chronopost_tracking_number || order.tracking_number)}
                               target="_blank" rel="noopener noreferrer"
                               className="text-sm font-semibold text-[#0E7FAB] underline">
                              Suivre le colis
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Code de remise — acheteur, statut paid */}
                  {tab === 'achats' && order.status === 'paid' && (
                    <BuyerEscrowCode orderId={order.id} />
                  )}

                  {/* Suivi livraison + confirmation de réception — acheteur, statut shipped */}
                  {tab === 'achats' && order.status === 'shipped' && (
                    <BuyerTrackingPanel
                      order={order}
                      onConfirmed={() => getMyOrders(user.id).then(setOrders).catch(() => {})}
                    />
                  )}

                  {/* Remise confirmée + avis — visible pour l'acheteur, statut completed */}
                  {tab === 'achats' && order.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-green-600">Remise confirmée</p>
                        {!reviewedOrderIds.has(order.id) ? (
                          <button
                            onClick={() => setReviewTarget(order)}
                            className="text-sm font-semibold text-[#0E7FAB] hover:text-[#1A3A8F] transition-colors"
                          >
                            Laisser un avis
                          </button>
                        ) : (
                          <p className="text-xs text-gray-400">Avis publié</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
