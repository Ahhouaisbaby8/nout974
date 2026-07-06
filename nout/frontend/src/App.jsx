import { lazy as reactLazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// ── Récupération auto d'un chunk périmé ────────────────────────────────────────────
// Quand un déploiement a lieu pendant qu'un onglet est ouvert, l'ancien index.html (en mémoire dans
// la SPA) référence des hashs de chunks qui n'existent plus sur le serveur → l'import() dynamique d'une
// route lazy renvoie 404. Sans garde, ça tombait dans l'ErrorBoundary = page « Quelque chose s'est mal
// passé » à chaque navigation vers une page pas encore chargée (typiquement /annonce/:id juste après une
// publication). Ici on RECHARGE pour récupérer le nouveau build → l'utilisateur ne voit jamais l'erreur.
//
// Garde anti-boucle SÛRE : compteur borné (MAX_RELOADS) qui survit au reload (sessionStorage), et qui
// n'est remis à zéro QUE lorsqu'un import réussit réellement (preuve que le build est sain) — jamais par
// une simple horloge. Ainsi, même si l'échec est LENT (mobile flaky, SW bloqué sur un shell périmé), on
// ne recharge jamais plus de MAX_RELOADS fois : au-delà on laisse l'ErrorBoundary afficher « Rafraîchir ».
const RELOAD_KEY = 'nout_chunk_reload'
const MAX_RELOADS = 2
function lazy(factory) {
  return reactLazy(() =>
    factory().then(
      (mod) => {
        try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* noop */ }
        return mod
      },
      (err) => {
        // On n'auto-recharge QUE si le compteur peut être lu ET incrémenté de façon persistante.
        // Si sessionStorage est indisponible (navigation privée stricte, quota, SecurityError…), un
        // reload ne pourrait jamais être compté → boucle infinie. Dans ce cas on s'abstient de
        // recharger : repli direct sur l'ErrorBoundary (bouton « Rafraîchir » manuel). Le setItem est
        // DANS le try, avant le reload → si l'écriture échoue, on ne recharge pas.
        try {
          const n = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
          if (n < MAX_RELOADS) {
            sessionStorage.setItem(RELOAD_KEY, String(n + 1))
            window.location.reload()
            return new Promise(() => {})   // le reload arrive : on ne rend jamais l'erreur
          }
        } catch { /* sessionStorage KO → pas d'auto-reload, l'ErrorBoundary prend le relais */ }
        throw err   // plafond atteint (ou stockage indispo) → repli sur l'ErrorBoundary
      },
    ),
  )
}

// Spinner de transition pendant le chargement d'une route splittée (lazy).
// min-height pour éviter tout saut de mise en page (CLS reste à 0).
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-nout-turquoise border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    // document.scrollingElement = html sur Chrome/Firefox, body sur iOS Safari
    // Assignation directe = toujours instantané, aucune animation
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
    }
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

import Header      from './components/layout/Header'
import Footer      from './components/layout/Footer'
import BottomNav   from './components/layout/BottomNav'
import CookieBanner from './components/legal/CookieBanner'
import MessageToast from './components/MessageToast'
import OrderToast   from './components/OrderToast'
import HelpBot      from './components/HelpBot'

// Accueil (page LCP) + Maintenance : chargés d'emblée (eager).
// TOUT le reste est code-splitté par route (lazy) → bundle initial bien plus léger
// (le gros du JS n'est téléchargé qu'à la navigation vers la page concernée).
import Home        from './pages/Home'
import Maintenance from './pages/Maintenance'

// Pages publiques
const ListingDetail = lazy(() => import('./pages/ListingDetail'))
const Search        = lazy(() => import('./pages/Search'))
const CategoryPage  = lazy(() => import('./pages/CategoryPage'))
const Profile       = lazy(() => import('./pages/Profile'))
const About         = lazy(() => import('./pages/About'))
const Help          = lazy(() => import('./pages/Help'))
const HowItWorks    = lazy(() => import('./pages/HowItWorks'))
const Creators      = lazy(() => import('./pages/Creators'))
const InstallApp    = lazy(() => import('./pages/InstallApp'))

// Auth
const Login          = lazy(() => import('./pages/Login'))
const Register       = lazy(() => import('./pages/Register'))
const CompteActive   = lazy(() => import('./pages/CompteActive'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))

// Pages privées
const CreateListing  = lazy(() => import('./pages/CreateListing'))
const Checkout       = lazy(() => import('./pages/Checkout'))
const EditListing    = lazy(() => import('./pages/EditListing'))
const Messages       = lazy(() => import('./pages/Messages'))
const Conversation   = lazy(() => import('./pages/Conversation'))
const Orders         = lazy(() => import('./pages/Orders'))
const Favorites      = lazy(() => import('./pages/Favorites'))
const Notifications  = lazy(() => import('./pages/Notifications'))
const Settings       = lazy(() => import('./pages/Settings'))
const AccountLayout   = lazy(() => import('./pages/account/AccountLayout'))
const AccountSecurity = lazy(() => import('./pages/account/AccountSecurity'))
const BlockedUsers    = lazy(() => import('./pages/account/BlockedUsers'))
const MyMoney         = lazy(() => import('./pages/account/MyMoney'))
const VerifyPayments  = lazy(() => import('./pages/account/VerifyPayments'))
const SellerSpace    = lazy(() => import('./pages/SellerSpace'))

// Admin
const AdminLayout        = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard     = lazy(() => import('./pages/admin/Dashboard'))
const AdminListings      = lazy(() => import('./pages/admin/listings/ListingsModeration'))
const AdminListingReview = lazy(() => import('./pages/admin/listings/ListingReview'))
const AdminUsers         = lazy(() => import('./pages/admin/users/UsersList'))
const AdminUserDetail    = lazy(() => import('./pages/admin/users/UserDetail'))
const AdminOrders        = lazy(() => import('./pages/admin/orders/OrdersList'))
const AdminReports       = lazy(() => import('./pages/admin/Reports'))
const AdminFinances      = lazy(() => import('./pages/admin/Finances'))
const AdminRGPD          = lazy(() => import('./pages/admin/RGPD'))
const AdminSettings      = lazy(() => import('./pages/admin/SiteSettings'))

// 404
const NotFound = lazy(() => import('./pages/NotFound'))

// Brand (dev uniquement)
const BrandPage    = lazy(() => import('./pages/BrandPage'))
const BrandCompare = lazy(() => import('./pages/BrandCompare'))

// Légal
const CGU                 = lazy(() => import('./pages/legal/CGU'))
const CGV                 = lazy(() => import('./pages/legal/CGV'))
const Privacy             = lazy(() => import('./pages/legal/Privacy'))
const Cookies             = lazy(() => import('./pages/legal/Cookies'))
const MentionsLegales     = lazy(() => import('./pages/legal/MentionsLegales'))
const CharteBonneConduite = lazy(() => import('./pages/legal/CharteBonneConduite'))
const ReglementCatalogue  = lazy(() => import('./pages/legal/ReglementCatalogue'))

function PrivateRoute({ children }) {
  const { user, profile } = useAuth()
  if (!user) return <Navigate to="/connexion" replace />
  if (profile?.is_banned) return <Navigate to="/connexion" replace />
  return children
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user)    return <Navigate to="/connexion" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

const MAINTENANCE = import.meta.env.VITE_MAINTENANCE === 'true'

// Routes qui ont leur PROPRE hero plein écran (le hero gère son padding-top sous la navbar fixe).
// Les autres pages reçoivent un padding-top compensatoire (la navbar est fixed = hors flux).
const HERO_ROUTES = ['/', '/comment-ca-marche']

function AppShell() {
  const { pathname } = useLocation()
  const hasHero = HERO_ROUTES.includes(pathname)

  return (
    <div className="min-h-screen flex flex-col bg-nout-secondary">
      <ScrollToTop />
      <Header />

      <main className={`flex-1 pb-16 md:pb-0 ${hasHero ? '' : 'pt-[calc(4rem+env(safe-area-inset-top))] lg:pt-[calc(4rem+2.75rem+env(safe-area-inset-top))]'}`}>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/"             element={<Home />} />
          <Route path="/annonce/:id"  element={<ListingDetail />} />
          <Route path="/commander/:id" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/recherche"    element={<Search />} />
          <Route path="/c/:slug"      element={<CategoryPage />} />
          <Route path="/profil/:id"   element={<Profile />} />
          <Route path="/a-propos"          element={<About />} />
          <Route path="/aide"              element={<Help />} />
          <Route path="/comment-ca-marche" element={<HowItWorks />} />
          <Route path="/createurs"         element={<Creators />} />
          <Route path="/installer-app"    element={<InstallApp />} />

          {/* Auth */}
          <Route path="/connexion"      element={<Login />} />
          <Route path="/inscription"    element={<Register />} />
          <Route path="/compte-active"  element={<CompteActive />} />
          <Route path="/paiement-succes" element={<PaymentSuccess />} />

          {/* Privé */}
          <Route path="/publier"    element={<PrivateRoute><CreateListing /></PrivateRoute>} />
          <Route path="/annonce/:id/modifier" element={<PrivateRoute><EditListing /></PrivateRoute>} />
          <Route path="/messages"   element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/messages/:id" element={<PrivateRoute><Conversation /></PrivateRoute>} />
          <Route path="/commandes"  element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/espace-vendeur" element={<PrivateRoute><SellerSpace /></PrivateRoute>} />
          <Route path="/favoris"    element={<PrivateRoute><Favorites /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />

          {/* Espace compte — structure menu latéral */}
          <Route path="/compte" element={<PrivateRoute><AccountLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/compte/profil" replace />} />
            <Route path="profil"        element={<Settings />} />
            <Route path="securite"      element={<AccountSecurity />} />
            <Route path="paiements"     element={<MyMoney />} />
            <Route path="paiements/verifier" element={<VerifyPayments />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="bloques"       element={<BlockedUsers />} />
            <Route path="fondateur"     element={<Settings />} />
            <Route path="supprimer"     element={<Settings />} />
          </Route>

          {/* Ancienne route paramètres → redirige vers le nouvel espace compte */}
          <Route path="/parametres" element={<Navigate to="/compte/profil" replace />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index                    element={<AdminDashboard />} />
            <Route path="annonces"          element={<AdminListings />} />
            <Route path="annonces/:id"      element={<AdminListingReview />} />
            <Route path="utilisateurs"      element={<AdminUsers />} />
            <Route path="utilisateurs/:id"  element={<AdminUserDetail />} />
            <Route path="commandes"         element={<AdminOrders />} />
            <Route path="signalements"      element={<AdminReports />} />
            <Route path="finances"          element={<AdminFinances />} />
            <Route path="rgpd"              element={<AdminRGPD />} />
            <Route path="parametres"        element={<AdminSettings />} />
          </Route>

          {/* Brand — aperçu charte graphique (dev only) */}
          {import.meta.env.DEV && <Route path="/brand"         element={<BrandPage />} />}
          {import.meta.env.DEV && <Route path="/brand-compare" element={<BrandCompare />} />}

          {/* Légal */}
          <Route path="/legal/cgu"                      element={<CGU />} />
          <Route path="/legal/cgv"                      element={<CGV />} />
          <Route path="/legal/confidentialite"          element={<Privacy />} />
          <Route path="/legal/cookies"                  element={<Cookies />} />
          <Route path="/legal/mentions"                 element={<MentionsLegales />} />
          <Route path="/legal/charte-bonne-conduite"    element={<CharteBonneConduite />} />
          <Route path="/legal/reglement-catalogue"      element={<ReglementCatalogue />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>

      <Footer />
      <BottomNav />
      <CookieBanner />
      <MessageToast />
      <OrderToast />
      <HelpBot />
    </div>
  )
}

export default function App() {
  if (MAINTENANCE) return <Maintenance />
  return <AppShell />
}
