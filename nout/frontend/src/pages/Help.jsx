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
    a: "Le paiement en ligne est sécurisé par un prestataire certifié PCI-DSS. Le vendeur reçoit son prix en entier. L'acheteur paie le prix affiché, plus une protection acheteur de 10 % + 0,25 € (et les frais de port s'il choisit une livraison) qui couvre le traitement et la sécurisation de la transaction.",
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
