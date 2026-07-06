import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { formatPrice } from '../../utils/formatters'

export default function AdminFinances() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    // Port figé sur la commande (shipping_fee) = source exacte, tous transporteurs. Le PORT par mode
    // n'est qu'un REPLI pour les anciennes commandes sans shipping_fee (sinon UBN relais/domicile serait
    // surestimé au tarif Chronopost et la commission afficherait un faux négatif).
    const PORT = { hand: 0, relay: 6.51, home: 10.80 }
    Promise.all([
      supabase.from('orders').select('total_price, seller_payout, shipping_method, shipping_fee').eq('status', 'paid'),
      supabase.from('orders').select('total_price').eq('status', 'delivered'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ]).then(([paid, delivered, total]) => {
      const paidRows       = paid.data ?? []
      const paidTotal      = paidRows.reduce((s, o) => s + Number(o.total_price), 0)
      const deliveredTotal = (delivered.data ?? []).reduce((s, o) => s + Number(o.total_price), 0)
      // Commission NOUT (brute, avant frais Stripe) = total encaissé − reversé au vendeur − port.
      // Modèle protection acheteur : le vendeur reçoit le PRIX PLEIN, donc commission = la protection (10%+0,25€).
      // Fallback si seller_payout non figé (vieilles commandes) : estimation à partir du total hors port.
      const commission = paidRows.reduce((s, o) => {
        const port = o.shipping_fee != null ? Number(o.shipping_fee) : (PORT[o.shipping_method] ?? 0)
        const payout = o.seller_payout != null
          ? Number(o.seller_payout)
          : (Number(o.total_price) - port) / 1.10
        return s + (Number(o.total_price) - payout - port)
      }, 0)
      setStats({ paidTotal, commission, deliveredTotal, totalOrders: total.count ?? 0 })
    }).catch((err) => {
      console.error('[admin] chargement des finances échoué :', err?.message)
      setStats({ paidTotal: 0, commission: 0, deliveredTotal: 0, totalOrders: 0 })
    })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Finances</h1>

      {!stats ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Volume total payé',     value: formatPrice(stats.paidTotal),      icon: '' },
            { label: 'Commission NOUT (10% + 0,25€)',  value: formatPrice(stats.commission),      icon: '', color: 'text-green-600' },
            { label: 'Volume livré',           value: formatPrice(stats.deliveredTotal), icon: '' },
            { label: 'Total commandes',        value: stats.totalOrders,                icon: '' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-400">{label}</p>
              <p className={`text-2xl font-extrabold mt-1 ${color ?? 'text-nout-primary'}`}>{value}</p>
              <span className="text-2xl mt-2 block">{icon}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-nout-dark mb-2">Configuration Stripe</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Les paiements sont gérés via <strong>Stripe Connect</strong>. Les frais de protection acheteur (<strong>10 % + 0,25 €</strong>) sont payés par l'acheteur, en plus du prix. Les vendeurs reçoivent l'intégralité de leur prix sur leur compte bancaire via Stripe Express.
        </p>
        <p className="text-xs text-gray-400 mt-2">Dashboard complet sur <strong>dashboard.stripe.com</strong></p>
      </div>
    </div>
  )
}
