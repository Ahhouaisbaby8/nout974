import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { getAvatarUrl } from '../utils/avatar'

export default function MessageToast() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = useRef(location.pathname)
  const toastIdRef = useRef(0)
  const [toasts, setToasts] = useState([])

  // Garder une ref de la page courante sans re-souscrire au channel
  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  // Supprimer les toasts de la conversation qu'on vient d'ouvrir
  useEffect(() => {
    const match = location.pathname.match(/^\/messages\/(.+)$/)
    if (match) {
      setToasts(prev => prev.filter(t => t.senderId !== match[1]))
    }
  }, [location.pathname])

  const addToast = useCallback((toast) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { ...toast, id }].slice(-3)) // max 3 empilés
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`toast-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        const senderId = payload.new.sender_id
        // Pas de toast si l'utilisateur est déjà dans cette conversation
        if (locationRef.current === `/messages/${senderId}`) return

        const { data: sender } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', senderId)
          .single()

        addToast({
          senderName: sender?.username ?? 'Quelqu\'un',
          avatarUrl: getAvatarUrl(sender?.avatar_url),
          message: payload.new.content,
          senderId,
        })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id, addToast])

  if (!user || !toasts.length) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => navigate(`/messages/${toast.senderId}`)}
          className="pointer-events-auto w-[300px] bg-white rounded-xl shadow-lg flex items-center gap-3 cursor-pointer"
          style={{
            borderLeft: '3px solid #00C4B4',
            padding: '12px 16px',
            animation: 'slideInRight 300ms ease-out',
          }}
        >
          {/* Avatar expéditeur */}
          {toast.avatarUrl ? (
            <img
              src={toast.avatarUrl}
              alt={toast.senderName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#00C4B4] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {toast.senderName[0]?.toUpperCase()}
            </div>
          )}

          {/* Texte */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#1A1A2E] truncate">{toast.senderName}</p>
            <p className="text-xs text-gray-500 truncate">{toast.message}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">à l'instant</p>
          </div>
        </div>
      ))}
    </div>
  )
}
