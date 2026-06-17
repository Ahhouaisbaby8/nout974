import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-nout-nuit text-white mt-16 pb-16 md:pb-0">

      {/* Ligne accent turquoise */}
      <div className="h-[3px] bg-nout-accent" />

      <div className="max-w-7xl mx-auto px-4 py-12">

        {/* ── GRILLE 4 COLONNES ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-10 mb-10">

          {/* Colonne identité */}
          <div>
            <div className="flex flex-col leading-none mb-3">
              <span className="font-title font-black text-[26px] text-white tracking-[0.2em] leading-none">
                NOUT
              </span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C4B4] flex-shrink-0" />
                <span className="font-title font-semibold text-[8px] tracking-[0.28em] text-[#00C4B4] uppercase leading-none">
                  La Réunion 974
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C4B4] flex-shrink-0" />
              </div>
            </div>
            <p className="text-sm text-white/60 italic font-title leading-relaxed">
              La marketplace du 974
            </p>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-white/40">contact@nout.re</p>
              <p className="text-xs text-white/40">Saint-Denis, La Réunion 974</p>
            </div>
          </div>

          {/* Colonne navigation */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              <li><Link to="/"         className="text-sm text-white/60 hover:text-white transition-colors">Accueil</Link></li>
              <li><Link to="/recherche" className="text-sm text-white/60 hover:text-white transition-colors">Annonces</Link></li>
              <li><Link to="/a-propos" className="text-sm text-white/60 hover:text-white transition-colors">À propos</Link></li>
              <li><Link to="/aide"              className="text-sm text-white/60 hover:text-white transition-colors">Aide & Contact</Link></li>
              <li><Link to="/comment-ca-marche" className="text-sm text-white/60 hover:text-white transition-colors">Comment ça marche</Link></li>
              <li><Link to="/publier"  className="text-sm text-white/60 hover:text-white transition-colors">Publier une annonce</Link></li>
            </ul>
          </div>

          {/* Colonne légal */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-4">
              Légal
            </h4>
            <ul className="space-y-2.5">
              <li><Link to="/legal/cgu"                   className="text-sm text-white/60 hover:text-white transition-colors">CGU</Link></li>
              <li><Link to="/legal/cgv"                   className="text-sm text-white/60 hover:text-white transition-colors">CGV</Link></li>
              <li><Link to="/legal/confidentialite"       className="text-sm text-white/60 hover:text-white transition-colors">Confidentialité & RGPD</Link></li>
              <li><Link to="/legal/cookies"               className="text-sm text-white/60 hover:text-white transition-colors">Politique cookies</Link></li>
              <li><Link to="/legal/mentions"              className="text-sm text-white/60 hover:text-white transition-colors">Mentions légales</Link></li>
              <li><Link to="/legal/charte-bonne-conduite" className="text-sm text-white/60 hover:text-white transition-colors">Charte de conduite</Link></li>
              <li><Link to="/legal/reglement-catalogue"   className="text-sm text-white/60 hover:text-white transition-colors">Règlement catalogue</Link></li>
            </ul>
          </div>

          {/* Colonne compte */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-white/40 mb-4">
              Mon compte
            </h4>
            <ul className="space-y-2.5">
              <li><Link to="/connexion"    className="text-sm text-white/60 hover:text-white transition-colors">Connexion</Link></li>
              <li><Link to="/inscription"  className="text-sm text-white/60 hover:text-white transition-colors">Inscription</Link></li>
              <li><Link to="/favoris"      className="text-sm text-white/60 hover:text-white transition-colors">Mes favoris</Link></li>
              <li><Link to="/commandes"    className="text-sm text-white/60 hover:text-white transition-colors">Mes commandes</Link></li>
              <li><Link to="/installer-app" className="text-sm text-white/60 hover:text-white transition-colors">📲 Installer l'app</Link></li>
            </ul>
          </div>

        </div>

        {/* ── PIED DE PAGE ── */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} NOUT — Marketplace 974. Tous droits réservés.
          </p>
          <p className="text-xs text-white/30">
            Paiements certifiés <span className="text-white/50">PCI-DSS</span>
          </p>
        </div>

      </div>
    </footer>
  )
}
