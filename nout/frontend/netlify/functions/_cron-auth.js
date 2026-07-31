// ─── Autorisation partagée des crons ─────────────────────────────────────────────────────────
// Un cron doit accepter : (1) l'invocation planifiée Netlify (auto), (2) le « Run now » du dashboard
// Netlify, (3) un appel serveur signé (cron-job.org avec x-nout-cron = CRON_SECRET). Et refuser tout
// appel externe anonyme.
//
// Netlify marque SES invocations (planifiée ET « Run now ») avec le header X-NF-Event: schedule +
// user-agent « Netlify Clockwork » (doc officielle) — un appel externe ne peut pas forger ce contexte.
// AVANT ce helper, le « Run now » (appel HTTP sans x-nout-cron) était refusé (401 en ~4 ms) → on ne
// pouvait pas tester les crons à la demande.
//
// Renvoie true si l'appel est autorisé, false sinon. Usage :
//   if (!cronAuthorized(event)) return { statusCode: 401, body: 'Non autorisé.' }

function cronAuthorized(event) {
  // Invocation planifiée Netlify = pas de httpMethod → toujours autorisée.
  if (!event || !event.httpMethod) return true
  const h = event.headers || {}
  // « Run now » du dashboard + toute invocation Netlify : header/UA propres à Netlify (non forgeables).
  const isNetlify = (h['x-nf-event'] === 'schedule') || /clockwork/i.test(h['user-agent'] || '')
  // Appel serveur signé (cron-job.org ou interne).
  const hasSecret = process.env.CRON_SECRET && h['x-nout-cron'] === process.env.CRON_SECRET
  return isNetlify || hasSecret
}

module.exports = { cronAuthorized }
