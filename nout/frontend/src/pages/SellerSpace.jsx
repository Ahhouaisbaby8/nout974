import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getSellerDashboard } from '../services/sellerStats'
import { formatPrice, formatDate } from '../utils/formatters'
import { SHIPPING_METHODS } from '../utils/shipping'
import Spinner from '../components/ui/Spinner'
import { Handshake, Truck, ChevronRight } from 'lucide-react'

// Libellés des statuts de commande — sobres, une teinte neutre, accent discret
const STATUS = {
  paid:           'En attente de remise',
  payout_pending: 'Virement en attente',
  completed:      'Versé',
  shipped:        'Expédiée',
  refunded:       'Remboursé',
  cancelled:      'Annulé',
  pending:        'En cours',
  disputed:       'Litige',
}

const ShipIcon = ({ method, className }) =>
  method === 'hand'
    ? <Handshake className={className} />
    : <Truck className={className} />

// Bloc de solde : sobre, fond blanc, bordure fine, chiffre net (pas de gradient ni couleur criarde)
function SoldeBox({ label, amount, accent = false }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-title text-xl ${accent ? 'text-nout-primary' : 'text-nout-dark'}`}>
        {formatPrice(amount)}
      </p>
    </div>
  )
}

function StatBox({ value, label }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <p className="font-title text-lg text-nout-dark leading-none">{value}</p>
      <p className="text-[11px] text-gray-400 mt-1.5">{label}</p>
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
      <p className="text-lg font-medium text-nout-dark">Impossible de charger l'espace vendeur</p>
      <Link to="/" className="btn-primary mt-6 px-8 inline-block">Retour à l'accueil</Link>
    </div>
  )

  const { solde, stats, sales, activeListings } = data
  const ventes = sales.filter(o => ['paid', 'payout_pending', 'completed', 'shipped'].includes(o.status))

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* En-tête sobre */}
      <h1 className="font-title text-2xl text-nout-dark mb-1">Espace Vendeur</h1>
      <p className="text-sm text-gray-400 mb-8">Suis tes gains et ton activité.</p>

      {/* ── SOLDE & GAINS ── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4 pb-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">Total gagné</span>
          <span className="font-title text-3xl text-nout-dark tracking-tight">{formatPrice(solde.totalGagne)}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <SoldeBox label="En attente de remise" amount={solde.enAttenteRemise} />
          <SoldeBox label="Virement en attente" amount={solde.aVerser} />
          <SoldeBox label="Déjà versé" amount={solde.verse} accent />
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Tu reçois le prix de ton article. Les frais de service et de livraison sont payés par l'acheteur.
          Le virement est débloqué une fois la remise confirmée avec le code à 6 chiffres.
        </p>
      </section>

      {/* ── STATS ── */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Statistiques</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <StatBox value={stats.annoncesActives} label="Annonces en ligne" />
          <StatBox value={stats.nbVentes} label="Ventes" />
          <StatBox value={stats.totalViews} label="Vues totales" />
          <StatBox value={formatPrice(stats.panierMoyen)} label="Panier moyen" />
          <StatBox
            value={stats.noteCount > 0 ? `${stats.noteMoyenne}` : '—'}
            label={stats.noteCount > 0 ? `${stats.noteCount} avis` : 'Pas d\'avis'}
          />
        </div>
      </section>

      {/* ── MES VENTES ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">Mes ventes</h2>
          <Link to="/commandes?tab=ventes" className="text-xs text-nout-primary hover:underline">
            Tout voir
          </Link>
        </div>
        {ventes.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            Aucune vente pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {ventes.slice(0, 8).map(o => {
              const img = o.listing?.images?.[0]
              return (
                <Link
                  key={o.id}
                  to="/commandes?tab=ventes"
                  className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-gray-300 transition-colors"
                >
                  <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-nout-dark truncate">{o.listing?.title ?? 'Article'}</p>
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <span>{o.buyer?.username ? `${o.buyer.username} · ` : ''}{formatDate(o.created_at)}</span>
                      {o.shipping_method && SHIPPING_METHODS[o.shipping_method] && (
                        <ShipIcon method={o.shipping_method} className="w-3 h-3 text-gray-300" />
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-title text-nout-dark">{formatPrice(o.listing?.price ?? 0)}</p>
                    <span className="text-[11px] text-gray-400">{STATUS[o.status] ?? o.status}</span>
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
          <h2 className="text-sm font-medium text-gray-500">Mes annonces en ligne</h2>
          <Link to="/publier" className="text-xs text-nout-primary hover:underline">
            Publier
          </Link>
        </div>
        {activeListings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            Aucune annonce active.
          </div>
        ) : (
          <div className="space-y-2">
            {activeListings.slice(0, 10).map(l => (
              <Link
                key={l.id}
                to={`/annonce/${l.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-gray-300 transition-colors"
              >
                <div className="w-11 h-11 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {l.images?.[0] && <img src={l.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-nout-dark truncate">{l.title}</p>
                  <p className="text-[11px] text-gray-400">{l.views ?? 0} vue{(l.views ?? 0) !== 1 ? 's' : ''}</p>
                </div>
                <p className="font-title text-nout-dark flex-shrink-0">{formatPrice(l.price)}</p>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
