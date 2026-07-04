import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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

// ── Étape (timeline verticale, sans icône décorative — le numéro suffit) ──
function Step({ n, title, desc, last, light }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="hiw-fade flex gap-4">
      {/* Colonne numéro + ligne */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-title font-bold text-[15px] flex-shrink-0 ${
          light ? 'bg-[#1A3A8F] text-white' : 'bg-[#0E8C82] text-white'
        }`}>
          {n}
        </div>
        {!last && (
          <div className={`w-px flex-1 mt-2 mb-0 min-h-[28px] ${light ? 'bg-[#1A3A8F]/15' : 'bg-white/15'}`} />
        )}
      </div>
      {/* Contenu */}
      <div className="pb-8">
        <p className={`font-title font-bold text-[16px] mb-1 ${light ? 'text-[#1A1A2E]' : 'text-white'}`}>{title}</p>
        <p className={`text-sm leading-relaxed ${light ? 'text-[#6B7A99]' : 'text-white/65'}`}>{desc}</p>
      </div>
    </div>
  )
}

// ── Carte garantie (texte + filet d'accent discret, pas d'icône) ──────────
function GuaranteeCard({ title, desc }) {
  const ref = useFadeIn()
  return (
    <div ref={ref} className="hiw-fade bg-white rounded-2xl p-6 shadow-sm border border-[#E8EFF5]">
      <div className="w-8 h-0.5 rounded-full bg-[#0E8C82] mb-4" />
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
        aria-expanded={open}
      >
        <span className="font-semibold text-sm text-[#1A1A2E]">{q}</span>
        <span className={`flex-shrink-0 text-[#9aa5b8] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
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
    { title: 'Tu trouves l\'article qui te plaît', desc: 'Parcours les annonces et trouve la perle rare à La Réunion.' },
    { title: 'Tu paies en sécurité',              desc: 'Ton paiement est sécurisé et bloqué : le vendeur n\'est payé qu\'une fois l\'article remis.' },
    { title: 'Vous vous retrouvez',               desc: 'Le vendeur te contacte pour organiser la remise en main propre, ou expédie ton colis.' },
    { title: 'Tu confirmes la réception',         desc: 'Tu donnes ton code de remise (ou tu cliques « J\'ai bien reçu »). Tant que tu n\'as rien reçu, ton argent reste protégé.' },
    { title: 'C\'est tout !',                     desc: 'L\'argent est alors libéré au vendeur. Transaction terminée, en toute confiance.' },
  ]

  const sellerSteps = [
    { title: 'Tu publies ton annonce',  desc: 'Photos, description, prix — en quelques minutes c\'est en ligne.' },
    { title: 'Un acheteur paie',        desc: 'L\'acheteur paie d\'avance. L\'argent est sécurisé chez NOUT avant même la remise.' },
    { title: 'Vous vous retrouvez',     desc: 'Remise en main propre où vous voulez à La Réunion, ou expédition du colis.' },
    { title: 'La remise est confirmée', desc: 'L\'acheteur valide la réception avec son code à 6 chiffres.' },
    { title: 'Tu reçois ton argent',    desc: 'Le virement part automatiquement sur ton compte. Tu reçois ton prix EN ENTIER, sans frais déduits.' },
  ]

  const guarantees = [
    { title: 'Paiement sécurisé',          desc: 'Ton argent est bloqué et protégé jusqu\'à la confirmation de remise. Le vendeur n\'est jamais payé avant.' },
    { title: 'Remboursement automatique',  desc: 'Si la remise n\'est pas confirmée dans les délais, tu es remboursé automatiquement. Ton argent ne disparaît jamais.' },
    { title: 'Litige géré par NOUT',       desc: 'Un problème ? Tu le signales en un clic et l\'équipe NOUT tranche : remboursement ou versement, selon le cas.' },
    { title: 'Données bancaires protégées', desc: 'Les paiements passent par un prestataire certifié PCI-DSS. Tes coordonnées bancaires ne transitent jamais par NOUT.' },
    { title: 'Entre Réunionnais',          desc: 'Une communauté 974 : profils à email vérifié, remise en main propre possible, et de vraies personnes près de chez toi.' },
    { title: 'Le vendeur reçoit son prix', desc: 'Pas de frais cachés côté vendeur : tu fixes ton prix, tu le touches en entier. Les frais de protection sont payés par l\'acheteur.' },
  ]

  const faq = [
    {
      q: 'C\'est quoi le code à 6 chiffres ?',
      a: 'C\'est ton code de sécurité unique, envoyé par email après ton paiement. Tu le donnes au vendeur UNIQUEMENT lors de la remise en main propre pour confirmer la transaction et libérer l\'argent.',
    },
    {
      q: 'Que se passe-t-il si je ne reçois pas mon article ?',
      a: 'Tant que tu n\'as pas confirmé la remise, ton argent reste bloqué. Si la remise n\'est pas confirmée dans les délais, tu es automatiquement remboursé. En cas de désaccord, l\'équipe NOUT tranche le litige.',
    },
    {
      q: 'Comment je reçois mon argent en tant que vendeur ?',
      a: 'Renseigne ton IBAN dans tes réglages. Dès que l\'acheteur confirme la remise, le virement part automatiquement sur ton compte bancaire.',
    },
    {
      q: 'Est-ce que NOUT prend une commission au vendeur ?',
      a: 'Non. Le vendeur reçoit son prix EN ENTIER, sans aucun frais déduit. Les frais de service (10 % + 0,25 €) sont payés par l\'acheteur sous forme de protection acheteur, en plus du prix.',
    },
    {
      q: 'C\'est vraiment sécurisé ?',
      a: 'Oui. Les paiements sont gérés par un prestataire certifié PCI-DSS, la norme de sécurité internationale pour les paiements en ligne. Tes données bancaires ne transitent jamais par NOUT, et l\'argent reste bloqué jusqu\'à la remise.',
    },
  ]

  return (
    <>
      {/* ── CSS animations injectées une fois ── */}
      <style>{`
        .hiw-fade { opacity: 0; transform: translateY(24px); transition: opacity 500ms ease, transform 500ms ease; }
        .hiw-visible { opacity: 1; transform: translateY(0); }
      `}</style>

      {/* ── SECTION 1 — HERO (sous la navbar transparente) ── */}
      <section
        ref={heroRef}
        className="bg-[#0A0F2C] px-4 pt-[calc(64px+env(safe-area-inset-top)+2.5rem)] lg:pt-[calc(64px+2.75rem+env(safe-area-inset-top)+2.5rem)] pb-16 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(14,140,130,0.14) 0%, transparent 70%)',
        }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0E8C82] animate-pulse" />
            <span className="text-white/70 text-xs font-semibold tracking-wide uppercase">Marketplace 974</span>
          </div>
          <h1 className="font-title font-extrabold text-[28px] sm:text-[38px] text-white leading-[1.15] mb-4">
            Acheter et vendre,<br />en toute confiance
          </h1>
          <p className="text-white/65 text-[15px] sm:text-base leading-relaxed max-w-lg mx-auto">
            Sur NOUT, ton argent est bloqué et protégé à chaque transaction. Le vendeur n'est payé
            qu'une fois l'article bien reçu.
          </p>
        </div>
      </section>

      {/* ── SECTION 2 — ACHETEURS (fond clair) ── */}
      <section className="bg-[#F8FAFF] px-4 py-14">
        <div className="max-w-xl mx-auto">
          <div className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7A99] mb-1">Pour les acheteurs</p>
            <h2 className="font-title font-extrabold text-[24px] text-[#0A0F2C]">Tu achètes</h2>
          </div>
          <div>
            {buyerSteps.map((s, i) => (
              <Step key={i} n={i + 1} {...s} last={i === buyerSteps.length - 1} light />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — VENDEURS (fond sombre) ── */}
      <section className="bg-[#0A0F2C] px-4 py-14">
        <div className="max-w-xl mx-auto">
          <div className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45 mb-1">Pour les vendeurs</p>
            <h2 className="font-title font-extrabold text-[24px] text-white">Tu vends</h2>
          </div>
          <div>
            {sellerSteps.map((s, i) => (
              <Step key={i} n={i + 1} {...s} last={i === sellerSteps.length - 1} light={false} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — GARANTIES ── */}
      <section className="bg-[#EEF3F8] px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7A99] mb-1">Ce qui te protège</p>
            <h2 className="font-title font-extrabold text-[24px] text-[#0A0F2C]">Tes garanties NOUT</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guarantees.map((g, i) => (
              <GuaranteeCard key={i} {...g} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — FAQ ── */}
      <section className="bg-white px-4 py-14">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-title font-extrabold text-[24px] text-[#0A0F2C] mb-8 text-center">
            Questions fréquentes
          </h2>
          <div className="bg-[#F8FAFF] rounded-2xl px-6 divide-y divide-[#E8EFF5]">
            {faq.map((item, i) => (
              <FaqItem key={i} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — CTA FINAL ── */}
      <section className="px-4 py-16 text-center"
        style={{ background: 'linear-gradient(135deg, #0A0F2C 0%, #14306F 55%, #0E5E78 100%)' }}
      >
        <div className="max-w-lg mx-auto">
          <h2 className="font-title font-extrabold text-[24px] sm:text-[30px] text-white mb-3">
            Prêt à commencer ?
          </h2>
          <p className="text-white/60 text-sm mb-8">
            Rejoins les Réunionnais qui achètent et vendent en confiance sur NOUT.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/recherche')}
              className="px-8 py-3.5 bg-white text-[#14306F] rounded-full font-semibold text-sm hover:bg-white/90 transition-opacity shadow-lg"
            >
              Voir les annonces
            </button>
            <button
              onClick={() => navigate('/publier')}
              className="px-8 py-3.5 bg-[#0E8C82] text-white rounded-full font-semibold text-sm hover:bg-[#0B716A] transition-colors shadow-lg"
            >
              Vendre maintenant
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
