// ─── Sémantique des statuts UBN — SOURCE UNIQUE PARTAGÉE ─────────────────────────────
//
// Utilisée par LES DEUX chemins qui apprennent la livraison d'un colis UBN :
//   - ubn-status-sync.js  (callback PUSH — le HUB UBN nous POST le statut, si activé chez eux)
//   - ubn-tracking.js     (poll PULL — on lit la page de suivi publique ubn-speed.fr)
// Les deux DOIVENT s'accorder sur « qu'est-ce que livré / échoué » → on centralise ici pour
// qu'ils ne puissent jamais diverger. Doc API Distant v4.6/v4.7 §12.
//
// ⚠️ ARGENT : ces libellés déclenchent (indirectement) le versement vendeur. On matche donc
// UNIQUEMENT des correspondances EXACTES (après normalisation casse/accents/espaces). Un libellé
// inconnu → aucune action (le colis reste 'shipped', filet 12j → traitement manuel). Erreur du
// bon côté : on préfère RATER une livraison (retard, zéro perte) plutôt que d'en INVENTER une
// (versement à tort). Ne JAMAIS élargir en "contains" — seulement ajouter des libellés exacts.

// Normalise un statut pour comparaison robuste : minuscules, sans accents, espaces réduits.
const norm = (s) => String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ')

// Mapping des statuts UBN — doc API Distant v4.7 (section « Mapping local »). SEULE la COMPLÉTION réelle
// déclenche le versement : « Livraison colis terminée » → completed → DELIVERED (retrait effectif en point
// relais OU remise à domicile).
// ⚠️ « Colis remis en point relais » = on-hold pour UBN (colis DÉPOSÉ au relais, PAS encore retiré) → il ne
// DOIT PAS être delivered : sinon on paierait le vendeur au dépôt, avant le retrait acheteur (fenêtre de
// retrait ~10-14 j) ; et un colis jamais retiré finit « Livraison colis annulée » → NOUT aurait payé pour un
// colis retourné. Idem « Livraison colis reportée » = on-hold → on attend (jamais failed). Ne PAS les ajouter ici.
const DELIVERED = new Set(['livraison colis terminee'].map(norm))
// Statuts d'échec / annulation (doc v4.7 : « en échec » → failed, « annulée » → cancelled) → gel en litige,
// examen admin, AUCUN mouvement d'argent.
const FAILED = new Set(['livraison colis en echec', 'livraison colis annulee'].map(norm))

// Classe une LISTE de libellés de statut (ex. le flux d'historique d'une page de suivi) :
// renvoie 'delivered' | 'failed' | null. N'accepte QUE des correspondances exactes → aucun faux
// positif depuis du texte explicatif.
//
// ⚠️ FAILED EST PRIORITAIRE SUR DELIVERED (sécurité argent). Le flux d'un colis peut contenir À LA FOIS
// un libellé « livré » NON terminal (ex. « colis remis en point relais » = déposé) ET un « échec/annulé »
// postérieur (ex. colis non retiré → annulé, ou une panne du site qui masque l'ordre chronologique). Comme
// on agrège tout l'historique (l'ordre HTML n'est pas fiable), un échec présent N'IMPORTE OÙ doit primer :
// on préfère RATER une livraison (→ 'failed' → disputed = examen manuel, ZÉRO perte) plutôt qu'en INVENTER
// une (→ versement à tort). Ne JAMAIS remettre DELIVERED en premier.
function classifyUbnStatuses(statuses) {
  const set = new Set((Array.isArray(statuses) ? statuses : [statuses]).map(norm))
  for (const s of set) if (FAILED.has(s)) return 'failed'
  for (const s of set) if (DELIVERED.has(s)) return 'delivered'
  return null
}

module.exports = { norm, DELIVERED, FAILED, classifyUbnStatuses }
