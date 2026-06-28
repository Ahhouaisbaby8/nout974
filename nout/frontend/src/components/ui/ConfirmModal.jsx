import { AlertTriangle } from 'lucide-react'

// Modale de confirmation réutilisable, dans le style NOUT (remplace le confirm() natif moche).
// Props :
//   open        : booléen d'affichage
//   title       : titre (ex : "Supprimer cette annonce ?")
//   message     : texte explicatif
//   confirmLabel: libellé du bouton d'action (défaut "Confirmer")
//   cancelLabel : libellé annuler (défaut "Annuler")
//   danger      : true = bouton rouge (suppression), false = bouton turquoise
//   loading     : désactive les boutons pendant l'action
//   onConfirm / onCancel
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  loadingLabel = 'Patiente…',
  cancelLabel = 'Annuler',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fade-in"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${danger ? 'bg-red-50' : 'bg-[#EAF6F5]'}`}>
            <AlertTriangle className={`w-6 h-6 ${danger ? 'text-red-500' : 'text-[#0E7FAB]'}`} />
          </div>
          <h3 className="text-lg font-bold text-nout-dark mb-1">{title}</h3>
          {message && <p className="text-sm text-gray-500 leading-relaxed">{message}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-3 rounded-nout border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-3 rounded-nout font-bold text-sm text-white transition-all disabled:opacity-60 ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-[#00C4B4] hover:bg-[#00b0a2]'
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
