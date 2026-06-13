exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let email, username
  try {
    const body = JSON.parse(event.body ?? '{}')
    email    = body.email
    username = body.username
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  if (!email) return { statusCode: 400, body: 'Email requis' }

  // Prénom à partir du champ username ou du préfixe email
  const prenom = username
    ? username.charAt(0).toUpperCase() + username.slice(1)
    : email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)

  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'no api key' }) }
  }

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur NOUT</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFF;font-family:'Inter',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- LOGO -->
        <tr>
          <td align="center" style="background:#0A0F2C;border-radius:16px 16px 0 0;padding:32px 24px 24px;">
            <p style="margin:0;font-size:42px;font-weight:900;color:#FFFFFF;letter-spacing:-1px;font-family:Georgia,serif;">NOUT</p>
            <p style="margin:6px 0 0;font-size:11px;font-weight:700;color:#00C4B4;letter-spacing:5px;text-transform:uppercase;">La Réunion 974</p>
          </td>
        </tr>

        <!-- CONTENU PRINCIPAL -->
        <tr>
          <td style="background:#FFFFFF;padding:40px 32px 32px;">

            <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0A0F2C;">
              Bienvenue ${prenom}&nbsp;! 🎉
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.7;">
              Tu fais maintenant partie de la marketplace 100&nbsp;% réunionnaise.<br>
              Commence à vendre ou acheter dès maintenant&nbsp;!
            </p>

            <!-- BOUTON CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 36px;">
              <tr>
                <td style="background:#007A6E;border-radius:50px;padding:14px 32px;">
                  <a href="https://nout.re" style="color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;display:block;">
                    Découvrir NOUT →
                  </a>
                </td>
              </tr>
            </table>

            <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 32px;">

            <!-- SECTION PWA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F9FA;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:24px 24px 8px;">
                  <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0A0F2C;">📱 Installe NOUT sur ton téléphone</p>
                  <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.6;">
                    NOUT est disponible directement sur ton écran d'accueil,<br>sans passer par l'App Store&nbsp;!
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 24px;">

                  <!-- Deux colonnes -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr valign="top">

                      <!-- iPhone -->
                      <td width="48%" style="background:#FFFFFF;border-radius:10px;padding:16px;border:1px solid #E5E7EB;">
                        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0A0F2C;">🍎 iPhone (Safari)</p>
                        <ol style="margin:0;padding-left:18px;font-size:12px;color:#4B5563;line-height:2;">
                          <li>Ouvre <strong>nout.re</strong> dans Safari</li>
                          <li>Appuie sur l'icône <strong>Partager</strong> (carré + flèche ↑)</li>
                          <li>Fais défiler → <strong>"Sur l'écran d'accueil"</strong></li>
                          <li>Appuie sur <strong>"Ajouter"</strong></li>
                        </ol>
                      </td>

                      <td width="4%"></td>

                      <!-- Android -->
                      <td width="48%" style="background:#FFFFFF;border-radius:10px;padding:16px;border:1px solid #E5E7EB;">
                        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0A0F2C;">🤖 Android (Chrome)</p>
                        <ol style="margin:0;padding-left:18px;font-size:12px;color:#4B5563;line-height:2;">
                          <li>Ouvre <strong>nout.re</strong> dans Chrome</li>
                          <li>Appuie sur les <strong>3 points</strong> en haut à droite</li>
                          <li>Appuie sur <strong>"Ajouter à l'écran d'accueil"</strong></li>
                          <li>Appuie sur <strong>"Ajouter"</strong></li>
                        </ol>
                      </td>

                    </tr>
                  </table>

                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td align="center" style="background:#F3F4F6;border-radius:0 0 16px 16px;padding:20px 24px;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.8;">
              <a href="https://nout.re" style="color:#007A6E;font-weight:600;text-decoration:none;">nout.re</a>
              &nbsp;·&nbsp;
              <a href="mailto:contact@nout.re" style="color:#007A6E;font-weight:600;text-decoration:none;">contact@nout.re</a>
            </p>
            <p style="margin:4px 0 0;font-size:11px;color:#D1D5DB;">
              Le marketplace 100&nbsp;% réunionnais — Saint-Denis, La Réunion 974
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NOUT <contact@nout.re>',
        to: [email],
        subject: 'Bienvenue sur NOUT 🎉 - La marketplace du 974',
        html,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('send-welcome Resend error:', err)
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: err }) }
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('send-welcome error:', err.message)
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) }
  }
}
