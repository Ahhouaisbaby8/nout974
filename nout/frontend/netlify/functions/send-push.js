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

  // Auth : secret interne (appel fonction→fonction) OU JWT utilisateur (appel client)
  const internalSecret = event.headers['x-internal-secret']
  const authHeader = event.headers['authorization'] || event.headers['Authorization']

  if (internalSecret) {
    if (!process.env.CRON_SECRET || internalSecret !== process.env.CRON_SECRET) {
      return { statusCode: 401, body: 'Non autorisé.' }
    }
  } else if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { statusCode: 401, body: 'Session invalide.' }
    }
  } else {
    return { statusCode: 401, body: 'Non authentifié.' }
  }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, body: 'Trop de tentatives.' }
  }

  try {
    const { receiver_id, title, body, url } = JSON.parse(event.body)

    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${receiver_id}&select=subscription`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    )

    const rows = await res.json()
    if (!rows.length) return { statusCode: 200, body: 'Pas d\'abonnement enregistré' }

    const payload = JSON.stringify({ title, body, url })
    await Promise.allSettled(
      rows.map(row => webpush.sendNotification(row.subscription, payload))
    )

    return { statusCode: 200, body: 'OK' }
  } catch (err) {
    console.error('send-push error:', err)
    return { statusCode: 500, body: err.message }
  }
}
