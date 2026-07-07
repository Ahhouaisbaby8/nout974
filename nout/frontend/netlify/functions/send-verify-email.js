// ENVOI DE L'E-MAIL DE VÉRIFICATION (validation e-mail différée) — bouton « Renvoyer l'e-mail ».
//
// Le membre est DÉJÀ connecté (l'inscription ne bloque plus) : il demande ici le lien qui
// vérifiera son adresse. Le token (aléatoire, 24 h, usage unique) est stocké sur SON profil
// (colonnes email_verify_token / email_verify_expires — non lisibles par le client, cf.
// migration 20260707_email_verified.sql) et le lien pointe vers /verifier-email.
//
// Comptes Google : vérifiés d'office (Google fait foi) → réponse « déjà vérifié », zéro e-mail.
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { rateLimit, getClientIp, TOO_MANY } = require('./_rate-limit')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'
const SITE_URL       = process.env.URL || 'https://nout.re'

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Anti-abus : 3 envois/min par IP (chaque envoi consomme le quota Resend).
  if (rateLimit(getClientIp(event), 'send-verify-email', 3)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

  // Auth JWT — on n'envoie le lien qu'à l'adresse de l'appelant lui-même.
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    if (authUser.app_metadata?.provider === 'google') {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, already: true }) }
    }

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, email_verified_at')
      .eq('id', authUser.id)
      .single()
    if (profErr || !prof?.email) {
      // Colonne absente (migration pas encore passée) ou profil illisible → message honnête.
      console.error('[send-verify-email] lecture profil:', profErr?.message)
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'La vérification n\'est pas encore disponible. Réessaie plus tard.' }) }
    }
    if (prof.email_verified_at) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, already: true }) }
    }

    // Nouveau token (écrase l'ancien : seul le DERNIER lien envoyé est valable).
    const verifyToken = crypto.randomBytes(24).toString('hex')
    const expiresAt   = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const { error: updErr } = await supabase
      .from('profiles')
      .update({ email_verify_token: verifyToken, email_verify_expires: expiresAt })
      .eq('id', prof.id)
    if (updErr) {
      console.error('[send-verify-email] écriture token:', updErr.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Envoi impossible pour le moment. Réessaie.' }) }
    }

    if (!process.env.RESEND_API_KEY) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Envoi d\'e-mails indisponible pour le moment.' }) }
    }

    const verifyUrl = `${SITE_URL}/verifier-email?uid=${prof.id}&token=${verifyToken}`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NOUT <contact@nout.re>',
        to: prof.email,
        subject: 'Confirme ton adresse e-mail — NOUT 974',
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#F8FAFF">
            <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
              <h1 style="color:#1A3A8F;font-size:22px;margin:0 0 8px;text-align:center">Confirme ton adresse</h1>
              <p style="color:#6B7A99;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px">
                Clique sur le bouton ci-dessous pour vérifier ton adresse e-mail et débloquer
                la publication d'annonces, la messagerie et les achats sur NOUT.
              </p>
              <div style="text-align:center;margin:24px 0">
                <a href="${verifyUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#0E7FAB,#00C4B4);color:white;padding:14px 32px;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px">
                  Confirmer mon adresse
                </a>
              </div>
              <p style="color:#6B7A99;font-size:12px;line-height:1.6;text-align:center">
                Ce lien est valable 24 heures. Si tu n'es pas à l'origine de cette demande, ignore cet e-mail.
              </p>
              <p style="color:#6B7A99;font-size:12px;text-align:center;margin-top:24px;border-top:1px solid #E8F0FF;padding-top:16px">
                L'équipe NOUT 974 — Le marketplace 100 % réunionnais
              </p>
            </div>
          </div>
        `,
      }),
    })
    if (!res.ok) {
      console.error(`[send-verify-email] Resend ${res.status}:`, await res.text())
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Envoi impossible pour le moment. Réessaie.' }) }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('[send-verify-email] erreur:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur. Réessaie.' }) }
  }
}
