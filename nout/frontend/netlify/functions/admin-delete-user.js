const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const headers = {
  'Access-Control-Allow-Origin': process.env.URL || 'https://nout.re',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) }

  // Vérifier JWT de l'appelant
  const token = (event.headers['authorization'] || event.headers['Authorization'])?.replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }

  const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !adminUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  // Vérifier que l'appelant est admin
  const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', adminUser.id).single()
  if (adminProfile?.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }

  try {
    const { targetUserId } = JSON.parse(event.body)
    if (!targetUserId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetUserId requis.' }) }

    // Bloquer si commandes actives (en attente de paiement ou de virement)
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .or(`buyer_id.eq.${targetUserId},seller_id.eq.${targetUserId}`)
      .in('status', ['paid', 'payout_pending'])

    if (activeOrders?.length > 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Impossible : des commandes actives existent pour ce compte.' }) }
    }

    // Supprimer les données liées
    await Promise.all([
      supabase.from('push_subscriptions').delete().eq('user_id', targetUserId),
      supabase.from('favorites').delete().eq('user_id', targetUserId),
      supabase.from('reports').delete().eq('user_id', targetUserId),
    ])
    await supabase.from('messages').delete().or(`sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`)
    await supabase.from('listings').update({ is_active: false, is_sold: true }).eq('user_id', targetUserId)

    // Supprimer le compte auth — le trigger Supabase supprime le profil en cascade
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId)
    if (deleteError) throw deleteError

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error('admin-delete-user error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) }
  }
}
