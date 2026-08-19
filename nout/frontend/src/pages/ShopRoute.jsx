import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ShopPage from './ShopPage'
import NotFound from './NotFound'
import { loadProFonts, RESERVED_SLUGS } from './pro/proData'
import { getShopBySlug, getShopListings, SHOPS_TABLE_MISSING } from '../services/shops'

// ─── nout.re/<slug> : la boutique d'un pro, à sa marque ─────────────────────────────
// Route attrape-tout d'un seul segment, montée en DERNIER : toutes les routes fixes de
// NOUT (/aide, /recherche, /publier…) sont prioritaires, et une adresse inconnue
// retombe sur la page 404 habituelle. Les slugs réservés sont refusés à la création.
export default function ShopRoute() {
  const { slug } = useParams()
  const [state, setState] = useState({ loading: true, shop: null, listings: [] })

  useEffect(() => { loadProFonts() }, [])

  useEffect(() => {
    let alive = true
    setState({ loading: true, shop: null, listings: [] })
    // Une adresse qui ne peut pas être une boutique (réservée, ou hors format) ne
    // déclenche aucune requête : sinon la moindre URL erronée irait taper la base.
    const s = String(slug || '').toLowerCase()
    if (!/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$/.test(s) || RESERVED_SLUGS.has(s)) {
      setState({ loading: false, shop: null, listings: [] })
      return () => { alive = false }
    }
    ;(async () => {
      try {
        const shop = await getShopBySlug(slug)
        if (!alive) return
        if (!shop) { setState({ loading: false, shop: null, listings: [] }); return }
        const listings = await getShopListings(shop.id)
        if (alive) setState({ loading: false, shop, listings })
      } catch (e) {
        // Table absente (migration pas encore exécutée) ou panne : on ne bloque pas le
        // site, l'adresse se comporte comme une page inconnue.
        if (e?.message !== SHOPS_TABLE_MISSING) console.error('Boutique :', e)
        if (alive) setState({ loading: false, shop: null, listings: [] })
      }
    })()
    return () => { alive = false }
  }, [slug])

  if (state.loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="w-7 h-7 rounded-full border-2 border-nout-turquoise border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!state.shop) return <NotFound />

  // Les réglages de présentation vivent dans `settings` (JSON) : on les remonte au
  // niveau attendu par la vitrine, qui les lit à plat.
  const s = state.shop.settings || {}
  return (
    <ShopPage
      shop={{ ...state.shop, ...s }}
      listings={state.listings}
      wide={typeof window !== 'undefined' && window.innerWidth >= 900}
      browsable
      standalone
    />
  )
}
