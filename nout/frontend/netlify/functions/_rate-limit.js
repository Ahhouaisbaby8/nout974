// ─── Rate limiting partagé (anti-flooding) ────────────────────────────────────────
//
// Première ligne de défense contre le bombardement d'une fonction Netlify par un
// client (bot, script, boucle malveillante). Limite le nombre d'appels par IP et
// par fenêtre de temps. Invisible pour un usage normal ; bloque les abus.
//
// ⚠️ Portée : compteur EN MÉMOIRE, par instance de fonction (chaque fonction Netlify
// a son propre Map). C'est volontairement simple et sans dépendance : suffisant comme
// garde-fou anti-flood. Ce n'est PAS un quota distribué exact (plusieurs instances =
// plusieurs compteurs), mais ça casse net les rafales depuis une même IP. Pour un vrai
// quota global il faudrait un store partagé (Redis/Upstash) — non nécessaire ici.
//
// Usage dans une fonction :
//   const { rateLimit, getClientIp } = require('./_rate-limit')
//   const ip = getClientIp(event)
//   if (rateLimit(ip, 'submit-review', 5)) {
//     return { statusCode: 429, headers, body: JSON.stringify({ error: TOO_MANY }) }
//   }

// Un Map par (clé fonction) pour ne pas mélanger les compteurs entre fonctions.
const _buckets = new Map()

// Extrait l'IP client depuis les en-têtes Netlify (repli 'unknown' si absent).
function getClientIp(event) {
  const raw = event?.headers?.['x-forwarded-for']
           ?? event?.headers?.['x-nf-client-connection-ip']
           ?? event?.headers?.['client-ip']
           ?? 'unknown'
  return String(raw).split(',')[0].trim() || 'unknown'
}

// Renvoie true si l'IP a DÉPASSÉ la limite (→ la fonction doit répondre 429).
// - ip        : IP client (via getClientIp)
// - scope     : nom logique de la fonction (isole les compteurs)
// - max       : nombre max d'appels autorisés dans la fenêtre (défaut 10)
// - windowMs  : durée de la fenêtre en ms (défaut 60 000 = 1 min)
function rateLimit(ip, scope = 'default', max = 10, windowMs = 60_000) {
  const now = Date.now()
  let bucket = _buckets.get(scope)
  if (!bucket) { bucket = new Map(); _buckets.set(scope, bucket) }

  // Nettoyage opportuniste : purge les entrées expirées de ce scope (évite la fuite mémoire).
  if (bucket.size > 5000) {
    for (const [k, v] of bucket) { if (now > v.resetAt) bucket.delete(k) }
  }

  const entry = bucket.get(ip) ?? { count: 0, resetAt: now + windowMs }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }
  entry.count++
  bucket.set(ip, entry)
  return entry.count > max
}

// Message standard à renvoyer au client (429).
const TOO_MANY = 'Trop de requêtes. Réessaie dans une minute.'

module.exports = { rateLimit, getClientIp, TOO_MANY }
