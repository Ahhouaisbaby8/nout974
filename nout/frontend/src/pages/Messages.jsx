import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getConversations } from '../services/messages'
import { supabase } from '../services/supabase'
import { formatRelativeDate } from '../utils/formatters'
import { getAvatarUrl } from '../utils/avatar'

const WELCOME_KEY = 'nout_welcome_seen'

const WELCOME_MESSAGE = {
  id: '__welcome__',
  isWelcome: true,
  content: `Bienvenue sur NOUT ! 🎉\n\nNOUT c'est la marketplace 100 % réunionnaise pour acheter et vendre tes articles de seconde main entre particuliers.\n\n👉 Pour faire ta première vente :\n1. 📸 Publie une annonce — prends une belle photo, décris ton article et fixe ton prix.\n2. 💬 Réponds aux messages — les acheteurs te contacteront ici.\n3. 🤝 Finalise la vente — échangez et concluez la transaction en toute sécurité.\n\nBonne vente ! 🛍️\nL'équipe NOUT`,
}

export default function Messages() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)

  const loadConversations = useCallback(async () => {
    try {
      const msgs = await getConversations(user.id)
      const map = new Map()
      for (const msg of msgs) {
        // Null safety : le profil peut être absent si le compte a été supprimé
        const senderId = msg.sender?.id ?? msg.sender_id
        const other = senderId === user.id ? msg.receiver : msg.sender
        if (!other) continue
        if (!map.has(other.id)) {
          map.set(other.id, { other, lastMessage: msg, unread: 0 })
        }
        if (!msg.is_read && msg.receiver_id === user.id) {
          map.get(other.id).unread++
        }
      }
      setConversations(Array.from(map.values()))
    } catch {
      setConversations([])
    }
  }, [user.id])

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) setShowWelcome(true)
    loadConversations().finally(() => setLoading(false))
  }, [loadConversations])

  // Temps réel : mise à jour de la liste quand un message arrive
  useEffect(() => {
    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => loadConversations())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user.id, loadConversations])

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_KEY, '1')
    setShowWelcome(false)
  }


  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-nout-dark mb-5">Messages</h1>

      {/* Message de bienvenue NOUT */}
      {showWelcome && (
        <div className="bg-white rounded-2xl shadow-sm border-l-4 border-nout-primary p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-nout-primary text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">
              N
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold text-nout-dark text-sm">L'équipe NOUT</p>
                <span className="text-xs text-gray-400">Maintenant</span>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {WELCOME_MESSAGE.content}
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => navigate('/publier')}
                  className="btn-primary px-4 py-2 text-xs"
                >
                  📸 Publier une annonce
                </button>
                <button
                  onClick={dismissWelcome}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste des conversations */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-4 border-nout-border border-t-nout-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : conversations.length === 0 && !showWelcome ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">💬</p>
          <p className="text-base font-semibold text-nout-dark">Aucun message pour le moment</p>
          <p className="text-sm mt-1">Quand quelqu'un te contactera, le message apparaîtra ici.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map(({ other, lastMessage, unread }) => {
            const avatarUrl = getAvatarUrl(other?.avatar_url)
            const isMine = lastMessage.sender_id === user.id
            return (
              <button
                key={other.id}
                onClick={() => navigate(`/messages/${other.id}`)}
                className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3 text-left w-full"
              >
                {/* Point bleu — indicateur non lu (largeur fixe pour aligner toutes les lignes) */}
                <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full transition-all ${unread > 0 ? 'bg-[#1A3A8F]' : 'bg-transparent'}`} />

                {/* Avatar */}
                {avatarUrl ? (
                  <img src={avatarUrl} alt={other.username} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-nout-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {other.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate ${unread > 0 ? 'font-semibold text-[#1A1A2E]' : 'font-medium text-gray-700'}`}>
                      {other.username}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {formatRelativeDate(lastMessage.created_at)}
                    </span>
                  </div>
                  <p className={`text-sm truncate mt-0.5 ${unread > 0 ? 'font-semibold text-[#1A1A2E]' : 'text-gray-400'}`}>
                    {isMine ? 'Toi : ' : ''}{lastMessage.content}
                  </p>
                </div>

                {/* Badge non lu */}
                {unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-nout-primary text-white text-xs flex items-center justify-center flex-shrink-0">
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
