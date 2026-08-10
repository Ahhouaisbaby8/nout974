import { Link } from 'react-router-dom'

// ─── NOUT Pro : la page qui explique l'offre ────────────────────────────────────────
// Elle dit ce qui est décidé et ce qui ne l'est pas. Pas de prix inventé : le palier
// Pro+ et le prix d'un domaine attendent une décision, et c'est écrit noir sur blanc
// plutôt que rempli avec un chiffre qui deviendrait une promesse.

const INCLUS = [
  'Ta boutique à ta marque, sur nout.re/tonnom',
  'Paiement sécurisé, protection acheteur et litiges gérés par NOUT',
  'Livraison 974 : point relais dès 4 €, domicile, main propre',
  'CGV, mentions légales, confidentialité et retours générés et tenus à jour',
  'Tes produits visibles aussi dans le marketplace NOUT',
  'Éditeur complet : textes, photos, couleurs, rayons, mise en page',
]

function Check() {
  return (
    <span className="w-4 h-4 rounded-full bg-[#EAF5F3] flex items-center justify-center flex-shrink-0 mt-0.5">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0E8C82" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
    </span>
  )
}

export default function ProOffer() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <title>Tarifs NOUT Pro — boutique en ligne à La Réunion</title>
      <meta name="description" content="Ce que coûte une boutique NOUT Pro : gratuite dès 10 ventes par mois, sinon un abonnement mensuel. Paiement, livraison 974 et conformité inclus." />

      <div className="text-center mb-8">
        <p className="font-title font-extrabold text-lg text-nout-texte">NOUT <span className="font-normal text-gray-400">Pro</span></p>
        <h1 className="font-title text-[26px] font-bold text-nout-texte mt-2">Ta boutique est gratuite si tu vends</h1>
        <p className="text-[14px] text-gray-500 mt-2 max-w-[52ch] mx-auto leading-relaxed">
          Le principe est simple : à partir de 10 ventes dans le mois, ta boutique ne te coûte rien.
          En dessous, elle est facturée. Aucun engagement, tu peux arrêter quand tu veux.
        </p>
        <p className="inline-block mt-4 text-[11.5px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          Ouverture prochaine — les prix ci-dessous sont ceux prévus au lancement
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {/* Palier de base */}
        <div className="rounded-2xl border border-nout-turquoise bg-white p-6 shadow-nout-md">
          <p className="text-[11px] font-bold uppercase tracking-wide text-nout-turquoise">Boutique</p>
          <p className="font-title text-[30px] font-bold text-nout-texte mt-1 leading-none">
            0 €<span className="text-[15px] font-semibold text-gray-400"> dès 10 ventes / mois</span>
          </p>
          <p className="text-[13px] text-gray-500 mt-1.5">
            En dessous de 10 ventes sur le mois : <b className="text-nout-texte">9,99 € pour ce mois-là</b>.
            Une commission s'applique sur chaque vente, comme pour tout vendeur NOUT.
          </p>
          <ul className="flex flex-col gap-2 mt-4">
            {INCLUS.map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[13px] text-nout-texte leading-snug"><Check />{t}</li>
            ))}
          </ul>
          <Link to="/boutique-creer" className="btn-primary w-full mt-5 text-center block">Créer ma boutique</Link>
          <p className="text-[11.5px] text-gray-400 mt-2 text-center">Gratuit à créer. Le SIRET n'est demandé que pour publier.</p>
        </div>

        {/* Palier domaine */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Pro+ · ton propre nom de domaine</p>
          <p className="font-title text-[30px] font-bold text-nout-texte mt-1 leading-none">
            Prix<span className="text-[15px] font-semibold text-gray-400"> à annoncer</span>
          </p>
          <p className="text-[13px] text-gray-500 mt-1.5">
            Ta boutique répond sur <b className="text-nout-texte">tamarque.re</b> au lieu de nout.re/tamarque,
            et la mention « Propulsé par NOUT » disparaît de la vitrine.
          </p>
          <ul className="flex flex-col gap-2 mt-4">
            {['Ton domaine, branché et renouvelé par NOUT',
              'Vitrine sans la mention NOUT',
              'Pixel publicitaire Meta / TikTok sur ta boutique',
              'Le tunnel de paiement reste identifié NOUT'].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-[13px] text-nout-texte leading-snug"><Check />{t}</li>
            ))}
          </ul>
          <p className="text-[12px] text-gray-500 leading-relaxed mt-4 rounded-lg bg-gray-50 px-3 py-2.5">
            Le paiement garde l'identité NOUT même en Pro+ : c'est ce qui rassure l'acheteur au moment
            de sortir sa carte, et la loi impose de dire qui encaisse.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-8">
        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">On la monte pour toi</p>
        <h2 className="font-title text-[19px] font-bold text-nout-texte mt-1">Boutique clé en main — 399 €</h2>
        <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed max-w-[70ch]">
          Une prestation ponctuelle, si tu n'as ni le temps ni l'envie : on écrit tes textes, on prépare
          tes photos, on installe ton catalogue et on règle ton référencement local. Tu récupères une
          boutique prête à vendre. Indépendant de ton abonnement.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-title text-[17px] font-bold text-nout-texte mb-3">Les questions qu'on nous pose</h2>
        <div className="flex flex-col gap-3.5">
          {[
            ['Qu\'est-ce qui compte comme une vente ?',
             "Une commande payée et non annulée, sur le mois civil. Le compteur repart à zéro le 1er."],
            ['Comment est prélevé l\'abonnement ?',
             "Il est retenu sur un versement à venir quand c'est possible, sinon prélevé. En cas d'échec, ta boutique est mise en pause — mais tes produits restent visibles sur le marketplace, tu ne perds pas tes ventes."],
            ['Je peux arrêter quand je veux ?',
             "Oui, sans préavis. Tes annonces et ton compte NOUT restent, seule la vitrine de marque s'éteint."],
            ['Il me faut un SIRET ?',
             "Pour publier, oui : dès qu'on vend ce qu'on fabrique ou qu'on achète pour revendre, l'activité est professionnelle. Créer et personnaliser sa boutique ne demande rien."],
            ['Combien de boutiques par personne ?',
             "Deux. Au-delà, écris au support : on relève la limite si l'activité le justifie."],
          ].map(([q, a]) => (
            <div key={q}>
              <p className="text-[13.5px] font-semibold text-nout-texte">{q}</p>
              <p className="text-[13px] text-gray-500 leading-relaxed mt-0.5">{a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-center mt-8 flex-wrap">
        <Link to="/boutique-templates" className="btn-secondary !px-6">Voir les templates</Link>
        <Link to="/boutique-creer" className="btn-primary !px-6">Créer ma boutique</Link>
      </div>
    </div>
  )
}
