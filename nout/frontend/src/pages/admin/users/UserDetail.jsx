import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../services/supabase'
import { formatRelativeDate } from '../../../utils/formatters'
import ListingCard from '../../../components/ui/ListingCard'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile,  setProfile]  = useState(null)
  const [listings, setListings] = useState([])
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.rpc('admin_accounts'),
      supabase.from('listings').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    ]).then(([{ data: accts }, { data: l }]) => {
      setProfile((accts ?? []).find(a => a.id === id) ?? null)
      setListings(l ?? [])
    }).catch((err) => {
      console.error('[admin] chargement du profil utilisateur échoué :', err?.message)
      setLoadError(true)
    })
  }, [id])

  if (loadError) return <p className="text-red-500 text-sm">Impossible de charger cet utilisateur. Réessaie.</p>
  if (!profile) return <p className="text-gray-400 text-sm">Chargement…</p>

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/admin/utilisateurs')} className="text-sm text-nout-primary hover:underline mb-4 block">← Retour</button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-nout-primary text-white flex items-center justify-center text-2xl font-bold">
            {profile.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-nout-dark">{profile.username}</h1>
            <p className="text-sm text-gray-400">{profile.email}</p>
          </div>
          <span className={`ml-auto text-xs px-3 py-1 rounded-full ${profile.role === 'admin' ? 'bg-red-100 text-red-600' : profile.role === 'moderator' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
            {profile.role}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Ville</p><p>{profile.city ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400">Inscrit</p><p>{formatRelativeDate(profile.created_at)}</p></div>
          <div><p className="text-xs text-gray-400">Téléphone</p><p>{profile.phone ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400">Stripe</p><p className="text-xs truncate">{profile.stripe_account_id ?? 'Non connecté'}</p></div>
        </div>
        {profile.bio && <p className="mt-3 text-sm text-gray-500 italic">"{profile.bio}"</p>}
      </div>

      <h2 className="font-bold text-nout-dark mb-3">Annonces ({listings.length})</h2>
      {listings.length === 0
        ? <p className="text-sm text-gray-400">Aucune annonce.</p>
        : <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{listings.map(l => <ListingCard key={l.id} listing={l} />)}</div>
      }
    </div>
  )
}
