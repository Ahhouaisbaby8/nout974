const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // 1. Vérifier le JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  const userId = authUser.id

  try {
    // 2. Bloquer la suppression si des commandes actives existent
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      // Toute commande « vivante » bloque la suppression (sinon un vendeur en litige/chargeback pourrait
      // effacer son compte pour échapper à la résolution). Inclut shipped/delivered/disputed/chargeback.
      .in('status', ['paid', 'shipped', 'delivered', 'payout_pending', 'disputed', 'chargeback'])

    if (activeOrders?.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Impossible de supprimer ton compte : tu as des transactions en cours. Attends leur finalisation.' }),
      }
    }

    // 4. Supprimer les annonces de l'utilisateur
    await supabase.from('listings').delete().eq('user_id', userId)

    // 5. Supprimer tous ses messages (envoyés et reçus)
    await supabase.from('messages').delete().eq('sender_id', userId)
    await supabase.from('messages').delete().eq('receiver_id', userId)

    // 6. Supprimer le profil
    await supabase.from('profiles').delete().eq('id', userId)

    // 7. Supprimer le compte auth Supabase (nécessite SUPABASE_SERVICE_KEY)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteAuthError) {
      console.error('Erreur suppression auth user:', deleteAuthError.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur lors de la suppression du compte.' }) }
    }

    console.log(`Compte supprimé : ${userId}`)
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error('delete-account error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur. Contacte contact@nout.re.' }) }
  }
}
