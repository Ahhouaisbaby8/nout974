export default function AdminSiteSettings() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Paramètres du site</h1>

      <div className="flex flex-col gap-4">
        {[
          { icon: '', title: 'Domaine',            value: 'nout.re',                            note: 'Configuré via Netlify' },
          { icon: '', title: 'Email de contact',   value: 'contact@nout.re',                 note: 'Affiché dans le footer et les pages légales' },
          { icon: '', title: 'Protection acheteur', value: '10 % + 0,25 €',                      note: 'Payée par l\'acheteur. Modifiable dans netlify/functions/create-checkout-session.js' },
          { icon: '', title: 'SIRET',              value: '106 334 436 00016',                  note: 'SIREN : 106 334 436' },
          { icon: '', title: 'Hébergement',        value: 'Netlify',                            note: 'Déploiement automatique depuis GitHub' },
          { icon: '', title: 'Base de données',   value: 'Supabase PostgreSQL',                note: 'pvimybfqfhrvpnmkcepy.supabase.co' },
        ].map(({ icon, title, value, note }) => (
          <div key={title} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-400">{title}</p>
              <p className="font-semibold text-nout-dark">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
