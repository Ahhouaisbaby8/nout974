import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-nout-dark text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

          <div>
            <h4 className="text-lg font-bold mb-4 text-nout-primary">NOUT</h4>
            <p className="text-sm text-gray-400">Marketplace de seconde main pour La Réunion 974</p>
            <p className="text-xs text-gray-500 mt-3">contact@nout974.re</p>
            <p className="text-xs text-gray-500">Saint-Denis, Réunion 974</p>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-300">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/"         className="text-gray-400 hover:text-nout-primary transition-colors">Accueil</Link></li>
              <li><Link to="/a-propos" className="text-gray-400 hover:text-nout-primary transition-colors">À propos</Link></li>
              <li><Link to="/aide"     className="text-gray-400 hover:text-nout-primary transition-colors">Aide & Contact</Link></li>
              <li><Link to="/publier"  className="text-gray-400 hover:text-nout-primary transition-colors">Publier une annonce</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-300">Légal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/legal/cgu"            className="text-gray-400 hover:text-nout-primary transition-colors">CGU</Link></li>
              <li><Link to="/legal/cgv"            className="text-gray-400 hover:text-nout-primary transition-colors">CGV</Link></li>
              <li><Link to="/legal/confidentialite" className="text-gray-400 hover:text-nout-primary transition-colors">Confidentialité & RGPD</Link></li>
              <li><Link to="/legal/cookies"        className="text-gray-400 hover:text-nout-primary transition-colors">Politique cookies</Link></li>
              <li><Link to="/legal/mentions"       className="text-gray-400 hover:text-nout-primary transition-colors">Mentions légales</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-300">Mon compte</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/connexion"   className="text-gray-400 hover:text-nout-primary transition-colors">Connexion</Link></li>
              <li><Link to="/inscription" className="text-gray-400 hover:text-nout-primary transition-colors">Inscription</Link></li>
              <li><Link to="/favoris"     className="text-gray-400 hover:text-nout-primary transition-colors">Mes favoris</Link></li>
              <li><Link to="/commandes"   className="text-gray-400 hover:text-nout-primary transition-colors">Mes commandes</Link></li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-700 pt-8 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} NOUT — Marketplace 974. Tous droits réservés.</p>
          <p className="mt-1">Paiements sécurisés par Stripe · SIRET : [à compléter]</p>
        </div>
      </div>
    </footer>
  )
}
