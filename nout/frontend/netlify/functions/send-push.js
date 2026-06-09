const webpush = require('web-push')

webpush.setVapidDetails(
  'mailto:contact@nout974.re',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

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

    await webpush.sendNotification(
      rows[0].subscription,
      JSON.stringify({ title, body, url })
    )

    return { statusCode: 200, body: 'OK' }
  } catch (err) {
    console.error('send-push error:', err)
    return { statusCode: 500, body: err.message }
  }
}
