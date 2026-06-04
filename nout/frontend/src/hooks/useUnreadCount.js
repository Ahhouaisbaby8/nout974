import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) { setCount(0); return }

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .then(({ count: c }) => setCount(c ?? 0))

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => setCount(prev => prev + 1))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.is_read && !payload.old.is_read) {
          setCount(prev => Math.max(0, prev - 1))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])

  return count
}
