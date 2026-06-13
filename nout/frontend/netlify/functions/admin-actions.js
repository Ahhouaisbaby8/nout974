const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

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
        await supabase.from('profiles').update({ is_banned: true }).eq('id', targetId)
        break

      case 'unban_user':
        await supabase.from('profiles').update({ is_banned: false }).eq('id', targetId)
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

      default:
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Action inconnue : ${action}` }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }

  } catch (err) {
    console.error(`[admin-actions] ${action} error:`, err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur. Réessaie.' }) }
  }
}
