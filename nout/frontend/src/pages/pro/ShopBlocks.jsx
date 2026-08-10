// ─── NOUT Pro : les BLOCS LIBRES d'une boutique ────────────────────────────────────
// Le vendeur compose sa page en empilant des blocs — un texte, un texte avec une photo
// à gauche ou à droite, une série de photos — et les déplace où il veut. Jamais de
// positionnement au pixel : ce qui s'aligne joliment sur un écran d'ordinateur se
// chevauche sur un écran de 390 px, et l'essentiel du trafic est sur téléphone.
//
// Ce fichier est la SEULE source de vérité : la mise en page par défaut, les bornes,
// l'assainissement et le rendu. La vitrine et l'éditeur l'importent tous les deux, ce
// qui interdit qu'ils divergent.

// Mise en page livrée par défaut. Les quatre sections NOUT n'ont pas de `kind` : c'est
// ce qui les distingue d'un bloc libre. `locked` = le vendeur ne peut pas la masquer.
export const DEFAULT_LAYOUT = [
  { id: 'bs', label: 'Nos best-sellers', on: true, pos: 'before' },
  { id: 'reviews', label: 'Avis clients', on: true, pos: 'after' },
  { id: 'about', label: "L'atelier / L'équipe", on: true, pos: 'after' },
  { id: 'how', label: 'Comment ça marche', on: true, pos: 'after', locked: true },
]

export const MAX_BLOCS = 6
export const MAX_TITRE = 40
export const MAX_TEXTE = 400
export const MAX_PHOTOS_BLOC = 6

export const BLOCK_KINDS = [
  { kind: 'texte', label: 'Texte', hint: 'Un titre et un paragraphe' },
  { kind: 'photo-texte', label: 'Texte + photo', hint: 'La photo à gauche, à droite ou au-dessus' },
  { kind: 'photos', label: 'Photos', hint: 'Une série d’images' },
]

export const newBlock = (kind, pos = 'after') => ({
  uid: 'b' + Math.random().toString(36).slice(2, 9),
  kind, on: true, pos,
  title: '', text: '', align: 'gauche',
  img: null, media: 'droite', size: 'moyenne',
  imgs: [], format: 'portrait',
})

// ── Assainissement ────────────────────────────────────────────────────────────────
// La vitrine ne fait JAMAIS confiance au contenu de `layout` : il vient d'une colonne
// JSON que le propriétaire peut écrire directement via l'API, sans passer par l'éditeur.

// Coordonnées : une boutique publique et indexée ne doit pas pouvoir afficher
// « commandez-moi au 0692… ». C'est exactement ce que bloquent déjà la messagerie et
// la publication d'annonce ; sortir l'acheteur du paiement protégé, c'est le vider de
// sa protection. On caviarde au RENDU, donc y compris pour un contenu écrit hors éditeur.
const TEL = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,}/g
const MAIL = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\)|\[dot\])\s*\w{2,}/gi
const LIEN = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|fr|re|net|org|shop|store|io|be|ch|ca)\b/gi

export const redactContacts = (s) => String(s || '')
  .replace(MAIL, '[retiré]').replace(LIEN, '[retiré]').replace(TEL, '[retiré]')

export const hasContacts = (s) => {
  const t = String(s || '')
  return TEL.test(t) || MAIL.test(t) || LIEN.test(t)
}

// Revendications réservées à NOUT : un vendeur ne peut pas réécrire les promesses de la
// plateforme (elles engagent NOUT, pas lui) ni fabriquer ses propres conditions de vente.
const REVENDICATIONS = [
  /paiement\s+(?:100\s*%\s*)?(?:s[ée]curis[ée]|prot[ée]g[ée])/i,
  /protection\s+acheteur/i,
  /\bCGV\b|conditions\s+g[ée]n[ée]rales/i,
  /mentions\s+l[ée]gales/i,
  /garantie\s+(?:de\s+)?\d+\s*(?:an|ans|mois)/i,
  /rembours(?:ement|é)\s+(?:sous|en)\s+\d+/i,
  /satisfait\s+ou\s+rembours/i,
]
export const claimIssue = (s) => REVENDICATIONS.find((r) => r.test(String(s || ''))) || null

const clamp = (s, n) => String(s ?? '').slice(0, n)
const oneOf = (v, list, def) => (list.includes(v) ? v : def)

// Nettoie une mise en page complète : bornes, types, doublons, plafond de blocs.
// Un tableau vide ou invalide retombe sur la mise en page par défaut — une boutique
// sans aucune section n'est pas un choix, c'est un accident.
export function sanitizeLayout(layout) {
  if (!Array.isArray(layout) || layout.length === 0) return DEFAULT_LAYOUT
  const vus = new Set()
  const out = []
  let libres = 0
  for (const b of layout) {
    if (!b || typeof b !== 'object') continue
    const pos = oneOf(b.pos, ['before', 'after'], 'after')
    if (!b.kind) {
      // section NOUT : seuls `on` et `pos` sont ouverts
      const def = DEFAULT_LAYOUT.find((d) => d.id === b.id)
      if (!def || vus.has(b.id)) continue
      vus.add(b.id)
      out.push({ ...def, on: def.locked ? true : b.on !== false, pos })
      continue
    }
    if (libres >= MAX_BLOCS) continue
    const kind = oneOf(b.kind, ['texte', 'photo-texte', 'photos'], 'texte')
    libres += 1
    out.push({
      uid: typeof b.uid === 'string' && b.uid ? b.uid.slice(0, 20) : 'b' + libres,
      kind, on: b.on !== false, pos,
      title: redactContacts(clamp(b.title, MAX_TITRE)),
      text: redactContacts(clamp(b.text, MAX_TEXTE)).split('\n').slice(0, 8).join('\n'),
      align: oneOf(b.align, ['gauche', 'centre'], 'gauche'),
      img: typeof b.img === 'string' ? b.img : null,
      media: oneOf(b.media, ['gauche', 'droite', 'dessus'], 'droite'),
      size: oneOf(b.size, ['petite', 'moyenne', 'grande'], 'moyenne'),
      imgs: Array.isArray(b.imgs) ? b.imgs.filter((x) => typeof x === 'string').slice(0, MAX_PHOTOS_BLOC) : [],
      format: oneOf(b.format, ['portrait', 'carre', 'paysage'], 'portrait'),
    })
  }
  // les sections NOUT manquantes sont réinjectées : on ne perd jamais le socle
  for (const d of DEFAULT_LAYOUT) if (!vus.has(d.id)) out.push({ ...d })
  return out.length ? out : DEFAULT_LAYOUT
}

// Version allégée pour le brouillon et l'historique : les photos importées sont du
// base64 (plusieurs centaines de kilo-octets). Les garder dans 60 pas d'historique
// ferait exploser la mémoire de l'onglet sur téléphone.
export const stripBlockImages = (layout) =>
  (Array.isArray(layout) ? layout : []).map((b) => (b.kind
    ? { ...b, img: b.img && b.img.startsWith('data:') ? null : b.img,
        imgs: (b.imgs || []).filter((x) => !x.startsWith('data:')) }
    : b))

const RATIO = { portrait: 'aspect-[3/4]', carre: 'aspect-square', paysage: 'aspect-[4/3]' }
const LARGEUR = { petite: 'w-40', moyenne: 'w-64', grande: 'w-96' }

// ── Rendu ─────────────────────────────────────────────────────────────────────────
// `ctx` porte le contexte de la vitrine : mut (nuances), secTitle (police des titres),
// styleLine (filets), inner (largeur bornée), wide (rendu ordinateur).
// `break-words` en plus de `min-w-0` : sans lui, une URL collée ou un mot de 300
// caractères déborde la page — et le cadre d'aperçu du wizard le masque (overflow
// caché), donc le défaut n'apparaîtrait qu'en production.
export function FreeBlock({ b, ctx }) {
  const { mut, secTitle, styleLine, inner, wide } = ctx
  const vide = !b.title && !b.text
  if (b.kind === 'texte' && vide) return null
  if (b.kind === 'photos' && !(b.imgs || []).length) return null
  if (b.kind === 'photo-texte' && vide && !b.img) return null

  const cadre = `px-5 py-5 border-t ${inner} ${wide ? 'px-8 py-8' : ''}`
  const Titre = b.title ? (
    <h2 className={`font-bold break-words ${wide ? 'text-[19px]' : 'text-[15px]'}`} style={secTitle}>{b.title}</h2>
  ) : null
  const Texte = b.text ? (
    <p className={`text-[12.5px] leading-relaxed whitespace-pre-line break-words max-w-[70ch] ${b.title ? 'mt-1.5' : ''}`}
       style={{ color: mut(65) }}>{b.text}</p>
  ) : null

  if (b.kind === 'texte') {
    return (
      <div style={styleLine} className={`${cadre} ${b.align === 'centre' ? 'text-center' : ''}`}>
        <div className={b.align === 'centre' ? 'mx-auto max-w-[70ch]' : ''}>{Titre}{Texte}</div>
      </div>
    )
  }

  if (b.kind === 'photos') {
    return (
      <div style={styleLine} className={cadre}>
        {Titre}
        <div className={`grid gap-3 ${b.title ? 'mt-3' : ''} ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {b.imgs.map((src, i) => (
            <div key={i} className={`rounded-xl overflow-hidden ${RATIO[b.format]}`} style={{ background: mut(8) }}>
              <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // texte + photo : l'ordre du DOM reste [texte, image] pour les lecteurs d'écran et
  // pour l'empilement sur téléphone ; c'est la classe qui décide du côté à l'écran.
  const rangee = b.media === 'dessus' ? 'flex flex-col-reverse gap-4'
    : b.media === 'gauche' ? `flex flex-col-reverse gap-4 ${wide ? 'flex-row-reverse items-center gap-8' : ''}`
      : `flex flex-col gap-4 ${wide ? 'flex-row items-center gap-8' : ''}`
  const largeur = b.media === 'dessus' || !wide ? 'w-full' : LARGEUR[b.size]
  return (
    <div style={styleLine} className={cadre}>
      <div className={rangee}>
        <div className="flex-1 min-w-0">{Titre}{Texte}</div>
        {b.img && (
          <div className={`flex-shrink-0 rounded-xl overflow-hidden aspect-[4/3] ${largeur}`} style={{ background: mut(8) }}>
            <img src={b.img} alt="" loading="lazy" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  )
}
