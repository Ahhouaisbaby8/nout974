import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import Header      from './components/layout/Header'
import Footer      from './components/layout/Footer'
import BottomNav   from './components/layout/BottomNav'
import CookieBanner from './components/legal/CookieBanner'
import MessageToast from './components/MessageToast'

// Pages publiques
import Home           from './pages/Home'
import ListingDetail  from './pages/ListingDetail'
import Search         from './pages/Search'
import Profile        from './pages/Profile'
import About          from './pages/About'
import Help           from './pages/Help'

// Auth
import Login          from './pages/Login'
import Register       from './pages/Register'
import PaymentSuccess from './pages/PaymentSuccess'

// Pages privées
import CreateListing from './pages/CreateListing'
import EditListing   from './pages/EditListing'
import Messages      from './pages/Messages'
import Conversation  from './pages/Conversation'
import Orders        from './pages/Orders'
import Favorites     from './pages/Favorites'
import Settings      from './pages/Settings'

// Admin
import AdminLayout          from './pages/admin/AdminLayout'
import AdminDashboard       from './pages/admin/Dashboard'
import AdminListings        from './pages/admin/listings/ListingsModeration'
import AdminListingReview   from './pages/admin/listings/ListingReview'
import AdminUsers           from './pages/admin/users/UsersList'
import AdminUserDetail      from './pages/admin/users/UserDetail'
import AdminOrders          from './pages/admin/orders/OrdersList'
import AdminReports         from './pages/admin/Reports'
import AdminFinances        from './pages/admin/Finances'
import AdminRGPD            from './pages/admin/RGPD'
import AdminSettings        from './pages/admin/SiteSettings'

// Brand (dev uniquement)
import BrandPage    from './pages/BrandPage'
import BrandCompare from './pages/BrandCompare'

// Légal
import CGU            from './pages/legal/CGU'
import CGV            from './pages/legal/CGV'
import Privacy        from './pages/legal/Privacy'
import Cookies        from './pages/legal/Cookies'
import MentionsLegales from './pages/legal/MentionsLegales'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/connexion" replace />
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user)    return <Navigate to="/connexion" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-nout-secondary">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          {/* Public */}
          <Route path="/"             element={<Home />} />
          <Route path="/annonce/:id"  element={<ListingDetail />} />
          <Route path="/recherche"    element={<Search />} />
          <Route path="/profil/:id"   element={<Profile />} />
          <Route path="/a-propos"     element={<About />} />
          <Route path="/aide"         element={<Help />} />

          {/* Auth */}
          <Route path="/connexion"      element={<Login />} />
          <Route path="/inscription"    element={<Register />} />
          <Route path="/paiement-succes" element={<PaymentSuccess />} />

          {/* Privé */}
          <Route path="/publier"    element={<PrivateRoute><CreateListing /></PrivateRoute>} />
          <Route path="/annonce/:id/modifier" element={<PrivateRoute><EditListing /></PrivateRoute>} />
          <Route path="/messages"   element={<PrivateRoute><Messages /></PrivateRoute>} />
          <Route path="/messages/:id" element={<PrivateRoute><Conversation /></PrivateRoute>} />
          <Route path="/commandes"  element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/favoris"    element={<PrivateRoute><Favorites /></PrivateRoute>} />
          <Route path="/parametres" element={<PrivateRoute><Settings /></PrivateRoute>} />

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
          <Route path="/legal/cgu"             element={<CGU />} />
          <Route path="/legal/cgv"             element={<CGV />} />
          <Route path="/legal/confidentialite" element={<Privacy />} />
          <Route path="/legal/cookies"         element={<Cookies />} />
          <Route path="/legal/mentions"        element={<MentionsLegales />} />
        </Routes>
      </main>

      <Footer />
      <BottomNav />
      <CookieBanner />
      <MessageToast />
    </div>
  )
}
