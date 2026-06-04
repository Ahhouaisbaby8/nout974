import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { formatPrice } from '../../utils/formatters'

export default function AdminFinances() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('orders').select('total_price').eq('status', 'paid'),
      supabase.from('orders').select('total_price').eq('status', 'delivered'),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
    ]).then(([paid, delivered, total]) => {
      const paidTotal      = (paid.data ?? []).reduce((s, o) => s + Number(o.total_price), 0)
      const deliveredTotal = (delivered.data ?? []).reduce((s, o) => s + Number(o.total_price), 0)
      setStats({ paidTotal, commission: paidTotal * 0.10, deliveredTotal, totalOrders: total.count ?? 0 })
    })
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Finances</h1>

      {!stats ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Volume total payé',     value: formatPrice(stats.paidTotal),      icon: '💳' },
            { label: 'Commission NOUT (10%)', value: formatPrice(stats.commission),      icon: '🏦', color: 'text-green-600' },
            { label: 'Volume livré',           value: formatPrice(stats.deliveredTotal), icon: '✅' },
            { label: 'Total commandes',        value: stats.totalOrders,                icon: '📦' },
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
          Les paiements sont gérés via <strong>Stripe Connect</strong>. NOUT prélève automatiquement <strong>10 %</strong> de commission. Les vendeurs reçoivent le solde sur leur compte bancaire via Stripe Express.
        </p>
        <p className="text-xs text-gray-400 mt-2">Dashboard complet sur <strong>dashboard.stripe.com</strong></p>
      </div>
    </div>
  )
}
