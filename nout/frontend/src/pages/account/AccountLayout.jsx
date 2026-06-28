import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getAvatarUrl } from '../../utils/avatar'
import {
  User, ShieldCheck, Wallet, Bell, Users, CreditCard, Star, Trash2, Menu, X,
} from 'lucide-react'

// Sections de l'espace compte. "soon" = fonction à venir (badge Bientôt, non cliquable).
const NAV = [
  {
    group: 'Mon compte',
    items: [
      { to: '/compte/profil',        label: 'Mon profil',        icon: User },
      { to: '/compte/securite',      label: 'Sécurité',          icon: ShieldCheck },
      { to: '/compte/paiements',     label: 'Paiements & ventes', icon: Wallet },
      { to: '/compte/notifications', label: 'Notifications',     icon: Bell },
    ],
  },
  {
    group: 'Communauté',
    items: [
      { to: '/compte/parrainage',    label: 'Parrainage',    icon: Users,      soon: true },
      { to: '/compte/porte-monnaie', label: 'Porte-monnaie', icon: CreditCard, soon: true },
    ],
  },
  {
    group: 'Préférences',
    items: [
      { to: '/compte/fondateur',  label: 'Membre Fondateur',    icon: Star },
      { to: '/compte/supprimer',  label: 'Supprimer mon compte', icon: Trash2, danger: true },
    ],
  },
]

export default function AccountLayout() {
  const { profile, user } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const avatarUrl = getAvatarUrl(profile?.avatar_url)

  const SidebarContent = (
    <div className="bg-white border border-[#ECEFF4] rounded-2xl overflow-hidden">
      {/* En-tête minimal clair (design C) : fond gris très clair, avatar liseré turquoise */}
      <div className="flex items-center gap-3 px-[18px] py-5 bg-[#F8FAFC] border-b border-[#EEF2F7]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={profile?.username}
               className="w-11 h-11 rounded-full object-cover flex-shrink-0" style={{ border: '2px solid #00C4B4' }} />
        ) : (
          <div className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[17px] flex-shrink-0 bg-white text-nout-roi"
               style={{ border: '2px solid #00C4B4' }}>
            {profile?.username?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-[15px] text-nout-texte leading-tight truncate">{profile?.username ?? 'Mon compte'}</p>
          <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>

      <nav className="p-2">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#9aa5b8] px-3 pt-3 pb-1.5">{group}</p>
            {items.map(({ to, label, icon: Icon, soon, danger }) => (
              soon ? (
                <div key={to} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium text-gray-400 cursor-default">
                  <Icon className="w-[17px] h-[17px] flex-shrink-0 opacity-70" />
                  {label}
                  <span className="ml-auto text-[10px] font-bold bg-[#FFF3E0] text-[#E08600] rounded-full px-2 py-0.5">Bientôt</span>
                </div>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E7F7F5] text-[#0E7FAB] font-semibold'
                      : danger
                        ? 'text-[#E0524D] hover:bg-[#FDECEC]'
                        : 'text-[#5B6B82] hover:bg-[#F1F7FA] hover:text-[#0E7FAB]'
                  }`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-[17px] h-[17px] flex-shrink-0 ${isActive ? 'text-nout-turquoise' : ''}`} />
                      {label}
                    </>
                  )}
                </NavLink>
              )
            ))}
          </div>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Barre mobile : bouton menu */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#ECEFF4] rounded-xl text-sm font-semibold text-nout-texte"
        >
          <Menu className="w-4 h-4" /> Mon compte
        </button>
      </div>

      {/* Overlay mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85%] bg-[#F8FAFF] p-3 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="ml-auto mb-2 flex w-9 h-9 items-center justify-center rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar desktop */}
        <aside className="hidden md:block self-start sticky top-20">{SidebarContent}</aside>
        {/* Contenu */}
        <main className="bg-white border border-[#ECEFF4] rounded-2xl p-6 md:p-7 min-h-[400px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
