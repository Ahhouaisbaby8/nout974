import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import { containsForbiddenWord } from '../utils/forbiddenWords'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getMessages, sendMessage, markAsRead, subscribeToMessages } from '../services/messages'
import { getOffers, respondOffer } from '../services/offers'
import { getProfile } from '../services/profiles'
import { supabase } from '../services/supabase'
import { getAvatarUrl } from '../utils/avatar'
import { formatRelativeDate, formatPrice } from '../utils/formatters'
import BackButton from '../components/ui/BackButton'
import Spinner from '../components/ui/Spinner'
import { resolveFounder } from '../components/ui/FounderBadge'

// Carte d'offre — sombre & minimaliste (le turquoise n'est qu'une touche sur « acceptée »).
function OfferBubble({ offer, userId, busy, onRespond, onPay }) {
  const isMine      = offer.proposed_by === userId
  const isRecipient = offer.proposed_by !== userId
  const isBuyer     = offer.buyer_id === userId
  const amount      = formatPrice(offer.amount)
  const working     = busy === offer.id

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[78%] rounded-2xl bg-[#0A0F2C] text-white px-4 py-3 shadow-sm">
        <p className="text-[11px] uppercase tracking-wide text-white/40">Offre</p>
        <p className="text-2xl font-extrabold leading-tight">{amount}</p>

        {offer.status === 'pending' && isRecipient && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={working} onClick={() => onRespond(offer, 'accept')}
              className="text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-white text-[#0A0F2C] hover:bg-white/90 disabled:opacity-50">
              {working ? '…' : 'Accepter'}
            </button>
            <button disabled={working} onClick={() => onRespond(offer, 'counter')}
              className="text-[13px] font-medium px-3 py-1.5 rounded-lg border border-white/25 text-white/80 hover:bg-white/10 disabled:opacity-50">
              Contre-offre
            </button>
            <button disabled={working} onClick={() => onRespond(offer, 'refuse')}
              className="text-[13px] font-medium px-3 py-1.5 rounded-lg text-white/45 hover:text-white/70 disabled:opacity-50">
              Refuser
            </button>
          </div>
        )}

        {offer.status === 'pending' && isMine && (
          <p className="mt-2 text-[12px] text-white/45">En attente de réponse…</p>
        )}

        {offer.status === 'accepted' && (
          <>
            <p className="mt-1 text-[12px] font-medium text-[#2EC4B6]">Offre acceptée</p>
            {isBuyer ? (
              <button disabled={working} onClick={() => onPay(offer)}
                className="mt-2 w-full text-[14px] font-semibold px-3 py-2 rounded-lg bg-white text-[#0A0F2C] hover:bg-white/90">
                Payer {amount}
              </button>
            ) : (
              <p className="mt-1 text-[12px] text-white/45">En attente du paiement de l'acheteur.</p>
            )}
          </>
        )}

        {offer.status === 'refused'   && <p className="mt-1 text-[12px] text-white/40">Offre refusée.</p>}
        {offer.status === 'countered' && <p className="mt-1 text-[12px] text-white/40">Contre-offre faite ci-dessous.</p>}
        {offer.status === 'cancelled' && <p className="mt-1 text-[12px] text-white/40">Offre annulée.</p>}

        <p className="text-[10px] mt-2 text-white/30">{formatRelativeDate(offer.created_at)}</p>
      </div>
    </div>
  )
}

export default function Conversation() {
  const { id: otherUserId } = useParams()
  const [searchParams] = useSearchParams()
  const listingId = searchParams.get('annonce') ?? null

  const { user, profile, refreshUnreadCount } = useAuth()
  const navigate = useNavigate()
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
  const [offers, setOffers]       = useState([])
  const [offerBusy, setOfferBusy] = useState(null)   // id de l'offre en cours de traitement

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
      listingId ? getOffers(listingId, user.id, otherUserId).catch(() => []) : Promise.resolve([]),
    ]).then(([prof, msgs, offs]) => {
      setOtherUser(prof)
      setMessages(msgs)
      setOffers(offs)
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

  const reloadOffers = useCallback(() => {
    if (!listingId) return
    getOffers(listingId, user.id, otherUserId).then(setOffers).catch(() => {})
  }, [listingId, user.id, otherUserId])

  const handleRespond = async (offer, action) => {
    if (offerBusy) return
    let counterAmount
    if (action === 'counter') {
      const v = window.prompt('Ta contre-offre (en €) :')
      if (v == null) return
      counterAmount = parseFloat(String(v).replace(',', '.'))
      if (!(counterAmount > 0)) { setMsgError('Montant de contre-offre invalide.'); return }
    }
    setMsgError('')
    setOfferBusy(offer.id)
    try {
      await respondOffer({ offerId: offer.id, action, counterAmount })
      reloadOffers()
    } catch (err) {
      setMsgError(err.message)
    } finally {
      setOfferBusy(null)
    }
  }

  const handlePayOffer = (offer) => navigate(`/commander/${offer.listing_id}?offre=${offer.id}`)

  // Fil unifié : messages + offres, dans l'ordre chronologique.
  const timeline = [
    ...messages.map(m => ({ kind: 'msg',   at: m.created_at, data: m })),
    ...offers.map(o   => ({ kind: 'offer', at: o.created_at, data: o })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at))

  const avatarUrl = getAvatarUrl(otherUser?.avatar_url)
  const { isFounder: otherIsFounder, founderNumber: otherFounderNumber, showBadge: otherShowBadge } = resolveFounder(otherUser)
  const showFounderHeader = otherIsFounder && otherShowBadge

  if (loading) return <div className="flex justify-center py-24"><Spinner size="lg" /></div>

  return (
    // ── Bug 2 fix : 100dvh tient compte de la barre du navigateur mobile ──
    <div
      className="max-w-2xl mx-auto flex flex-col h-[calc(100dvh-140px)]"
      style={containerHeight ? { height: `${containerHeight}px` } : {}}
    >

      {/* ── EN-TÊTE ── */}
      <div className={`px-4 py-3 flex items-center gap-3 flex-shrink-0 relative overflow-hidden ${showFounderHeader ? 'hero-sunset' : 'bg-white border-b border-nout-border'}`}>
        {/* Mini palmier déco quand fondateur — silhouette sombre, bien cadrée dans l'en-tête */}
        {showFounderHeader && (
          <div className="absolute bottom-0 pointer-events-none select-none" style={{ right: 12, opacity: 0.45 }}>
            <svg width="52" height="56" viewBox="0 0 100 110" fill="none">
              <path d="M50 108 Q48 80 47 55 Q46 40 50 28" stroke="rgba(4,2,0,0.55)" strokeWidth="5" strokeLinecap="round"/>
              <path d="M50 28 Q72 22 92 30" stroke="rgba(4,2,0,0.5)"  strokeWidth="4"   strokeLinecap="round"/>
              <path d="M50 28 Q28 22 8 30"  stroke="rgba(4,2,0,0.5)"  strokeWidth="4"   strokeLinecap="round"/>
              <path d="M50 28 Q66 12 84 8"  stroke="rgba(4,2,0,0.4)"  strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M50 28 Q34 12 16 8"  stroke="rgba(4,2,0,0.4)"  strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M50 28 Q50 8 50 2"   stroke="rgba(4,2,0,0.35)" strokeWidth="3"   strokeLinecap="round"/>
              <circle cx="50" cy="27" r="4" fill="rgba(4,2,0,0.45)"/>
            </svg>
          </div>
        )}
        <BackButton />
        <Link to={`/profil/${otherUserId}`} className="flex items-center gap-3 flex-1 z-10">
          {/* Avatar */}
          {showFounderHeader ? (
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden"
                   style={{ boxShadow: '0 0 0 2px #D4A017, 0 0 10px 3px rgba(212,160,23,0.4)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={otherUser?.username} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-nout-turquoise to-nout-lagon flex items-center justify-center font-bold text-white">
                      {otherUser?.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                }
              </div>
            </div>
          ) : (
            avatarUrl
              ? <img src={avatarUrl} alt={otherUser?.username} className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full bg-nout-primary text-white flex items-center justify-center font-bold">
                  {otherUser?.username?.[0]?.toUpperCase() ?? '?'}
                </div>
          )}
          {/* Nom + badge fondateur */}
          <div>
            <span className={`font-semibold text-sm ${showFounderHeader ? 'text-white' : 'text-nout-dark'}`}>
              {otherUser?.username}
            </span>
            {showFounderHeader && (
              <p className="text-[10px] font-bold" style={{ color: '#D4A017' }}>
                Membre Fondateur #{otherFounderNumber}
              </p>
            )}
          </div>
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
          {timeline.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              <p className="text-3xl mb-2"></p>
              Commence la conversation avec {otherUser?.username} !
            </div>
          )}

          {timeline.map((item) => {
            if (item.kind === 'offer') {
              return (
                <OfferBubble
                  key={`o-${item.data.id}`}
                  offer={item.data}
                  userId={user.id}
                  busy={offerBusy}
                  onRespond={handleRespond}
                  onPay={handlePayOffer}
                />
              )
            }
            const msg    = item.data
            const isMine = msg.sender_id === user.id
            return (
              <div key={`m-${msg.id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
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
          {msgError}
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
          
        </button>
      </form>

    </div>
  )
}
