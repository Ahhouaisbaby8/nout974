import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { formatPrice } from '../utils/formatters'
import { getDeliveryOption, SHIPPING_METHODS } from '../utils/shipping'
import { thumbUrl } from '../utils/image'
import { CheckCircle2, Truck, Store } from 'lucide-react'
import Spinner from '../components/ui/Spinner'

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const orderId  = params.get('commande')

  const [order, setOrder]     = useState(null)
  const [loading, setLoading] = useState(true)

  // Récupère la commande pour un vrai récap (titre / prix payé / mode). RLS : l'acheteur lit sa propre
  // commande. Fail-safe : si la lecture échoue, on retombe sur l'affichage minimal (n° de commande).
  useEffect(() => {
    if (!orderId) { setLoading(false); return }
    let cancelled = false
    supabase
      .from('orders')
      .select('id, total_price, status, shipping_method, delivery_option, carrier, relay_label, listing:listings!listing_id(title, price, images)')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setOrder(data ?? null) })
      .catch(() => { if (!cancelled) setOrder(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orderId])

  const isDelivery = order ? (order.shipping_method && order.shipping_method !== 'hand') : false
  const modeLabel  = order
    ? (order.delivery_option
        ? getDeliveryOption(order.delivery_option).label
        : (SHIPPING_METHODS[order.shipping_method]?.label ?? (isDelivery ? 'Livraison' : 'Remise en main propre')))
    : null
  const listing = order?.listing
  const img     = thumbUrl(listing?.images?.[0] ?? null)

  return (
    <div className="min-h-screen bg-nout-secondary flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-nout-dark mb-2">Paiement réussi !</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Ton paiement est sécurisé et protégé par NOUT.
        </p>

        {loading ? (
          <div className="py-6 flex justify-center"><Spinner /></div>
        ) : order ? (
          <>
            {/* Récap de l'article acheté */}
            <div className="bg-nout-secondary rounded-xl p-4 flex gap-3 items-center text-left mb-4">
              <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {img && <img src={img} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-nout-dark truncate">{listing?.title ?? 'Article'}</p>
                <p className="text-sm font-bold text-nout-primary">{formatPrice(order.total_price)}</p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                  {isDelivery ? <Truck className="w-3 h-3" /> : <Store className="w-3 h-3" />}
                  {modeLabel}
                </p>
              </div>
            </div>

            {/* Prochaine étape — dépend du mode (livraison vs main propre) */}
            <div className="bg-[#EAF6F5] border border-[#B9E5E1] rounded-xl p-4 text-left mb-6">
              <p className="text-[13px] font-semibold text-[#0E7FAB] mb-1">Prochaine étape</p>
              <p className="text-[12px] text-gray-600 leading-relaxed">
                {isDelivery
                  ? `Le vendeur va préparer et expédier ton colis. Tu pourras suivre son acheminement depuis « Mes commandes ». Ton paiement reste protégé jusqu'à la réception.`
                  : `Le vendeur va te contacter via la messagerie pour organiser la remise. Un code à 6 chiffres t'a été envoyé par e-mail (et il est dans « Mes commandes ») : donne-le au vendeur au moment de la remise pour débloquer son paiement. Ton argent reste protégé jusque-là.`}
              </p>
            </div>
          </>
        ) : (
          <div className="bg-nout-secondary rounded-xl p-4 text-left mb-6">
            <p className="text-xs text-gray-400 mb-1">Numéro de commande</p>
            <p className="text-sm font-mono text-nout-dark break-all">{orderId ?? '—'}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link to="/commandes?tab=achats" className="btn-primary w-full text-center">
            Voir ma commande
          </Link>
          <Link to="/" className="text-sm text-nout-primary hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
