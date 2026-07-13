import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import DOMPurify from 'dompurify'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { uploadAvatar, isUsernameAvailable } from '../services/profiles'
import { getAvatarUrl } from '../utils/avatar'
import { REUNION_CITIES } from '../utils/cities'
import CropModal from '../components/ui/CropModal'
import { Palette } from 'lucide-react'

export default function Settings() {
  const { user, profile, updateProfile, logout } = useAuth()

  const [username, setUsername] = useState(profile?.username ?? '')
  // Vérification EN DIRECT de la disponibilité du pseudo : 'idle' | 'checking' | 'ok' | 'taken' | 'short'
  const [pseudoStatus, setPseudoStatus] = useState('idle')
  const [bio, setBio]           = useState(profile?.bio ?? '')
  const [phone, setPhone]       = useState(profile?.phone ?? '')
  const [city, setCity]         = useState(profile?.city ?? '')
  // Adresse d'EXPÉDITION du vendeur (expéditeur sur les étiquettes transporteur).
  // Vient de get_my_account (chargé dans profile). ≠ adresse de livraison acheteur (sur la commande).
  const [shipAddress,  setShipAddress]  = useState(profile?.ship_address  ?? '')
  const [shipAddress2, setShipAddress2] = useState(profile?.ship_address2 ?? '')
  const [shipPostcode, setShipPostcode] = useState(profile?.ship_postcode ?? '')
  const [shipCity,     setShipCity]     = useState(profile?.ship_city     ?? '')
  const [isCreator, setIsCreator]     = useState(profile?.is_creator ?? false)
  const [creatorCraft, setCreatorCraft] = useState(profile?.creator_craft ?? '')
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile]       = useState(null)
  const [cropSrc, setCropSrc]             = useState(null)
  const [saving, setSaving]     = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  const fileInputRef = useRef(null)

  const [showFounderBadge, setShowFounderBadge]       = useState(profile?.show_founder_badge !== false)
  const [badgeToggling, setBadgeToggling]             = useState(false)
  const [badgeToggleSuccess, setBadgeToggleSuccess]   = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting]   = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const currentAvatarUrl = getAvatarUrl(profile?.avatar_url)

  // Vérifie EN DIRECT si le pseudo est libre, 500 ms après la dernière frappe (anti-spam requêtes).
  // On ne vérifie pas si le pseudo n'a pas changé (= le sien) → pas de faux « déjà pris ».
  useEffect(() => {
    const val = username.trim()
    if (val === (profile?.username ?? '')) { setPseudoStatus('idle'); return }
    if (val.length < 3) { setPseudoStatus('short'); return }
    setPseudoStatus('checking')
    const t = setTimeout(async () => {
      const libre = await isUsernameAvailable(val, user?.id)
      setPseudoStatus(libre ? 'ok' : 'taken')
    }, 500)
    return () => clearTimeout(t)
  }, [username, profile?.username, user?.id])

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
    if (pseudoStatus === 'taken')   return setError('Ce pseudo est déjà pris, choisis-en un autre.')

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
        is_creator:    isCreator,
        creator_craft: isCreator ? clean(creatorCraft.trim()) : null,
        // Adresse d'expédition vendeur (null si vide → champ optionnel tant que pas de vente livrée)
        ship_address:  clean(shipAddress.trim())  || null,
        ship_address2: clean(shipAddress2.trim()) || null,
        ship_postcode: clean(shipPostcode.trim()) || null,
        ship_city:     clean(shipCity.trim())     || null,
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

  const handleToggleFounderBadge = async () => {
    if (badgeToggling) return
    const next = !showFounderBadge
    setShowFounderBadge(next)
    setBadgeToggling(true)
    try {
      await updateProfile({ show_founder_badge: next })
      setBadgeToggleSuccess(true)
      setTimeout(() => setBadgeToggleSuccess(false), 2500)
    } catch {
      setShowFounderBadge(!next)
    } finally {
      setBadgeToggling(false)
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
    <div>
      <h1 className="font-title text-[22px] font-bold text-nout-texte mb-6">Mon profil</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg px-4 py-3 mb-5">
          Profil mis à jour avec succès !
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── AVATAR ── (rangée à plat : plus de carte dans la carte) */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="relative flex-shrink-0 group"
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover ring-1 ring-[#E8EDF3] shadow-sm" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#EAF5F3] text-[#0E8C82] flex items-center justify-center text-3xl font-bold ring-1 ring-[#E8EDF3] shadow-sm">
                {username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-medium">Modifier</span>
            </div>
          </button>
          <div>
            <p className="font-semibold text-nout-texte">Photo de profil</p>
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="text-sm text-[#0E8C82] font-medium hover:underline mt-0.5"
            >
              Changer la photo
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>

        {/* ── INFOS ── (à plat) */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-nout-dark mb-1">Pseudo</label>
            <input
              type="text"
              required
              maxLength={30}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`input-field ${
                pseudoStatus === 'taken' || pseudoStatus === 'short'
                  ? 'border-red-400 ring-2 ring-red-200'
                  : pseudoStatus === 'ok'
                    ? 'border-green-400 ring-2 ring-green-200'
                    : ''
              }`}
            />
            {pseudoStatus === 'checking' && <p className="text-xs text-gray-400 mt-1">Vérification…</p>}
            {pseudoStatus === 'ok'       && <p className="text-xs text-green-600 mt-1">Ce pseudo est disponible.</p>}
            {pseudoStatus === 'taken'    && <p className="text-xs text-red-500 mt-1">Ce pseudo est déjà pris / utilisé, choisis-en un autre.</p>}
            {pseudoStatus === 'short'    && <p className="text-xs text-red-500 mt-1">Le pseudo doit faire au moins 3 caractères.</p>}
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

          {/* Créateur péi : déclaration auto (Phase 1). Affiche un badge + place dans la vitrine. */}
          <div className="rounded-xl border border-[#E6EAF0] bg-[#F8FAFC] p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isCreator}
                onChange={(e) => setIsCreator(e.target.checked)}
                className="mt-0.5 w-5 h-5 accent-[#0E8C82] cursor-pointer flex-shrink-0"
              />
              <span>
                <span className="block text-sm font-semibold text-[#0E8C82] flex items-center gap-1.5">
                  <Palette className="w-4 h-4" /> Je suis créateur péi
                </span>
                <span className="block text-[12px] text-gray-600 mt-0.5">
                  Tu fabriques toi-même tes articles à La Réunion (bijoux, vêtements, déco…).
                  Tu obtiens un badge « Créateur péi » et tu apparais dans la vitrine des créateurs.
                </span>
              </span>
            </label>

            {isCreator && (
              <div className="mt-3">
                <label className="block text-[12px] font-medium text-nout-dark mb-1">
                  Ton activité <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  maxLength={80}
                  placeholder="Ex : Bijoux en graines péi, couture créole…"
                  value={creatorCraft}
                  onChange={(e) => setCreatorCraft(e.target.value)}
                  className="input-field"
                />
              </div>
            )}
          </div>

          {/* Adresse d'expédition (vendeur) : sert d'expéditeur sur l'étiquette de livraison.
              ≠ adresse de livraison de l'acheteur. Optionnelle tant que tu ne vends pas en livraison. */}
          <div className="rounded-xl border border-[#E6EAF0] bg-[#F8FAFC] p-4 space-y-3">
            <div>
              <span className="block text-sm font-semibold text-nout-dark">Adresse d'expédition</span>
              <span className="block text-[12px] text-gray-600 mt-0.5">
                Utilisée comme adresse d'envoi quand tu expédies une vente (point relais ou domicile).
                Elle reste privée. Nécessaire seulement si tu vends avec livraison.
              </span>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-nout-dark mb-1">Adresse</label>
              <input
                type="text" maxLength={38}
                placeholder="Ex : 12 rue des Flamboyants"
                value={shipAddress}
                onChange={(e) => setShipAddress(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-nout-dark mb-1">
                Complément <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text" maxLength={38}
                placeholder="Bâtiment, étage, résidence…"
                value={shipAddress2}
                onChange={(e) => setShipAddress2(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-nout-dark mb-1">Code postal</label>
                <input
                  type="text" inputMode="numeric" maxLength={5}
                  placeholder="974xx"
                  value={shipPostcode}
                  onChange={(e) => setShipPostcode(e.target.value.replace(/\D/g, ''))}
                  className="input-field"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[12px] font-medium text-nout-dark mb-1">Ville</label>
                <select
                  value={shipCity}
                  onChange={(e) => setShipCity(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="">Choisir…</option>
                  {REUNION_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
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

      {/* ── RECEVOIR MES PAIEMENTS → page dédiée « Mon argent » ── */}
      <div className="mt-8 pt-8 border-t border-[#EEF2F7]">
        <h2 className="font-bold text-nout-dark mb-1">Recevoir mes paiements</h2>
        <p className="text-sm text-gray-500 mb-3 leading-relaxed">
          L'argent de tes ventes t'attend dans ton porte-monnaie. Vérifie ton identité une fois, puis
          retire sur ton compte bancaire quand tu veux — <strong>pas de SIRET</strong> pour un particulier.
        </p>
        <Link to="/compte/paiements" className="inline-block btn-primary px-6 py-3 text-sm">
          Aller à Mon argent
        </Link>
      </div>

      {/* ── SECTION BADGE FONDATEUR (visible uniquement si is_founder) ── */}
      {profile?.is_founder && (
        <div className="mt-8 pt-8 border-t border-[#EEF2F7]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-bold text-nout-dark mb-1">Badge Membre Fondateur</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Affiche ta bannière coucher de soleil, ton anneau doré et ton badge
                sur ton profil, dans les conversations et sur tes annonces.
              </p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Désactiver n'affecte pas ta commission à vie (0%) ni ta place #{profile.founder_number}.
                Le compteur de places sur l'accueil reste inchangé.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleFounderBadge}
              disabled={badgeToggling}
              className={`relative flex-shrink-0 mt-0.5 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                showFounderBadge ? 'bg-nout-turquoise' : 'bg-gray-300'
              } ${badgeToggling ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              aria-label="Afficher mon badge Membre Fondateur"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                showFounderBadge ? 'translate-x-6' : 'translate-x-0'
              }`} />
            </button>
          </div>
          {badgeToggleSuccess && (
            <p className="text-xs text-green-600 mt-3 font-medium">Préférence enregistrée</p>
          )}
        </div>
      )}

      {/* ── SECTION CONFIDENTIALITÉ ── */}
      <div className="mt-8 pt-8 border-t border-[#EEF2F7]">
        <h2 className="font-bold text-nout-dark mb-1">Confidentialité et compte</h2>
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
            <span className="text-4xl"></span>
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
