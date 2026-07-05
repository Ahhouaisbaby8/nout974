import { createPortal } from 'react-dom'
import { Shield, RefreshCcw, X } from 'lucide-react'

// Explication « Protection acheteur » (style Vinted) — montre CE QUE C'EST, sans jamais afficher
// la formule des frais (décision produit : on montre l'info, pas le calcul « 10 % + 0,25 € »).
// Réutilisée sur la page annonce (ListingDetail) et le tunnel d'achat (Checkout) via une icône ⓘ.
export default function ProtectionInfoModal({ open, onClose }) {
  if (!open) return null
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden cursor-default flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end px-4 pt-4 flex-shrink-0">
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-nout-turquoise hover:opacity-70">
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
            onClick={onClose}
            className="w-full bg-nout-turquoise text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            D'accord
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
