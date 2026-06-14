const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const migrations = [
  { from: 'neuf',       to: 'neuf_avec_etiquette' },
  { from: 'neuf-sans',  to: 'neuf_sans_etiquette' },
  { from: 'tres-bon',   to: 'tres_bon_etat' },
  { from: 'bon',        to: 'bon_etat' },
  { from: 'acceptable', to: 'etat_correct' },
]

exports.handler = async (event) => {
  if (event.queryStringParameters?.secret !== process.env.CRON_SECRET) {
    return { statusCode: 403, body: 'Interdit' }
  }

  const results = []
  for (const { from, to } of migrations) {
    const { data, error } = await supabase
      .from('listings')
      .update({ condition: to })
      .eq('condition', from)
      .select('id')
    results.push({ from, to, lignes: data?.length ?? 0, erreur: error?.message ?? null })
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, resultats: results }, null, 2),
  }
}
