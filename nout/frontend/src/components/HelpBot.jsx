import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MessageCircle, X, ChevronRight, RotateCcw } from 'lucide-react'

// Assistant NOUT — bot GUIDÉ (pas d'API/LLM) : l'utilisateur clique des questions
// pré-définies, les réponses sont rédigées (toujours exactes). Échappatoire = page Aide.
const GREETING = "Bonjour ! Je suis l'assistant NOUT. Une question ? Choisis un sujet ci-dessous."

const QA = [
  {
    id: 'how', label: 'Comment ça marche ?',
    answer: "Tu trouves un article, tu paies en sécurité (ton argent est bloqué), tu reçois l'article, puis l'argent est libéré au vendeur. Simple et protégé.",
    link: { to: '/comment-ca-marche', label: 'Voir en détail' },
  },
  {
    id: 'secure', label: "C'est sécurisé ?",
    answer: "Oui. Ton paiement reste bloqué et protégé jusqu'à ce que tu confirmes la réception. Les paiements passent par un prestataire certifié PCI-DSS : tes données bancaires ne transitent jamais par NOUT.",
  },
  {
    id: 'fees', label: 'Quels sont les frais ?',
    answer: "Le vendeur reçoit son prix EN ENTIER, sans frais déduits. Les frais de protection (10 % + 0,25 €) sont payés par l'acheteur, en plus du prix.",
  },
  {
    id: 'sell', label: 'Comment vendre ?',
    answer: "Clique sur « Vendre », ajoute tes photos, une description et ton prix — ton annonce est en ligne en 2 minutes.",
    link: { to: '/publier', label: 'Vendre un article' },
  },
  {
    id: 'payout', label: 'Comment je reçois mon argent ?',
    answer: "L'argent de tes ventes s'accumule dans ton porte-monnaie « Mon argent ». Tu vérifies ton identité une seule fois (pièce d'identité + IBAN, pas de SIRET pour un particulier), puis tu retires ton solde vers ton compte bancaire quand tu veux.",
    link: { to: '/compte/paiements', label: 'Mon argent' },
  },
  {
    id: 'tax', label: 'Ça peut me poser problème (impôts) ?',
    answer: "Non, si tu vends tes affaires perso d'occasion : c'est entre particuliers, non imposable et sans immatriculation, quel que soit le montant. Stripe affiche « Entrepreneur individuel » — c'est juste une étiquette technique pour un particulier, ça ne crée aucune obligation. Ce n'est que si tu achètes pour revendre régulièrement (activité pro) que tu dois t'immatriculer. En cas de doute, renseigne-toi auprès d'un expert-comptable.",
    link: { to: '/aide', label: "Plus d'infos" },
  },
  {
    id: 'ship', label: 'Livraison ou main propre ?',
    answer: "Les deux : remise en main propre gratuite partout à La Réunion, ou livraison Chronopost si tu préfères.",
  },
  {
    id: 'problem', label: "Et si j'ai un problème ?",
    answer: "Tant que tu n'as pas confirmé la réception, ton argent reste bloqué. En cas de souci, signale-le : l'équipe NOUT tranche le litige (remboursement ou versement).",
    link: { to: '/aide', label: "Centre d'aide" },
  },
  {
    id: 'contact', label: 'Contacter le support',
    answer: "Tu retrouves tout dans le centre d'aide, et tu peux nous écrire depuis là — on te répond vite.",
    link: { to: '/aide', label: "Aller à l'aide" },
  },
]

const GRADIENT = 'linear-gradient(135deg, #0E7FAB 0%, #00C4B4 100%)'

export default function HelpBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: GREETING }])
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const endRef = useRef(null)

  // Masqué là où l'espace bas-droite sert déjà (messagerie, tunnel d'achat).
  const hidden = pathname.startsWith('/messages') || pathname.startsWith('/commander')

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, open])

  const ask = (qa) => {
    setMessages(m => [...m, { from: 'user', text: qa.label }, { from: 'bot', text: qa.answer, link: qa.link }])
  }
  const reset = () => setMessages([{ from: 'bot', text: GREETING }])
  const goLink = (to) => { setOpen(false); navigate(to) }

  if (hidden) return null

  return (
    <>
      {/* Bulle flottante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir l'assistant NOUT"
          className="fixed z-40 right-4 md:right-6 bottom-20 md:bottom-6 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          style={{ background: GRADIENT }}
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Panneau */}
      {open && (
        <div className="fixed z-[55] right-3 md:right-6 bottom-20 md:bottom-6 left-3 md:left-auto md:w-[372px] max-h-[72vh] md:max-h-[560px] bg-white rounded-2xl shadow-2xl border border-[#E8EFF5] flex flex-col overflow-hidden animate-fade-in">
          {/* En-tête */}
          <div className="flex items-center justify-between px-4 py-3 text-white flex-shrink-0" style={{ background: GRADIENT }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-[15px] leading-tight">Assistant NOUT</p>
                <p className="text-[11px] text-white/80 leading-tight">Réponses immédiates</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 1 && (
                <button onClick={reset} aria-label="Recommencer" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15">
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/15">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Fil de messages */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-3 bg-[#F8FAFC]">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.from === 'user'
                    ? 'bg-[#0E8C82] text-white rounded-br-md'
                    : 'bg-white text-nout-texte border border-[#EEF2F7] rounded-bl-md shadow-sm'
                }`}>
                  {m.text}
                  {m.link && (
                    <button
                      onClick={() => goLink(m.link.to)}
                      className="mt-2 flex items-center gap-1 text-[13px] font-semibold text-[#0E8C82] hover:underline"
                    >
                      {m.link.label} <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Questions cliquables */}
          <div className="border-t border-[#EEF2F7] p-2.5 bg-white flex-shrink-0">
            <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto">
              {QA.map(qa => (
                <button
                  key={qa.id}
                  onClick={() => ask(qa)}
                  className="px-3 py-1.5 rounded-full text-[12.5px] font-medium text-nout-texte bg-[#F1F5F9] hover:bg-[#E6EDF3] transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
