import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { getMyShops, getShopQuota, unpublishShop, DEFAULT_SHOP_QUOTA, SHOPS_TABLE_MISSING } from '../../services/shops'

// ─── Espace pro : le tableau de bord d'un vendeur qui a une boutique ────────────────
// Répond à deux questions, celles qu'on se pose vraiment quand on tient une boutique :
// « où j'en suis de mes 10 ventes du mois ? » et « ma boutique est-elle en ligne ? ».
// Lecture seule : aucun mouvement d'argent ne part d'ici, le versement reste piloté
// par l'escrow et « Mon argent ».

const SEUIL_GRATUIT = 10
const PRIX_MENSUEL = '9,99 €'
// Une « vente » = une commande payée que personne n'a annulée. On exclut donc les
// statuts d'échec plutôt que d'énumérer les statuts de succès : si un nouveau statut
// intermédiaire apparaît un jour, il comptera — plutôt que d'être silencieusement perdu.
const NON_COMPTEES = new Set(['cancelled', 'refunded', 'disputed', 'pending', 'failed', 'expired'])

const moisCourant = () => {
  const d = new Date()
  return { debut: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(),
           label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) }
}

export default function ProSpace() {
  const { user } = useAuth()
  const [shops, setShops] = useState([])
  const [quota, setQuota] = useState(DEFAULT_SHOP_QUOTA)
  const [ventes, setVentes] = useState(null)
  const [etat, setEtat] = useState('chargement')   // chargement | pret | absent
  const { debut, label } = moisCourant()

  useEffect(() => {
    if (!user) return
    let vivant = true
    ;(async () => {
      try {
        const [mes, q] = await Promise.all([getMyShops(user.id), getShopQuota(user.id)])
        if (!vivant) return
        setShops(mes); setQuota(q); setEtat('pret')
      } catch (e) {
        if (vivant) setEtat(e?.message === SHOPS_TABLE_MISSING ? 'absent' : 'pret')
      }
      // compteur de ventes du mois — indépendant de la table des boutiques
      const { data } = await supabase
        .from('orders').select('status').eq('seller_id', user.id).gte('created_at', debut)
      if (vivant) setVentes((data ?? []).filter((o) => !NON_COMPTEES.has(o.status)).length)
    })()
    return () => { vivant = false }
  }, [user, debut])

  const n = ventes ?? 0
  const gratuite = n >= SEUIL_GRATUIT
  const reste = Math.max(0, SEUIL_GRATUIT - n)
  const pct = Math.min(100, Math.round((n / SEUIL_GRATUIT) * 100))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <title>Espace pro — NOUT</title>
      <div className="flex items-center gap-3 mb-6">
        <p className="font-title font-extrabold text-nout-texte">NOUT <span className="text-[11px] font-bold text-nout-turquoise bg-[#EAF5F3] px-2 py-0.5 rounded-full align-middle">Pro</span></p>
        <div className="flex-1" />
        <Link to="/boutique-tarifs" className="text-[12.5px] font-semibold text-nout-turquoise">Voir l'offre</Link>
      </div>

      {/* ── compteur des 10 ventes ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Ventes de {label}</p>
            <p className="font-title text-[28px] font-bold text-nout-texte leading-none mt-1">
              {ventes === null ? '—' : n}<span className="text-[15px] font-semibold text-gray-400"> / {SEUIL_GRATUIT}</span>
            </p>
          </div>
          <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full ${
            gratuite ? 'text-[#0B716A] bg-[#EAF5F3]' : 'text-amber-800 bg-amber-50'}`}>
            {gratuite ? 'Boutique offerte ce mois-ci' : `Ce mois-ci : ${PRIX_MENSUEL}`}
          </span>
        </div>

        <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-4">
          <div className="h-full rounded-full bg-nout-turquoise transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        <p className="text-[13px] text-gray-500 leading-relaxed mt-3">
          {gratuite
            ? `Tu as dépassé les ${SEUIL_GRATUIT} ventes : ta boutique ne te coûte rien ce mois-ci. Le compteur repart au 1er du mois prochain.`
            : `Encore ${reste} vente${reste > 1 ? 's' : ''} avant que ta boutique soit offerte pour ${label}. En dessous de ${SEUIL_GRATUIT}, elle est facturée ${PRIX_MENSUEL} pour le mois.`}
        </p>
        <p className="text-[11.5px] text-gray-400 leading-relaxed mt-1.5">
          Une vente comptée = une commande payée et non annulée. Les commandes remboursées ou en litige
          ne comptent pas. L'abonnement est décompté à la fin du mois, jamais d'avance.
        </p>
      </div>

      {/* ── mes boutiques ── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-title text-[17px] font-bold text-nout-texte">Mes boutiques</h2>
          <span className="text-[12px] text-gray-400">{shops.length} / {quota}</span>
        </div>

        {etat === 'chargement' && <p className="text-[13px] text-gray-400">Chargement…</p>}

        {etat === 'absent' && (
          <p className="text-[13px] text-amber-800 bg-amber-50 rounded-lg px-3.5 py-2.5 leading-relaxed">
            L'enregistrement des boutiques n'est pas encore activé sur ce site. Tu peux déjà créer et
            personnaliser la tienne : elle reste dans ton navigateur en attendant.
          </p>
        )}

        {etat === 'pret' && shops.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[13.5px] text-gray-500 mb-3">Tu n'as pas encore de boutique.</p>
            <Link to="/boutique-creer" className="btn-primary !px-6">Créer ma boutique</Link>
          </div>
        )}

        {shops.map((s) => (
          <div key={s.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-3.5 py-3 mb-2 flex-wrap">
            <span className="w-9 h-9 rounded-lg flex-shrink-0" style={{ background: s.accent_color || '#0E8C82' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-nout-texte truncate">{s.name}</p>
              <p className="text-[11.5px] text-gray-400 truncate">nout.re/{s.slug}</p>
            </div>
            <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
              s.is_active ? 'text-[#0B716A] bg-[#EAF5F3]' : 'text-gray-500 bg-gray-100'}`}>
              {s.is_active ? 'En ligne' : 'Brouillon'}
            </span>
            <Link to={`/boutique-creer?shop=${s.id}`} className="text-[12.5px] font-semibold text-nout-turquoise flex-shrink-0">Modifier</Link>
            {s.is_active && <Link to={`/${s.slug}`} className="text-[12.5px] font-semibold text-gray-400 flex-shrink-0">Voir</Link>}
            {s.is_active && (
              <button type="button" onClick={() => unpublishShop(s.id).then(() => setShops((l) => l.map((x) => (x.id === s.id ? { ...x, is_active: false } : x))))}
                      className="text-[12.5px] font-semibold text-gray-400 hover:text-nout-texte flex-shrink-0">Dépublier</button>
            )}
          </div>
        ))}

        {etat === 'pret' && shops.length > 0 && shops.length < quota && (
          <Link to="/boutique-creer" className="btn-secondary !py-2 !px-4 !text-[12.5px] inline-block mt-1">Créer une autre boutique</Link>
        )}
        {etat === 'pret' && shops.length >= quota && (
          <p className="text-[12px] text-gray-400 leading-relaxed mt-2">
            Tu as atteint le nombre de boutiques autorisé sur ce compte. Écris-nous depuis l'aide si ton
            activité en demande davantage : on relève la limite au cas par cas.
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mt-4">
        <Link to="/espace-pro/clients" className="btn-secondary !px-5">Mes clients</Link>
        <Link to="/compte/paiements" className="btn-secondary !px-5">Mon argent</Link>
        <Link to="/boutique-creer" className="btn-secondary !px-5">Personnaliser</Link>
      </div>
    </div>
  )
}
