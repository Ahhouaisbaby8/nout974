import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { Heart, Shield, Camera, Info, X, Truck, RefreshCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { addFavorite, removeFavorite } from '../../services/favorites'
import { formatPrice, formatRelativeDate } from '../../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../../utils/categories'
import { computeProtectionFee, computeBuyerTotal, MIN_SHIPPING_FEE } from '../../utils/shipping'
import { thumbUrl } from '../../utils/image'

import { FounderCardBadge } from './FounderBadge'

export default function ListingCard({ listing, isFavorited = false, isFounderSeller = false, founderNumber = null }) {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [fav, setFav]         = useState(isFavorited)
  const [toggling, setToggling] = useState(false)
  const [pulse, setPulse]     = useState(false)
  const [modal, setModal]     = useState(null)   // 'price' | 'protection' | null

  const imageUrl  = thumbUrl(listing.images?.[0] ?? null)
  const category      = CATEGORIES.find(c => c.id === listing.category)
  const conditionLabel = CONDITIONS.find(c => c.id === listing.condition)?.label
  const views         = listing.views ?? 0
  // Modèle protection acheteur (façon Vinted) : le prix affiché est celui du vendeur, qu'il reçoit EN ENTIER.
  // À l'achat s'ajoute une protection acheteur (10% + 0,25€), + le port si livraison choisie.
  const protectionFee = computeProtectionFee(listing.price)

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

        {/* Total façon Vinted : ce que l'acheteur paie, protection incluse. PAS de port ici :
            il n'est ajouté qu'au checkout, quand l'acheteur choisit son mode de livraison.
            Le détail complet s'ouvre au clic sur le ⓘ. */}
        <button
          type="button"
          onClick={openModal('price')}
          className="flex items-center gap-0.5 text-[11px] text-nout-muted mt-0.5 hover:text-nout-turquoise transition-colors"
        >
          {formatPrice(computeBuyerTotal(listing.price, 'hand'))} · protection incluse
          <Info size={10} className="ml-0.5" />
        </button>

        <p className="text-[10px] text-nout-muted mt-1.5">
          {listing.city ? `${listing.city} · ` : ''}{formatRelativeDate(listing.created_at)}
        </p>
      </div>

      {/* Popups rendues via portail (hors de la carte) → toujours centrées plein écran */}
      {modal && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
          onClick={closeModal}
        >
          {/* ── POPUP : Détails du prix (style Vinted) ── */}
          {modal === 'price' && (
            <div
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4">
                <span className="w-6" />
                <h3 className="font-title font-bold text-nout-texte text-center flex-1">Détails du prix</h3>
                <button type="button" onClick={closeModal} aria-label="Fermer" className="text-nout-turquoise hover:opacity-70">
                  <X size={22} />
                </button>
              </div>

              <div className="px-5 pb-2">
                {/* Ligne article */}
                <div className="flex items-center gap-3 py-3 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {imageUrl && <img src={imageUrl} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="flex-1 min-w-0 text-[15px] text-nout-texte truncate">{listing.title}</p>
                  <span className="text-[15px] text-nout-texte">{formatPrice(listing.price)}</span>
                </div>

                {/* Protection acheteur (10% + 0,25€) — payée par l'acheteur, finance le paiement sécurisé */}
                <button
                  type="button"
                  onClick={openModal('protection')}
                  className="w-full flex items-center gap-3 py-3 border-t border-gray-100 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-nout-turquoise/15 flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className="text-nout-turquoise" />
                  </div>
                  <p className="flex-1 text-[15px] text-nout-texte flex items-center gap-1.5">
                    Protection acheteur
                    <Info size={15} className="text-nout-turquoise" />
                  </p>
                  <span className="text-[15px] font-medium text-nout-texte">{formatPrice(protectionFee)}</span>
                </button>

                {/* Frais de port (info, sélectionné au paiement) */}
                <div className="py-3 border-t border-gray-100">
                  <p className="text-[13px] text-gray-400 mb-2">À sélectionner lors du paiement</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-nout-turquoise/15 flex items-center justify-center flex-shrink-0">
                      <Truck size={18} className="text-nout-turquoise" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-nout-texte">Frais de port</p>
                      <p className="text-[13px] text-gray-400">Main propre gratuite, ou livraison à partir de {formatPrice(MIN_SHIPPING_FEE)}</p>
                    </div>
                    <span className="text-[15px] text-nout-texte">dès {formatPrice(MIN_SHIPPING_FEE)}</span>
                  </div>
                </div>

                <p className="text-[13px] text-gray-400 leading-relaxed py-3 border-t border-gray-100">
                  Le vendeur reçoit son prix en entier. À l'achat s'ajoute une protection acheteur
                  (et les frais de port si tu choisis une livraison). Le paiement est
                  sécurisé : le vendeur n'est payé qu'après confirmation de réception.
                </p>
              </div>

              <div className="p-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full bg-nout-turquoise text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  OK, fermer
                </button>
              </div>
            </div>
          )}

          {/* ── POPUP : Protection acheteurs (style Vinted) ── */}
          {modal === 'protection' && (
            <div
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden cursor-default flex flex-col max-h-[85dvh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end px-4 pt-4 flex-shrink-0">
                <button type="button" onClick={closeModal} aria-label="Fermer" className="text-nout-turquoise hover:opacity-70">
                  <X size={22} />
                </button>
              </div>

              <div className="px-6 overflow-y-auto">
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16 rounded-full bg-nout-turquoise/15 flex items-center justify-center">
                    <Shield size={28} className="text-nout-turquoise" />
                  </div>
                </div>
                <h3 className="font-title font-bold text-xl text-nout-texte text-center mb-5">
                  Protection acheteurs
                </h3>

                <p className="text-[15px] text-gray-500 leading-relaxed mb-5">
                  Pour chaque achat effectué sur NOUT, nous assurons ta protection.
                </p>

                <div className="flex items-start gap-3 mb-4">
                  <RefreshCcw size={20} className="text-nout-turquoise flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-semibold text-nout-texte mb-1">Politique de remboursement</p>
                    <p className="text-[15px] text-gray-500 leading-relaxed mb-2">Tu peux obtenir un remboursement si ta commande&nbsp;:</p>
                    <ul className="text-[15px] text-gray-500 leading-relaxed list-disc pl-5 space-y-0.5">
                      <li>n'est pas remise dans les 7 jours</li>
                      <li>n'est pas conforme à sa description</li>
                      <li>présente un problème non signalé</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 mb-4">
                  <Shield size={20} className="text-nout-turquoise flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[15px] font-semibold text-nout-texte mb-1">Paiement sécurisé (séquestre)</p>
                    <p className="text-[15px] text-gray-500 leading-relaxed">
                      Ton paiement est conservé en sécurité et versé au vendeur seulement après confirmation
                      de la remise avec ton code à 6 chiffres. Tu disposes de 7 jours&nbsp;; si la remise n'a pas
                      lieu, tu es remboursé automatiquement. En cas de problème, notre équipe intervient pour t'aider.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={openModal('price')}
                  className="w-full bg-nout-turquoise text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  D'accord
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </Link>
  )
}
