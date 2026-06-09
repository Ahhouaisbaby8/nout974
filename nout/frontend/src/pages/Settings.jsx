import { useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { uploadAvatar } from '../services/profiles'
import { getAvatarUrl } from '../utils/avatar'
import { REUNION_CITIES } from '../utils/cities'
import BackButton from '../components/ui/BackButton'
import CropModal from '../components/ui/CropModal'

export default function Settings() {
  const { user, profile, updateProfile } = useAuth()

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
  const [searchParams] = useSearchParams()
  const stripeStatus = searchParams.get('stripe') // 'success' | 'refresh' | null
  const [connectLoading, setConnectLoading] = useState(false)

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

    if (username.trim().length < 3) return setError('Le pseudo doit faire au moins 3 caractères.')

    setSaving(true)
    try {
      if (avatarFile) {
        await uploadAvatar(user.id, avatarFile)
      }
      await updateProfile({
        username: username.trim(),
        bio:      bio.trim(),
        phone:    phone.trim(),
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
        <h2 className="font-bold text-nout-dark mb-1">💳 Activer les paiements</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Pour recevoir de l'argent via NOUT, connecte ton compte Stripe. C'est gratuit et sécurisé — Stripe gère tous les virements directement sur ton compte bancaire.
        </p>

        {stripeStatus === 'success' && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
            ✅ Ton compte vendeur est activé ! Tu peux maintenant recevoir des paiements.
          </div>
        )}
        {stripeStatus === 'refresh' && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 text-sm rounded-lg px-4 py-3 mb-4">
            ⚠️ La session a expiré. Clique à nouveau sur le bouton pour finaliser.
          </div>
        )}

        {profile?.stripe_account_id ? (
          <div className="flex items-center gap-3">
            <span className="text-green-500 text-xl">✅</span>
            <div>
              <p className="font-semibold text-nout-dark text-sm">Compte vendeur connecté</p>
              <p className="text-xs text-gray-400">Tu peux vendre et recevoir des paiements sur NOUT.</p>
            </div>
          </div>
        ) : (
          <button
            onClick={async () => {
              setConnectLoading(true)
              try {
                const res = await fetch('/.netlify/functions/create-connect-account', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id }),
                })
                const data = await res.json()
                if (data.url) window.location.href = data.url
              } catch {
                alert('Erreur. Réessaie.')
              } finally {
                setConnectLoading(false)
              }
            }}
            disabled={connectLoading}
            className={`btn-primary px-6 py-3 text-sm ${connectLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {connectLoading ? 'Redirection vers Stripe…' : '🔗 Connecter mon compte Stripe'}
          </button>
        )}
      </div>

    </div>
    </>
  )
}
