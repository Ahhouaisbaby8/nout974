import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../services/supabase'
import { formatRelativeDate } from '../../../utils/formatters'
import { adminAction } from '../../../lib/adminApi'

export default function UsersList() {
  const [users,      setUsers]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [banLoading, setBanLoading] = useState({})
  const [banError,   setBanError]   = useState({})

  useEffect(() => {
    // RPC admin sécurisée (renvoie email/téléphone/etc. uniquement aux admins).
    supabase.rpc('admin_accounts')
      .then(({ data }) => setUsers(
        (data ?? [])
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 100)
      ))
      .finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const changeRole = async (id, role) => {
    try {
      await adminAction('set_role', id, { role })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleBan = async (id, currentlyBanned) => {
    setBanLoading(prev => ({ ...prev, [id]: true }))
    setBanError(prev => ({ ...prev, [id]: null }))
    try {
      await adminAction(currentlyBanned ? 'unban_user' : 'ban_user', id)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: !currentlyBanned } : u))
    } catch (err) {
      setBanError(prev => ({ ...prev, [id]: err.message }))
    } finally {
      setBanLoading(prev => ({ ...prev, [id]: false }))
    }
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
                <th className="px-4 py-3 text-left">Actions</th>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-600' : u.role === 'moderator' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                        {u.role}
                      </span>
                      {u.is_banned && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">banni</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 cursor-pointer">
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isProtected = u.role === 'admin'
                      const isBanned    = u.is_banned === true
                      const isLoading   = !!banLoading[u.id]
                      return (
                        <div>
                          <button
                            disabled={isProtected || isLoading}
                            onClick={() => toggleBan(u.id, isBanned)}
                            title={isProtected ? 'Action impossible sur ce compte' : ''}
                            className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                              isProtected
                                ? 'text-gray-300 cursor-not-allowed'
                                : isBanned
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-red-500 hover:bg-red-50'
                            }`}
                          >
                            {isLoading ? '…' : isBanned ? 'Débannir' : 'Bannir'}
                          </button>
                          {banError[u.id] && (
                            <p className="text-xs text-red-500 mt-1 max-w-[120px]">{banError[u.id]}</p>
                          )}
                        </div>
                      )
                    })()}
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
