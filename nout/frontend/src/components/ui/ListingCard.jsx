import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Shield, Camera, Info, X, Truck } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../services/favorites'
import { formatPrice, formatRelativeDate } from '../../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../../utils/categories'
import { computeProtectionFee, computeBuyerTotal } from '../../utils/shipping'
import { FounderCardBadge } from './FounderBadge'

export default function ListingCard({ listing, isFavorited = false, isFounderSeller = false, founderNumber = null }) {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [fav, setFav]         = useState(isFavorited)
  const [toggling, setToggling] = useState(false)
  const [pulse, setPulse]     = useState(false)
  const [modal, setModal]     = useState(null)   // 'price' | 'protection' | null

  const rawImage  = listing.images?.[0] ?? null
  const imageUrl  = rawImage?.includes('supabase.co/storage')
    ? `${rawImage}?width=400&height=400&resize=cover`
    : rawImage
  const category      = CATEGORIES.find(c => c.id === listing.category)
  const conditionLabel = CONDITIONS.find(c => c.id === listing.condition)?.label
  const views         = listing.views ?? 0
  // Affichage vignette = prix en main propre (le moins cher, sans port)
  const totalAcheteur = computeBuyerTotal(listing.price, 'hand')
  const fraisService  = computeProtectionFee(listing.price, 'hand')

  const openModal = (which) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setModal(which)
  }
  const closeModal = (e) => {
    e?.preventDefault()
    e?.stopPropagation()
    setModal(null)
  }

  const handleFav = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (toggling) return
    if (!user) { navigate('/connexion'); return }
    setToggling(true)
    setPulse(true)
    setTimeout(() => setPulse(false), 400)
    const next = !fav
    setFav(next)
    try {
      if (next) await addFavorite(user.id, listing.id)
      else      await removeFavorite(user.id, listing.id)
    } catch {
      setFav(!next)
    } finally {
      setToggling(false)
    }
  }

  return (
    <Link
      to={`/annonce/${listing.id}`}
      className="group relative block bg-white rounded-[16px] overflow-hidden border border-[#D6E0F5] shadow-nout-md transition-all duration-300 hover:-translate-y-1 hover:shadow-nout-hover hover:border-nout-turquoise"
    >
      {/* ── IMAGE (ratio 4:5 portrait — standard mode) ── */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            loading="lazy"
            onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
            className="w-full h-full object-cover opacity-0 transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-200">
            <Camera size={36} strokeWidth={1} />
          </div>
        )}

        {/* Badge Membre Fondateur (seul badge image — l'étude dit : 1 badge max) */}
        {isFounderSeller && founderNumber && (
          <FounderCardBadge number={founderNumber} />
        )}

        {/* Badge VENDU */}
        {listing.is_sold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-nout-texte text-xs font-bold px-3 py-1 rounded-full tracking-wider uppercase">
              Vendu
            </span>
          </div>
        )}

        {/* Cœur favori — haut droite */}
        <button
          onClick={handleFav}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center transition-transform ${pulse ? 'scale-125' : 'hover:scale-110'}`}
        >
          <Heart className={`w-4 h-4 transition-all duration-200 ${fav ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-white'}`} />
        </button>
      </div>

      {/* ── INFOS (épuré, façon mockup : marque > titre > prix > lieu·date) ── */}
      <div className="p-3">
        {/* Marque en gras si dispo, sinon le titre prend sa place */}
        {listing.brand ? (
          <>
            <p className="text-[12px] font-semibold text-nout-texte leading-tight truncate">
              {listing.brand}
            </p>
            <p className="text-[11px] text-nout-muted leading-snug truncate">
              {listing.title}
            </p>
          </>
        ) : (
          <p className="text-[12px] font-medium text-nout-texte truncate">
            {listing.title}
          </p>
        )}

        <p className="font-title font-bold text-[17px] leading-tight text-nout-texte tracking-tight mt-1.5">
          {formatPrice(listing.price)}
        </p>

        <button
          type="button"
          onClick={openModal('price')}
          className="flex items-center gap-0.5 text-[10px] text-nout-muted mt-0.5 hover:text-nout-turquoise transition-colors"
        >
          {formatPrice(totalAcheteur)} frais inclus
          <Info size={9} className="ml-0.5" />
        </button>

        <p className="text-[10px] text-nout-muted mt-1.5">
          {listing.city ? `${listing.city} · ` : ''}{formatRelativeDate(listing.created_at)}
        </p>
      </div>

      {/* ── POPUP : Détails du prix ── */}
      {modal === 'price' && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-title font-bold text-nout-texte">Détails du prix</h3>
              <button type="button" onClick={closeModal} aria-label="Fermer" className="text-nout-muted hover:text-nout-texte">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {imageUrl && <img src={imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nout-texte truncate">{listing.title}</p>
                </div>
                <span className="text-sm font-semibold text-nout-texte">{formatPrice(listing.price)}</span>
              </div>

              <button
                type="button"
                onClick={openModal('protection')}
                className="w-full flex items-center gap-3 text-left rounded-lg hover:bg-gray-50 -mx-1 px-1 py-1 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-nout-turquoise/10 flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="text-nout-turquoise" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-nout-texte flex items-center gap-1">
                    Frais de service NOUT
                    <Info size={12} className="text-nout-muted" />
                  </p>
                  <p className="text-[11px] text-nout-muted">Protection acheteur incluse</p>
                </div>
                <span className="text-sm font-semibold text-nout-texte">{formatPrice(fraisService)}</span>
              </button>

              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="font-semibold text-nout-texte">Total</span>
                <span className="font-title font-bold text-nout-texte">{formatPrice(totalAcheteur)}</span>
              </div>

              <p className="text-[12px] text-nout-muted leading-relaxed pt-1">
                Les frais de service couvrent la protection de ton achat. Le prix de l'article est
                fixé par le vendeur et peut faire l'objet d'une négociation. La remise se fait
                en main propre avec un code de confirmation sécurisé.
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className="w-full bg-nout-turquoise text-white font-semibold py-3.5 hover:opacity-90 transition-opacity"
            >
              OK, fermer
            </button>
          </div>
        </div>
      )}

      {/* ── POPUP : Protection acheteurs ── */}
      {modal === 'protection' && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden cursor-default flex flex-col max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-4 pt-4">
              <button type="button" onClick={closeModal} aria-label="Fermer" className="text-nout-muted hover:text-nout-texte">
                <X size={20} />
              </button>
            </div>

            <div className="px-6 overflow-y-auto">
              <div className="flex justify-center mb-3">
                <div className="w-16 h-16 rounded-full bg-nout-turquoise/10 flex items-center justify-center">
                  <Shield size={28} className="text-nout-turquoise" />
                </div>
              </div>
              <h3 className="font-title font-bold text-xl text-nout-texte text-center mb-4">
                Protection acheteurs
              </h3>

              <p className="text-sm text-nout-muted leading-relaxed mb-4 text-center">
                Pour chaque achat sur NOUT, ton argent est protégé jusqu'à la remise de l'article.
              </p>

              <div className="flex items-start gap-2 mb-3">
                <Shield size={18} className="text-nout-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-nout-texte mb-1">Paiement sécurisé (séquestre)</p>
                  <p className="text-sm text-nout-muted leading-relaxed">
                    Ton paiement est conservé en sécurité et n'est versé au vendeur qu'une fois que
                    tu as récupéré ton article et confirmé la remise avec ton code à 6 chiffres.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 mb-3">
                <Truck size={18} className="text-nout-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-nout-texte mb-1">Remboursement automatique</p>
                  <p className="text-sm text-nout-muted leading-relaxed">
                    Si la remise n'a pas lieu sous 7 jours, tu es remboursé automatiquement.
                    Tu ne perds jamais ton argent.
                  </p>
                </div>
              </div>

              <p className="text-[12px] text-nout-muted leading-relaxed mb-4">
                En cas de problème, notre équipe intervient pour t'aider. La remise se fait en
                main propre à La Réunion — tu vérifies l'article avant de valider.
              </p>
            </div>

            <button
              type="button"
              onClick={openModal('price')}
              className="w-full bg-nout-turquoise text-white font-semibold py-3.5 hover:opacity-90 transition-opacity flex-shrink-0"
            >
              D'accord
            </button>
          </div>
        </div>
      )}
    </Link>
  )
}
