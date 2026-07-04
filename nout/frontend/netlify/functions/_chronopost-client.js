// ─── Client Web Services Chronopost — helper serveur partagé ──────────────────────
//
// Centralise les appels SOAP aux Web Services Chronopost (doc VC6.25.10.10).
// Chronopost s'authentifie avec accountNumber + password (6 chiffres) passés
// DANS chaque requête SOAP. Ces identifiants vivent UNIQUEMENT en variables
// d'environnement Netlify — jamais dans le code, jamais renvoyés au front.
//
// NOUT a 2 contrats (confirmés par emails Chronopost du 2/07/2026) :
//   - 17380304  Chrono Relais DOM   productCode 4P  service 0  (point relais)
//   - 17379904  Chrono Express      productCode 17  service 0  (domicile)
//
// Variables d'environnement attendues (Netlify) :
//   CHRONOPOST_RELAIS_ACCOUNT    n° contrat Relais DOM (ex: 17380304)
//   CHRONOPOST_RELAIS_PASSWORD   mot de passe Web Services Relais (6 chiffres)
//   CHRONOPOST_EXPRESS_ACCOUNT   n° contrat Express (ex: 17379904)
//   CHRONOPOST_EXPRESS_PASSWORD  mot de passe Web Services Express (6 chiffres)
//
// Phase de VALIDATION Chronopost : tant que les accès prod ne sont pas validés,
// on développe avec le COMPTE TEST fourni par Chronopost (19869502 / 255562).
// Si CHRONOPOST_USE_TEST=1 (ou aucun compte prod défini), on bascule sur le test.
//
// Tant qu'aucun compte n'est configuré, isChronopostConfigured() = false et les
// endpoints répondent proprement « non configuré » → AUCUN impact site live.

// Compte test officiel Chronopost (documentation p.5) — sert au dev + à la validation.
const TEST_ACCOUNT  = '19869502'
const TEST_PASSWORD = '255562'

// Endpoints Web Services (SOAP over HTTP). wsha = résilience 3 infrastructures.
const ENDPOINTS = {
  shipping:  'https://ws.chronopost.fr/shipping-cxf/ShippingServiceWS',
  pointrelais: 'https://ws.chronopost.fr/recherchebt-ws-cxf/PointRelaisServiceWS',
  tracking:  'https://ws.chronopost.fr/tracking-cxf/TrackingServiceWS',
  quickcost: 'https://ws.chronopost.fr/quickcost-cxf/QuickcostServiceWS',
}

// Namespaces SOAP par service (utilisés dans l'enveloppe cxf:...)
const NAMESPACES = {
  shipping:    'http://cxf.shipping.soap.chronopost.fr/',
  pointrelais: 'http://cxf.rechercheBt.soap.chronopost.fr/',
  tracking:    'http://cxf.tracking.soap.chronopost.fr/',
  quickcost:   'http://cxf.quickcost.soap.chronopost.fr/',
}

// Codes produits / services par mode de livraison (confirmés par Chronopost)
const PRODUCTS = {
  relais:  { productCode: '4P', service: '0' },   // Chrono Relais DOM
  express: { productCode: '17', service: '0' },   // Chrono Express domicile
}

// Doit-on utiliser le compte test ? (phase de validation, ou aucun compte prod)
const useTest = () =>
  process.env.CHRONOPOST_USE_TEST === '1' ||
  (!process.env.CHRONOPOST_RELAIS_ACCOUNT && !process.env.CHRONOPOST_EXPRESS_ACCOUNT)

// Renvoie { account, password, productCode, service } pour un mode ('relais'|'express').
// En mode test, un seul compte sert pour tout (le compte test génère les 2 produits).
function credentials(mode = 'relais') {
  const prod = PRODUCTS[mode] || PRODUCTS.relais
  if (useTest()) {
    return { account: TEST_ACCOUNT, password: TEST_PASSWORD, ...prod, isTest: true }
  }
  if (mode === 'express') {
    return {
      account:  process.env.CHRONOPOST_EXPRESS_ACCOUNT || '',
      password: process.env.CHRONOPOST_EXPRESS_PASSWORD || '',
      ...prod, isTest: false,
    }
  }
  return {
    account:  process.env.CHRONOPOST_RELAIS_ACCOUNT || '',
    password: process.env.CHRONOPOST_RELAIS_PASSWORD || '',
    ...prod, isTest: false,
  }
}

// L'intégration est-elle prête ? (au moins un compte utilisable, test compris)
const isChronopostConfigured = () => {
  const c = credentials('relais')
  return Boolean(c.account && c.password)
}

// ── Utilitaires XML ───────────────────────────────────────────────────────────────

// Échappe le contenu texte d'une balise XML (les valeurs viennent d'utilisateurs).
const xmlEscape = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

// Construit un bloc de balises simples <k>v</k> à partir d'un objet plat (ordre préservé).
// Les valeurs undefined/null deviennent des balises vides (Chronopost tolère <k></k>).
function buildTags(obj) {
  return Object.entries(obj)
    .map(([k, v]) => `<${k}>${v === undefined || v === null ? '' : xmlEscape(v)}</${k}>`)
    .join('')
}

// Enveloppe SOAP complète pour une opération donnée.
//   service : clé de NAMESPACES (ex: 'shipping')
//   operation : nom de la méthode (ex: 'shippingMultiParcelV4')
//   innerXml : contenu du corps de l'opération (déjà en XML)
function soapEnvelope(service, operation, innerXml) {
  const ns = NAMESPACES[service]
  return (
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cxf="${ns}">` +
    `<soapenv:Header/>` +
    `<soapenv:Body>` +
    `<cxf:${operation}>${innerXml}</cxf:${operation}>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`
  )
}

// ── Extraction de champs dans une réponse XML ──────────────────────────────────────
// Les réponses Chronopost ont une structure simple et régulière ; on extrait les
// champs par nom de balise (sans dépendance XML, plus léger pour le build Netlify).

// Première valeur d'une balise <tag>...</tag> (ou null si absente).
function xmlFirst(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
  return m ? xmlDecode(m[1].trim()) : null
}

// Toutes les valeurs d'une balise répétée (ex: <listePointRelais> multiples).
function xmlAll(xml, tag) {
  const out = []
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi')
  let m
  while ((m = re.exec(xml)) !== null) out.push(m[1])
  return out
}

// Décodage des entités XML de base présentes dans les réponses.
const xmlDecode = (s) =>
  String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')

// Conserve la dernière enveloppe SOAP envoyée (debug + dossier de validation Chronopost).
let _lastRequest = null
const getLastRequest = () => _lastRequest

// ── Appel SOAP générique ───────────────────────────────────────────────────────────
async function soapCall(service, operation, innerXml) {
  if (!isChronopostConfigured()) {
    throw new ChronopostError('chronopost_not_configured', 503, 'Chronopost non configuré.')
  }
  const body = soapEnvelope(service, operation, innerXml)
  _lastRequest = body
  let res
  try {
    res = await fetch(ENDPOINTS[service], {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction':   '',
      },
      body,
    })
  } catch (err) {
    throw new ChronopostError('network_error', 502, `Connexion Chronopost impossible : ${err.message}`)
  }

  const text = await res.text()

  // Faute SOAP explicite
  const fault = xmlFirst(text, 'faultstring')
  if (fault) {
    throw new ChronopostError('soap_fault', res.status || 502, fault)
  }
  if (!res.ok) {
    throw new ChronopostError(`http_${res.status}`, res.status, `Erreur HTTP Chronopost ${res.status}`)
  }

  // errorCode !== 0 → erreur métier (codes d'erreur doc §4.3)
  const errorCode = xmlFirst(text, 'errorCode')
  if (errorCode !== null && errorCode !== '0') {
    const msg = xmlFirst(text, 'errorMessage') || `Code erreur Chronopost ${errorCode}`
    throw new ChronopostError(`chrono_${errorCode}`, 502, msg)
  }

  return text
}

// Erreur typée pour remonter proprement code + statut HTTP aux endpoints.
class ChronopostError extends Error {
  constructor(code, status, message) {
    super(message)
    this.name = 'ChronopostError'
    this.code = code
    this.status = status || 502
  }
}

module.exports = {
  soapCall, soapEnvelope, buildTags, xmlEscape, getLastRequest,
  xmlFirst, xmlAll, xmlDecode,
  credentials, isChronopostConfigured, useTest,
  ChronopostError, ENDPOINTS, NAMESPACES, PRODUCTS,
}
