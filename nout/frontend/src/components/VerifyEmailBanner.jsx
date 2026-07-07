import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { supabase } from '../services/supabase'

// Bandeau « Vérifie ton adresse e-mail » (validation différée) — affiché pile au moment où
// un membre non vérifié veut AGIR (publier, écrire, acheter). Propose le renvoi du lien.
// `context` complète la phrase : « Pour {context}, confirme ton adresse e-mail. »
export default function VerifyEmailBanner({ context = 'continuer' }) {
  const [state, setState] = useState('idle')   // idle | sending | sent | error
  const [error, setError] = useState('')

  const resend = async () => {
    if (state === 'sending') return
    setState('sending')
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('no session')
      const res = await fetch('/.netlify/functions/send-verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Envoi impossible.')
      if (body?.already) {
        // Déjà vérifié côté serveur (autre onglet, lien cliqué entre-temps) → on recharge le profil.
        window.location.reload()
        return
      }
      setState('sent')
    } catch (err) {
      setError(err?.message === 'no session' ? 'Reconnecte-toi pour recevoir le lien.' : (err?.message || 'Envoi impossible. Réessaie.'))
      setState('error')
    }
  }

  return (
    <div className="bg-white border border-[#DDE3EC] rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-nout-turquoise/15 flex items-center justify-center flex-shrink-0">
          <MailCheck size={18} className="text-nout-turquoise" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-nout-texte text-[15px]">Vérifie ton adresse e-mail</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Pour {context}, confirme ton adresse : clique sur le lien reçu par e-mail à ton inscription
            (pense aux spams). Tu ne le retrouves pas ? Renvoie-le en un clic.
          </p>

          {state === 'sent' ? (
            <p className="text-sm text-nout-turquoise font-medium mt-3">
              E-mail envoyé. Ouvre le lien, puis reviens ici.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <button
                type="button"
                onClick={resend}
                disabled={state === 'sending'}
                className={`btn-primary px-5 py-2 text-sm ${state === 'sending' ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {state === 'sending' ? 'Envoi…' : 'Renvoyer l\'e-mail'}
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="text-sm text-nout-primary font-semibold hover:underline"
              >
                J'ai validé, actualiser
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  )
}
