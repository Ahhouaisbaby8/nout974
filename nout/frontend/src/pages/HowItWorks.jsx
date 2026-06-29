import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, CreditCard, Users, Key, CheckCircle,
  Camera, MessageCircle, Wallet, Landmark, Clock, Lock, Shield,
} from 'lucide-react'
import { useHeroRef } from '../context/HeroContext'

// ── Hook fade-in au scroll ──────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('hiw-visible'); obs.disconnect() } },
      { threshold: 0.12 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

// ── Étape (timeline verticale) ─────────────────────────────────────────
function Step({ n, icon, title, desc, last, light }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="hiw-fade flex gap-4">
      {/* Colonne numéro + ligne */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-title font-black text-base shadow-lg flex-shrink-0 ${
          light ? 'bg-[#1A3A8F] text-white' : 'bg-[#00C4B4] text-[#0A0F2C]'
        }`}>
          {n}
        </div>
        {!last && (
          <div className={`w-px flex-1 mt-2 mb-0 min-h-[32px] ${light ? 'bg-[#1A3A8F]/20' : 'bg-[#00C4B4]/30'}`} />
        )}
      </div>
      {/* Contenu */}
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className={`flex-shrink-0 ${light ? 'text-[#1A3A8F]' : 'text-[#00C4B4]'}`}>{icon}</span>
          <p className={`font-title font-bold text-[16px] ${light ? 'text-[#1A1A2E]' : 'text-white'}`}>{title}</p>
        </div>
        <p className={`text-sm leading-relaxed ${light ? 'text-[#6B7A99]' : 'text-white/65'}`}>{desc}</p>
      </div>
    </div>
  )
}

// ── Carte garantie ──────────────────────────────────────────────────────
function GuaranteeCard({ icon, title, desc }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="hiw-fade bg-white rounded-2xl p-6 shadow-sm border border-[#E8EFF5] hover:border-[#00C4B4] hover:shadow-md transition-all">
      <div className="w-12 h-12 rounded-xl bg-[#F0FFFE] flex items-center justify-center text-[#00C4B4] mb-4">{icon}</div>
      <h3 className="font-title font-bold text-[15px] text-[#1A1A2E] mb-2">{title}</h3>
      <p className="text-sm text-[#6B7A99] leading-relaxed">{desc}</p>
    </div>
  )
}

// ── FAQ item accordéon ──────────────────────────────────────────────────
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const ref = useFadeIn()
  return (
    <div ref={ref} className="hiw-fade border-b border-[#E8EFF5] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center py-4 text-left gap-4"
      >
        <span className="font-semibold text-sm text-[#1A1A2E]">{q}</span>
        <span className={`flex-shrink-0 text-[#1A3A8F] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-[#6B7A99] leading-relaxed">{a}</p>
      )}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────
export default function HowItWorks() {
  const navigate = useNavigate()
  const heroRef = useHeroRef()   // navbar transparente tant que le hero sombre est visible

  const buyerSteps = [
    { icon: <Search size={20} />,       title: 'Tu trouves l\'article qui te plaît',  desc: 'Parcours les annonces et trouve la perle rare à La Réunion.' },
    { icon: <CreditCard size={20} />,   title: 'Tu paies en sécurité',                desc: 'Ton paiement est sécurisé et bloqué jusqu\'à la remise en main propre.' },
    { icon: <Users size={20} />,        title: 'Vous vous retrouvez',                 desc: 'Le vendeur te contacte pour organiser la remise en main propre.' },
    { icon: <Key size={20} />,          title: 'Tu donnes ton code',                  desc: 'Tu reçois un code unique par email. Donne-le au vendeur lors de la remise.' },
    { icon: <CheckCircle size={20} />,  title: 'C\'est tout !',                       desc: 'L\'argent est libéré au vendeur. Transaction terminée !' },
  ]

  const sellerSteps = [
    { icon: <Camera size={20} />,         title: 'Tu publies ton annonce',   desc: 'Photos, description, prix — en quelques minutes c\'est en ligne.' },
    { icon: <MessageCircle size={20} />,  title: 'Un acheteur te contacte',  desc: 'Tu reçois une notification dès qu\'on te fait une offre.' },
    { icon: <Wallet size={20} />,         title: 'Tu es payé à l\'avance',   desc: 'L\'acheteur paie avant la remise. Ton argent est sécurisé chez NOUT.' },
    { icon: <Users size={20} />,          title: 'Vous vous retrouvez',      desc: 'Organisez la remise en main propre où vous voulez à La Réunion.' },
    { icon: <Key size={20} />,            title: 'Tu saisis le code',        desc: 'L\'acheteur te donne son code à 6 chiffres. Tu le saisis sur NOUT.' },
    { icon: <Landmark size={20} />,       title: 'Tu reçois ton argent',     desc: 'Le virement part automatiquement sur ton compte bancaire.' },
  ]

  const guarantees = [
    { icon: <CreditCard size={24} />,  title: 'Paiement sécurisé',           desc: 'Ton argent est protégé jusqu\'à la confirmation de remise.' },
    { icon: <Clock size={24} />,       title: 'Remboursement automatique',    desc: 'Si la remise n\'est pas confirmée sous 7 jours, tu es remboursé automatiquement.' },
    { icon: <Lock size={24} />,        title: 'Données protégées',            desc: 'Tes informations bancaires sont chiffrées et sécurisées.' },
  ]

  const faq = [
    {
      q: 'C\'est quoi le code à 6 chiffres ?',
      a: 'C\'est ton code de sécurité unique envoyé par email après ton paiement. Tu le donnes au vendeur UNIQUEMENT lors de la remise en main propre pour confirmer la transaction.',
    },
    {
      q: 'Que se passe-t-il si je ne reçois pas mon article ?',
      a: 'Si la remise n\'est pas confirmée sous 7 jours, tu es automatiquement remboursé. Ton argent ne disparaît jamais.',
    },
    {
      q: 'Comment je reçois mon argent en tant que vendeur ?',
      a: 'Renseigne ton IBAN dans tes Paramètres. Dès que l\'acheteur confirme la remise avec son code, le virement part automatiquement sur ton compte bancaire.',
    },
    {
      q: 'Est-ce que NOUT prend une commission ?',
      a: 'Le vendeur reçoit son prix EN ENTIER, sans aucun frais déduit. Les frais de service (10 % + 0,25 €) sont payés par l\'acheteur sous forme de protection acheteur, en plus du prix (et des frais de port s\'il choisit une livraison — la remise en main propre n\'ajoute pas de port). C\'est plus avantageux pour le vendeur que la plupart des plateformes.',
    },
    {
      q: 'C\'est sécurisé ?',
      a: 'Oui. Les paiements sont gérés par un prestataire certifié PCI-DSS, la norme de sécurité internationale pour les paiements en ligne. Tes données bancaires ne transitent jamais par NOUT.',
    },
  ]

  return (
    <>
      {/* ── CSS animations injectées une fois ── */}
      <style>{`
        .hiw-fade { opacity: 0; transform: translateY(24px); transition: opacity 500ms ease, transform 500ms ease; }
        .hiw-visible { opacity: 1; transform: translateY(0); }
      `}</style>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — HERO (fusionné sous la navbar transparente)        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="bg-[#0A0F2C] px-4 pt-[calc(64px+env(safe-area-inset-top)+2rem)] pb-16 text-center relative overflow-hidden"
      >
        {/* Halo décoratif */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,196,180,0.12) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#00C4B4]/10 border border-[#00C4B4]/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C4B4] animate-pulse" />
            <span className="text-[#00C4B4] text-xs font-semibold tracking-wide uppercase">Marketplace 974</span>
          </div>
          <h1 className="font-title font-extrabold text-[28px] sm:text-[38px] text-white leading-[1.15] mb-4">
            NOUT, c'est simple<br />et sécurisé <Shield className="inline align-middle text-[#00C4B4]" size={30} />
          </h1>
          <p className="text-white/65 text-[15px] sm:text-base leading-relaxed max-w-lg mx-auto">
            La marketplace secondhand de La Réunion où ton argent est protégé à chaque transaction
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — ACHETEURS (fond clair)                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#F8FAFF] px-4 py-14">
        <div className="max-w-xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#1A3A8F] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7A99]">Pour les acheteurs</p>
              <h2 className="font-title font-extrabold text-[22px] text-[#0A0F2C]">Tu achètes</h2>
            </div>
          </div>
          {/* Étapes */}
          <div>
            {buyerSteps.map((s, i) => (
              <Step key={i} n={i + 1} {...s} last={i === buyerSteps.length - 1} light />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 3 — VENDEURS (fond sombre)                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0A0F2C] px-4 py-14">
        <div className="max-w-xl mx-auto">
          {/* En-tête */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-full bg-[#00C4B4] flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#0A0F2C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#00C4B4]/70">Pour les vendeurs</p>
              <h2 className="font-title font-extrabold text-[22px] text-white">Tu vends</h2>
            </div>
          </div>
          {/* Étapes */}
          <div>
            {sellerSteps.map((s, i) => (
              <Step key={i} n={i + 1} {...s} last={i === sellerSteps.length - 1} light={false} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 4 — GARANTIES (fond bleu-gris clair, cohérent NOUT)     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-[#EEF3F8] px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-title font-extrabold text-[22px] text-[#0A0F2C] flex items-center justify-center gap-2">
              Tes garanties NOUT <Shield size={22} className="text-[#1A3A8F]" />
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {guarantees.map((g, i) => (
              <GuaranteeCard key={i} {...g} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 5 — FAQ (fond blanc)                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white px-4 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-title font-extrabold text-[22px] text-[#0A0F2C] mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="bg-[#F8FAFF] rounded-2xl px-6 divide-y divide-[#E8EFF5]">
            {faq.map((item, i) => (
              <FaqItem key={i} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 6 — CTA FINAL                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-16 text-center"
        style={{ background: 'linear-gradient(135deg, #0A0F2C 0%, #1A3A8F 50%, #0E7FAB 100%)' }}
      >
        <div className="max-w-lg mx-auto">
          <h2 className="font-title font-extrabold text-[24px] sm:text-[30px] text-white mb-3">
            Prêt à commencer ?
          </h2>
          <p className="text-white/60 text-sm mb-8">
            Rejoins des centaines de Réunionnais qui achètent et vendent sur NOUT
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/recherche')}
              className="px-8 py-3.5 bg-white text-[#1A3A8F] rounded-full font-semibold text-sm hover:bg-white/90 transition-opacity shadow-lg flex items-center gap-2 justify-center"
            >
              <Search size={16} /> Voir les annonces
            </button>
            <button
              onClick={() => navigate('/publier')}
              className="px-8 py-3.5 bg-[#00C4B4] text-[#0A0F2C] rounded-full font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg flex items-center gap-2 justify-center"
            >
              <Camera size={16} /> Vendre maintenant
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
