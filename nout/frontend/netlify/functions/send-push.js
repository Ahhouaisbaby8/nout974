const webpush = require('web-push')

webpush.setVapidDetails(
  'mailto:contact@nout974.re',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
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
