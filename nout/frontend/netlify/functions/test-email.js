const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

exports.handler = async () => {
  const key = process.env.RESEND_API_KEY
  if (!key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: 'RESEND_API_KEY manquante' }) }

  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Indian/Reunion' })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'NOUT <contact@nout.re>',
      to: ['amandine.megarisse@gmail.com'],
      subject: '✅ Test email NOUT — Resend fonctionne',
      html: '<div style="font-family:sans-serif;padding:32px"><h1 style="color:#0A0F2C">Test NOUT</h1><p>Resend est bien configuré sur nout.re.</p><p style="color:#888">Envoyé le : ' + now + ' (heure Réunion)</p></div>',
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('test-email error:', err)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ ok: false, error: err }) }
  }

  const data = await res.json()
  return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, id: data.id }) }
}
