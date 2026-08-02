import { useState } from 'react'
import { supabase } from '../../services/supabase'

// Carte de test d'un transporteur (UBN ou Chronopost) : bouton + résultat clair (verdict, variables, étapes).
function CarrierTest({ nom, endpoint, description }) {
  const [res, setRes] = useState(null)
  const [testing, setTesting] = useState(false)

  const run = async () => {
    setTesting(true); setRes(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const data = await r.json()
      setRes(r.ok ? data : { error: data.error || 'Erreur inconnue' })
    } catch {
      setRes({ error: 'Impossible de contacter le serveur.' })
    } finally { setTesting(false) }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-nout-dark">Liaison {nom}</p>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        <button
          onClick={run}
          disabled={testing}
          className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            testing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-nout-primary text-white hover:opacity-90'
          }`}
        >
          {testing ? 'Test en cours…' : `Tester ${nom}`}
        </button>
      </div>

      {res && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          {res.error ? (
            <p className="text-sm text-red-600">{res.error}</p>
          ) : (
            <>
              <div className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${res.allOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {res.allOk ? '✓ ' : '⚠ '}{res.verdict}
              </div>
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{nom === 'UBN' ? 'Variables' : 'Contrats'}</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(res.vars ?? {}).map(([k, present]) => (
                    <span key={k} className={`text-[11px] font-medium px-2 py-1 rounded-full ${present ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {present ? '✓' : '✗'} {k}
                    </span>
                  ))}
                </div>
                {res.hubBase && <p className="text-[11px] text-gray-400 mt-1.5">Serveur : {res.hubBase}</p>}
              </div>
              {res.steps?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {res.steps.map((s) => (
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
  )
}

export default function AdminSiteSettings() {

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
      <div className="flex flex-col gap-4">
        <CarrierTest
          nom="Chronopost"
          endpoint="/.netlify/functions/admin-chronopost-test"
          description="Vérifie que les contrats Chronopost sont acceptés et que le serveur répond."
        />
        <CarrierTest
          nom="UBN"
          endpoint="/.netlify/functions/admin-ubn-test"
          description="Vérifie que la clé API est acceptée et que le serveur UBN répond."
        />
      </div>
    </div>
  )
}
