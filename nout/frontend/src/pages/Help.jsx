import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb, ShoppingBag, Camera, MessageCircle, Mail } from 'lucide-react'

const FAQ = [
  {
    q: "Comment créer un compte ?",
    a: "Clique sur \"S'inscrire\" en haut de la page. Tu peux t'inscrire avec ton adresse email ou directement avec ton compte Google en un seul clic.",
  },
  {
    q: "Comment publier une annonce ?",
    a: "Une fois connecté, clique sur le bouton \"Publier\" dans la navigation. Ajoute jusqu'à 5 photos, décris ton article, choisis une catégorie, un état et un prix, puis valide. Ton annonce sera visible immédiatement après modération.",
  },
  {
    q: "Comment contacter un vendeur ?",
    a: "Sur la page d'une annonce, clique sur \"Contacter le vendeur\". La conversation s'ouvre dans ta messagerie. Tu dois être connecté pour envoyer un message.",
  },
  {
    q: "Comment fonctionne le paiement ?",
    a: "Le paiement en ligne est sécurisé par un prestataire certifié PCI-DSS. Le vendeur reçoit son prix en entier. L'acheteur paie le prix affiché, plus une protection acheteur de 10 % + 0,25 € (et les frais de port s'il choisit une livraison) qui couvre le traitement et la sécurisation de la transaction. Point important : l'argent est bloqué en sécurité et n'est versé au vendeur qu'une fois la transaction confirmée — ni l'acheteur ni le vendeur ne peut « prendre l'argent et disparaître ».",
  },
  {
    q: "Comment se passe une remise en main propre ?",
    a: "C'est le mode le plus simple, et gratuit. L'acheteur paie et reçoit un code à 6 chiffres. Au rendez-vous, il remet ce code au vendeur, qui le saisit sur NOUT : le paiement est alors libéré aussitôt. Conseil vendeur important : saisis toujours le code au moment de la remise, AVANT de laisser partir l'objet — c'est ta garantie d'être payé. Conseil acheteur : ne donne ton code qu'après avoir vérifié l'article, et privilégie un lieu public pour le rendez-vous.",
  },
  {
    q: "Comment se passe la livraison, côté vendeur ?",
    a: "Quand l'acheteur choisit la livraison, il paie l'article ET les frais de port au moment de la commande. Le vendeur reçoit l'adresse, emballe l'article, l'expédie via le transporteur puis renseigne le numéro de suivi. Bientôt, NOUT générera l'étiquette d'envoi automatiquement : tu n'auras qu'à déposer ton colis en point relais, sans contacter personne, et le paiement se libérera automatiquement à la livraison. Garde toujours ta preuve d'envoi.",
  },
  {
    q: "Que se passe-t-il si la remise n'est pas confirmée ?",
    a: "Si le code n'est pas saisi dans les 7 jours, l'acheteur est remboursé automatiquement (ça le protège s'il a payé sans jamais recevoir l'article, ou si le rendez-vous n'a pas eu lieu). C'est pour cela qu'en tant que vendeur, tu dois saisir le code au moment même de la remise. Si tu as bien remis l'objet mais que l'acheteur refuse de donner son code, écris-nous à contact@nout.re avec tes preuves : l'argent reste bloqué et nous examinons le litige.",
  },
  {
    q: "J'ai un problème avec un colis (jamais reçu, vide, abîmé)",
    a: "Ton paiement est protégé : l'argent reste bloqué tant que ce n'est pas résolu, le vendeur n'est pas payé pendant ce temps. Ne confirme pas la réception et signale le problème sous 48 h à contact@nout.re, avec des photos (le colis et son contenu) et, si possible, une vidéo de déballage. Nous examinons le suivi du transporteur, la preuve d'envoi et les photos, puis nous tranchons : remboursement ou libération du paiement. Si le suivi indique « perdu » ou « non livré », le transporteur est responsable et tu es remboursé (avec l'assurance colis si elle a été souscrite).",
  },
  {
    q: "Comment je reçois l'argent de mes ventes ?",
    a: "L'argent de tes ventes s'accumule dans ton porte-monnaie, dans « Mon argent ». Pour le retirer sur ton compte bancaire, tu vérifies ton identité une seule fois (pièce d'identité + IBAN) auprès de Stripe, notre prestataire de paiement — pas de SIRET pour un particulier. Ensuite, tu vires ton solde vers ta banque quand tu veux, en un clic.",
  },
  {
    q: "Vendre sur NOUT peut-il me poser un problème (impôts, statut) ?",
    a: "Vends l'esprit tranquille. Tes paiements passent par Stripe (leader mondial du paiement) : c'est ce qui sécurise chaque transaction et te protège contre la fraude. Vendre tes propres affaires d'occasion, c'est de la vente entre particuliers : non imposable et sans immatriculation, quel que soit le montant. Le libellé « Entrepreneur individuel » affiché par Stripe est juste une étiquette technique pour un particulier — ça ne t'inscrit nulle part et ne crée aucune obligation. Comme sur toutes les grandes plateformes (Vinted, Leboncoin…), si tu dépasses 30 ventes ou 2 000 € de ventes dans l'année, tu reçois un récapitulatif de tes ventes et ces informations sont transmises à l'administration fiscale : une simple formalité de transparence, qui ne fait pas de toi un professionnel. La seule exception : acheter pour revendre régulièrement dans un but de profit est une activité pro, à déclarer. En cas de doute, un expert-comptable ou le service des impôts te renseignera.",
  },
  {
    q: "Puis-je modifier ou supprimer mon annonce ?",
    a: "Oui. Ouvre ton annonce et tu verras les boutons \"Modifier\" et \"Supprimer\" si tu en es le propriétaire. La suppression est définitive.",
  },
  {
    q: "Que faire en cas de problème avec un acheteur ou un vendeur ?",
    a: "Utilise le bouton \"Signaler\" sur le profil ou l'annonce concernée. Notre équipe de modération examine chaque signalement dans les plus brefs délais.",
  },
  {
    q: "Comment supprimer mon compte ?",
    a: "Pour supprimer ton compte, contacte-nous à contact@nout.re avec ton adresse email. Nous traiterons ta demande sous 48h conformément au RGPD.",
  },
  {
    q: "NOUT est-il gratuit ?",
    a: "La publication et la navigation sont entièrement gratuites. Le vendeur reçoit son prix en entier : les frais de service de 10 % + 0,25 € sont payés par l'acheteur, en plus du prix, sous forme de protection acheteur.",
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-nout-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex justify-between items-center py-4 text-left text-sm font-semibold text-nout-dark hover:text-nout-primary transition-colors"
      >
        {q}
        <span className={`ml-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function Help() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">

      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-yellow-50 flex items-center justify-center mx-auto mb-4 text-yellow-400">
          <Lightbulb size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-nout-dark">Centre d'aide</h1>
        <p className="text-gray-500 mt-2">Toutes les réponses à tes questions sur NOUT.</p>
      </div>

      {/* Guides rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { icon: <ShoppingBag size={28} />, titre: 'Acheter', desc: 'Recherche, contact et paiement sécurisé', lien: '/recherche' },
          { icon: <Camera size={28} />,      titre: 'Vendre', desc: "Publie une annonce en moins de 2 minutes", lien: '/publier' },
          { icon: <MessageCircle size={28} />, titre: 'Messages', desc: 'Échange avec acheteurs et vendeurs', lien: '/messages' },
        ].map(({ icon, titre, desc, lien }) => (
          <Link
            key={titre}
            to={lien}
            className="bg-white rounded-2xl shadow-sm p-5 text-center hover:shadow-md transition-shadow"
          >
            <div className="flex justify-center mb-2 text-nout-primary">{icon}</div>
            <p className="font-bold text-nout-dark text-sm">{titre}</p>
            <p className="text-xs text-gray-400 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {/* FAQ */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-nout-dark mb-4">Questions fréquentes</h2>
        {FAQ.map(({ q, a }) => (
          <FaqItem key={q} q={q} a={a} />
        ))}
      </section>

      {/* Contact */}
      <section className="bg-[#EAF6F5] rounded-2xl p-6 text-center">
        <div className="flex justify-center mb-2 text-nout-primary">
          <Mail size={28} />
        </div>
        <p className="font-bold text-nout-dark">Tu n'as pas trouvé ta réponse ?</p>
        <p className="text-sm text-gray-500 mt-1 mb-4">Écris-nous, on répond dans les 24 h.</p>
        <a
          href="mailto:contact@nout.re"
          className="btn-primary px-8 py-3 text-sm inline-block"
        >
          Contacter l'équipe NOUT
        </a>
      </section>

    </div>
  )
}
