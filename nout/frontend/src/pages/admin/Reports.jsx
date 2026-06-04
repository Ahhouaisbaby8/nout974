import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { formatRelativeDate } from '../../utils/formatters'

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('pending')

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('reports')
      .select(`id, reason, details, status, created_at,
        reporter:profiles!reporter_id(username),
        listings(id, title)`)
      .order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    q.then(({ data }) => setReports(data ?? [])).finally(() => setLoading(false))
  }, [filter])

  const resolve = async (id, status) => {
    await supabase.from('reports').update({ status }).eq('id', id)
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-nout-dark mb-6">Signalements</h1>

      <div className="flex gap-2 mb-5">
        {[['pending','En attente'],['resolved','Résolus'],['ignored','Ignorés'],['all','Tous']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === val ? 'bg-nout-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Chargement…</p> : (
        <div className="flex flex-col gap-3">
          {reports.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Aucun signalement.</p>}
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold text-nout-dark text-sm">
                    Signalé par <span className="text-nout-primary">{r.reporter?.username}</span>
                    {r.listings && <> → <Link to={`/annonce/${r.listings.id}`} target="_blank" className="text-nout-primary hover:underline">"{r.listings.title}"</Link></>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatRelativeDate(r.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {r.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1"><strong>Motif :</strong> {r.reason}</p>
              {r.details && <p className="text-sm text-gray-500 italic">{r.details}</p>}
              {r.status === 'pending' && (
                <div className="flex gap-3 mt-3">
                  <button onClick={() => resolve(r.id, 'resolved')} className="text-sm text-green-600 font-semibold hover:underline">✅ Résoudre</button>
                  <button onClick={() => resolve(r.id, 'ignored')}  className="text-sm text-gray-400 hover:underline">Ignorer</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
