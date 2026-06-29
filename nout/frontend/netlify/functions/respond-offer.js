// Réponse à une offre (acheteur ↔ vendeur) : accepter / refuser / contre-offre.
// Validé côté serveur : seul le DESTINATAIRE d'une offre 'pending' peut répondre.
// « Accepter » ne déplace AUCUN argent — il autorise juste l'acheteur à payer au prix convenu
// (le paiement réel est validé dans create-checkout-session via offer_id).
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL        = process.env.URL || 'https://nout.re'

const notify = (receiverId, title, body, url) => {
  if (!receiverId) return
  fetch(`${SITE_URL}/.netlify/functions/send-push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.CRON_SECRET },
    body: JSON.stringify({ receiver_id: receiverId, title, body, url }),
  }).catch(err => console.error('send-push respond-offer:', err.message))
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    const { offer_id, action, counter_amount } = JSON.parse(event.body || '{}')
    if (!offer_id || !['accept', 'refuse', 'counter'].includes(action)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Paramètres invalides.' }) }
    }

    const { data: offer, error: offErr } = await supabase
      .from('offers')
      .select('id, listing_id, buyer_id, seller_id, proposed_by, amount, status, listing:listings!listing_id(title, is_sold, user_id)')
      .eq('id', offer_id)
      .single()
    if (offErr || !offer) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Offre introuvable.' }) }
    if (offer.status !== 'pending') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cette offre a déjà été traitée.' }) }
    }

    // Intégrité anti-offre-forgée : le vendeur de l'offre DOIT être le propriétaire de l'annonce,
    // et l'acheteur ≠ vendeur. Empêche une offre buyer_id=seller_id=self qui s'auto-accepterait.
    if (offer.buyer_id === offer.seller_id || offer.seller_id !== offer.listing?.user_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Offre invalide.' }) }
    }

    // Seul le DESTINATAIRE (la partie qui n'a pas proposé cette offre) peut répondre.
    const recipientId = offer.proposed_by === offer.buyer_id ? offer.seller_id : offer.buyer_id
    if (authUser.id !== recipientId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Seul le destinataire de l\'offre peut y répondre.' }) }
    }
    if (offer.listing?.is_sold) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cet article est déjà vendu.' }) }
    }

    // Garde blocage : on est en service key (RLS bypassée) → vérif EXPLICITE.
    // Si un blocage existe dans un sens ou l'autre entre l'acheteur et le vendeur,
    // aucune action sur l'offre n'est permise (accept/refuse/counter).
    const { data: blk } = await supabase
      .from('blocks')
      .select('id')
      .or(`and(blocker_id.eq.${offer.buyer_id},blocked_id.eq.${offer.seller_id}),and(blocker_id.eq.${offer.seller_id},blocked_id.eq.${offer.buyer_id})`)
      .limit(1)
    if (blk && blk.length > 0) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Un blocage empêche cette action.' }) }
    }

    const titre = offer.listing?.title ?? 'ton article'

    if (action === 'refuse') {
      const { error } = await supabase.from('offers').update({ status: 'refused' }).eq('id', offer_id).eq('status', 'pending')
      if (error) throw error
      notify(offer.proposed_by, 'Offre refusée — NOUT 974', `Ton offre de ${offer.amount} € sur « ${titre} » a été refusée.`, `/messages/${recipientId}?annonce=${offer.listing_id}`)
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'refused' }) }
    }

    if (action === 'counter') {
      const amount = Number(counter_amount)
      if (!(amount > 0)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Montant de contre-offre invalide.' }) }
      // L'offre courante devient 'countered', et on crée une NOUVELLE offre 'pending' proposée par le répondant.
      const { error: updErr } = await supabase.from('offers').update({ status: 'countered' }).eq('id', offer_id).eq('status', 'pending')
      if (updErr) throw updErr
      const { data: created, error: insErr } = await supabase.from('offers').insert({
        listing_id:  offer.listing_id,
        buyer_id:    offer.buyer_id,
        seller_id:   offer.seller_id,
        proposed_by: authUser.id,
        amount,
        status:      'pending',
      }).select().single()
      if (insErr) throw insErr
      notify(offer.proposed_by, 'Contre-offre reçue — NOUT 974', `Contre-offre de ${amount} € sur « ${titre} ».`, `/messages/${offer.proposed_by === offer.buyer_id ? offer.seller_id : offer.buyer_id}?annonce=${offer.listing_id}`)
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'countered', offer: created }) }
    }

    // action === 'accept' : l'offre est acceptée ; les autres offres 'pending' de la même paire/annonce sont annulées.
    const { error: accErr } = await supabase.from('offers').update({ status: 'accepted' }).eq('id', offer_id).eq('status', 'pending')
    if (accErr) throw accErr
    await supabase.from('offers')
      .update({ status: 'cancelled' })
      .eq('listing_id', offer.listing_id)
      .eq('buyer_id', offer.buyer_id)
      .eq('seller_id', offer.seller_id)
      .eq('status', 'pending')
      .neq('id', offer_id)
    // L'acheteur peut maintenant payer au prix convenu.
    notify(offer.buyer_id, 'Offre acceptée — NOUT 974', `Ton offre de ${offer.amount} € sur « ${titre} » est acceptée. Tu peux payer ce prix.`, `/messages/${offer.seller_id}?annonce=${offer.listing_id}`)
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, status: 'accepted' }) }

  } catch (err) {
    console.error('[respond-offer] erreur:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la réponse à l\'offre.' }) }
  }
}
