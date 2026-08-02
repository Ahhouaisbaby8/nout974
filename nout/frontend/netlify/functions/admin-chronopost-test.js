// ─── Test de la liaison Chronopost (admin) ───────────────────────────────────────────────────
// Vérifie EN VRAI que l'intégration Chronopost répond : identifiants présents + le serveur SOAP
// accepte une requête. On appelle le suivi (trackSkybillV2) sur un numéro volontairement bidon :
//   - si Chronopost répond (même « colis inconnu ») → le serveur ET la clé/contrat fonctionnent.
//   - si erreur d'authentification / réseau → on remonte le message.
// Réservé admin (JWT + rôle). Lecture seule : ne crée aucune expédition, ne touche à rien.
// NE RENVOIE JAMAIS les identifiants — seulement présent/absent et le résultat de l'appel.

const { createClient } = require('@supabase/supabase-js')
const {
  soapCall, buildTags, isChronopostConfigured, xmlAll, xmlFirst, ChronopostError, credentials,
} = require('./_chronopost-client')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const CORS_ORIGIN = process.env.URL || 'https://nout.re'
const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Auth admin
  const token = (event.headers['authorization'] || event.headers['Authorization'] || '').replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', caller.id).single()
  if (prof?.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès réservé aux administrateurs.' }) }

  // 1) Présence des identifiants (sans jamais renvoyer les valeurs).
  const configured = isChronopostConfigured()
  let hasRelais = false, hasExpress = false
  try { hasRelais = !!credentials('relais')?.account } catch { /* */ }
  try { hasExpress = !!credentials('express')?.account } catch { /* */ }
  const vars = {
    'Contrat Relais DOM': hasRelais,
    'Contrat Express Intra': hasExpress,
  }

  if (!configured) {
    return { statusCode: 200, headers, body: JSON.stringify({
      configured: false, vars, steps: [],
      verdict: 'Chronopost non configuré : identifiants de contrat manquants.',
    }) }
  }

  // 2) Appel réel : suivi d'un numéro bidon. Le serveur doit répondre (même « inconnu »).
  const steps = []
  const t0 = Date.now()
  try {
    const inner = buildTags({ language: 'fr_FR', skybillNumber: 'XX000000000FR' })
    const xml = await soapCall('tracking', 'trackSkybillV2', inner)
    const events = xmlAll(xml, 'events')
    const errorCode = xmlFirst(xml, 'errorCode')
    // Le serveur a répondu (peu importe qu'il connaisse le colis) → la liaison marche.
    steps.push({
      name: 'tracking', label: 'Le serveur Chronopost répond', ok: true, ms: Date.now() - t0,
      info: { evenements: events.length, code: errorCode || 'ok' },
    })
  } catch (e) {
    const code = e instanceof ChronopostError ? e.code : 'error'
    steps.push({ name: 'tracking', label: 'Le serveur Chronopost répond', ok: false, ms: Date.now() - t0, code, message: e.message })
  }

  const allOk = steps.every(s => s.ok)
  const verdict = allOk
    ? 'Chronopost est actif et répond correctement.'
    : 'Chronopost est configuré mais l\'appel a échoué — voir le détail ci-dessous.'

  return { statusCode: 200, headers, body: JSON.stringify({ configured: true, vars, steps, allOk, verdict }) }
}
