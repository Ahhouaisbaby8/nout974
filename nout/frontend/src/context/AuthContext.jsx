import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../services/supabase'
import { usePushNotifications } from '../hooks/usePushNotifications'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) { setUnreadCount(0); return }

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)
      .then(({ count: c }) => setUnreadCount(c ?? 0))

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => setUnreadCount(prev => prev + 1))
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.is_read && !payload.old.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user?.id])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        if (event === 'SIGNED_IN') {
          const savedRedirect = sessionStorage.getItem('nout_auth_redirect')
          if (savedRedirect) {
            sessionStorage.removeItem('nout_auth_redirect')
            if (savedRedirect.startsWith('/')) {
              window.location.replace(savedRedirect)
            }
          }
        }
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) return
      if (data.is_banned) {
        sessionStorage.setItem('nout_ban', '1')
        await supabase.auth.signOut()
        window.location.replace('/connexion')
        return
      }
      setProfile(data)
    } catch {
      // profil non chargé — l'utilisateur reste connecté mais sans profil
    }
  }

  // Inscription email — le trigger Supabase crée le profil automatiquement
  const register = async ({ email, password }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/compte-active` },
    })
    if (error) throw error
  }

  const login = async ({ email, password }) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // Connexion Google — redirige vers Google puis revient sur le site
  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }

  const updateProfile = async (updates) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) throw error
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return
    const { count: c } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)
    setUnreadCount(c ?? 0)
  }, [user?.id])

  usePushNotifications(user?.id)

  const isAdmin     = profile?.role === 'admin'
  const isModerator = profile?.role === 'moderator' || isAdmin

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      register, login, loginWithGoogle, logout, updateProfile,
      isAdmin, isModerator, unreadCount, refreshUnreadCount,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
