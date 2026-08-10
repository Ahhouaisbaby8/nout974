import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { formatPrice } from '../../utils/formatters'

// ─── Mes clients ───────────────────────────────────────────────────────────────────
// L'avantage que le vendeur attend d'une vraie boutique : savoir qui achète chez lui.
// Reconstruit depuis SES commandes — aucune table nouvelle, aucune donnée collectée en
// plus. On n'affiche que ce que la relation commerciale justifie : le pseudo, le nombre
// de commandes, le total, la date de la dernière, et un lien vers la messagerie NOUT.
//
// Volontairement PAS d'e-mail ni d'adresse : ces données servent à exécuter la commande
// et à respecter la garantie légale, pas à constituer un fichier de prospection. Un
// export les mettrait entre les mains du vendeur sans base légale claire ni information
// des acheteurs — c'est le genre de raccourci qui coûte cher.

const NON_COMPTEES = new Set(['cancelled', 'refunded', 'disputed', 'pending', 'failed', 'expired'])

export default function ProClients() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!user) return
    let vivant = true
    ;(async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, status, total_price, created_at, buyer_id, buyer:profiles!buyer_id(id, username, avatar_url)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      if (vivant) setRows(data ?? [])
    })()
    return () => { vivant = false }
  }, [user])

  const clients = useMemo(() => {
    const m = new Map()
    for (const o of rows || []) {
      if (NON_COMPTEES.has(o.status)) continue
      const id = o.buyer_id
      if (!id) continue
      const c = m.get(id) || { id, nom: o.buyer?.username || 'Membre NOUT', avatar: o.buyer?.avatar_url, n: 0, total: 0, derniere: o.created_at }
      c.n += 1
      c.total += Number(o.total_price) || 0
      if (o.created_at > c.derniere) c.derniere = o.created_at
      m.set(id, c)
    }
    const list = [...m.values()].sort((a, b) => b.total - a.total)
    const t = q.trim().toLowerCase()
    return t ? list.filter((c) => c.nom.toLowerCase().includes(t)) : list
  }, [rows, q])

  const fideles = clients.filter((c) => c.n > 1).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <title>Mes clients — NOUT Pro</title>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="font-title text-[22px] font-semibold text-nout-texte">Mes clients</h1>
        <div className="flex-1" />
        <Link to="/espace-pro" className="text-[12.5px] font-semibold text-nout-turquoise">Espace pro</Link>
      </div>
      <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
        Les personnes qui ont acheté chez toi, reconstruites depuis tes commandes.
      </p>

      {rows === null && <p className="text-[13px] text-gray-400">Chargement…</p>}

      {rows !== null && clients.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
          <p className="text-[13.5px] text-gray-500">Aucun client pour le moment.</p>
          <p className="text-[12.5px] text-gray-400 mt-1">Ils apparaîtront ici dès ta première vente.</p>
        </div>
      )}

      {clients.length > 0 && (
        <>
          <div className="flex gap-3 flex-wrap mb-4">
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <p className="font-title text-[20px] font-semibold text-nout-texte leading-none">{clients.length}</p>
              <p className="text-[11.5px] text-gray-400 mt-1">client{clients.length > 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3">
              <p className="font-title text-[20px] font-semibold text-nout-texte leading-none">{fideles}</p>
              <p className="text-[11.5px] text-gray-400 mt-1">revenu{fideles > 1 ? 's' : ''} au moins deux fois</p>
            </div>
          </div>

          <input className="input-field !py-2 !text-[13px] mb-3" placeholder="Chercher un client"
                 value={q} onChange={(e) => setQ(e.target.value)} />

          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            {clients.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i ? 'border-t border-gray-100' : ''}`}>
                <span className="w-9 h-9 rounded-full bg-[#EAF5F3] text-[#0B716A] text-[13px] font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full object-cover" /> : c.nom.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-nout-texte truncate">{c.nom}</p>
                  <p className="text-[11.5px] text-gray-400">
                    {c.n} commande{c.n > 1 ? 's' : ''} · dernière le {new Date(c.derniere).toLocaleDateString('fr-FR')}
                    {c.n > 1 && <span className="text-[#0B716A] font-semibold"> · fidèle</span>}
                  </p>
                </div>
                <p className="text-[13.5px] font-semibold text-nout-texte tabular-nums flex-shrink-0">{formatPrice(c.total)}</p>
                <Link to={`/profil/${c.id}`} className="text-[12px] font-semibold text-nout-turquoise flex-shrink-0">Voir</Link>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[11.5px] text-gray-400 leading-relaxed mt-4">
        Les coordonnées de tes acheteurs ne sont pas affichées ici et ne sont pas exportables : elles
        servent à exécuter la commande, pas à constituer un fichier de prospection. Pour les recontacter,
        passe par la messagerie NOUT — ils sont prévenus et peuvent refuser.
      </p>
    </div>
  )
}
