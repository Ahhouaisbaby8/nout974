// VALIDATION DU LIEN DE VÉRIFICATION D'E-MAIL — cible du lien envoyé par
// send-verify-email.js / send-welcome.js. Le token EST l'authentification
// (le clic peut venir d'un autre appareil, sans session) : uid + token
// doivent correspondre au profil et ne pas être expirés.
//
// Usage unique : la mise à jour est conditionnée au token exact (.eq) →
// un token consommé ou remplacé ne peut pas être rejoué.
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { rateLimit, getClientIp, TOO_MANY } = require('./_rate-limit')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Comparaison en temps constant (anti timing-attack sur le token).
function safeEqual(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Anti brute-force : 10 essais/min par IP (le token fait 48 hexa — infatigable de toute façon).
  if (rateLimit(getClientIp(event), 'verify-email', 10)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
  }

  try {
    let body
    try { body = JSON.parse(event.body ?? '{}') } catch { body = {} }
    const uid   = typeof body.uid   === 'string' ? body.uid.trim()   : ''
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!/^[0-9a-f-]{36}$/i.test(uid) || !/^[0-9a-f]{48}$/i.test(token)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Lien de vérification invalide.' }) }
    }

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id, email_verified_at, email_verify_token, email_verify_expires')
      .eq('id', uid)
      .maybeSingle()
    if (profErr) {
      console.error('[verify-email] lecture profil:', profErr.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Vérification impossible pour le moment. Réessaie.' }) }
    }
    if (!prof) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Lien de vérification invalide.' }) }
    }
    if (prof.email_verified_at) {
      // Déjà vérifié (double clic sur le lien, vieux lien…) : succès idempotent.
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, already: true }) }
    }
    if (!prof.email_verify_token || !safeEqual(prof.email_verify_token, token)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ce lien n\'est plus valable. Demande un nouvel e-mail de vérification.' }) }
    }
    if (!prof.email_verify_expires || new Date(prof.email_verify_expires) < new Date()) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ce lien a expiré. Demande un nouvel e-mail de vérification.' }) }
    }

    // Usage unique : l'UPDATE exige le token courant — un lien déjà consommé/remplacé ne matche plus.
    const { data: updated, error: updErr } = await supabase
      .from('profiles')
      .update({ email_verified_at: new Date().toISOString(), email_verify_token: null, email_verify_expires: null })
      .eq('id', uid)
      .eq('email_verify_token', prof.email_verify_token)
      .select('id')
    if (updErr) {
      console.error('[verify-email] écriture:', updErr.message)
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Vérification impossible pour le moment. Réessaie.' }) }
    }
    if (!updated || !updated.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Ce lien n\'est plus valable. Demande un nouvel e-mail de vérification.' }) }
    }

    console.log(`[verify-email] adresse vérifiée pour ${uid}`)
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    console.error('[verify-email] erreur:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erreur serveur. Réessaie.' }) }
  }
}
