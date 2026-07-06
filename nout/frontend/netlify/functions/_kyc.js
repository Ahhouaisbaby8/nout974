// HELPERS KYC — SOURCE UNIQUE pour lire l'état de vérification d'un compte connecté Stripe
// (onboarding par API : NOUT collecte le KYC dans sa propre UI, le vendeur ne voit pas Stripe).
//
// Un compte « API » = créé avec controller.requirement_collection='application' + dashboard 'none'
// (la façon moderne des comptes « Custom »). Les anciens comptes Express (requirement_collection
// géré par Stripe) sont dits « legacy » : eux continuent de passer par la page hébergée Stripe.
//
// AUCUN mouvement d'argent ici : lecture/façonnage d'état uniquement.

// Un requirement Stripe (ex. 'individual.verification.document') → libellé FR affichable.
const REQUIREMENT_LABELS = [
  [/verification\.additional_document/, 'Un justificatif de domicile'],
  [/verification\.document/,            'Une photo de ta pièce d\'identité'],
  [/proof_of_liveness/,                 'Une vérification renforcée (selfie)'],
  [/external_account/,                  'Ton IBAN'],
  [/dob\./,                             'Ta date de naissance'],
  [/address\./,                         'Ton adresse'],
  [/\.phone/,                           'Ton numéro de téléphone'],
  [/first_name|last_name/,              'Ton nom complet'],
  [/\.email/,                           'Ton adresse email'],
  [/tos_acceptance/,                    'L\'acceptation des conditions'],
]

// Codes d'erreur de vérification Stripe → message FR actionnable.
const ERROR_MESSAGES = {
  verification_failed_keyed_identity:      'Tes informations n\'ont pas pu être confirmées automatiquement. Vérifie l\'orthographe exacte de ton nom (comme sur ta pièce d\'identité) et ta date de naissance.',
  verification_failed_name_match:          'Le nom saisi ne correspond pas à celui de ta pièce d\'identité. Corrige-le puis renvoie.',
  verification_failed_address_match:       'L\'adresse saisie ne correspond pas au document fourni.',
  verification_document_failed_greyscale:  'La photo doit être en couleur (pas en noir et blanc). Reprends une photo en couleur.',
  verification_document_failed_copy:       'Les photocopies et captures d\'écran sont refusées. Prends une photo de la pièce originale.',
  verification_document_not_readable:      'La photo est illisible (floue ou sombre). Reprends-la bien à plat, en pleine lumière.',
  verification_document_failed_test_mode:  'Document de test refusé.',
  verification_document_expired:           'Cette pièce d\'identité est expirée. Utilise une pièce en cours de validité.',
  verification_document_type_not_supported:'Ce type de document n\'est pas accepté. Utilise une carte d\'identité ou un passeport.',
  verification_document_too_large:         'La photo est trop lourde. Reprends-la ou réduis sa taille.',
  verification_document_corrupt:           'Le fichier est corrompu. Reprends une nouvelle photo.',
  invalid_dob_age_under_18:                'Il faut avoir 18 ans pour recevoir des paiements.',
  invalid_phone_number:                    'Le numéro de téléphone semble invalide.',
  invalid_address_po_boxes_disallowed:     'Les boîtes postales ne sont pas acceptées comme adresse.',
}

function labelForRequirement(key) {
  for (const [re, label] of REQUIREMENT_LABELS) {
    if (re.test(key)) return label
  }
  return null // requirement interne (mcc, url…) : géré côté serveur, on ne l'affiche pas au vendeur
}

// Mode du compte : 'api' (NOUT collecte le KYC), 'legacy' (Express, page Stripe), 'none'.
function accountMode(account) {
  if (!account) return 'none'
  return account.controller?.requirement_collection === 'application' ? 'api' : 'legacy'
}

// Façonne l'état lisible côté front à partir de l'objet compte Stripe. Ne renvoie JAMAIS de
// donnée sensible (pas d'IBAN, pas de nom) — uniquement des états et libellés.
function buildKycSnapshot(account) {
  const req = account?.requirements ?? {}
  const currentlyDue  = req.currently_due ?? []
  const pastDue       = req.past_due ?? []
  const pending       = req.pending_verification ?? []
  const due = [...new Set([...currentlyDue, ...pastDue])]

  // Deux slots Stripe DISTINCTS : document (pièce d'identité) ≠ additional_document (justificatif
  // de domicile). Les confondre ferait tourner le vendeur en boucle (mauvais slot rempli).
  const needsAdditionalDocument = due.some(k => /verification\.additional_document/.test(k))
  const needsDocument           = due.some(k => /verification\.document/.test(k))
  const needsLiveness           = due.some(k => /proof_of_liveness/.test(k))

  const needs = [...new Set(due.map(labelForRequirement).filter(Boolean))]

  const errors = (req.errors ?? [])
    .map(e => ERROR_MESSAGES[e.code] ?? null)
    .filter(Boolean)

  return {
    mode:               accountMode(account),
    activated:          true,
    payoutsEnabled:     !!account.payouts_enabled,
    detailsSubmitted:   !!account.details_submitted,
    pendingVerification: pending.length > 0,
    needs,                    // libellés FR de ce qui manque (vide = rien à fournir)
    needsDocument,
    needsAdditionalDocument,
    needsLiveness,
    hasErrors:          errors.length > 0,
    errors,                   // messages FR actionnables
    disabledReason:     req.disabled_reason ?? null,
  }
}

const EMPTY_SNAPSHOT = {
  mode: 'none', activated: false, payoutsEnabled: false, detailsSubmitted: false,
  pendingVerification: false, needs: [], needsDocument: false, needsAdditionalDocument: false,
  needsLiveness: false, hasErrors: false, errors: [], disabledReason: null,
}

module.exports = { buildKycSnapshot, accountMode, EMPTY_SNAPSHOT }
