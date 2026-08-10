import { Link } from 'react-router-dom'

// ─── NOUT Pro : ce que ça coûte, ce que ça donne ───────────────────────────────────
// Parti pris : une page sobre qui tient en un écran, et le détail qui se déplie au clic
// pour qui veut vraiment savoir. On n'affiche aucun prix qui n'est pas tranché — un
// chiffre sur cette page devient une promesse.

// Repli natif <details> : accessible au clavier, aucun script, aucun état à gérer.
function Repli({ titre, resume, children }) {
  return (
    <details className="group border-b border-gray-100 last:border-0">
      <summary className="flex items-start gap-3 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-nout-texte">{titre}</span>
          {resume && <span className="block text-[12.5px] text-gray-400 mt-0.5 leading-snug">{resume}</span>}
        </span>
        <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 text-gray-300 group-open:rotate-180 transition-transform">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </summary>
      <div className="pb-4 pr-8 text-[13px] text-gray-500 leading-relaxed">{children}</div>
    </details>
  )
}

function Section({ titre, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-1">{titre}</h2>
      <div className="border-t border-gray-100">{children}</div>
    </section>
  )
}

export default function ProOffer() {
  return (
    <div className="max-w-[680px] mx-auto px-5 py-14">
      <title>Tarifs NOUT Pro — boutique en ligne à La Réunion</title>
      <meta name="description" content="Une boutique NOUT Pro est gratuite à partir de 10 ventes par mois. Paiement sécurisé, livraison 974 et conformité inclus." />

      {/* ── en-tête ── */}
      <header className="mb-12">
        <p className="font-title text-[15px] font-semibold text-nout-texte">
          NOUT <span className="font-normal text-gray-400">Pro</span>
        </p>
        <h1 className="font-title text-[30px] sm:text-[34px] font-semibold text-nout-texte leading-[1.15] mt-5 tracking-tight">
          Gratuite à partir de<br />dix ventes par mois.
        </h1>
        <p className="text-[14.5px] text-gray-500 leading-relaxed mt-4 max-w-[46ch]">
          En dessous, la boutique est facturée pour le mois. Aucun engagement, aucune installation,
          et tout ce qui fait vendre — paiement, livraison, conformité — est déjà branché.
        </p>
        <div className="flex gap-2.5 flex-wrap mt-7">
          <Link to="/boutique-creer" className="btn-primary !px-6">Créer ma boutique</Link>
          <Link to="/boutique-templates" className="btn-secondary !px-6">Voir les modèles</Link>
        </div>
        <p className="text-[12px] text-gray-400 mt-3">
          Gratuit à créer et à essayer. Le SIRET n'est demandé qu'au moment de publier.
        </p>
      </header>

      {/* ── les deux formules ── */}
      <div className="grid sm:grid-cols-2 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden mb-3">
        <div className="bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Boutique</p>
          <p className="font-title text-[32px] font-semibold text-nout-texte leading-none mt-3 tracking-tight">0 €</p>
          <p className="text-[12.5px] text-gray-400 mt-1.5">le mois où tu fais 10 ventes ou plus</p>
          <p className="text-[13px] text-nout-texte mt-4 leading-relaxed">
            Sinon <b className="font-semibold">9,99 €</b> pour ce mois-là.
            Une commission s'applique sur chaque vente, comme pour tout vendeur NOUT.
          </p>
        </div>
        <div className="bg-white p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Pro+ · ton nom de domaine</p>
          <p className="font-title text-[32px] font-semibold text-gray-300 leading-none mt-3 tracking-tight">—</p>
          <p className="text-[12.5px] text-gray-400 mt-1.5">prix annoncé à l'ouverture</p>
          <p className="text-[13px] text-nout-texte mt-4 leading-relaxed">
            Ta boutique répond sur <b className="font-semibold">tamarque.re</b>, et la mention
            « Propulsé par NOUT » disparaît de la vitrine.
          </p>
        </div>
      </div>
      <p className="text-[12px] text-gray-400 leading-relaxed mb-12">
        L'abonnement est décompté à la fin du mois, jamais d'avance : impossible de savoir avant
        la fin du mois si tu as passé les dix ventes.
      </p>

      {/* ── ce que ça donne, détail au clic ── */}
      <Section titre="Ta vitrine">
        <Repli titre="Ton adresse : nout.re/tonnom" resume="Ton nom, pas un numéro de profil">
          Tu choisis ton adresse à la création. Elle est unique et te reste tant que ta boutique existe.
          Change-la le moins possible une fois que tu communiques dessus : les anciens liens partagés
          par tes clients cesseraient de fonctionner. Avec Pro+, cette adresse devient ton propre domaine.
        </Repli>
        <Repli titre="Un éditeur qui touche à tout" resume="Textes, photos, couleurs, rayons, mise en page">
          Tous les textes se réécrivent — la barre d'annonce, le grand titre, ta présentation, le bouton,
          le titre de chaque section. Les photos se changent, se remplacent par les tiennes et se
          déplacent parmi sept mises en page. Les couleurs vont jusqu'au détail : couleur principale,
          secondaire, fond, texte et cartes, avec un contrôle de lisibilité qui te prévient si le
          contraste devient trop faible. Tes rayons se renomment et se réordonnent. Et tout est
          annulable : une marche arrière, comme dans un traitement de texte.
        </Repli>
        <Repli titre="Vingt-et-un modèles de départ" resume="Boutiques, portfolios, entreprises, page de liens">
          Tu pars d'un modèle déjà rempli plutôt que d'une page blanche, puis tu changes ce que tu veux.
          Changer de modèle en cours de route garde tes textes et tes photos.
        </Repli>
        <Repli titre="Jusqu'à huit photos par produit" resume="Avec la principale que tu choisis">
          Les fiches montrent plusieurs angles, et la deuxième photo apparaît au survol dans la grille.
          Tu décides laquelle est la principale en déplaçant les vignettes.
        </Repli>
      </Section>

      <Section titre="Vendre et être payé">
        <Repli titre="Paiement sécurisé, par carte" resume="Stripe, authentification bancaire, aucun numéro chez nous">
          Tes clients paient par carte via Stripe, avec l'authentification de leur banque. Aucun numéro
          de carte ne transite ni ne dort chez NOUT. Le prix affiché est le prix total, protection
          comprise : la loi interdit de faire apparaître les frais seulement à la fin.
        </Repli>
        <Repli titre="Tu es payé après la livraison" resume="Environ 48 h après réception confirmée">
          L'argent du client est conservé en sécurité par NOUT jusqu'à ce que la commande soit arrivée.
          Environ 48 heures après la livraison confirmée, ton dû bascule dans « Mon argent », et tu le
          vires sur ton compte bancaire quand tu veux. Ce mécanisme protège l'acheteur, et c'est aussi
          ce qui le décide à commander chez un vendeur qu'il ne connaît pas.
        </Repli>
        <Repli titre="Les litiges ne sont pas ton problème" resume="NOUT instruit et tranche">
          Colis perdu, article non conforme, client injoignable : NOUT reçoit le signalement, demande
          les preuves aux deux parties et tranche. Tu n'as pas à gérer un remboursement toi-même.
        </Repli>
        <Repli titre="Les clients peuvent proposer leur prix" resume="Offre et contre-offre, débrayable">
          Le mécanisme d'offre de NOUT fonctionne aussi sur ta boutique. La protection est recalculée
          sur le prix réellement accepté.
        </Repli>
      </Section>

      <Section titre="Livraison à La Réunion">
        <Repli titre="Point relais dès 4 €, domicile, ou main propre" resume="Réseau 974 et Chronopost">
          Le client choisit au moment de payer. Le port est recalculé côté serveur, jamais laissé au
          hasard du navigateur.
        </Repli>
        <Repli titre="Ton étiquette est générée" resume="Tu imprimes, tu déposes">
          Pas de compte transporteur à ouvrir, pas de contrat à négocier. L'étiquette et le bordereau
          se téléchargent depuis ta commande, et le suivi remonte tout seul.
        </Repli>
      </Section>

      <Section titre="En règle dès le premier jour">
        <Repli titre="CGV, mentions légales, confidentialité, retours" resume="Générées, tenues à jour, non réécrivables">
          Ces pages sont produites par NOUT et maintenues quand la réglementation bouge. Tu ne peux pas
          les réécrire, et c'est volontaire : des conditions maison qui contrediraient le paiement
          protégé se retourneraient contre toi le jour d'un litige. Tu personnalises en revanche ce qui
          t'appartient — tes délais d'expédition, tes conditions de retour au-delà du minimum légal.
        </Repli>
        <Repli titre="L'encadré des garanties, dans la bonne version" resume="Selon que le produit est neuf ou d'occasion">
          Tu indiques l'état à la création du produit, et la fiche affiche l'encadré légal correspondant.
          C'est une obligation d'affichage que la plupart des petits sites oublient.
        </Repli>
        <Repli titre="Le SIRET, demandé pour publier" resume="Pas pour créer ni pour essayer">
          Créer et personnaliser ta boutique ne demande rien. Pour la rendre publique, ton numéro
          d'immatriculation est nécessaire : dès qu'on vend ce qu'on fabrique ou qu'on achète pour
          revendre, l'activité est professionnelle au sens de la loi. Si tu n'en as pas encore,
          l'immatriculation en micro-entreprise se fait en ligne, gratuitement, en une quinzaine de
          minutes.
        </Repli>
      </Section>

      <Section titre="Être trouvé">
        <Repli titre="Tes produits aussi sur le marketplace NOUT" resume="Avec un repère « Boutique »">
          Ce qui est dans ta boutique apparaît dans la recherche et les catégories de NOUT. Un visiteur
          qui cherchait autre chose tombe sur ton produit, clique, et arrive chez toi. Ta boutique
          amène tes clients, NOUT t'en amène d'autres.
        </Repli>
        <Repli titre="Prêt pour Google et les réseaux" resume="Titre, description, plan du site, aperçu de partage">
          Le titre et la description de chaque page sont composés pour la recherche locale, le plan du
          site est envoyé, et un lien partagé sur WhatsApp ou Facebook affiche ton visuel et ton nom
          au lieu d'une adresse nue.
        </Repli>
        <Repli titre="Tu peux faire de la publicité dessus" resume="Ton lien, ta boutique, ton pixel en Pro+">
          Rien n'empêche de sponsoriser un lien vers ta boutique. Avec Pro+, ton pixel Meta ou TikTok
          s'installe sur ta vitrine pour mesurer tes campagnes.
        </Repli>
      </Section>

      <Section titre="Si tu préfères qu'on s'en occupe">
        <Repli titre="Boutique clé en main — 399 €" resume="Une fois, indépendant de l'abonnement">
          On écrit tes textes, on prépare tes photos, on installe ton catalogue et on règle ton
          référencement local. Tu récupères une boutique prête à vendre, et tu la modifies ensuite
          toi-même comme n'importe quelle autre.
        </Repli>
      </Section>

      <Section titre="Questions">
        <Repli titre="Qu'est-ce qui compte comme une vente ?">
          Une commande payée que personne n'a annulée, sur le mois civil. Les commandes remboursées ou
          en litige ne comptent pas. Le compteur repart à zéro le 1er, et tu le suis en direct dans ton
          espace pro.
        </Repli>
        <Repli titre="Comment l'abonnement est-il prélevé ?">
          Il est retenu sur un versement à venir quand c'est possible — c'est gratuit et ça ne peut pas
          échouer. Sinon il est prélevé. En cas d'échec, ta vitrine est mise en pause, mais tes produits
          restent visibles sur le marketplace : tu ne perds pas tes ventes pendant ce temps.
        </Repli>
        <Repli titre="Je peux arrêter quand je veux ?">
          Oui, sans préavis. Tes annonces, ton argent et ton compte NOUT restent : seule la vitrine de
          marque s'éteint.
        </Repli>
        <Repli titre="Combien de boutiques par personne ?">
          Deux. Au-delà, écris au support : la limite est relevée au cas par cas quand l'activité le
          justifie.
        </Repli>
      </Section>

      <div className="border-t border-gray-100 pt-8 text-center">
        <p className="text-[13.5px] text-gray-500 mb-4">Essaie sans rien fournir. Tu ne publies que si ça te plaît.</p>
        <Link to="/boutique-creer" className="btn-primary !px-7">Créer ma boutique</Link>
        <p className="text-[11.5px] text-gray-400 mt-4">
          Ouverture prochaine — les conditions ci-dessus sont celles prévues au lancement.
        </p>
      </div>
    </div>
  )
}
