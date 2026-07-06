// SOUMISSION KYC VENDEUR — cœur de l'onboarding « zéro page Stripe » : le front NOUT collecte
// identité + IBAN dans SA propre UI, les tokenise DANS LE NAVIGATEUR directement chez Stripe
// (account token + bank token — obligation PSD2 pour une plateforme française : les données
// sensibles ne transitent JAMAIS par nos serveurs), puis nous envoie uniquement les tokens.
// Ici on crée/met à jour le compte connecté avec ces tokens.
//
// Compte créé = « Custom » moderne (controller properties) : dashboard 'none' (le vendeur ne voit
// jamais Stripe), requirement_collection 'application' (NOUT collecte le KYC), payout MANUEL
// (porte-monnaie « Mon argent », inchangé). AUCUN transfert/versement ici — création/màj de compte
// uniquement ; les mouvements d'argent restent dans _payout.js & co.
//
// Les anciens comptes Express (« legacy ») déjà vérifiés ne sont PAS touchés : eux gardent le
// parcours redirection existant. Un compte Express abandonné en cours d'onboarding est remplacé
// par un compte API tout neuf (zéro solde, aucun risque).
const Stripe = require('stripe')
const { createClient } = require('@supabase/supabase-js')
const { buildKycSnapshot, accountMode } = require('./_kyc')

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const ALLOWED_ORIGIN = process.env.URL || 'https://nout.re'

// Rate limiter en mémoire — 5 req/min par IP (même pattern que create-connect-account).
const _rateLimits = new Map()
function isRateLimited(ip) {
  const max = 5, windowMs = 60_000, now = Date.now()
  const entry = _rateLimits.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  _rateLimits.set(ip, entry)
  return entry.count > max
}

// Erreur Stripe → message FR actionnable (le détail brut reste dans les logs serveur).
function frenchStripeError(err) {
  const msg   = String(err?.message ?? '')
  const param = String(err?.param ?? '')
  if (/review the responsibilities|managed accounts|sign(ed)? up for Connect|Connect (is )?(not )?(enabled|activated)|platform.*(loss|liability)/i.test(msg)) {
    // Côté plateforme : Amandine n'a pas encore accepté les « responsabilités » des comptes gérés
    // par la plateforme dans le dashboard Stripe (Paramètres → Connect). Pas une erreur vendeur.
    return { status: 503, platformNotReady: true, error: 'La vérification directe sur NOUT n\'est pas encore activée. Tu peux utiliser la vérification sécurisée classique en attendant.' }
  }
  if (/phone/i.test(param) || /phone/i.test(msg))            return { status: 400, error: 'Le numéro de téléphone semble invalide. Vérifie-le (ex. 0692 12 34 56).' }
  if (/dob/i.test(param) || /at least|age/i.test(msg))       return { status: 400, error: 'La date de naissance semble invalide (il faut avoir 18 ans).' }
  if (/postal_code|address/i.test(param))                    return { status: 400, error: 'L\'adresse semble invalide. Vérifie la rue, le code postal et la ville.' }
  if (/bank_account|external_account|iban/i.test(param + ' ' + msg)) return { status: 400, error: 'Cet IBAN semble invalide. Vérifie-le et réessaie.' }
  if (/token.*(used|expired)|expired.*token/i.test(msg))     return { status: 400, error: 'La session de vérification a expiré. Reprends la validation.' }
  return { status: 500, error: 'Impossible d\'enregistrer ta vérification pour le moment. Réessaie dans un instant.' }
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' }

  const ip = (event.headers['x-forwarded-for'] ?? event.headers['client-ip'] ?? 'unknown').split(',')[0].trim()
  if (isRateLimited(ip)) {
    return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de tentatives. Réessaie dans une minute.' }) }
  }

  // Auth JWT — on agit UNIQUEMENT sur le compte de l'appelant (jamais de userId en body).
  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  const token = authHeader?.replace('Bearer ', '').trim()
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non authentifié.' }) }
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Session invalide.' }) }

  try {
    let body
    try { body = JSON.parse(event.body ?? '{}') } catch { body = {} }
    const accountToken = typeof body.accountToken === 'string' ? body.accountToken.trim() : ''
    const bankToken    = typeof body.bankToken    === 'string' ? body.bankToken.trim()    : ''

    // Seuls des IDs de tokens Stripe (créés côté navigateur avec la clé publique) sont acceptés —
    // jamais de donnée brute (nom, IBAN…) : elle ne doit pas transiter ici (PSD2).
    if (accountToken && !/^ct_[A-Za-z0-9]+$/.test(accountToken)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Jeton de vérification invalide.' }) }
    }
    if (bankToken && !/^btok_[A-Za-z0-9]+$/.test(bankToken)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Jeton bancaire invalide.' }) }
    }
    if (!accountToken && !bankToken) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Rien à enregistrer.' }) }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', authUser.id)
      .single()

    // ── Compte existant : lecture + tri legacy/api ─────────────────────────────────────────────
    let accountId = profile?.stripe_account_id || null
    let account   = null
    if (accountId) {
      try {
        account = await stripe.accounts.retrieve(accountId)
      } catch (e) {
        if (e?.code === 'resource_missing' || e?.statusCode === 404) {
          // ID mort (auto-réparation, même logique que create-connect-account) → on repart de zéro.
          accountId = null
          await supabase.from('profiles').update({ stripe_account_id: null }).eq('id', authUser.id)
        } else {
          throw e
        }
      }
    }

    if (account && accountMode(account) === 'legacy') {
      if (account.details_submitted || account.payouts_enabled) {
        // Compte Express déjà rempli/actif : on n'y touche JAMAIS (il peut porter un solde).
        // Ce compte continue de se gérer via la page hébergée Stripe (parcours existant).
        return { statusCode: 409, headers, body: JSON.stringify({
          mode: 'legacy',
          error: 'Ton compte de paiement existant se gère via la vérification sécurisée classique.',
        }) }
      }
      // Express abandonné en cours de route (rien soumis, zéro solde) → remplacé par un compte API.
      if (!accountToken) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Reprends la vérification depuis le début.' }) }
      }
      console.warn(`[connect-kyc] compte Express non abouti ${accountId} remplacé par un compte API pour ${authUser.id}`)
      accountId = null
      account   = null
    }

    // ── Création ou mise à jour ────────────────────────────────────────────────────────────────
    if (!accountId) {
      if (!accountToken) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Reprends la vérification depuis le début.' }) }
      }
      // Compte « Custom » moderne : NOUT collecte le KYC, le vendeur ne voit aucun dashboard
      // Stripe, versement MANUEL (porte-monnaie). L'identité + l'acceptation des conditions
      // arrivent via account_token (créées dans le navigateur du vendeur). L'IBAN (bank token)
      // est joint au même appel quand il est fourni : tout-ou-rien, pas de compte à moitié créé.
      const createParams = {
        country: 'FR',
        controller: {
          stripe_dashboard:       { type: 'none' },
          fees:                   { payer: 'application' },
          losses:                 { payments: 'application' },
          requirement_collection: 'application',
        },
        capabilities: { transfers: { requested: true } },
        business_profile: {
          mcc: '5931', // « Used merchandise and secondhand stores » — vente d'occasion
          url: 'https://nout.re',
          product_description: 'Vente d\'articles de seconde main entre particuliers sur NOUT (La Réunion)',
        },
        settings: { payouts: { schedule: { interval: 'manual' } } },
        metadata: { nout_user_id: authUser.id }, // lie le compte KYC au membre NOUT (traçabilité)
        account_token: accountToken,
      }
      if (bankToken) createParams.external_account = bankToken

      // Idempotence anti double-clic / double-onglet : deux créations concurrentes du même user dans
      // la même fenêtre de 30 s partagent la clé → Stripe n'en accepte qu'UNE (la 2e, portant un token
      // différent, est rejetée) → pas de compte connecté orphelin avec l'identité du vendeur.
      const idemWindow = Math.floor(Date.now() / 30_000)
      const created = await stripe.accounts.create(createParams, { idempotencyKey: `acctcreate_${authUser.id}_${idemWindow}` })

      // Défense en profondeur : le contenu du token est fabriqué côté client. Si quelqu'un forge un
      // token « company » (au lieu de particulier), on refuse et on supprime le compte fraîchement créé.
      if (created.business_type && created.business_type !== 'individual') {
        try { await stripe.accounts.del(created.id) } catch (e) { console.error('[connect-kyc] del compte non-individual:', e?.message) }
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Vérification invalide. Reprends la vérification depuis le début.' }) }
      }
      accountId = created.id
      const { error: saveError } = await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', authUser.id)
      if (saveError) {
        // Sans lien profil→compte, le compte serait orphelin (retraits impossibles) : on préfère
        // échouer franchement et laisser le vendeur re-valider (le compte orphelin reste vide).
        console.error('[connect-kyc] sauvegarde stripe_account_id échouée:', saveError.message)
        return { statusCode: 500, headers, body: JSON.stringify({ error: 'Enregistrement impossible pour le moment. Réessaie.' }) }
      }
      account = created
    } else {
      // Compte API existant : màj identité (nouveau token) et/ou nouvel IBAN.
      if (accountToken) {
        account = await stripe.accounts.update(accountId, { account_token: accountToken })
        if (account.business_type && account.business_type !== 'individual') {
          // Token forgé « company » : on refuse (défense en profondeur, cf. création).
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Vérification invalide. Reprends la vérification depuis le début.' }) }
        }
      } else {
        account = await stripe.accounts.retrieve(accountId)
      }

      if (bankToken) {
        // CHANGEMENT d'IBAN (un compte bancaire existait déjà) vs COMPLÉTION (premier IBAN).
        const hadBank = (account.external_accounts?.total_count ?? 0) > 0

        if (hadBank) {
          // ANTI-DÉTOURNEMENT (session volée) : un remplacement d'IBAN déclenche
          //  1) un GEL des retraits de 48 h (lu par request-payout ET sweep-wallets via
          //     metadata.bank_changed_at) — posé AVANT l'attache : si l'attache échoue ensuite,
          //     un gel sans changement est inoffensif ; l'inverse (IBAN changé sans gel) ne l'est pas,
          //  2) une alerte au vendeur — s'il n'est pas à l'origine du changement, il a 48 h pour réagir
          //     avant que le moindre centime ne puisse partir vers le nouvel IBAN.
          await stripe.accounts.update(accountId, {
            metadata: { bank_changed_at: String(Math.floor(Date.now() / 1000)) },
          })
        }

        await stripe.accounts.createExternalAccount(accountId, {
          external_account: bankToken,
          default_for_currency: true, // le nouvel IBAN devient LA destination des retraits
        })

        if (hadBank) {
          try {
            await supabase.from('notifications').insert({
              user_id: authUser.id, type: 'bank_change',
              title: 'Ton IBAN a été modifié',
              body: 'Le compte bancaire de tes retraits vient d\'être changé. Si ce n\'est pas toi, change ton mot de passe immédiatement et écris à contact@nout.re. Par sécurité, les retraits sont suspendus 48 h.',
              link: '/compte/paiements',
            })
          } catch (e) {
            console.error('[connect-kyc] notification bank_change:', e?.message)
          }
        }

        // Snapshot FRAIS après l'attache bancaire (sinon le front verrait encore « IBAN manquant »).
        account = await stripe.accounts.retrieve(accountId)
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify(buildKycSnapshot(account)) }
  } catch (err) {
    console.error('[connect-kyc] erreur:', err?.message, err?.code ?? '', err?.param ?? '')
    const mapped = frenchStripeError(err)
    return { statusCode: mapped.status, headers, body: JSON.stringify({
      error: mapped.error,
      ...(mapped.platformNotReady ? { platformNotReady: true } : {}),
    }) }
  }
}
