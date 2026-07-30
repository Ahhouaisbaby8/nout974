// ─── CHEF D'ORCHESTRE LOGISTIQUE (déclenché par un cron EXTERNE) ─────────────────────────────
// Point d'entrée FIABLE, indépendant du scheduler Netlify (qui ne déclenche pas les crons natifs —
// même bug que release-delivered/cron-payouts). Un service cron externe (cron-job.org) appelle cette
// URL toutes les 15 min :
//   https://nout.re/.netlify/functions/cron-logistics?key=<PAYOUT_CRON_KEY>
//
// À chaque appel, lance LE CIRCUIT COMPLET, dans l'ordre :
//   1) chronopost-tracking → interroge Chronopost : colis livré ? → pose delivered_at
//   2) ubn-tracking        → interroge UBN : colis livré/échoué ? → pose delivered_at / disputed
//   3) auto-refund         → rembourse l'acheteur si le colis n'a pas été déposé sous 7 jours
//                            (et débloque les versements/gèle les litiges — logique déjà en place)
//
// Résultat : NOUT est informé du dépôt/livraison réelle par les transporteurs, ET l'acheteur est
// remboursé automatiquement au bout d'une semaine de non-dépôt. Circuit 100 % automatique.
//
// Sécurité : même clé que les versements (PAYOUT_CRON_KEY, Netlify only). On appelle les handlers
// existants DIRECTEMENT (require), avec un event « invocation planifiée » (sans httpMethod → leur
// garde interne les laisse passer sans re-secret). Aucune logique dupliquée : les 3 crons restent
// la source de vérité, on ne fait que les RÉVEILLER de façon fiable.

const chronopostTracking = require('./chronopost-tracking')
const ubnTracking        = require('./ubn-tracking')
const autoRefund         = require('./auto-refund')

// Event « planifié » : pas de httpMethod → les handlers ne réclament pas le header x-nout-cron.
const scheduledEvent = { source: 'cron-logistics' }

async function runStep(name, mod) {
  const t0 = Date.now()
  try {
    const res = await mod.handler(scheduledEvent)
    return { name, ok: true, ms: Date.now() - t0, body: (res && res.body) ? String(res.body).slice(0, 200) : null }
  } catch (e) {
    console.error(`[cron-logistics] ${name} :`, e.message)
    return { name, ok: false, ms: Date.now() - t0, error: e.message }
  }
}

exports.handler = async (event) => {
  // Auth par la clé externe (query ?key=… OU header x-payout-key), identique aux versements.
  const key = event?.queryStringParameters?.key || event?.headers?.['x-payout-key']
  if (!process.env.PAYOUT_CRON_KEY || key !== process.env.PAYOUT_CRON_KEY) {
    return { statusCode: 403, body: 'Non autorisé.' }
  }

  console.log('🔄 cron-logistics démarré', new Date().toISOString())

  // Suivi transporteurs D'ABORD (pose delivered_at), PUIS auto-refund (rembourse les non-déposés).
  // Ordre important : on veut que les livraisons du tour soient constatées avant de décider des remboursements.
  const steps = []
  steps.push(await runStep('chronopost-tracking', chronopostTracking))
  steps.push(await runStep('ubn-tracking', ubnTracking))
  steps.push(await runStep('auto-refund', autoRefund))

  const summary = 'cron-logistics terminé — ' + steps.map(s => `${s.name}:${s.ok ? 'ok' : 'ERREUR'}`).join(' · ')
  console.log(summary)
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary, steps }) }
}
