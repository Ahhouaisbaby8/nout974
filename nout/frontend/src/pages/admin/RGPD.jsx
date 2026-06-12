import { useState } from 'react'
import { supabase } from '../../services/supabase'

export default function AdminRGPD() {
  const [email,   setEmail]   = useState('')
  const [result,  setResult]  = useState('')
  const [loading, setLoading] = useState(false)

  const handleExport = async () => {
    if (!email.trim()) return
    setLoading(true); setResult('')
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('email', email).single()
      if (!profile) { setResult('Aucun compte trouvé.'); return }
      const [{ data: listings }, { data: orders }, { data: messages }] = await Promise.all([
        supabase.from('listings').select('*').eq('user_id', profile.id),
        supabase.from('orders').select('*').or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`),
        supabase.from('messages').select('*').or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`),
      ])
      const blob = new Blob([JSON.stringify({ profil: profile, annonces: listings, commandes: orders, messages }, null, 2)], { type: 'application/json' })
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `nout-data-${email}.json` })
      a.click()
      setResult('✅ Export téléchargé.')
    } catch { setResult("Erreur lors de l'export.") }
    finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!email.trim() || !confirm(`Supprimer définitivement le compte ${email} ?`)) return
    setLoading(true)
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single()
      if (!profile) { setResult('Aucun compte trouvé.'); return }
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/admin-delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ targetUserId: profile.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      setResult(`✅ Compte ${email} supprimé définitivement.`)
      setEmail('')
    } catch (err) { setResult(`Erreur : ${err.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Outils RGPD</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
        <h2 className="font-bold text-nout-dark mb-1">Rechercher un utilisateur</h2>
        <div className="flex gap-3 mt-3">
          <input type="email" placeholder="email@exemple.re" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field flex-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-nout-dark text-sm mb-2">📤 Export des données</h3>
          <p className="text-xs text-gray-500 mb-3">Télécharger toutes les données de l'utilisateur au format JSON.</p>
          <button onClick={handleExport} disabled={loading || !email} className="btn-primary px-4 py-2 text-sm w-full disabled:opacity-50">Exporter</button>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-red-600 text-sm mb-2">🗑 Suppression</h3>
          <p className="text-xs text-gray-500 mb-3">Supprime le compte et toutes ses données. Irréversible.</p>
          <button onClick={handleDelete} disabled={loading || !email} className="w-full px-4 py-2 bg-red-50 text-red-500 border-2 border-red-200 rounded-nout text-sm font-bold hover:bg-red-100 disabled:opacity-50">Supprimer</button>
        </div>
      </div>

      {result && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3 mb-4">{result}</div>}

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-bold text-nout-dark mb-2">Rappel légal</h2>
        <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
          <li>Délai de réponse : <strong>1 mois</strong> maximum après demande</li>
          <li>Conservation : durée de la relation + 3 ans</li>
          <li>Contact DPO : contact@nout.re</li>
        </ul>
      </div>
    </div>
  )
}
