// Versement au vendeur — LOGIQUE UNIQUE réutilisée par :
//   - confirm-receipt.js  (bouton acheteur « J'ai bien reçu » sur une livraison)
//   - auto-refund.js      (auto-release : libération auto X jours après l'expédition)
//
// ── GARANTIES (argent) ──────────────────────────────────────────────────────
// 1) JAMAIS payé deux fois : idempotencyKey `transfer_${order_id}` → Stripe ne fait qu'UN transfert
//    pour une commande donnée, quel que soit le nombre d'appels (boutons, cron, courses concurrentes).
// 2) ORDRE SÛR : on TRANSFÈRE D'ABORD, on écrit le statut terminal ENSUITE. On ne « consomme » donc
//    rien tant que l'argent n'est pas parti. Si le transfert échoue → on ne touche À RIEN → la commande
//    reste dans son statut d'origine ('paid'/'shipped') = REJOUABLE (re-clic ou prochain passage du cron).
// 3) FINALISATION ATOMIQUE : la transition paid/shipped → completed/payout_pending ne réussit que pour
//    UN SEUL appelant (on lit le nombre de lignes touchées). Les appels concurrents — qui ont, eux,
//    déclenché le MÊME transfert idempotent — obtiennent 0 ligne et ne renvoient pas de double e-mail.
// 4) AUTO-RÉPARATION : si le transfert réussit mais que l'écriture du statut échoue (panne transitoire),
//    la commande reste 'shipped' et l'argent est déjà parti (idempotent) → un prochain passage rejoue le
//    transfert (sans re-payer) et réécrit le statut. Aucun argent « parti sans completed » de façon figée.
//
// `seller_payout` figé sur la commande = montant exact à verser (prix plein dans le modèle protection
// acheteur ; montant réduit conservé pour les anciennes commandes). Fallback ultra-ancien = formule
// conservatrice (ne verse pas plus qu'encaissé à l'époque).
//
// Renvoie { outcome, ... } où outcome ∈ :
//   'settled'  → CET appel a finalisé la commande (transfert fait + statut écrit). À toi d'e-mailer.
//   'already'  → un AUTRE appel a déjà finalisé (transfert idempotent déjà couvert). Ne rien faire.
//   'retry'    → échec transitoire (transfert OU écriture). Commande inchangée/rejouable. À retenter.
async function releaseSellerPayout({ stripe, supabase, order }) {
  const order_id    = order.id
  const prixArticle = Number(order.listing?.price ?? 0)
  const payoutNet   = order.seller_payout != null
    ? Number(order.seller_payout)
    : Math.round((prixArticle - (prixArticle * 0.10 + 0.25) - (prixArticle * 0.015 + 0.25)) * 100) / 100
  const transferCents  = Math.max(0, Math.round(payoutNet * 100))
  const vendorStripeId = order.seller?.stripe_account_id

  // Statuts depuis lesquels un versement automatique/acheteur est légitime. JAMAIS 'disputed' :
  // la résolution d'un litige passe par admin-actions.js (claim-first dédié), pas par ce module.
  // 'delivered' est inclus : release-delivered verse DIRECTEMENT depuis 'delivered' (48h après livraison),
  // sans repositionner la commande en 'shipped' (ce qui l'exposait au gel 12j d'auto-refund → double-paiement).
  const allowedStatuses = ['paid', 'shipped', 'delivered', 'payout_pending']

  // 0) GARDE TOCTOU : on relit le statut JUSTE avant de transférer. Les appelants par snapshot (cron
  //    auto-release) peuvent être périmés ; un litige acheteur ('disputed') ou un remboursement a pu
  //    survenir entre-temps. Si la commande n'est plus payable, on ne transfère RIEN (rien n'est figé).
  const { data: fresh } = await supabase.from('orders').select('status, stripe_payment_id').eq('id', order_id).single()
  if (!fresh || !allowedStatuses.includes(fresh.status)) {
    return { outcome: 'already', transferOk: false, payoutNet, vendorStripeId, orderStatus: null }
  }

  // 1) TRANSFERT d'abord (idempotent). Aucune écriture terminale tant que ce n'est pas acquis.
  let transferOk = false
  if (vendorStripeId && transferCents > 0) {
    // ── GARDE ANTI-DOUBLE-TRANSFERT (centralisée pour TOUS les appelants) ──
    // La clé d'idempotence Stripe ne dure que ~24h. Si un versement pour cette commande est DÉJÀ parti
    // (retry au-delà de 24h, réponse HTTP perdue, résolution admin tardive…), on NE recrée PAS un transfert.
    // Recherche précise par transfer_group ('order_<id>', sans pagination) + repli metadata pour les transferts
    // créés avant l'ajout du transfer_group. On ne compte QUE les transferts NON entièrement reversés
    // (amount_reversed < amount) : un transfert repris par chargeback ≠ vendeur payé.
    try {
      const byGroup = await stripe.transfers.list({ transfer_group: `order_${order_id}`, limit: 10 })
      transferOk = (byGroup.data || []).some(t => (t.amount_reversed ?? 0) < t.amount)
      if (!transferOk) {
        const byMeta = await stripe.transfers.list({ destination: vendorStripeId, limit: 100 })
        transferOk = (byMeta.data || []).some(t =>
          String(t.metadata?.order_id) === String(order_id) && (t.amount_reversed ?? 0) < t.amount)
      }
      if (transferOk) console.log(`[payout] transfert déjà présent chez Stripe (order ${order_id}) → pas de re-versement`)
    } catch (err) {
      // Doute sur l'état Stripe → on NE transfère PAS (prudence argent). Rejouable au prochain passage.
      console.error(`[payout] transfers.list (pré-check anti-double) échoué (order ${order_id}) :`, err.message)
      return { outcome: 'retry', transferOk: false, payoutNet, vendorStripeId, orderStatus: null }
    }

    if (!transferOk) {
      // source_transaction = la CHARGE d'origine de la vente. Lie le transfert à SA vente précise →
      //  1) le transfert ne peut JAMAIS échouer pour « solde plateforme insuffisant » : Stripe l'exécute
      //     dès que les fonds de CETTE vente sont disponibles (fin des payout_pending « balance_insufficient »),
      //  2) traçabilité : chaque euro versé est rattaché à sa vente exacte dans le dashboard Stripe.
      // Best-effort : si l'ID de charge est indisponible, on transfère quand même (repli = comportement actuel).
      let sourceTransaction = null
      if (fresh.stripe_payment_id) {
        try {
          const pi = await stripe.paymentIntents.retrieve(fresh.stripe_payment_id)
          sourceTransaction = pi.latest_charge || null
        } catch (e) {
          console.error(`[payout] source_transaction indispo (order ${order_id}) :`, e.message)
        }
      }
      try {
        await stripe.transfers.create(
          // transfer_group = 'order_<id>' : permet de RETROUVER PRÉCISÉMENT le(s) transfert(s) d'une commande
          // via transfers.list({ transfer_group }) — sans limite/pagination — pour ne JAMAIS re-verser un
          // transfert déjà parti (le pré-check ci-dessus s'en sert ; la clé d'idempotence ne dure que 24h).
          {
            amount: transferCents, currency: 'eur', destination: vendorStripeId,
            transfer_group: `order_${order_id}`, metadata: { order_id },
            ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
          },
          { idempotencyKey: `transfer_${order_id}` },
        )
        transferOk = true
        console.log(`[payout] transfert OK : ${transferCents / 100} € → ${vendorStripeId} (order ${order_id})${sourceTransaction ? ' [source_transaction]' : ''}`)
      } catch (err) {
        // Échec transfert : on ne touche À RIEN → commande inchangée = rejouable (re-clic / prochain cron).
        console.error(`[payout] transfert échoué (order ${order_id}) :`, err.message)
        return { outcome: 'retry', transferOk: false, payoutNet, vendorStripeId, orderStatus: null }
      }
    }
  } else if (!vendorStripeId) {
    console.log(`[payout] vendeur sans compte Stripe (order ${order_id}) → payout_pending`)
  }

  // 2) FINALISATION atomique : seule la 1re transition paid/shipped → ... « gagne » (rowcount).
  const orderStatus = (vendorStripeId && transferOk) ? 'completed' : 'payout_pending'
  const { data: updated, error: updErr } = await supabase
    .from('orders')
    .update({ status: orderStatus })
    .eq('id', order_id)
    .in('status', allowedStatuses) // jamais écraser completed/refunded/cancelled (ni disputed hors résolution admin)
    .select('id')
  if (updErr) {
    // Transfert déjà fait (idempotent) mais statut pas écrit : on laisse la commande telle quelle ;
    // un prochain passage rejouera le transfert (sans re-payer) et réécrira le statut.
    console.error(`[payout] update statut → ${orderStatus} (order ${order_id}) :`, updErr.message)
    return { outcome: 'retry', transferOk, payoutNet, vendorStripeId, orderStatus: null }
  }
  const settled = !!(updated && updated.length)
  if (settled) {
    // Marque le code escrow consommé (cohérence + le refund pass ne le touchera jamais). Best-effort.
    await supabase.from('escrow_codes')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('order_id', order_id)
      .is('confirmed_at', null)
      .is('refunded_at', null)
  }

  return { outcome: settled ? 'settled' : 'already', transferOk, payoutNet, vendorStripeId, orderStatus }
}

module.exports = { releaseSellerPayout }
