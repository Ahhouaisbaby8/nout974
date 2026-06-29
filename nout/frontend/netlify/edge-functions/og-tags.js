// Edge function : réécrit le <head> côté serveur pour les crawlers / unfurlers (WhatsApp, Facebook…)
// qui n'exécutent pas le JS. Couvre les ANNONCES (/annonce/:id) et les VITRINES vendeur (/profil/:id).

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

// Retire les balises og/twitter/canonical + meta description STATIQUES (peu importe les commentaires
// HTML autour), puis insère le bloc dynamique juste avant </head>.
function injectHead(html, title, description, dynamicTags) {
  let modified = html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/[ \t]*<meta\s+name="description"[^>]*>\s*/i, `\n    <meta name="description" content="${esc(description)}" />\n    `)
    .replace(/[ \t]*<meta[^>]+property="og:[^"]*"[^>]*>\s*/g, '')
    .replace(/[ \t]*<meta[^>]+name="twitter:[^"]*"[^>]*>\s*/g, '')
    .replace(/[ \t]*<link[^>]+rel="canonical"[^>]*>\s*/g, '')
  const headEnd = modified.indexOf('</head>')
  if (headEnd !== -1) {
    modified = modified.slice(0, headEnd) + `${dynamicTags}\n  ` + modified.slice(headEnd)
  }
  return modified
}

export default async (request, context) => {
  const url = new URL(request.url)
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
  const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY')
  if (!supabaseUrl || !supabaseKey) return context.next()

  const sbHeaders = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  const cleanUrl = url.origin + url.pathname

  // ── ANNONCE ────────────────────────────────────────────────────────────────
  const listingMatch = url.pathname.match(/^\/annonce\/([^/]+)$/)
  if (listingMatch) {
    const listingId = listingMatch[1]
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/listings?id=eq.${listingId}&select=title,price,description,images,brand,condition,is_sold`,
        { headers: sbHeaders }
      )
      const rows = await res.json()
      const listing = rows?.[0]

      // Annonce inexistante / supprimée → vrai 404 (évite le soft-404 qui gaspille le budget de crawl).
      if (!listing) {
        const r404 = await context.next()
        const body404 = await r404.text()
        return new Response(body404, {
          status: 404,
          headers: { ...Object.fromEntries(r404.headers), 'content-type': 'text/html; charset=utf-8' },
        })
      }

      const response = await context.next()
      const html = await response.text()

      const price = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(listing.price)
      const title = `${listing.title} — ${price} | NOUT 974`
      const description = listing.description
        ? listing.description.replace(/\s+/g, ' ').trim().slice(0, 160)
        : 'Disponible sur NOUT, le marketplace 100% réunionnais entre particuliers.'
      const image = listing.images?.[0] ?? ''

      const CONDITION_SCHEMA = {
        neuf_avec_etiquette: 'https://schema.org/NewCondition',
        neuf_sans_etiquette: 'https://schema.org/NewCondition',
        tres_bon_etat:       'https://schema.org/UsedCondition',
        bon_etat:            'https://schema.org/UsedCondition',
        etat_correct:        'https://schema.org/UsedCondition',
      }
      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: listing.title,
        description,
        ...(image ? { image: [image] } : {}),
        ...(listing.brand ? { brand: { '@type': 'Brand', name: listing.brand } } : {}),
        offers: {
          '@type': 'Offer',
          price: listing.price,
          priceCurrency: 'EUR',
          availability: listing.is_sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          itemCondition: CONDITION_SCHEMA[listing.condition] ?? 'https://schema.org/UsedCondition',
          url: cleanUrl,
        },
      }
      const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`

      const dynamicTags = [
        `<meta property="og:type" content="product" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:url" content="${esc(cleanUrl)}" />`,
        `<meta property="og:site_name" content="NOUT 974" />`,
        `<meta property="og:locale" content="fr_FR" />`,
        image ? `<meta property="og:image" content="${esc(image)}" />` : '',
        `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
        `<link rel="canonical" href="${esc(cleanUrl)}" />`,
        jsonLdTag,
      ].filter(Boolean).join('\n    ')

      return new Response(injectHead(html, title, description, dynamicTags), {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), 'content-type': 'text/html; charset=utf-8' },
      })
    } catch {
      return context.next()
    }
  }

  // ── PROFIL / VITRINE VENDEUR ────────────────────────────────────────────────
  const profileMatch = url.pathname.match(/^\/profil\/([^/]+)$/)
  if (profileMatch) {
    const profileId = profileMatch[1]
    try {
      // Champs d'affichage uniquement (jamais email/iban/phone — donnée sensible, cf. RLS profiles).
      const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}&select=username,avatar_url,bio,city`,
        { headers: sbHeaders }
      )
      const rows = await res.json()
      const profile = rows?.[0]
      if (!profile) return context.next()

      const response = await context.next()
      const html = await response.text()

      const username = profile.username ?? 'Vendeur'
      const lieu = profile.city ? ` à ${profile.city}` : ''
      const title = `${username} — Boutique seconde main${lieu} | NOUT 974`
      const description = profile.bio
        ? profile.bio.replace(/\s+/g, ' ').trim().slice(0, 160)
        : `Découvre la boutique de ${username} sur NOUT, le marketplace seconde main de La Réunion (974) : articles d'occasion, remise en main propre ou livraison, paiement sécurisé.`
      // avatar_url = chemin de stockage → URL publique Supabase. Sinon, og-image de marque (1200x630).
      const image = profile.avatar_url
        ? `${supabaseUrl}/storage/v1/object/public/avatars/${profile.avatar_url}`
        : `${url.origin}/og-image.png`
      const hasAvatar = !!profile.avatar_url

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        mainEntity: { '@type': 'Person', name: username, image, url: cleanUrl },
      }
      const jsonLdTag = `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`

      const dynamicTags = [
        `<meta property="og:type" content="profile" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:url" content="${esc(cleanUrl)}" />`,
        `<meta property="og:site_name" content="NOUT 974" />`,
        `<meta property="og:locale" content="fr_FR" />`,
        `<meta property="og:image" content="${esc(image)}" />`,
        `<meta name="twitter:card" content="${hasAvatar ? 'summary' : 'summary_large_image'}" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
        `<meta name="twitter:image" content="${esc(image)}" />`,
        `<link rel="canonical" href="${esc(cleanUrl)}" />`,
        jsonLdTag,
      ].join('\n    ')

      return new Response(injectHead(html, title, description, dynamicTags), {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), 'content-type': 'text/html; charset=utf-8' },
      })
    } catch {
      return context.next()
    }
  }

  return context.next()
}

export const config = { path: ['/annonce/*', '/profil/*'] }
