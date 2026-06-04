import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../services/supabase'
import { formatPrice, formatRelativeDate } from '../../../utils/formatters'
import { CATEGORIES, CONDITIONS } from '../../../utils/categories'

export default function ListingReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)

  useEffect(() => {
    supabase.from('listings').select('*, profiles(username, email, city)').eq('id', id).single()
      .then(({ data }) => setListing(data))
  }, [id])

  const update = async (updates) => {
    await supabase.from('listings').update(updates).eq('id', id)
    setListing(prev => ({ ...prev, ...updates }))
  }

  if (!listing) return <p className="text-gray-400 text-sm">Chargement…</p>

  const category  = CATEGORIES.find(c => c.id === listing.category)
  const condition = CONDITIONS.find(c => c.id === listing.condition)

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate('/admin/annonces')} className="text-sm text-nout-primary hover:underline mb-4 block">
        ← Retour à la liste
      </button>
      <h1 className="text-xl font-extrabold text-nout-dark mb-6">Revue de l'annonce</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        {listing.images?.[0] && <img src={listing.images[0]} className="w-full h-56 object-cover rounded-lg" alt="" />}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Titre</p><p className="font-medium">{listing.title}</p></div>
          <div><p className="text-xs text-gray-400">Prix</p><p className="font-bold text-nout-primary">{formatPrice(listing.price)}</p></div>
          <div><p className="text-xs text-gray-400">Catégorie</p><p>{category?.icon} {category?.label}</p></div>
          <div><p className="text-xs text-gray-400">État</p><p>{condition?.label}</p></div>
          <div><p className="text-xs text-gray-400">Ville</p><p>{listing.city}</p></div>
          <div><p className="text-xs text-gray-400">Publié</p><p>{formatRelativeDate(listing.created_at)}</p></div>
          <div><p className="text-xs text-gray-400">Vendeur</p><p>{listing.profiles?.username}</p></div>
          <div><p className="text-xs text-gray-400">Email</p><p className="truncate">{listing.profiles?.email}</p></div>
        </div>

        {listing.description && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Description</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={() => update({ is_active: !listing.is_active })}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${listing.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
            {listing.is_active ? 'Désactiver' : 'Réactiver'}
          </button>
          <a href={`/annonce/${id}`} target="_blank" rel="noreferrer"
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-gray-50 text-gray-600 hover:bg-gray-100 text-center">
            Voir en public
          </a>
        </div>
      </div>
    </div>
  )
}
