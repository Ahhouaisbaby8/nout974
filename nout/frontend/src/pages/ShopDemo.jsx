import { useEffect, useState } from 'react'
import ShopPage from './ShopPage'
import { DEMOS, TPL_ORDER, themeById, demoShop, demoListings, loadProFonts } from './pro/proData'

// ─── APERÇU LOCAL de NOUT Pro (DEV UNIQUEMENT) ──────────────────────────────────────
// Route montée seulement en dev (`import.meta.env.DEV` dans App.jsx) → JAMAIS en prod.
// Fait défiler les 15 boutiques-démo (sélecteur en haut) pour juger chaque template
// avec de vraies données fictives. Aucune base touchée.

export default function ShopDemo() {
  const [id, setId] = useState('lumina')
  useEffect(() => { loadProFonts() }, [])
  const d = DEMOS[id]

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 pt-4 flex items-center gap-3 flex-wrap">
        <div className="text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
          Aperçu NOUT Pro — démo locale (données fictives)
        </div>
        <select value={id} onChange={(e) => setId(e.target.value)}
                className="text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-nout-texte">
          {TPL_ORDER.map((k) => (
            <option key={k} value={k}>{DEMOS[k].brand} — thème {themeById(DEMOS[k].template).name}</option>
          ))}
        </select>
      </div>
      <div className="max-w-lg mx-auto my-5 rounded-2xl overflow-hidden shadow-xl border border-gray-200">
        <ShopPage key={id} shop={demoShop(d)} listings={demoListings(d)} browsable />
      </div>
    </>
  )
}
