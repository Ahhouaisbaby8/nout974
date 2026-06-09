import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export default function OrderToast() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toastIdRef = useRef(0)
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((toast) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { ...toast, id }].slice(-3))
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }, [])

  useEffect(() => {
    if (!user) return

    const buyerChannel = supabase
      .channel(`order-buyer-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `buyer_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.status !== 'paid') return
        const { data: listing } = await supabase
          .from('listings').select('title').eq('id', payload.new.listing_id).single()
        addToast({ icon: '✅', message: `Achat confirmé — ${listing?.title ?? 'ton article'}`, url: '/commandes' })
      })
      .subscribe()

    const sellerChannel = supabase
      .channel(`order-seller-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `seller_id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new.status !== 'paid') return
        const { data: listing } = await supabase
          .from('listings').select('title').eq('id', payload.new.listing_id).single()
        addToast({ icon: '🎉', message: `Tu viens de vendre — ${listing?.title ?? 'ton article'}`, url: '/messages' })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(buyerChannel)
      supabase.removeChannel(sellerChannel)
    }
  }, [user?.id, addToast])

  if (!user || !toasts.length) return null

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          onClick={() => navigate(toast.url)}
          className="pointer-events-auto w-[300px] bg-white rounded-xl shadow-lg flex items-center gap-3 cursor-pointer"
          style={{
            borderLeft: '3px solid #1A3A8F',
            padding: '12px 16px',
            animation: 'slideInRight 300ms ease-out',
          }}
        >
          <div className="text-2xl flex-shrink-0">{toast.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#1A1A2E]">NOUT 974</p>
            <p className="text-xs text-gray-500 truncate">{toast.message}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">à l'instant</p>
          </div>
        </div>
      ))}
    </div>
  )
}
