// ─── Test de la liaison UBN (admin) ──────────────────────────────────────────────────────────
// Vérifie EN VRAI que l'intégration UBN fonctionne : les variables sont-elles présentes, la clé
// est-elle acceptée, le serveur UBN répond-il ? Enchaîne 3 vérifications de la doc v4.5 :
//   1) ping         (GET /distant/ping)        → le service HUB est en ligne (peut marcher sans clé)
//   2) auth-check    (GET /distant/auth-check)  → la clé + l'identité client sont acceptées
//   3) points-relais (GET /distant/points-relais?cp=97400) → un vrai appel métier renvoie des relais
// Réservé admin (JWT + rôle). Lecture seule : ne crée aucune expédition, ne touche à rien.
// NE RENVOIE JAMAIS la clé ni les secrets — seulement présent/absent et le résultat des appels.

const { createClient } = require('@supabase/supabase-js')
const { ubnGet, isUbnConfigured, cfg, API_PREFIX, UbnError } = require('./_ubn-client')

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

  // 1) Présence des variables (sans jamais renvoyer les valeurs secrètes).
  const c = cfg()
  const vars = {
    UBN_API_KEY:        Boolean(c.apiKey),
    UBN_HUB_BASE:       Boolean(c.hubBase),
    UBN_PARTNER:        Boolean(c.partner),
    UBN_CUSTOMER:       Boolean(c.customer),
    UBN_API_CONNECT_ID: Boolean(c.connectId),
  }
  const configured = isUbnConfigured()   // clé + URL du HUB présentes (minimum pour tenter un appel)
  // On expose juste le HUB (URL publique, pas un secret) pour aider au diagnostic.
  const hubBase = c.hubBase || null

  const steps = []
  const runStep = async (name, label, fn) => {
    const t0 = Date.now()
    try {
      const info = await fn()
      steps.push({ name, label, ok: true, ms: Date.now() - t0, info })
    } catch (e) {
      const code = e instanceof UbnError ? e.code : 'error'
      const status = e instanceof UbnError ? e.status : null
      steps.push({ name, label, ok: false, ms: Date.now() - t0, code, status, message: e.message })
    }
  }

  if (!configured) {
    return { statusCode: 200, headers, body: JSON.stringify({
      configured: false, vars, hubBase, steps,
      verdict: 'UBN non configuré : il manque la clé API ou l\'URL du HUB.',
    }) }
  }

  // 2) ping (service en ligne)
  await runStep('ping', 'Le service UBN est en ligne', async () => {
    const r = await ubnGet('/ping')
    return { reponse: r?.status || r?.message || 'ok' }
  })

  // 3) auth-check (clé + identité acceptées)
  await runStep('auth', 'La clé API est acceptée', async () => {
    const r = await ubnGet('/auth-check')
    return { reponse: r?.status || r?.message || 'ok' }
  })

  // 4) points-relais (vrai appel métier : renvoie des relais autour d'un CP réel — St-Denis 97400)
  await runStep('relais', 'Les points relais répondent', async () => {
    const r = await ubnGet('/points-relais', { query: { cp: '97400', ville: 'Saint-Denis' } })
    const items = r?.items || r?.points || r?.data || []
    return { nb_relais: Array.isArray(items) ? items.length : 0 }
  })

  const allOk = steps.every(s => s.ok)
  const authStep = steps.find(s => s.name === 'auth')
  let verdict
  if (allOk) verdict = 'UBN est actif et répond correctement.'
  else if (authStep && !authStep.ok) verdict = 'Le serveur répond mais la clé/identité est refusée — vérifie UBN_API_KEY, UBN_PARTNER, UBN_CUSTOMER.'
  else verdict = 'UBN est configuré mais un appel a échoué — voir le détail ci-dessous.'

  return { statusCode: 200, headers, body: JSON.stringify({
    configured: true, vars, hubBase, apiPrefix: API_PREFIX, steps, allOk, verdict,
  }) }
}
