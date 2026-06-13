import { useState, useRef } from 'react'
import DOMPurify from 'dompurify'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { uploadAvatar } from '../services/profiles'
import { getAvatarUrl } from '../utils/avatar'
import { REUNION_CITIES } from '../utils/cities'
import BackButton from '../components/ui/BackButton'
import CropModal from '../components/ui/CropModal'

export default function Settings() {
  const { user, profile, updateProfile, logout } = useAuth()

  const [username, setUsername] = useState(profile?.username ?? '')
  const [bio, setBio]           = useState(profile?.bio ?? '')
  const [phone, setPhone]       = useState(profile?.phone ?? '')
  const [city, setCity]         = useState(profile?.city ?? '')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile]       = useState(null)
  const [cropSrc, setCropSrc]             = useState(null)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  const fileInputRef = useRef(null)
  const [iban, setIban]           = useState(profile?.iban ?? '')
  const [ibanSaving, setIbanSaving] = useState(false)
  const [ibanSuccess, setIbanSuccess] = useState(false)
  const [ibanError, setIbanError]   = useState('')

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const currentAvatarUrl = getAvatarUrl(profile?.avatar_url)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCropSrc(URL.createObjectURL(file))
    e.target.value = ''
  }

  const handleAvatarCropConfirm = (blob) => {
    URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    if (!blob) return
    setAvatarFile(blob)
    setAvatarPreview(URL.createObjectURL(blob))
  }

  const handleAvatarCropCancel = () => {
    URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const clean = (str) => DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

    if (username.trim().length < 3) return setError('Le pseudo doit faire au moins 3 caractères.')

    setSaving(true)
    try {
      if (avatarFile) {
        await uploadAvatar(user.id, avatarFile)
      }
      await updateProfile({
        username: clean(username.trim()),
        bio:      clean(bio.trim()),
        phone:    clean(phone.trim()),
        city,
      })
      setSuccess(true)
      setAvatarFile(null)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        setError('Ce pseudo est déjà pris, choisis-en un autre.')
      } else {
        setError('Une erreur est survenue. Réessaie.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIban = async () => {
    setIbanError('')
    setIbanSuccess(false)
    const cleaned = iban.replace(/[\s-]/g, '').toUpperCase()
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(cleaned)) {
      return setIbanError('Format IBAN invalide. Exemple : FR76 3000 6000 0112 3456 7890 189')
    }
    setIbanSaving(true)
    try {
      await updateProfile({ iban: cleaned })
      setIbanSuccess(true)
    } catch {
      setIbanError('Erreur lors de l\'enregistrement. Réessaie.')
    } finally {
      setIbanSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return
    setDeleting(true)
    setDeleteError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/.netlify/functions/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      await logout()
    } catch (err) {
      setDeleteError(err.message)
      setDeleting(false)
    }
  }

  const displayAvatar = avatarPreview ?? currentAvatarUrl

  return (
    <>
    {cropSrc && (
      <CropModal
        imageSrc={cropSrc}
        onConfirm={handleAvatarCropConfirm}
        onCancel={handleAvatarCropCancel}
      />
    )}
    <div className="max-w-lg mx-auto px-4 py-6">
      <BackButton />
      <h1 className="text-2xl font-extrabold text-nout-dark mt-4 mb-6">Mon profil</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-5">
          ✅ Profil mis à jour avec succès !
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── AVATAR ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="relative flex-shrink-0 group"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-nout-primary" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-nout-primary text-white flex items-center justify-center text-3xl font-bold border-4 border-nout-primary">
                {username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xl">📷</span>
            </div>
          </button>
          <div>
            <p className="font-semibold text-nout-dark">Photo de profil</p>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="text-sm text-nout-primary hover:underline mt-1"
            >
              Changer la photo
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* ── INFOS ── */}
        <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Pseudo</label>
            <input
              type="text"
              required
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">
              Bio <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <textarea
              rows={3}
              maxLength={200}
              placeholder="Présente-toi en quelques mots..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input-field resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">
              Téléphone <span className="text-gray-400 font-normal">(optionnel — visible uniquement par toi)</span>
            </label>
            <input
              type="tel"
              placeholder="0692 XX XX XX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Ville</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input-field cursor-pointer"
            >
              <option value="">Choisir ta ville...</option>
              {REUNION_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={`btn-primary w-full py-4 text-base ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>

      </form>

      {/* ── SECTION PAIEMENTS VENDEUR ── */}
      <div className="mt-8 bg-white rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-nout-dark mb-1">💳 Recevoir mes paiements</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Renseigne ton IBAN pour recevoir l'argent de tes ventes directement sur ton compte bancaire.
        </p>

        {(profile?.stripe_account_id || profile?.iban || ibanSuccess) && (
          <div className="flex items-center gap-2 mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
            <span className="text-green-500">✅</span>
            <p className="font-semibold text-green-700 text-sm">Paiements activés</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {ibanError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
              {ibanError}
            </div>
          )}
          {ibanSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3">
              IBAN enregistré avec succès.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">IBAN</label>
            <input
              type="text"
              placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
              value={iban}
              onChange={(e) => setIban(e.target.value.toUpperCase())}
              className="input-field"
              maxLength={42}
            />
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Ton IBAN sera utilisé uniquement pour virer tes gains de vente.
          </p>
          <button
            type="button"
            onClick={handleSaveIban}
            disabled={ibanSaving}
            className={`btn-primary px-6 py-3 text-sm ${ibanSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {ibanSaving ? 'Enregistrement…' : (profile?.iban ? 'Modifier mon IBAN' : 'Enregistrer mon IBAN')}
          </button>
        </div>
      </div>

      {/* ── SECTION CONFIDENTIALITÉ ── */}
      <div className="mt-8 bg-white rounded-xl p-5 shadow-sm">
        <h2 className="font-bold text-nout-dark mb-1">🔒 Confidentialité et compte</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          La suppression de ton compte est définitive et irréversible.
        </p>
        <button
          type="button"
          onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteError('') }}
          className="px-5 py-2.5 rounded-lg border-2 border-red-400 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
        >
          Supprimer mon compte
        </button>
      </div>

    </div>

    {/* ── MODAL SUPPRESSION ── */}
    {showDeleteModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <div className="text-center mb-5">
            <span className="text-4xl">⚠️</span>
            <h3 className="font-title font-extrabold text-[18px] text-nout-dark mt-3 mb-2">
              Supprimer ton compte ?
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Cette action est irréversible. Toutes tes annonces, messages et données seront supprimés définitivement.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Tape <span className="text-red-500 font-bold">SUPPRIMER</span> pour confirmer
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              className="input-field text-center font-mono tracking-widest"
              autoComplete="off"
            />
          </div>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg px-3 py-2 mb-4">
              {deleteError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmText !== 'SUPPRIMER' || deleting}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
