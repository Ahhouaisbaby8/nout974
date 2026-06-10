import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { containsForbiddenWord } from '../utils/forbiddenWords'
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
  const scrollContainerRef = useRef(null)
  const isInitialLoad = useRef(true)

  const [otherUser, setOtherUser]       = useState(null)
  const [messages, setMessages]         = useState([])
  const [content, setContent]           = useState('')
  const [loading, setLoading]           = useState(true)
  const [sending, setSending]           = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [contentVisible, setContentVisible] = useState(false)
  const [containerHeight, setContainerHeight] = useState(null)
  const [msgError, setMsgError] = useState('')

  // ── Bug 1 fix : scroll limité au conteneur, jamais sur le body ──
  const scrollToBottom = useCallback((behavior = 'instant') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }, [])

  // Réinitialiser quand on change de conversation
  useEffect(() => {
    isInitialLoad.current = true
    setContentVisible(false)
    setShowScrollBtn(false)
  }, [otherUserId])

  // Charger le profil de l'interlocuteur + les messages
  useEffect(() => {
    setLoading(true)
    setMessages([])
    setOtherUser(null)
    setContentVisible(false)
    Promise.all([
      getProfile(otherUserId),
      getMessages(user.id, otherUserId, listingId),
    ]).then(([prof, msgs]) => {
      setOtherUser(prof)
      setMessages(msgs)
      const unread = msgs.filter(m => !m.is_read && m.sender_id === otherUserId).map(m => m.id)
      if (unread.length) markAsRead(unread).then(() => refreshUnreadCount())
    }).finally(() => setLoading(false))
  }, [user.id, otherUserId, listingId])

  // ── Bug 3 fix : requestAnimationFrame garantit que le DOM est peint avant de scroller ──
  // ── Bug 5 fix : bouton "Nouveau message" si l'utilisateur a remonté ──
  useEffect(() => {
    if (loading) return
    if (!messages.length) {
      // Conversation vide : afficher immédiatement (rien à scroller)
      setContentVisible(true)
      return
    }
    if (isInitialLoad.current) {
      requestAnimationFrame(() => {
        scrollToBottom('instant')
        isInitialLoad.current = false
        // Révéler le contenu après le scroll pour éviter le flash
        setTimeout(() => setContentVisible(true), 50)
      })
    } else if (isNearBottom()) {
      scrollToBottom('smooth')
    } else {
      // L'utilisateur a remonté → signaler un nouveau message
      setShowScrollBtn(true)
    }
  }, [messages, loading, scrollToBottom, isNearBottom])

  // Masquer le bouton quand l'utilisateur re-descend
  const handleScroll = useCallback(() => {
    if (isNearBottom()) setShowScrollBtn(false)
  }, [isNearBottom])

  // ── Bug 4 fix : clavier virtuel mobile via visualViewport ──
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      const nav = document.querySelector('nav') ?? document.querySelector('header')
      const navH = nav?.offsetHeight ?? 64
      setContainerHeight(vv.height - navH)
      if (isNearBottom()) {
        requestAnimationFrame(() => scrollToBottom('instant'))
      }
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [scrollToBottom, isNearBottom])

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
    const text = DOMPurify.sanitize(content.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })

    const wordCheck = containsForbiddenWord(text)
    if (wordCheck.found) {
      setMsgError('Ce message contient un terme non autorisé sur NOUT.')
      return
    }
    setMsgError('')
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
      requestAnimationFrame(() => scrollToBottom('smooth'))
    } catch {
      setContent(text)
    } finally {
      setSending(false)
    }
  }

  const avatarUrl = getAvatarUrl(otherUser?.avatar_url)

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    // ── Bug 2 fix : 100dvh tient compte de la barre du navigateur mobile ──
    <div
      className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-140px)]"
      style={containerHeight ? { height: `${containerHeight}px` } : {}}
    >

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
      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-y-contain px-4 py-4 flex flex-col gap-3"
          style={{ opacity: contentVisible ? 1 : 0, transition: 'opacity 150ms ease' }}
        >
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
          {/* Ancre de fin de liste (sans scrollIntoView) */}
          <div className="h-px flex-shrink-0" aria-hidden="true" />
        </div>

        {/* ── Bug 5 : bouton flottant "Nouveau message" ── */}
        {showScrollBtn && (
          <button
            onClick={() => { scrollToBottom('smooth'); setShowScrollBtn(false) }}
            className="absolute bottom-4 right-4 z-10 bg-nout-primary text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg flex items-center gap-1.5"
          >
            ↓ Nouveau message
          </button>
        )}
      </div>

      {/* ── SAISIE ── */}
      {msgError && (
        <div className="bg-red-50 border-t border-red-200 px-4 py-2 text-xs text-red-600 flex-shrink-0">
          ⛔ {msgError}
        </div>
      )}
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
