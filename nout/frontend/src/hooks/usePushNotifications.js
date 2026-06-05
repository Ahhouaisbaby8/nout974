import { useEffect } from 'react'
import { supabase } from '../services/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function subscribeToPush(userId) {
  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))

    await supabase
      .from('push_subscriptions')
      .upsert({ user_id: userId, subscription: sub.toJSON() }, { onConflict: 'user_id' })
  } catch (err) {
    console.error('Abonnement push échoué :', err)
  }
}

export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId || !VAPID_PUBLIC_KEY) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    if (Notification.permission === 'granted') {
      subscribeToPush(userId)
      return
    }

    // Demander la permission une seule fois par utilisateur
    const key = `nout_push_asked_${userId}`
    if (localStorage.getItem(key)) return

    localStorage.setItem(key, '1')
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') subscribeToPush(userId)
    })
  }, [userId])
}
