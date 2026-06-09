exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé API manquante' }) }
  }

  try {
    const { titre, categorie, taille, composition } = JSON.parse(event.body)

    const lignes = [
      `Titre : ${titre}`,
      `Catégorie : ${categorie}`,
      taille      ? `Taille : ${taille}`           : null,
      composition ? `Composition : ${composition}` : null,
    ].filter(Boolean).join('\n')

    const prompt = `Tu es un assistant pour un marketplace de seconde main à La Réunion appelé NOUT 974.
Génère une description courte et accrocheuse de 2-3 phrases pour cette annonce.
La description doit être naturelle, honnête, et donner envie d'acheter.
Écris en français, sans emoji, sans majuscules excessives.

${lignes}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Anthropic error:', res.status, err)
      return { statusCode: 500, body: JSON.stringify({ error: 'Erreur API Anthropic' }) }
    }

    const data = await res.json()
    const description = data.content?.[0]?.text ?? ''

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description }),
    }
  } catch (err) {
    console.error('generate-description error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
