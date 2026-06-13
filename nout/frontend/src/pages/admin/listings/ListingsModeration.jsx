import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../services/supabase'
import { formatRelativeDate } from '../../../utils/formatters'
import { adminAction } from '../../../lib/adminApi'

export default function ListingsModeration() {
  const [listings, setListings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('listings')
      .select('id, title, price, category, city, is_active, is_sold, created_at, images, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filter === 'active')   q = q.eq('is_active', true).eq('is_sold', false)
    if (filter === 'inactive') q = q.eq('is_active', false)
    if (filter === 'sold')     q = q.eq('is_sold', true)

    q.then(({ data }) => setListings(data ?? [])).finally(() => setLoading(false))
  }, [filter])

  const toggle = async (id, newValue) => {
    try {
      await adminAction(newValue ? 'restore_listing' : 'suspend_listing', id)
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_active: newValue } : l))
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Modération des annonces</h1>

      <div className="flex gap-2 mb-5">
        {[['all','Toutes'],['active','Actives'],['inactive','Inactives'],['sold','Vendues']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === val ? 'bg-nout-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Annonce</th>
                <th className="px-4 py-3 text-left">Vendeur</th>
                <th className="px-4 py-3 text-left">Prix</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listings.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {l.images?.[0]
                        ? <img src={l.images[0]} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                        : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">📷</div>
                      }
                      <div>
                        <Link to={`/admin/annonces/${l.id}`} className="font-medium text-nout-dark hover:text-nout-primary truncate block max-w-[200px]">
                          {l.title}
                        </Link>
                        <p className="text-xs text-gray-400">{l.city} · {formatRelativeDate(l.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{l.profiles?.username ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-nout-primary">{l.price} €</td>
                  <td className="px-4 py-3">
                    {l.is_sold
                      ? <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">Vendue</span>
                      : l.is_active
                        ? <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">Active</span>
                        : <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full">Désactivée</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/annonce/${l.id}`} target="_blank" className="text-xs text-gray-400 hover:text-nout-primary">Voir</Link>
                      {!l.is_sold && (
                        <button onClick={() => toggle(l.id, !l.is_active)}
                          className={`text-xs ${l.is_active ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}`}>
                          {l.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listings.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Aucune annonce.</p>}
        </div>
      )}
    </div>
  )
}
