const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

webpush.setVapidDetails(
  'mailto:contact@nout.re',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// Rate limiter en mémoire — 20 req/min par IP
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 20, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Auth : secret interne (appel fonction→fonction, contenu de confiance) OU JWT utilisateur (appel client).
  // ⚠️ Un appelant JWT ne peut PAS fixer le contenu librement (anti-phishing) : il envoie seulement un type
  // ('follow'/'message') + receiver_id, et le SERVEUR construit titre/corps/url après avoir vérifié l'action.
  const internalSecret = event.headers['x-internal-secret']
  const authHeader = event.headers['authorization'] || event.headers['Authorization']

  let isInternal = false
  let authUser = null
  if (internalSecret) {
    if (!process.env.CRON_SECRET || internalSecret !== process.env.CRON_SECRET) {
      return { statusCode: 401, body: 'Non autorisé.' }
    }
    isInternal = true
  } else if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { statusCode: 401, body: 'Session invalide.' }
    }
    authUser = user
  } else {
    return { statusCode: 401, body: 'Non authentifié.' }
  }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, body: 'Trop de tentatives.' }
  }

  try {
    const parsed = JSON.parse(event.body || '{}')
    let receiver_id = parsed.receiver_id
    let title, notifBody, url

    if (isInternal) {
      // Appel serveur de confiance : contenu tel quel.
      title = parsed.title
      notifBody = parsed.body
      url = parsed.url
    } else {
      // Appel client (JWT) : contenu CONSTRUIT PAR LE SERVEUR selon le type, après vérification de l'action.
      const type = parsed.type
      if (!receiver_id || !['follow', 'message'].includes(type)) {
        return { statusCode: 400, body: 'Requête invalide.' }
      }
      const { data: me } = await supabase.from('profiles').select('username').eq('id', authUser.id).single()
      const myName = (me?.username || 'Quelqu\'un').slice(0, 60)

      if (type === 'follow') {
        // On ne notifie que si l'abonnement existe VRAIMENT et que l'appelant en est l'auteur.
        const { data: f } = await supabase.from('follows')
          .select('follower_id').eq('follower_id', authUser.id).eq('following_id', receiver_id).maybeSingle()
        if (!f) return { statusCode: 403, body: 'Action non vérifiée.' }
        title = 'Nouvel abonné'
        notifBody = `${myName} s'est abonné à votre profil`
        url = `/profil/${authUser.id}`
      } else {
        // message : un message de l'appelant vers le destinataire doit exister ; le corps = son contenu.
        const { data: msg } = await supabase.from('messages')
          .select('content').eq('sender_id', authUser.id).eq('receiver_id', receiver_id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (!msg) return { statusCode: 403, body: 'Action non vérifiée.' }
        title = myName
        const c = String(msg.content || '')
        notifBody = c.length > 80 ? c.slice(0, 80) + '…' : c
        url = `/messages/${authUser.id}`
      }
    }

    if (!receiver_id) return { statusCode: 400, body: 'Destinataire manquant.' }

    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(receiver_id)}&select=subscription`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    const rows = await res.json()
    if (!Array.isArray(rows) || !rows.length) return { statusCode: 200, body: 'Pas d\'abonnement enregistré' }

    const payload = JSON.stringify({ title, body: notifBody, url })
    await Promise.allSettled(
      rows.map(row => webpush.sendNotification(row.subscription, payload))
    )

    return { statusCode: 200, body: 'OK' }
  } catch (err) {
    console.error('send-push error:', err)
    return { statusCode: 500, body: 'Erreur interne.' }
  }
}
