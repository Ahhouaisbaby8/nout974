// ─── Étape lisible d'un colis (Chronopost + UBN) ─────────────────────────────────────────────
// Traduit un code/statut transporteur BRUT en une étape SIMPLE et commune, pour que NOUT sache OÙ
// est physiquement le colis (et n'affiche plus juste « pas encore remis » pour tout).
//
// 4 étapes canoniques (ordre logique) :
//   'not_handed'  → le colis n'a PAS été pris en charge (étiquette faite, rien déposé) → suspect si ça dure
//   'in_transit'  → le colis circule (pris en charge, en cours d'acheminement)
//   'at_relay'    → le colis est au point relais / à disposition, l'acheteur doit le retirer
//   'delivered'   → livré / retiré → fin
//
// Sert à : (1) afficher l'état réel côté admin/acheteur/vendeur, (2) NE rembourser automatiquement
// QUE si le colis n'a jamais été pris en charge (jamais 'in_transit'/'at_relay'/'delivered').

// ── CHRONOPOST — codes événements (doc §4.1) ──
// Livraison / retrait (fin) — DOIT rester aligné avec DELIVERED_CODES de chronopost-tracking.js.
const CHRONO_DELIVERED = new Set(['D', 'D1', 'D2', 'D6', 'D7', 'DC', 'RG', 'RI', 'U', 'Y'])
// Mis à disposition au point relais / consigne (à retirer).
const CHRONO_AT_RELAY  = new Set(['MD', 'DP', 'AG', 'ML', 'T1'])
// Pris en charge / en cours d'acheminement (le colis circule).
const CHRONO_TRANSIT   = new Set(['PC', 'PC1', 'PCH', 'EN', 'TR', 'AR', 'DE', 'GD', 'ET', 'CT', 'IT', 'RE'])
// Anomalie / retour (à surveiller, mais le colis A été pris en charge).
const CHRONO_ISSUE     = new Set(['AN', 'IN', 'RT', 'RB', 'AV'])

function chronoStage(code) {
  if (!code) return null
  const c = String(code).toUpperCase()
  if (CHRONO_DELIVERED.has(c)) return 'delivered'
  if (CHRONO_AT_RELAY.has(c))  return 'at_relay'
  if (CHRONO_TRANSIT.has(c) || CHRONO_ISSUE.has(c)) return 'in_transit'
  // Code inconnu mais présent = le transporteur a AU MOINS scanné quelque chose → considéré en transit
  // (prudence : on ne veut jamais classer 'not_handed' un colis qui a bougé). Sauf codes de prise
  // d'étiquette pure (DC déjà en delivered ; sinon on retombe ici → in_transit, jamais rembourse a tort).
  return 'in_transit'
}

// ── UBN — libellés de statut (rendus texte). On mappe par mots-clés (robuste aux variations). ──
//
// ⚠️ ORDRE CRUCIAL : on teste 'at_relay' AVANT 'delivered'. Piège réel constaté sur un vrai colis
// (USR2026-5661017B-RE) : UBN écrit « Colis remis en point relais » quand le colis ARRIVE au relais
// (pas encore retiré par l'acheteur !). Le mot « remis » ne doit donc PAS déclencher 'delivered' :
// tant qu'on lit « relais / point relais / mise à disposition », c'est 'at_relay' (à retirer), pas livré.
// 'delivered' n'est vrai que pour un RETRAIT/remise effectif SANS mention de relais (ex. « livraison
// terminée », « colis retiré », « remis au destinataire »).
function ubnStage(labels) {
  const txt = (Array.isArray(labels) ? labels.join(' ') : String(labels || '')).toLowerCase()
  if (!txt.trim()) return null
  // 1) AU RELAIS d'abord (prioritaire sur « remis ») : le colis est arrivé au point relais, à retirer.
  if (/relais|point relais|mise a disposition|mise à disposition|disposition|à retirer|a retirer|consigne/.test(txt)) return 'at_relay'
  // 2) LIVRÉ / RETIRÉ effectif (sans mention de relais, filtrée juste au-dessus).
  if (/livr|retir|délivr|delivr|remis au|remis a|terminee|terminée/.test(txt)) return 'delivered'
  // 3) EN ROUTE.
  if (/transit|achemin|pris en charge|collect|enlèv|enlev|en cours|expédi|expedi|tri|centre|tourn/.test(txt)) return 'in_transit'
  return 'in_transit'
}

// Libellé humain d'une étape (pour l'affichage).
const STAGE_LABEL = {
  not_handed: 'Pas encore remis au transporteur',
  in_transit: 'En route',
  at_relay:   'À retirer au point relais',
  delivered:  'Livré',
}

module.exports = { chronoStage, ubnStage, STAGE_LABEL }
