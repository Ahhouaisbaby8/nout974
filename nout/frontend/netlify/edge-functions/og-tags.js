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
      `${supabaseUrl}/rest/v1/listings?id=eq.${listingId}&select=title,price,description,images`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const rows = await res.json()
    const listing = rows?.[0]
    if (!listing) return context.next()

    const response = await context.next()
    const html = await response.text()

    const price = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(listing.price)
    const title = `${listing.title} — ${price} | NOUT 974`
    const description = listing.description
      ? listing.description.replace(/\n/g, ' ').slice(0, 160)
      : 'Disponible sur NOUT, le marketplace 100% réunionnais entre particuliers.'
    const image = listing.images?.[0] ?? ''
    const pageUrl = url.toString()

    const esc = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    const dynamicTags = [
      `<meta property="og:type" content="product" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      `<meta property="og:url" content="${esc(pageUrl)}" />`,
      `<meta property="og:site_name" content="NOUT 974" />`,
      `<meta property="og:locale" content="fr_FR" />`,
      image ? `<meta property="og:image" content="${esc(image)}" />` : '',
      image ? `<meta property="og:image:width" content="800" />` : '',
      image ? `<meta property="og:image:height" content="800" />` : '',
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
      `<meta name="twitter:title" content="${esc(title)}" />`,
      `<meta name="twitter:description" content="${esc(description)}" />`,
      image ? `<meta name="twitter:image" content="${esc(image)}" />` : '',
    ].filter(Boolean).join('\n    ')

    // Remplace le bloc OG statique (du commentaire jusqu'à </head>)
    const ogStart = html.indexOf('<!-- Open Graph (WhatsApp, Facebook, etc.) -->')
    const headEnd = html.indexOf('</head>')

    let modified = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)

    if (ogStart !== -1 && headEnd !== -1) {
      modified = modified.slice(0, ogStart) +
        `<!-- Open Graph dynamique —— annonce -->\n    ${dynamicTags}\n  ` +
        modified.slice(headEnd)
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
