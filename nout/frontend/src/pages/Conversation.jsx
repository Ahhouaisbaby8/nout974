import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMessages, sendMessage, markAsRead, subscribeToMessages } from '../services/messages'
import { getProfile } from '../services/profiles'
import { supabase } from '../services/supabase'
import { getAvatarUrl } from '../utils/avatar'
import { formatRelativeDate } from '../utils/formatters'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'

export default function Conversation() {
  const { id: otherUserId } = useParams()
  const [searchParams] = useSearchParams()
  const listingId = searchParams.get('annonce') ?? null

  const { user, profile, refreshUnreadCount } = useAuth()
  const bottomRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const isInitialLoad = useRef(true)

  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages]   = useState([])
  const [content, setContent]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)

  const isNearBottom = () => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }

  // Réinitialiser le flag quand on change de conversation
  useEffect(() => {
    isInitialLoad.current = true
  }, [otherUserId])

  // Charger le profil de l'interlocuteur + les messages
  useEffect(() => {
    setLoading(true)
    setMessages([])
    setOtherUser(null)
    Promise.all([
      getProfile(otherUserId),
      getMessages(user.id, otherUserId, listingId),
    ]).then(([profile, msgs]) => {
      setOtherUser(profile)
      setMessages(msgs)
      // Marquer comme lus et rafraîchir le badge
      const unread = msgs.filter(m => !m.is_read && m.sender_id === otherUserId).map(m => m.id)
      if (unread.length) markAsRead(unread).then(() => refreshUnreadCount())
    }).finally(() => setLoading(false))
  }, [user.id, otherUserId, listingId])

  // Scroll automatique vers le bas
  useEffect(() => {
    if (!messages.length) return
    if (isInitialLoad.current) {
      // Premier chargement : scroll instantané sans animation
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      isInitialLoad.current = false
    } else if (isNearBottom()) {
      // Nouveau message : scroll doux seulement si déjà près du bas
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Temps réel — nouveaux messages entrants
  useEffect(() => {
    const channel = subscribeToMessages(user.id, (payload) => {
      if (payload.new.sender_id === otherUserId) {
        setMessages(prev => [...prev, payload.new])
        markAsRead([payload.new.id]).then(() => refreshUnreadCount())
      }
    })
    return () => supabase.removeChannel(channel)
  }, [user.id, otherUserId])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!content.trim() || sending) return

    const text = content.trim()
    setContent('')
    setSending(true)

    try {
      const msg = await sendMessage({
        senderId: user.id,
        receiverId: otherUserId,
        listingId,
        content: text,
        senderName: profile?.username,
      })
      setMessages(prev => [...prev, msg])
    } catch {
      setContent(text)
    } finally {
      setSending(false)
    }
  }

  const avatarUrl = getAvatarUrl(otherUser?.avatar_url)

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)]">

      {/* ── EN-TÊTE ── */}
      <div className="bg-white border-b border-nout-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <BackButton />
        <Link to={`/profil/${otherUserId}`} className="flex items-center gap-3 flex-1">
          {avatarUrl ? (
            <img src={avatarUrl} alt={otherUser?.username} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-nout-primary text-white flex items-center justify-center font-bold">
              {otherUser?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <span className="font-semibold text-nout-dark">{otherUser?.username}</span>
        </Link>
      </div>

      {/* ── MESSAGES ── */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            <p className="text-3xl mb-2">👋</p>
            Commence la conversation avec {otherUser?.username} !
          </div>
        )}

        {messages.map((msg) => {
          const isMine  = msg.sender_id === user.id
          const isOffer = msg.content.startsWith('💰 Offre :')

          if (isOffer) {
            const lines  = msg.content.split('\n')
            const amount = lines[0].replace('💰 Offre : ', '')
            const title  = lines[1]?.replace("Pour l'annonce : ", '') ?? ''
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl border-2 border-amber-300 bg-amber-50 ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                  <p className="text-xs font-semibold text-amber-600 mb-1">💰 Proposition d'offre</p>
                  <p className="text-2xl font-extrabold text-amber-700">{amount}</p>
                  {title && <p className="text-xs text-gray-500 mt-1 truncate max-w-[180px]">{title}</p>}
                  <p className="text-[10px] mt-1.5 text-gray-400">{formatRelativeDate(msg.created_at)}</p>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                isMine
                  ? 'bg-nout-primary text-white rounded-br-sm'
                  : 'bg-white text-nout-dark shadow-sm rounded-bl-sm'
              }`}>
                <p className="whitespace-pre-line">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                  {formatRelativeDate(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── SAISIE ── */}
      <form
        onSubmit={handleSend}
        className="bg-white border-t border-nout-border px-4 py-3 flex gap-3 items-end flex-shrink-0"
      >
        <textarea
          rows={1}
          placeholder="Écris ton message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) }
          }}
          className="flex-1 input-field resize-none py-2.5 max-h-32"
        />
        <button
          type="submit"
          disabled={!content.trim() || sending}
          className="btn-primary px-5 py-2.5 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ➤
        </button>
      </form>

    </div>
  )
}
