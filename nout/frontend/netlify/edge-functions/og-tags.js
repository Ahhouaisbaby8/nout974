export default async (request, context) => {
  const url = new URL(request.url)
  const match = url.pathname.match(/^\/annonce\/([^/]+)$/)
  if (!match) return context.next()

  const listingId = match[1]
  const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')
  const supabaseKey = Deno.env.get('VITE_SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseKey) return context.next()

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/listings?id=eq.${listingId}&select=title,price,description,images,brand,condition,is_sold`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const rows = await res.json()
    const listing = rows?.[0]

    // Annonce inexistante / supprimée → vrai 404 (évite le soft-404 qui gaspille le budget de crawl).
    // On sert quand même le shell SPA (l'utilisateur voit "annonce introuvable"), mais avec le bon statut HTTP.
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
    const cleanUrl = url.origin + url.pathname

    const esc = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // JSON-LD Product : rich results Google (prix / disponibilité / état / marque sous le lien).
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
    // < : empêche un éventuel </script> dans la description de casser le bloc.
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

    // Injection ROBUSTE : on retire d'abord les balises og/twitter/canonical + la meta description
    // STATIQUES (peu importe les commentaires HTML autour), puis on insère le bloc dynamique juste
    // avant </head>. Avant, le code dépendait d'un commentaire exact qui avait dérivé → injection jamais faite.
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

    return new Response(modified, {
      status: response.status,
      headers: {
        ...Object.fromEntries(response.headers),
        'content-type': 'text/html; charset=utf-8',
      },
    })
  } catch {
    return context.next()
  }
}

export const config = { path: '/annonce/*' }
