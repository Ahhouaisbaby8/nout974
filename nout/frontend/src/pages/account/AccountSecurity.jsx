import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

export default function AccountSecurity() {
  const { user } = useAuth()

  const [newEmail, setNewEmail]       = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg]       = useState('')
  const [emailErr, setEmailErr]       = useState('')

  const [newPwd, setNewPwd]   = useState('')
  const [newPwd2, setNewPwd2] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg]   = useState('')
  const [pwdErr, setPwdErr]   = useState('')

  const handleChangeEmail = async (e) => {
    e.preventDefault()
    setEmailMsg(''); setEmailErr('')
    const email = newEmail.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setEmailErr('Adresse email invalide.')
    if (email === user?.email) return setEmailErr('C\'est déjà ton adresse actuelle.')
    setEmailSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) throw error
      setEmailMsg('Vérifie ta nouvelle boîte mail : un lien de confirmation t\'a été envoyé. Le changement sera effectif après confirmation.')
      setNewEmail('')
    } catch (err) {
      setEmailErr(/already.*registered/i.test(err.message)
        ? 'Cette adresse est déjà utilisée par un autre compte.'
        : 'Impossible de modifier l\'email pour le moment.')
    } finally {
      setEmailSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwdMsg(''); setPwdErr('')
    if (newPwd.length < 8) return setPwdErr('Le mot de passe doit faire au moins 8 caractères.')
    if (newPwd !== newPwd2) return setPwdErr('Les deux mots de passe ne correspondent pas.')
    setPwdSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setPwdMsg('Ton mot de passe a été modifié.')
      setNewPwd(''); setNewPwd2('')
    } catch {
      setPwdErr('Impossible de modifier le mot de passe pour le moment.')
    } finally {
      setPwdSaving(false)
    }
  }

  return (
    <div>
      <h1 className="font-title text-[22px] font-bold text-nout-texte mb-1">Sécurité</h1>
      <p className="text-sm text-gray-500 mb-6">Modifie ton adresse email ou ton mot de passe.</p>

      {/* Email */}
      <form onSubmit={handleChangeEmail} className="mb-7">
        <label className="block text-sm font-medium text-nout-dark mb-1">Adresse email</label>
        <p className="text-xs text-gray-400 mb-2">Actuelle : {user?.email}</p>
        <div className="flex flex-col sm:flex-row gap-2 max-w-md">
          <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                 placeholder="Nouvelle adresse email" className="input-field flex-1" />
          <button type="submit" disabled={emailSaving || !newEmail.trim()}
                  className="px-5 py-2.5 rounded-lg bg-nout-turquoise text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap">
            {emailSaving ? 'Envoi…' : 'Changer l\'email'}
          </button>
        </div>
        {emailMsg && <p className="text-[13px] text-emerald-600 mt-2 leading-snug max-w-md">{emailMsg}</p>}
        {emailErr && <p className="text-[13px] text-red-500 mt-2">{emailErr}</p>}
      </form>

      {/* Mot de passe */}
      <form onSubmit={handleChangePassword} className="border-t border-gray-100 pt-6">
        <label className="block text-sm font-medium text-nout-dark mb-2">Nouveau mot de passe</label>
        <div className="flex flex-col gap-2 max-w-md">
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
                 placeholder="Nouveau mot de passe (8 caractères min.)" className="input-field" autoComplete="new-password" />
          <input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)}
                 placeholder="Confirme le nouveau mot de passe" className="input-field" autoComplete="new-password" />
          <button type="submit" disabled={pwdSaving || !newPwd || !newPwd2}
                  className="px-5 py-2.5 rounded-lg bg-nout-turquoise text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 self-start">
            {pwdSaving ? 'Modification…' : 'Changer le mot de passe'}
          </button>
        </div>
        {pwdMsg && <p className="text-[13px] text-emerald-600 mt-2">{pwdMsg}</p>}
        {pwdErr && <p className="text-[13px] text-red-500 mt-2">{pwdErr}</p>}
      </form>
    </div>
  )
}
