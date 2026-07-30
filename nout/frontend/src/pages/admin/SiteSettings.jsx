import { useState } from 'react'
import { supabase } from '../../services/supabase'

export default function AdminSiteSettings() {
  const [ubn, setUbn] = useState(null)
  const [testing, setTesting] = useState(false)

  // Teste la liaison UBN en vrai (ping + auth + points relais) via la fonction serveur.
  const testUbn = async () => {
    setTesting(true)
    setUbn(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-ubn-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const data = await res.json()
      setUbn(res.ok ? data : { error: data.error || 'Erreur inconnue' })
    } catch {
      setUbn({ error: 'Impossible de contacter le serveur.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Paramètres du site</h1>

      <div className="flex flex-col gap-4 mb-8">
        {[
          { title: 'Domaine',            value: 'nout.re',             note: 'Configuré via Netlify' },
          { title: 'Email de contact',   value: 'contact@nout.re',     note: 'Affiché dans le footer et les pages légales' },
          { title: 'Protection acheteur', value: '10 % + 0,25 €',      note: 'Payée par l\'acheteur. Modifiable dans netlify/functions/create-checkout-session.js' },
          { title: 'SIRET',              value: '106 334 436 00016',   note: 'SIREN : 106 334 436' },
          { title: 'Hébergement',        value: 'Netlify',             note: 'Déploiement automatique depuis GitHub' },
          { title: 'Base de données',   value: 'Supabase PostgreSQL', note: 'pvimybfqfhrvpnmkcepy.supabase.co' },
        ].map(({ title, value, note }) => (
          <div key={title} className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-xs text-gray-400">{title}</p>
            <p className="font-semibold text-nout-dark">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{note}</p>
          </div>
        ))}
      </div>

      {/* ── Transporteurs : test de la liaison UBN ── */}
      <h2 className="text-lg font-extrabold text-nout-dark mb-3">Transporteurs</h2>
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-nout-dark">Liaison UBN</p>
            <p className="text-xs text-gray-400 mt-0.5">Vérifie que la clé API est acceptée et que le serveur UBN répond.</p>
          </div>
          <button
            onClick={testUbn}
            disabled={testing}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              testing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-nout-primary text-white hover:opacity-90'
            }`}
          >
            {testing ? 'Test en cours…' : 'Tester UBN'}
          </button>
        </div>

        {ubn && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            {ubn.error ? (
              <p className="text-sm text-red-600">{ubn.error}</p>
            ) : (
              <>
                {/* Verdict global */}
                <div className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${
                  ubn.allOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {ubn.allOk ? '✓ ' : '⚠ '}{ubn.verdict}
                </div>

                {/* Présence des variables */}
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Variables</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(ubn.vars ?? {}).map(([k, present]) => (
                      <span key={k} className={`text-[11px] font-medium px-2 py-1 rounded-full ${
                        present ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {present ? '✓' : '✗'} {k}
                      </span>
                    ))}
                  </div>
                  {ubn.hubBase && <p className="text-[11px] text-gray-400 mt-1.5">Serveur : {ubn.hubBase}</p>}
                </div>

                {/* Détail des étapes */}
                {ubn.steps?.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {ubn.steps.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-sm">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-nout-dark">{s.label}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {s.ok
                            ? (s.info?.nb_relais != null ? `${s.info.nb_relais} relais · ${s.ms} ms` : `${s.ms} ms`)
                            : `${s.code ?? 'erreur'}${s.status ? ` (${s.status})` : ''}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
