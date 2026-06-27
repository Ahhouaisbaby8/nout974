import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getNotifications, markNotificationsRead } from '../services/notifications'
import { formatRelativeDate } from '../utils/formatters'
import { Bell, UserPlus, MessageCircle, ShoppingBag, CheckCircle2, Key, Info } from 'lucide-react'

// Icône + couleur selon le type de notification
const TYPE_META = {
  follow:         { icon: UserPlus,      color: 'text-[#0E7FAB]' },
  message:        { icon: MessageCircle, color: 'text-[#2EC4B6]' },
  sale:           { icon: ShoppingBag,   color: 'text-emerald-600' },
  offer_accepted: { icon: CheckCircle2,  color: 'text-emerald-600' },
  escrow_code:    { icon: Key,           color: 'text-[#D4A017]' },
  system:         { icon: Info,          color: 'text-nout-muted' },
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications(user.id)
      .then((data) => {
        setItems(data)
        // Marque tout comme lu à l'ouverture (best-effort)
        if (data.some(n => !n.is_read)) markNotificationsRead(user.id).catch(() => {})
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [user.id])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-200 rounded-full animate-pulse mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-title text-2xl font-bold text-nout-texte mb-6 flex items-center gap-2">
        <Bell className="w-6 h-6 text-nout-turquoise" />
        Notifications
      </h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? TYPE_META.system
            const Icon = meta.icon
            return (
              <li key={n.id}>
                <button
                  onClick={() => n.link && navigate(n.link)}
                  className={`w-full flex items-start gap-3 text-left rounded-xl border p-3.5 transition-colors ${
                    n.is_read ? 'bg-white border-[#ECEFF4]' : 'bg-[#F0FFFE] border-[#B9E5E1]'
                  } hover:border-nout-turquoise`}
                >
                  <span className={`mt-0.5 flex-shrink-0 ${meta.color}`}><Icon className="w-5 h-5" /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-nout-texte">{n.title}</p>
                    {n.body && <p className="text-[13px] text-gray-500 leading-snug mt-0.5">{n.body}</p>}
                    <p className="text-[11px] text-gray-400 mt-1">{formatRelativeDate(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-nout-turquoise flex-shrink-0 mt-1.5" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
