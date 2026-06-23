import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSellerDashboard } from '../services/sellerStats'
import { formatPrice, formatDate } from '../utils/formatters'
import { SHIPPING_METHODS } from '../utils/shipping'
import Spinner from '../components/ui/Spinner'
import {
  Wallet, Clock, Send, CheckCircle, Eye, Star, Package, TrendingUp, Tag, ChevronRight,
  Handshake, Truck,
} from 'lucide-react'

const ShipIcon = ({ method, className }) =>
  method === 'hand'
    ? <Handshake className={className} />
    : <Truck className={className} />

// Libellés + couleurs des statuts de commande (cohérent avec Orders.jsx)
const STATUS = {
  paid:           { label: 'En attente de remise', color: 'text-blue-600 bg-blue-50' },
  payout_pending: { label: 'Virement en attente',  color: 'text-amber-600 bg-amber-50' },
  completed:      { label: 'Versé',                color: 'text-emerald-600 bg-emerald-50' },
  shipped:        { label: 'Expédiée',             color: 'text-sky-600 bg-sky-50' },
  refunded:       { label: 'Remboursé',            color: 'text-gray-500 bg-gray-100' },
  cancelled:      { label: 'Annulé',               color: 'text-gray-500 bg-gray-100' },
  pending:        { label: 'En cours',             color: 'text-gray-400 bg-gray-50' },
  disputed:       { label: 'Litige',               color: 'text-red-600 bg-red-50' },
}

function SoldeCard({ icon: Icon, label, amount, tone }) {
  const tones = {
    blue:    'from-[#0E7FAB] to-[#00C4B4]',
    amber:   'from-amber-400 to-amber-500',
    green:   'from-emerald-500 to-emerald-600',
    primary: 'from-[#0A0F2C] to-[#1A3A8F]',
  }
  return (
    <div className={`rounded-2xl p-4 text-white bg-gradient-to-br ${tones[tone]} shadow-nout-md`}>
      <div className="flex items-center gap-2 mb-2 opacity-90">
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <p className="font-title font-extrabold text-2xl">{formatPrice(amount)}</p>
    </div>
  )
}

function StatBox({ icon: Icon, value, label }) {
  return (
    <div className="bg-white rounded-xl border border-[#D6E0F5] p-3 text-center">
      <Icon className="w-5 h-5 mx-auto text-nout-primary mb-1" />
      <p className="font-title font-bold text-lg text-nout-dark leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export default function SellerSpace() {
  const { user } = useAuth()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  useEffect(() => {
    document.title = 'Espace Vendeur | NOUT 974'
    getSellerDashboard(user.id)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
    return () => { document.title = 'NOUT — Marketplace seconde main La Réunion 974' }
  }, [user.id])

  if (loading) return <div className="py-24"><Spinner /></div>
  if (error || !data) return (
    <div className="text-center py-24 text-gray-400">
      <p className="text-lg font-semibold text-nout-dark">Impossible de charger l'espace vendeur</p>
      <Link to="/" className="btn-primary mt-6 px-8 inline-block">Retour à l'accueil</Link>
    </div>
  )

  const { solde, stats, sales, activeListings } = data
  const ventes = sales.filter(o => ['paid', 'payout_pending', 'completed', 'shipped'].includes(o.status))

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-5">
        <Wallet className="w-6 h-6 text-nout-primary" />
        <h1 className="font-title font-extrabold text-2xl text-nout-dark">Espace Vendeur</h1>
      </div>

      {/* ── SOLDE & GAINS ── */}
      <section className="mb-6">
        <SoldeCard icon={Wallet} label="Total gagné" amount={solde.totalGagne} tone="primary" />
        <div className="grid grid-cols-3 gap-3 mt-3">
          <SoldeCard icon={Clock} label="En attente de remise" amount={solde.enAttenteRemise} tone="blue" />
          <SoldeCard icon={Send} label="Virement en attente" amount={solde.aVerser} tone="amber" />
          <SoldeCard icon={CheckCircle} label="Déjà versé" amount={solde.verse} tone="green" />
        </div>
        <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
          Tu reçois le prix de ton article. Les frais de service et de livraison sont payés par l'acheteur.
          Le virement est débloqué une fois la remise confirmée avec le code à 6 chiffres.
        </p>
      </section>

      {/* ── STATS BUSINESS ── */}
      <section className="mb-6">
        <h2 className="font-title font-bold text-nout-dark mb-3">Mes statistiques</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <StatBox icon={Tag} value={stats.annoncesActives} label="Annonces en ligne" />
          <StatBox icon={Package} value={stats.nbVentes} label="Ventes" />
          <StatBox icon={Eye} value={stats.totalViews} label="Vues totales" />
          <StatBox icon={TrendingUp} value={formatPrice(stats.panierMoyen)} label="Panier moyen" />
          <StatBox
            icon={Star}
            value={stats.noteCount > 0 ? `${stats.noteMoyenne}★` : '—'}
            label={stats.noteCount > 0 ? `${stats.noteCount} avis` : 'Pas d\'avis'}
          />
        </div>
      </section>

      {/* ── MES VENTES ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-title font-bold text-nout-dark">Mes ventes</h2>
          <Link to="/commandes?tab=ventes" className="text-xs text-nout-primary font-semibold hover:underline">
            Tout voir
          </Link>
        </div>
        {ventes.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D6E0F5] p-6 text-center text-sm text-gray-400">
            Aucune vente pour le moment. Publie des articles pour commencer !
          </div>
        ) : (
          <div className="space-y-2">
            {ventes.slice(0, 8).map(o => {
              const st = STATUS[o.status] ?? STATUS.pending
              const img = o.listing?.images?.[0]
              return (
                <Link
                  key={o.id}
                  to="/commandes?tab=ventes"
                  className="flex items-center gap-3 bg-white rounded-xl border border-[#D6E0F5] p-3 hover:border-nout-turquoise transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-nout-dark truncate">{o.listing?.title ?? 'Article'}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <span>{o.buyer?.username ? `${o.buyer.username} · ` : ''}{formatDate(o.created_at)}</span>
                      {o.shipping_method && SHIPPING_METHODS[o.shipping_method] && (
                        <ShipIcon method={o.shipping_method} className="w-3 h-3 text-gray-400" />
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-title font-bold text-nout-dark">{formatPrice(o.listing?.price ?? 0)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* ── MES ANNONCES EN LIGNE ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-title font-bold text-nout-dark">Mes annonces en ligne</h2>
          <Link to="/publier" className="text-xs text-nout-primary font-semibold hover:underline">
            + Publier
          </Link>
        </div>
        {activeListings.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D6E0F5] p-6 text-center text-sm text-gray-400">
            Aucune annonce active.
          </div>
        ) : (
          <div className="space-y-2">
            {activeListings.slice(0, 10).map(l => (
              <Link
                key={l.id}
                to={`/annonce/${l.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-[#D6E0F5] p-3 hover:border-nout-turquoise transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nout-dark truncate">{l.title}</p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {l.views ?? 0} vue{(l.views ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="font-title font-bold text-nout-primary flex-shrink-0">{formatPrice(l.price)}</p>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
