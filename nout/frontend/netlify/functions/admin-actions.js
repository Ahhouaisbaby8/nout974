const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
const { computeRefundAmount } = require('./_fees')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)

const CORS_ORIGIN = process.env.URL || 'https://nout.re'

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Vérification JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }

  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  // Vérification rôle admin
  const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (callerProfile?.role !== 'admin') {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }
  }

  let body
  try {
    body = JSON.parse(event.body ?? '{}')
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Corps JSON invalide.' }) }
  }

  const { action, targetId, role } = body
  if (!action || !targetId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres manquants : action et targetId requis.' }) }
  }

  try {
    switch (action) {

      case 'ban_user':
        await supabase.from('profiles').update({ is_banned: true, banned_at: new Date().toISOString() }).eq('id', targetId)
        break

      case 'unban_user':
        await supabase.from('profiles').update({ is_banned: false, banned_at: null }).eq('id', targetId)
        break

      case 'suspend_user': {
        const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        await supabase.from('profiles').update({ is_suspended: true, suspended_until: suspendedUntil }).eq('id', targetId)
        break
      }

      case 'unsuspend_user':
        await supabase.from('profiles').update({ is_suspended: false, suspended_until: null }).eq('id', targetId)
        break

      case 'set_role':
      case 'promote_to_admin':
      case 'demote_to_user': {
        const newRole = action === 'promote_to_admin' ? 'admin'
          : action === 'demote_to_user' ? 'user'
          : role
        if (!['user', 'moderator', 'admin'].includes(newRole)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: `Rôle invalide : ${newRole}` }) }
        }
        if (targetId === caller.id && newRole !== 'admin') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Impossible de modifier son propre rôle admin.' }) }
        }
        await supabase.from('profiles').update({ role: newRole }).eq('id', targetId)
        break
      }

      case 'suspend_listing':
        await supabase.from('listings').update({ is_active: false }).eq('id', targetId)
        break

      case 'restore_listing':
        await supabase.from('listings').update({ is_active: true }).eq('id', targetId)
        break

      case 'remove_listing':
        await supabase.from('listings').update({ is_active: false, is_sold: true }).eq('id', targetId)
        break

      case 'delete_user_rgpd': {
        const { data: activeOrders } = await supabase
          .from('orders')
          .select('id')
          .or(`buyer_id.eq.${targetId},seller_id.eq.${targetId}`)
          .in('status', ['paid', 'payout_pending'])

        if (activeOrders?.length > 0) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Impossible : des commandes actives existent pour ce compte.' }) }
        }

        await Promise.all([
          supabase.from('push_subscriptions').delete().eq('user_id', targetId),
          supabase.from('favorites').delete().eq('user_id', targetId),
          supabase.from('reports').delete().eq('user_id', targetId),
        ])
        await supabase.from('messages').delete().or(`sender_id.eq.${targetId},receiver_id.eq.${targetId}`)
        await supabase.from('listings').update({ is_active: false, is_sold: true }).eq('user_id', targetId)

        const { error: deleteErr } = await supabase.auth.admin.deleteUser(targetId)
        if (deleteErr) throw new Error(`Erreur suppression auth : ${deleteErr.message}`)
        break
      }

      case 'resolve_dispute_refund': {
        // Litige tranché EN FAVEUR DE L'ACHETEUR : remboursement du prix + port. OPTION A : NOUT GARDE ses
        // frais de protection (jamais de perte pour NOUT). Garde-fou anciennes commandes = remboursement plein.
        const { data: order } = await supabase.from('orders')
          .select('id, status, stripe_payment_id, listing_id, total_price, seller_payout, shipping_fee, shipping_method, seller:profiles!seller_id(stripe_account_id)')
          .eq('id', targetId).single()
        if (!order) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
        if (order.status !== 'disputed') return { statusCode: 400, headers, body: JSON.stringify({ error: 'La commande n\'est pas en litige.' }) }
        if (!order.stripe_payment_id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Aucun paiement à rembourser.' }) }

        // GARDE ANTI-DOUBLE-SORTIE : le vendeur a-t-il DÉJÀ été payé pour cette commande ? Si oui, rembourser
        // l'acheteur par-dessus ferait sortir l'argent DEUX FOIS (versement vendeur + remboursement) → perte NOUT.
        // On BLOQUE : l'admin doit d'abord rappeler le virement (reversal) côté Stripe avant de rembourser.
        // La recherche par transfer_group ('order_<id>') tourne SANS dépendre du compte vendeur : elle retrouve
        // le virement même si le stripe_account_id du profil a changé depuis (auto-réparation d'onboarding).
        {
          const vendorStripeId = order.seller?.stripe_account_id
          let paidEur = null
          try {
            const byGroup = await stripe.transfers.list({ transfer_group: `order_${order.id}`, limit: 10 })
            let hit = (byGroup.data || []).find(t => (t.amount_reversed ?? 0) < t.amount)
            if (!hit && vendorStripeId) {
              // Repli metadata (anciens transferts sans transfer_group) — nécessite la destination.
              const byMeta = await stripe.transfers.list({ destination: vendorStripeId, limit: 100 })
              hit = (byMeta.data || []).find(t => String(t.metadata?.order_id) === String(order.id) && (t.amount_reversed ?? 0) < t.amount)
            }
            if (hit) paidEur = ((hit.amount - (hit.amount_reversed ?? 0)) / 100).toFixed(2)
          } catch (e) {
            console.error(`[admin] resolve_dispute_refund transfers.list order ${order.id} :`, e.message)
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'Impossible de vérifier l\'état des versements Stripe. Réessaie.' }) }
          }
          if (paidEur != null) {
            return { statusCode: 409, headers, body: JSON.stringify({ error: `Le vendeur a déjà été payé (${paidEur} €) pour cette commande. Rappelle d'abord ce virement dans Stripe (reversal) avant de rembourser l'acheteur, sinon double décaissement.` }) }
          }
        }

        // RÉSERVATION ATOMIQUE du statut AVANT le refund : on sort la commande de 'disputed' en une seule
        // opération gardée → une « libération » concurrente (resolve_dispute_release, qui relit le statut
        // juste avant de transférer dans _payout) verra 'refunded' (hors allowedStatuses) et n'enverra rien.
        // Ferme la course « remboursé ET payé ». Le refund Stripe reste idempotent (refund_${order.id}).
        const { data: claimed } = await supabase.from('orders')
          .update({ status: 'refunded' }).eq('id', order.id).eq('status', 'disputed').select('id')
        if (!claimed || !claimed.length) {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Commande déjà traitée (remboursée, versée ou clôturée).' }) }
        }
        const refundInfo = computeRefundAmount(order)
        // Pas de pré-check de solde ici (la revue argent a montré que le solde GLOBAL est un mauvais signal
        // et bloquerait des remboursements légitimes) : si le solde est réellement insuffisant, Stripe
        // rejette le refund et le catch ci-dessous rollback la réservation (disputed) — Stripe est l'arbitre.
        try {
          await stripe.refunds.create(
            {
              payment_intent: order.stripe_payment_id,
              ...(refundInfo.amountCents > 0 ? { amount: refundInfo.amountCents } : {}),
            },
            { idempotencyKey: `refund_${order.id}` },
          )
        } catch (e) {
          // Refund échoué : on annule la réservation pour pouvoir re-tenter (rollback vers 'disputed').
          await supabase.from('orders').update({ status: 'disputed' }).eq('id', order.id).eq('status', 'refunded')
          return { statusCode: 502, headers, body: JSON.stringify({ error: `Remboursement Stripe échoué : ${e.message}` }) }
        }
        await supabase.from('listings').update({ is_sold: false }).eq('id', order.listing_id)
        await supabase.from('escrow_codes').update({ refunded_at: new Date().toISOString() }).eq('order_id', order.id).is('refunded_at', null)
        break
      }

      case 'resolve_dispute_release': {
        // Litige tranché EN FAVEUR DU VENDEUR : versement du prix au vendeur.
        const { data: order } = await supabase.from('orders')
          .select('id, status, seller_payout, stripe_payment_id, listing:listings!listing_id(price), seller:profiles!seller_id(stripe_account_id)')
          .eq('id', targetId).single()
        if (!order) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Commande introuvable.' }) }
        if (order.status !== 'disputed') return { statusCode: 400, headers, body: JSON.stringify({ error: 'La commande n\'est pas en litige.' }) }
        const vendorStripeId = order.seller?.stripe_account_id
        if (!vendorStripeId) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Le vendeur n\'a pas activé ses paiements (Stripe). Impossible de libérer le versement.' }) }
        }

        // GARDE SYMÉTRIQUE ANTI-DOUBLE-SORTIE : l'acheteur a-t-il DÉJÀ été remboursé pour cette commande ?
        // Cas réel : « Rembourser » réussit chez Stripe mais la réponse HTTP se perd → rollback en 'disputed' →
        // l'admin change d'avis et clique « Libérer » → sans ce check, NOUT rembourse l'acheteur ET paie le
        // vendeur (double décaissement). On BLOQUE si un remboursement non-échoué existe sur le paiement.
        if (order.stripe_payment_id) {
          try {
            const refunds = await stripe.refunds.list({ payment_intent: order.stripe_payment_id, limit: 10 })
            const done = (refunds.data || []).find(r => r.status !== 'failed' && r.status !== 'canceled')
            if (done) {
              return { statusCode: 409, headers, body: JSON.stringify({ error: `L'acheteur a déjà été remboursé (${(done.amount / 100).toFixed(2)} €) pour cette commande : impossible de verser le vendeur en plus. À traiter manuellement dans Stripe si besoin.` }) }
            }
          } catch (e) {
            console.error(`[admin] resolve_dispute_release refunds.list order ${order.id} :`, e.message)
            return { statusCode: 502, headers, body: JSON.stringify({ error: 'Impossible de vérifier l\'état des remboursements Stripe. Réessaie.' }) }
          }
        }

        // GARDE ANTI-DOUBLE-PAIEMENT : un virement pour cette commande est-il DÉJÀ parti chez Stripe ?
        // (la clé d'idempotence transfer_<id> ne dure que ~24h ; un litige peut être tranché bien après.)
        // Recherche par transfer_group ('order_<id>') + repli metadata ; on ignore les transferts entièrement
        // reversés (chargeback). Si un versement existe déjà, on NE recrée PAS -> on finalise juste la commande.
        let alreadyPaid = false
        try {
          const byGroup = await stripe.transfers.list({ transfer_group: `order_${order.id}`, limit: 10 })
          alreadyPaid = (byGroup.data || []).some(t => (t.amount_reversed ?? 0) < t.amount)
          if (!alreadyPaid) {
            const byMeta = await stripe.transfers.list({ destination: vendorStripeId, limit: 100 })
            alreadyPaid = (byMeta.data || []).some(t =>
              String(t.metadata?.order_id) === String(order.id) && (t.amount_reversed ?? 0) < t.amount)
          }
        } catch (e) {
          console.error(`[admin] resolve_dispute_release transfers.list order ${order.id} :`, e.message)
          return { statusCode: 502, headers, body: JSON.stringify({ error: 'Impossible de vérifier l\'état des versements Stripe. Réessaie.' }) }
        }

        // RÉSERVATION ATOMIQUE du statut AVANT le transfert (symétrique au remboursement) : disputed -> completed
        // en une seule opération gardée. Un « Rembourser » concurrent (qui réserve disputed -> refunded) ne peut
        // donc PAS passer en même temps -> jamais « remboursé ET payé ».
        const { data: claimed } = await supabase.from('orders')
          .update({ status: 'completed' }).eq('id', order.id).eq('status', 'disputed').select('id')
        if (!claimed || !claimed.length) {
          return { statusCode: 409, headers, body: JSON.stringify({ error: 'Commande déjà traitée (remboursée, versée ou clôturée).' }) }
        }

        if (alreadyPaid) {
          // Le vendeur a DÉJÀ été payé (ex. release-delivered a versé puis la commande a fini en litige) :
          // on finalise SANS re-transférer. Sinon, clé d'idempotence expirée (>24h) = double-paiement.
          console.log(`[admin] resolve_dispute_release order ${order.id} : versement déjà présent chez Stripe → completed sans re-versement`)
          await supabase.from('escrow_codes').update({ confirmed_at: new Date().toISOString() }).eq('order_id', order.id).is('confirmed_at', null)
          break
        }

        const prixArticle  = Number(order.listing?.price ?? 0)
        const payoutNet    = order.seller_payout != null
          ? Number(order.seller_payout)
          : Math.round((prixArticle - (prixArticle * 0.10 + 0.25) - (prixArticle * 0.015 + 0.25)) * 100) / 100
        const transferCents = Math.max(0, Math.round(payoutNet * 100))
        try {
          if (transferCents > 0) {
            await stripe.transfers.create(
              { amount: transferCents, currency: 'eur', destination: vendorStripeId, transfer_group: `order_${order.id}`, metadata: { order_id: order.id } },
              { idempotencyKey: `transfer_${order.id}` }, // même clé que tous les chemins -> jamais payé 2x (<24h), + garde transfer_group ci-dessus (>24h)
            )
          }
        } catch (e) {
          // Transfert échoué : on annule la réservation pour pouvoir re-tenter (rollback -> disputed).
          await supabase.from('orders').update({ status: 'disputed' }).eq('id', order.id).eq('status', 'completed')
          return { statusCode: 502, headers, body: JSON.stringify({ error: `Versement Stripe échoué : ${e.message}` }) }
        }
        await supabase.from('escrow_codes').update({ confirmed_at: new Date().toISOString() }).eq('order_id', order.id).is('confirmed_at', null)
        break
      }

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Action inconnue : ${action}` }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error(`[admin-actions] ${action} error:`, err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur. Réessaie.' }) }
  }
}
