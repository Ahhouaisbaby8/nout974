const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL        = process.env.URL || 'https://nout.re'

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Vérification JWT
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  // Vérification rôle admin/moderator
  const { data: caller } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!caller || !['admin', 'moderator'].includes(caller.role)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
  }

  try {
    const { userId } = JSON.parse(event.body)

    // Récupérer email + username + warnings actuels
    const { data: target, error: profileError } = await supabase
      .from('profiles')
      .select('email, username, warnings')
      .eq('id', userId)
      .single()

    if (profileError || !target) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Utilisateur introuvable.' }) }
    }

    // Incrémenter le compteur d'avertissements
    await supabase
      .from('profiles')
      .update({ warnings: (target.warnings ?? 0) + 1 })
      .eq('id', userId)

    // Envoi email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NOUT 974 <onboarding@resend.dev>',
        to: [target.email],
        subject: '⚠️ Avertissement — NOUT 974',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto">
            <h2 style="color:#0A0F2C">⚠️ Avertissement de l'équipe NOUT</h2>
            <p>Bonjour <strong>${target.username}</strong>,</p>
            <p>Ton compte a reçu un <strong>avertissement</strong> suite à un signalement de la communauté NOUT 974.</p>
            <p>Nous te demandons de respecter les règles de la marketplace pour continuer à profiter du service. En cas de récidive, ton compte pourra être suspendu ou banni.</p>
            <p>Si tu penses qu'il s'agit d'une erreur, réponds à cet email.</p>
            <p style="margin-top:32px;color:#6B7A99;font-size:13px">L'équipe NOUT 974 — <a href="${SITE_URL}" style="color:#1A3A8F">nout974.re</a></p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Resend error:', errText)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur envoi email.' }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }

  } catch (err) {
    console.error('send-warning error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur.' }) }
  }
}
