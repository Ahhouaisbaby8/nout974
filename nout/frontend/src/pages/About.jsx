import { Link } from 'react-router-dom'
import { Handshake, Leaf, MapPin, Mail } from 'lucide-react'

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mx-auto mb-4 text-pink-400">
          <Leaf size={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-nout-dark">À propos de NOUT</h1>
        <p className="text-gray-500 mt-3 text-base leading-relaxed">
          La marketplace 100 % réunionnaise pour acheter et vendre de seconde main entre particuliers.
        </p>
      </div>

      {/* Notre mission */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <h2 className="text-xl font-bold text-nout-dark mb-3">Notre mission</h2>
        <p className="text-gray-600 leading-relaxed">
          NOUT est née d'une idée simple : créer un espace de confiance, fait <strong>par les Réunionnais, pour les Réunionnais</strong>.
          Ici, pas de frais d'importation, pas de délais d'attente interminables — juste des voisins qui échangent des objets qui ont encore de la valeur, tous basés sur l'île.
        </p>
      </section>

      {/* Nos valeurs */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <h2 className="text-xl font-bold text-nout-dark mb-4">Nos valeurs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Handshake size={28} />, titre: 'Confiance', texte: 'Paiement sécurisé, profils vérifiés et messagerie intégrée pour échanger en toute sécurité.' },
            { icon: <Leaf size={28} />,      titre: 'Économie circulaire', texte: "Donner une seconde vie aux objets, c'est bon pour le porte-monnaie et pour l'environnement." },
            { icon: <MapPin size={28} />,    titre: 'Local', texte: '100 % Réunion. Toutes les annonces sont publiées par des habitants de notre île.' },
          ].map(({ icon, titre, texte }) => (
            <div key={titre} className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="flex justify-center mb-2 text-nout-primary">{icon}</div>
              <p className="font-bold text-nout-dark text-sm">{titre}</p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">{texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-5">
        <h2 className="text-xl font-bold text-nout-dark mb-4">Comment ça marche ?</h2>
        <div className="flex flex-col gap-4">
          {[
            { num: '1', titre: 'Crée ton compte', texte: 'Inscription gratuite avec ton email ou ton compte Google.' },
            { num: '2', titre: 'Publie une annonce', texte: 'Ajoute des photos, décris ton article et fixe ton prix — en moins de 2 minutes.' },
            { num: '3', titre: 'Échange en toute sécurité', texte: 'Discute via la messagerie intégrée, paie en ligne ou rencontre-toi en vrai.' },
          ].map(({ num, titre, texte }) => (
            <div key={num} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-nout-primary text-white flex items-center justify-center font-extrabold flex-shrink-0">
                {num}
              </div>
              <div>
                <p className="font-semibold text-nout-dark">{titre}</p>
                <p className="text-sm text-gray-500 mt-0.5">{texte}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-bold text-nout-dark mb-3">Nous contacter</h2>
        <div className="flex flex-col gap-2 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <Mail size={16} className="text-nout-primary flex-shrink-0" />
            <a href="mailto:contact@nout.re" className="text-nout-primary hover:underline">contact@nout.re</a>
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={16} className="text-nout-primary flex-shrink-0" />
            Saint-Denis, La Réunion (974)
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center">
        <Link to="/" className="btn-primary px-10 py-3 text-base">
          Découvrir les annonces
        </Link>
      </div>

    </div>
  )
}
