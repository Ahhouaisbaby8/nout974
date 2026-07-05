import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Guide des tailles (façon Vinted) — informatif. Repère de conversion, la vraie référence
// reste l'étiquette de l'article. Deux tableaux : hauts/robes et pantalons/jeans.
const TOPS = [
  ['XS', '34', '6'], ['S', '36', '8'], ['M', '38', '10'], ['L', '40', '12'],
  ['XL', '42', '14'], ['XXL', '44', '16'], ['3XL', '46', '18'],
]
const PANTS = [
  ['24', '61', '34'], ['26', '66', '36'], ['28', '71', '38'], ['30', '76', '40'],
  ['32', '81', '42'], ['34', '86', '44'], ['36', '91', '46'],
]

export default function SizeGuideModal({ open, onClose }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-title font-bold text-nout-texte">Guide des tailles</h3>
          <button type="button" onClick={onClose} aria-label="Fermer" className="text-nout-turquoise hover:opacity-70">
            <X size={22} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto">
          <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
            Les tailles ne sont pas standardisées d'une marque à l'autre. Sers-toi de ce guide comme repère —
            en cas de doute, fie-toi à l'étiquette de l'article.
          </p>

          <h4 className="font-semibold text-nout-dark text-sm mb-2">Hauts, robes & vêtements</h4>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="py-1.5 px-2 font-medium">Taille</th>
                  <th className="py-1.5 px-2 font-medium">FR</th>
                  <th className="py-1.5 px-2 font-medium">US / UK</th>
                </tr>
              </thead>
              <tbody>
                {TOPS.map(([intl, fr, us]) => (
                  <tr key={intl} className="border-t border-gray-100">
                    <td className="py-1.5 px-2 font-semibold text-nout-dark">{intl}</td>
                    <td className="py-1.5 px-2 text-gray-600 tabular-nums">{fr}</td>
                    <td className="py-1.5 px-2 text-gray-600 tabular-nums">{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-nout-dark text-sm mb-2">Pantalons & jeans (tour de taille)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="text-gray-400 text-left">
                  <th className="py-1.5 px-2 font-medium">W (pouces)</th>
                  <th className="py-1.5 px-2 font-medium">cm</th>
                  <th className="py-1.5 px-2 font-medium">FR / EU</th>
                </tr>
              </thead>
              <tbody>
                {PANTS.map(([w, cm, fr]) => (
                  <tr key={w} className="border-t border-gray-100">
                    <td className="py-1.5 px-2 font-semibold text-nout-dark tabular-nums">W{w}</td>
                    <td className="py-1.5 px-2 text-gray-600 tabular-nums">{cm}</td>
                    <td className="py-1.5 px-2 text-gray-600 tabular-nums">{fr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 flex-shrink-0 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-nout-turquoise text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
