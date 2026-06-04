import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../services/supabase'
import { formatRelativeDate } from '../../../utils/formatters'

export default function UsersList() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    supabase.from('profiles').select('id, username, email, role, city, created_at')
      .order('created_at', { ascending: false }).limit(100)
      .then(({ data }) => setUsers(data ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const changeRole = async (id, role) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Utilisateurs</h1>
      <input type="text" placeholder="Rechercher par pseudo ou email…" value={search}
        onChange={(e) => setSearch(e.target.value)} className="input-field mb-5 max-w-sm" />

      {loading ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Utilisateur</th>
                <th className="px-4 py-3 text-left">Ville</th>
                <th className="px-4 py-3 text-left">Inscrit</th>
                <th className="px-4 py-3 text-left">Rôle</th>
                <th className="px-4 py-3 text-left">Modifier rôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/utilisateurs/${u.id}`} className="font-medium text-nout-dark hover:text-nout-primary">{u.username}</Link>
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.city ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatRelativeDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-600' : u.role === 'moderator' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 cursor-pointer">
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Aucun utilisateur trouvé.</p>}
        </div>
      )}
    </div>
  )
}
