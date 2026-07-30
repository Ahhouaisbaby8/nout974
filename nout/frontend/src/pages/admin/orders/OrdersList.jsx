import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../services/supabase'
import { formatPrice, formatRelativeDate } from '../../../utils/formatters'

const STATUS = {
  pending:        { label: 'En attente',  color: 'bg-yellow-100 text-yellow-700' },
  paid:           { label: 'Payée',       color: 'bg-blue-100 text-blue-700' },
  shipped:        { label: 'Expédiée',    color: 'bg-purple-100 text-purple-700' },
  completed:      { label: 'Terminée',    color: 'bg-green-100 text-green-700' },
  payout_pending: { label: 'Virement en attente', color: 'bg-amber-100 text-amber-700' },
  refunded:       { label: 'Remboursée',  color: 'bg-gray-100 text-gray-500' },
  cancelled:      { label: 'Annulée',     color: 'bg-gray-100 text-gray-500' },
  disputed:       { label: 'Litige',      color: 'bg-red-100 text-red-600' },
}

// Fenêtre de protection acheteur : le versement auto part 48h APRÈS la livraison constatée.
const RECEIPT_WINDOW_H = 48

// État du VERSEMENT VENDEUR d'une commande : a-t-il reçu / dans combien de temps ?
// Déduit du statut + delivered_at (pas d'appel Stripe → instantané pour toute la liste).
function payoutState(o) {
  switch (o.status) {
    case 'completed':
      return { label: 'Vendeur payé', sub: 'versement effectué', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' }
    case 'payout_pending':
      return { label: 'Versement en cours', sub: 'en route vers le vendeur', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
    case 'delivered': {
      // Livré → payé automatiquement 48h après. On affiche le temps restant.
      if (!o.delivered_at) return { label: 'Bientôt', sub: 'livré, versement sous 48h', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
      const dueAt = new Date(o.delivered_at).getTime() + RECEIPT_WINDOW_H * 3600 * 1000
      const msLeft = dueAt - Date.now()
      if (msLeft <= 0) return { label: 'Imminent', sub: 'délai écoulé, versement au prochain passage', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' }
      const hLeft = Math.ceil(msLeft / 3600000)
      const when = hLeft >= 24 ? `sous ${Math.ceil(hLeft / 24)} j` : `sous ${hLeft} h`
      return { label: `Versement ${when}`, sub: 'après le délai de protection 48h', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' }
    }
    case 'paid':
    case 'shipped':
      return { label: 'En attente de livraison', sub: 'argent sécurisé chez NOUT', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
    case 'disputed':
      return { label: 'Suspendu (litige)', sub: 'versement bloqué', color: 'bg-red-100 text-red-600', dot: 'bg-red-500' }
    case 'refunded':
      return { label: 'Remboursé', sub: 'acheteur remboursé', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' }
    case 'cancelled':
      return { label: 'Rien à verser', sub: 'commande annulée', color: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300' }
    default:
      return { label: '—', sub: '', color: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300' }
  }
}

// Date courte lisible (JJ/MM/AAAA à HHhMM), ou null si absente.
const fmtDate = (d) => d
  ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
  : null

// État du DÉLAI avant annulation auto (le vendeur a 7 j pour remettre/expédier).
// `date` = la date à afficher SOUS le libellé (remis le… / limite le… / annulée le…).
//
// DISTINCTION IMPORTANTE : « étiquette générée » ≠ « colis vraiment remis au transporteur ».
// Le seul fait FIABLE est delivered_at (livraison confirmée par le transporteur). Un statut 'shipped'
// sans delivered_at = le vendeur a juste généré l'étiquette → on N'AFFIRME PAS que le colis est parti.
function delaiState(o) {
  if (o.status === 'cancelled')
    return { label: 'annulée — délai dépassé', color: 'bg-red-50 text-red-600', dot: 'bg-red-500', date: null }
  // Livraison RÉELLEMENT confirmée par le transporteur → là seulement « remis à temps ».
  if (o.delivered_at || o.status === 'completed' || o.status === 'payout_pending')
    return { label: 'livré', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', date: fmtDate(o.delivered_at) ? `livré le ${fmtDate(o.delivered_at)}` : null }
  // Étiquette générée mais transporteur n'a rien confirmé → colis pas (encore) réellement remis.
  if (o.status === 'shipped')
    return { label: 'colis pas encore remis', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', date: fmtDate(o.shipped_at) ? `étiquette le ${fmtDate(o.shipped_at)}` : null }
  if (o.status === 'refunded')
    return { label: 'remboursée', color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', date: null }
  if (o.status !== 'paid' || !o.expires_at)
    return { label: '—', color: 'bg-gray-100 text-gray-400', dot: 'bg-gray-300', date: null }

  // En attente : on montre la DATE LIMITE de remise (expires_at) + le temps restant.
  // Formulation explicite pour le suivi admin : « à remettre avant le … ».
  const limite = fmtDate(o.expires_at) ? `à remettre avant le ${fmtDate(o.expires_at)}` : null
  const msLeft = new Date(o.expires_at).getTime() - Date.now()
  if (msLeft <= 0)
    return { label: 'délai écoulé', color: 'bg-red-50 text-red-600', dot: 'bg-red-500', date: limite }
  const hLeft = Math.ceil(msLeft / 3600000)
  if (hLeft <= 24)
    return { label: `bientôt — ${hLeft} h`, color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', date: limite }
  const dLeft = Math.ceil(hLeft / 24)
  return { label: `${dLeft} j restants`, color: 'bg-green-100 text-green-700', dot: 'bg-green-500', date: limite }
}

// Une commande mérite-t-elle l'attention de l'admin ? Renvoie un motif court, ou null.
// But : repérer visuellement les commandes à surveiller SANS avoir à enquêter une par une.
function orderAlert(o) {
  // Colis dont l'étiquette est générée mais jamais confirmé livré, et qui traîne.
  if (o.status === 'shipped' && !o.delivered_at) {
    const days = o.shipped_at ? Math.floor((Date.now() - new Date(o.shipped_at).getTime()) / 86400000) : null
    if (days != null && days >= 10) return { level: 'danger', txt: `colis non remis depuis ${days} j` }
    if (days != null && days >= 5)  return { level: 'warn',   txt: `colis pas encore remis (${days} j)` }
    return { level: 'warn', txt: 'colis pas encore remis' }
  }
  if (o.status === 'disputed') return { level: 'danger', txt: 'litige à traiter' }
  // Délai de remise dépassé mais commande encore en attente (devrait être annulée).
  if (o.status === 'paid' && o.expires_at && new Date(o.expires_at).getTime() < Date.now())
    return { level: 'danger', txt: 'délai dépassé — à annuler' }
  return null
}

// Crons dont on surveille la santé (nom technique → libellé clair + ce qu'il fait).
const WATCHED_CRONS = [
  { job: 'chronopost-tracking', label: 'Suivi Chronopost', desc: 'Vérifie si les colis Chronopost sont livrés' },
  { job: 'ubn-tracking',        label: 'Suivi UBN',        desc: 'Vérifie si les colis UBN sont livrés' },
  { job: 'auto-refund',         label: 'Annulation & remboursement', desc: 'Annule et rembourse après 7 jours sans envoi' },
  { job: 'cron-payouts',        label: 'Versement des vendeurs', desc: 'Verse les vendeurs 48h après livraison' },
]

// État de santé d'un cron : à jour (vert) si vu récemment, en retard (ambre), muet/mort (rouge).
// Seuils larges : un cron horaire vu il y a < 90 min = OK ; cron-payouts (15 min) tolère aussi.
function cronHealth(hb) {
  if (!hb?.last_run_at) return { txt: 'jamais vu', color: 'text-red-600', dot: 'bg-red-500', ago: null }
  const min = Math.floor((Date.now() - new Date(hb.last_run_at).getTime()) / 60000)
  const ago = min < 60 ? `il y a ${min} min` : min < 1440 ? `il y a ${Math.floor(min / 60)} h` : `il y a ${Math.floor(min / 1440)} j`
  if (min <= 90)  return { txt: ago, color: 'text-green-600', dot: 'bg-green-500', ago }
  if (min <= 360) return { txt: ago, color: 'text-amber-600', dot: 'bg-amber-500', ago }
  return { txt: ago, color: 'text-red-600', dot: 'bg-red-500', ago }
}

export default function OrdersList() {
  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')
  const [busy,    setBusy]    = useState(null)
  const [diag,    setDiag]    = useState(null)   // état factuel lu directement en base (fraîcheur)
  const [diagLoading, setDiagLoading] = useState(false)
  const [inspectQ, setInspectQ] = useState('')   // enquête sur une commande précise (base + Stripe)
  const [inspect,  setInspect]  = useState(null)
  const [inspecting, setInspecting] = useState(false)

  const runInspect = async () => {
    if (!inspectQ.trim()) return
    setInspecting(true); setInspect(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-order-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ query: inspectQ.trim() }),
      })
      const data = await res.json()
      setInspect(res.ok ? data : { error: data.error || 'Erreur' })
    } catch { setInspect({ error: 'Impossible de contacter le serveur.' }) }
    finally { setInspecting(false) }
  }

  // Chargement des commandes VIA LE SERVEUR (service key) : contourne la RLS qui, en lecture
  // navigateur, masquait des commandes (bug « il manque des lignes récentes »). La même réponse
  // alimente l'encart de fraîcheur ET le tableau → un seul appel, tout cohérent.
  const load = useCallback(async () => {
    setLoading(true)
    setDiagLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-orders-diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ status: filter }),
      })
      const data = await res.json()
      if (res.ok) {
        setDiag(data)
        setOrders((data.orders ?? []).map(o => ({
          id: o.id,
          total_price: o.montant,
          status: o.statut,
          created_at: o.date,
          delivered_at: o.delivered_at,
          shipped_at: o.shipped_at,
          seller_payout: o.seller_payout,
          expires_at: o.expires_at,
          buyer:    { username: o.acheteur !== '—' ? o.acheteur : null },
          seller:   { username: o.vendeur  !== '—' ? o.vendeur  : null },
          listings: { title:    o.article  !== '—' ? o.article  : null },
        })))
      }
    } catch { /* silencieux */ }
    finally { setLoading(false); setDiagLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])
  const runDiag = load   // le bouton « Rafraîchir » relance le même chargement complet

  // Résolution d'un litige (admin) : rembourse l'acheteur OU libère le paiement au vendeur.
  const resolve = async (orderId, action) => {
    if (busy) return
    const verb = action === 'resolve_dispute_refund'
      ? "REMBOURSER l'acheteur"
      : 'LIBÉRER le paiement au vendeur'
    if (!window.confirm(`Litige — confirmer : ${verb} pour cette commande ?\nVérifie d'abord sur Stripe qu'aucun mouvement n'est déjà parti.`)) return
    setBusy(orderId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ action, targetId: orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      load()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-4">Commandes</h1>

      {/* Encart FRAÎCHEUR : confirme, chiffres à l'appui, que la page reflète bien la base en direct.
          Lu via la fonction serveur (service key) → aucune commande ne peut y échapper. */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {diag ? (
          <>
            <div>
              <span className="text-gray-400">Total commandes&nbsp;: </span>
              <span className="font-bold text-nout-dark">{diag.total}</span>
            </div>
            <div>
              <span className="text-gray-400">7 derniers jours&nbsp;: </span>
              <span className={`font-bold ${diag.recent7 > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{diag.recent7}</span>
            </div>
            <div>
              <span className="text-gray-400">30 derniers jours&nbsp;: </span>
              <span className={`font-bold ${diag.recent30 > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{diag.recent30}</span>
            </div>
            <div>
              <span className="text-gray-400">Dernière commande&nbsp;: </span>
              <span className="font-bold text-nout-dark">
                {diag.mostRecent
                  ? new Date(diag.mostRecent).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : 'aucune'}
              </span>
            </div>
            <button
              onClick={runDiag}
              disabled={diagLoading}
              className="ml-auto text-xs font-semibold text-nout-primary hover:underline disabled:opacity-50"
            >
              {diagLoading ? 'Vérification…' : 'Rafraîchir'}
            </button>
          </>
        ) : (
          <span className="text-gray-400 text-xs">{diagLoading ? 'Lecture de la base…' : 'Diagnostic indisponible.'}</span>
        )}
      </div>

      {/* Encart SANTÉ DU SYSTÈME : prouve que les tâches automatiques tournent vraiment (NOUT interroge
          bien les transporteurs, gère les délais et les versements). Une pastille par cron + dernière exécution.
          Vert = vu récemment · Ambre = en retard · Rouge = muet (à basculer sur un cron externe fiable). */}
      {diag?.heartbeats && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Santé du système — tâches automatiques</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WATCHED_CRONS.map(c => {
              const hb = diag.heartbeats.find(h => h.job === c.job)
              const h = cronHealth(hb)
              return (
                <div key={c.job} className="flex items-start gap-2.5 border border-gray-100 rounded-lg px-3 py-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${h.dot}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-nout-dark">{c.label}</p>
                    <p className="text-[11px] text-gray-400 leading-snug">{c.desc}</p>
                    <p className={`text-xs font-semibold mt-0.5 ${h.color}`}>
                      {h.ago ? `Dernière exécution ${h.txt}` : 'Jamais exécuté'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-gray-400 mt-3 leading-snug">
            Vert = à jour · Ambre = en retard · Rouge = ne répond plus (à basculer sur un déclencheur externe fiable, comme les versements).
            {diag.heartbeats.length === 0 && ' — En attente de la première exécution (ou migration cron_heartbeats à passer).'}
          </p>
        </div>
      )}

      {/* ── ENQUÊTE sur une commande (base + Stripe) : la vérité sur l'argent d'une commande précise ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Enquêter sur une commande (argent réel)</p>
        <div className="flex gap-2">
          <input
            value={inspectQ}
            onChange={(e) => setInspectQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runInspect()}
            placeholder="Titre de l'article (ex. Vend 3 pour 10€) ou id de commande"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={runInspect} disabled={inspecting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${inspecting ? 'bg-gray-100 text-gray-400' : 'bg-nout-primary text-white hover:opacity-90'}`}>
            {inspecting ? 'Analyse…' : 'Enquêter'}
          </button>
        </div>

        {inspect && (
          <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
            {inspect.error ? (
              <p className="text-red-600">{inspect.error}</p>
            ) : (
              <>
                {inspect.alertes?.length > 0 && (
                  <div className="mb-3 space-y-1">
                    {inspect.alertes.map((a, i) => (
                      <p key={i} className={`text-xs font-semibold rounded-lg px-3 py-2 ${a.startsWith('⚠') ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>{a}</p>
                    ))}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                  <div><span className="text-gray-400">Article : </span><b>{inspect.commande.article ?? '—'}</b></div>
                  <div><span className="text-gray-400">Statut : </span><b>{inspect.commande.statut}</b></div>
                  <div><span className="text-gray-400">Vendeur : </span>{inspect.commande.vendeur}</div>
                  <div><span className="text-gray-400">Acheteur : </span>{inspect.commande.acheteur}</div>
                  <div><span className="text-gray-400">Transporteur : </span>{inspect.commande.transporteur ?? '—'}</div>
                  <div><span className="text-gray-400">N° suivi : </span>{inspect.commande.numero_suivi ?? '—'}</div>
                  <div><span className="text-gray-400">Expédié le : </span>{inspect.commande.expedie_le ? new Date(inspect.commande.expedie_le).toLocaleString('fr-FR') : '—'}</div>
                  <div><span className="text-gray-400">Livré le : </span>{inspect.commande.livre_le ? new Date(inspect.commande.livre_le).toLocaleString('fr-FR') : <span className="text-amber-600 font-semibold">non livré</span>}</div>
                  {/* Temps écoulé depuis l'expédition + combien il reste avant remboursement auto (10 j). */}
                  {inspect.commande.expedie_le && !inspect.commande.livre_le && (() => {
                    const j = Math.floor((Date.now() - new Date(inspect.commande.expedie_le).getTime()) / 86400000)
                    const reste = 10 - j
                    return (
                      <div className="sm:col-span-2">
                        <span className="text-gray-400">Depuis l'expédition : </span>
                        <b className={j >= 10 ? 'text-red-600' : 'text-amber-600'}>{j} jour{j > 1 ? 's' : ''}</b>
                        {reste > 0
                          ? <span className="text-gray-500"> — remboursement auto de l'acheteur dans {reste} jour{reste > 1 ? 's' : ''} si toujours pas livré</span>
                          : <span className="text-red-600 font-semibold"> — délai dépassé, remboursement au prochain passage</span>}
                      </div>
                    )
                  })()}
                </div>
                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Argent (source : Stripe)</p>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13px]">
                    <div><span className="text-gray-400">Paiement acheteur : </span><b>{inspect.argent.paymentStatus ?? '—'}</b></div>
                    <div><span className="text-gray-400">Remboursé : </span>{inspect.argent.refunded ? <b className="text-green-700">oui ({inspect.argent.refundedAmount} €)</b> : 'non'}</div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400">Vendeur payé (transfert Stripe) : </span>
                      {inspect.argent.sellerTransferred
                        ? <b className="text-red-600">OUI — {inspect.argent.transfers.filter(t => !t.reversed).map(t => `${t.montant} €`).join(', ')}</b>
                        : <b className="text-green-700">non</b>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {[['all','Toutes'], ...Object.entries(STATUS).map(([k,v]) => [k, v.label])].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === val ? 'bg-nout-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Article</th>
                <th className="px-4 py-3 text-left">Acheteur</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-left">Montant</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Délai avant annulation</th>
                <th className="px-4 py-3 text-left">Versement vendeur</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map(o => {
                const s = STATUS[o.status] ?? STATUS.pending
                const alert = orderAlert(o)   // commande à surveiller ? (surlignage + badge)
                const rowBg = alert?.level === 'danger' ? 'bg-red-50 hover:bg-red-100'
                  : alert?.level === 'warn' ? 'bg-amber-50 hover:bg-amber-100'
                  : 'hover:bg-gray-50'
                return (
                  <tr key={o.id} className={rowBg}>
                    <td className="px-4 py-3 font-medium text-nout-dark max-w-[200px]">
                      <div className="truncate">{o.listings?.title ?? '—'}</div>
                      {alert && (
                        <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          alert.level === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          ⚠ {alert.txt}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{o.buyer?.username ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{o.seller?.username ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold text-nout-primary">{formatPrice(o.total_price)}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${s.color}`}>{s.label}</span></td>
                    <td className="px-4 py-3">
                      {(() => {
                        const dl = delaiState(o)
                        return (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dl.dot}`} />
                              <span className={`text-xs px-2 py-1 rounded-full ${dl.color}`}>{dl.label}</span>
                            </span>
                            {dl.date && <span className="text-[11px] text-gray-400 pl-3.5">{dl.date}</span>}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const p = payoutState(o)
                        return (
                          <span className="inline-flex items-center gap-1.5" title={p.sub}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.dot}`} />
                            <span className={`text-xs px-2 py-1 rounded-full ${p.color}`}>{p.label}</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatRelativeDate(o.created_at)}</td>
                    <td className="px-4 py-3">
                      {o.status === 'disputed' ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => resolve(o.id, 'resolve_dispute_refund')}
                            disabled={busy === o.id}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          >
                            {busy === o.id ? '…' : 'Rembourser'}
                          </button>
                          <button
                            onClick={() => resolve(o.id, 'resolve_dispute_release')}
                            disabled={busy === o.id}
                            className="text-[11px] font-semibold px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {busy === o.id ? '…' : 'Libérer'}
                          </button>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {orders.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Aucune commande.</p>}
        </div>
      )}
    </div>
  )
}
