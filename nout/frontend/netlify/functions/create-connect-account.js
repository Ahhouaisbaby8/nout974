const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter en mémoire — 5 req/min par IP
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 5, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  // Rate limiting
  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Vérification JWT — l'appelant doit être authentifié
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }
  }

  try {
    const { userId } = JSON.parse(event.body)
    const siteUrl    = process.env.URL || 'http://localhost:8888'

    // L'utilisateur authentifié doit être celui qui active le compte
    if (authUser.id !== userId) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Accès refusé.' }) }
    }

    // Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id, email')
      .eq('id', userId)
      .single()

    // Crée un compte connecté Express PARTICULIER (sans SIRET ; versement MANUEL = porte-monnaie : l'argent
    // s'accumule dans le solde du compte connecté et n'est viré à la banque que sur demande « Retirer ») et le stocke.
    const createConnectedAccount = async () => {
      const account = await stripe.accounts.create({
        type:          'express',
        country:       'FR',
        email:         profile?.email,
        business_type: 'individual',
        capabilities:  { transfers: { requested: true } },
        business_profile: { product_description: 'Vente d\'articles de seconde main sur NOUT 974' },
        settings:      { payouts: { schedule: { interval: 'manual' } } },
      })
      await supabase.from('profiles').update({ stripe_account_id: account.id }).eq('id', userId)
      return account.id
    }

    let accountId = profile?.stripe_account_id

    // AUTO-RÉPARATION 1 : si l'ID stocké ne correspond plus à un compte Stripe existant → on repart de zéro.
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch (e) {
        if (e?.code === 'resource_missing' || e?.statusCode === 404) {
          console.warn(`[connect] stripe_account_id ${accountId} invalide → recréation`)
          accountId = null
          await supabase.from('profiles').update({ stripe_account_id: null }).eq('id', userId)
        } else {
          // Erreur transitoire/autre : on NE plante PAS, on garde l'ID et on laisse accountLinks.create tenter.
          console.warn(`[connect] retrieve ${accountId} a échoué (${e?.code || e?.message}) — on garde l'ID`)
        }
      }
    }

    if (!accountId) accountId = await createConnectedAccount()

    const linkParams = {
      refresh_url: `${siteUrl}/compte/paiements?stripe=refresh`,
      return_url:  `${siteUrl}/compte/paiements?stripe=success`,
      type:        'account_onboarding',
    }

    // AUTO-RÉPARATION 2 : l'ID stocké existe mais n'est PAS un compte connecté de NOTRE plateforme (ancien
    // ID, compte plateforme lui-même, valeur corrompue) → Stripe renvoie « not connected to your platform /
    // does not exist ». Dans ce cas on réinitialise et on recrée un compte connecté propre, puis on réessaie.
    let link
    try {
      link = await stripe.accountLinks.create({ account: accountId, ...linkParams })
    } catch (e) {
      const badAccount = e?.code === 'account_invalid'
        || /not connected to your platform|does not exist|No such account/i.test(String(e?.message ?? ''))
      if (!badAccount) throw e
      console.warn(`[connect] accountLink KO pour ${accountId} (${e?.message}) → recréation d'un compte connecté propre`)
      await supabase.from('profiles').update({ stripe_account_id: null }).eq('id', userId)
      accountId = await createConnectedAccount()
      link = await stripe.accountLinks.create({ account: accountId, ...linkParams })
    }

    return { statusCode: 200, headers, body: JSON.stringify({ url: link.url }) }

  } catch (err) {
    // Le message brut est journalisé côté serveur (visible dans les logs Netlify), pas renvoyé à
    // l'utilisateur. Cause n°1 d'échec = Stripe Connect pas activé sur le compte de la PLATEFORME
    // (dashboard NOUT) : on la détecte pour afficher un message clair et actionnable.
    console.error('Connect error:', err?.message, err?.code ?? '')
    const raw = String(err?.message ?? '')
    const connectNotEnabled = /sign(ed)? up for Connect|Connect (is )?(not )?(enabled|activated)|only.*Connect platforms|managed accounts|review the responsibilities/i.test(raw)
    const base = connectNotEnabled
      ? 'Les paiements vendeur ne sont pas encore activés côté NOUT (Stripe Connect à activer sur le compte de la plateforme).'
      : 'Impossible de préparer ton compte de paiement pour le moment.'
    // Message générique côté client (le détail Stripe reste dans console.error / logs Netlify uniquement).
    return { statusCode: 500, headers, body: JSON.stringify({ error: base }) }
  }
}
