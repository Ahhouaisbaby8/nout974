exports.handler = async () => {
  const now = new Date().toLocaleString('fr-FR', {
    timeZone: 'Indian/Reunion',
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <h1 style="color:#0A0F2C;font-size:22px;margin-bottom:8px;">✅ Test email NOUT</h1>
      <p style="color:#444;font-size:15px;line-height:1.6;">
        Cet email confirme que <strong>Resend est bien configuré</strong> sur <strong>nout.re</strong>.
      </p>
      <p style="color:#888;font-size:13px;margin-top:24px;">
        Envoyé le : ${now} (heure de La Réunion)
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#bbb;font-size:11px;">NOUT · La Réunion 974 · contact@nout.re</p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NOUT <contact@nout.re>',
      to: 'amandine.megarisse@gmail.com',
      subject: '✅ Test email NOUT — Resend fonctionne',
      html,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('test-email Resend error:', errText)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: errText }),
    }
  }

  const data = await res.json()
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, id: data.id, envoyé_à: 'amandine.megarisse@gmail.com' }),
  }
}
