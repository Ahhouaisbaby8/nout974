import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabase'
import { formatPrice } from '../../utils/formatters'

// Statuts « vente aboutie » = argent réellement gagné par NOUT. On EXCLUT
// pending (paiement non abouti), cancelled, refunded, chargeback, disputed.
const SETTLED_STATUSES = ['paid', 'shipped', 'delivered', 'completed', 'payout_pending']

// Repli port pour les vieilles commandes sans shipping_fee figé (sinon UBN serait
// surestimé au tarif Chronopost et la commission afficherait un faux négatif).
const PORT = { hand: 0, relay: 6.51, home: 10.80 }

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

// Commission NOUT (brute, avant frais Stripe) d'une commande = total − reversé vendeur − port.
// Modèle protection acheteur : le vendeur reçoit le PRIX PLEIN → la commission = la protection (10 %+0,25 €).
function commissionOf(o) {
  const port = o.shipping_fee != null ? Number(o.shipping_fee) : (PORT[o.shipping_method] ?? 0)
  const payout = o.seller_payout != null ? Number(o.seller_payout) : (Number(o.total_price) - port) / 1.10
  return Number(o.total_price) - payout - port
}

export default function AdminFinances() {
  const [orders, setOrders] = useState(null)   // toutes les commandes abouties (chargées une fois)
  const [error, setError]   = useState('')

  // Sélection de période. year='all' = toute la période ; month='all' = toute l'année ;
  // day='all' = tout le mois. Le jour n'a de sens que si un mois est choisi.
  const [year, setYear]   = useState('all')
  const [month, setMonth] = useState('all')
  const [day, setDay]     = useState('all')

  useEffect(() => {
    supabase
      .from('orders')
      .select('total_price, seller_payout, shipping_method, shipping_fee, status, created_at')
      .in('status', SETTLED_STATUSES)
      .then(({ data, error }) => {
        if (error) { console.error('[admin] finances :', error.message); setError('Chargement impossible.'); setOrders([]); return }
        setOrders(data ?? [])
      })
  }, [])

  // Années présentes dans les données (pour peupler le menu Année).
  const years = useMemo(() => {
    if (!orders) return []
    const set = new Set(orders.map(o => new Date(o.created_at).getFullYear()))
    return [...set].sort((a, b) => b - a)
  }, [orders])

  // Nombre de jours du mois sélectionné (pour peupler le menu Jour ; défaut 31).
  const daysInMonth = useMemo(() => {
    if (year === 'all' || month === 'all') return 31
    return new Date(Number(year), Number(month) + 1, 0).getDate()
  }, [year, month])

  // Commandes filtrées sur la période choisie.
  const filtered = useMemo(() => {
    if (!orders) return []
    return orders.filter(o => {
      const d = new Date(o.created_at)
      if (year !== 'all' && d.getFullYear() !== Number(year)) return false
      if (month !== 'all' && d.getMonth() !== Number(month)) return false
      if (day !== 'all' && d.getDate() !== Number(day)) return false
      return true
    })
  }, [orders, year, month, day])

  // Stats recalculées pour la période.
  const stats = useMemo(() => {
    const paidTotal      = filtered.reduce((s, o) => s + Number(o.total_price), 0)
    const commission     = filtered.reduce((s, o) => s + commissionOf(o), 0)
    const deliveredTotal = filtered
      .filter(o => o.status === 'delivered' || o.status === 'completed')
      .reduce((s, o) => s + Number(o.total_price), 0)
    return { paidTotal, commission, deliveredTotal, totalOrders: filtered.length }
  }, [filtered])

  // Libellé lisible de la période sélectionnée (pour l'affichage).
  const periodeLabel = year === 'all'
    ? 'Toute la période'
    : month === 'all'
      ? `Année ${year}`
      : day === 'all'
        ? `${MOIS[Number(month)]} ${year}`
        : `${day} ${MOIS[Number(month)]} ${year}`

  const selectCls = 'border border-nout-border rounded-lg px-3 py-2 text-sm bg-white cursor-pointer focus:outline-none focus:border-[#00C4B4]'

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Finances</h1>

      {/* Filtres période */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select
          value={year}
          onChange={(e) => { setYear(e.target.value); if (e.target.value === 'all') { setMonth('all'); setDay('all') } }}
          className={selectCls}
        >
          <option value="all">Toutes les années</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        <select
          value={month}
          onChange={(e) => { setMonth(e.target.value); setDay('all') }}
          disabled={year === 'all'}
          className={`${selectCls} ${year === 'all' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="all">Tous les mois</option>
          {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>

        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          disabled={year === 'all' || month === 'all'}
          className={`${selectCls} ${(year === 'all' || month === 'all') ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="all">Tous les jours</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <span className="text-sm text-gray-400">· {periodeLabel}</span>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {!orders ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Volume total payé',              value: formatPrice(stats.paidTotal) },
            { label: 'Commission NOUT (protection acheteur)',  value: formatPrice(stats.commission), color: 'text-green-600' },
            { label: 'Volume livré',                   value: formatPrice(stats.deliveredTotal) },
            { label: 'Ventes abouties',                value: stats.totalOrders },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-400">{label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${color ?? 'text-nout-primary'}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-nout-dark mb-2">Configuration Stripe</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Les paiements sont gérés via <strong>Stripe Connect</strong>. Les frais de protection acheteur (<strong>10 % + 0,25 €</strong>) sont payés par l'acheteur, en plus du prix. Les vendeurs reçoivent l'intégralité de leur prix sur leur compte bancaire via Stripe Express.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Chiffres calculés sur les <strong>ventes abouties</strong> (payées, expédiées, livrées, terminées) — hors annulées et remboursées. Détail comptable complet sur <strong>dashboard.stripe.com</strong>.
        </p>
      </div>
    </div>
  )
}
