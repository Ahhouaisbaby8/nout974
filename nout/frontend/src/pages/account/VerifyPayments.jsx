import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, ChevronLeft, Check } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'

// « Vérifier mon identité » — onboarding paiement 100 % DANS NOUT (zéro page Stripe dans le cas
// normal). Le vendeur remplit 4 petits écrans ; ses données (identité, IBAN) sont chiffrées et
// tokenisées DANS SON NAVIGATEUR directement chez Stripe (obligation PSD2 France) — elles ne
// passent jamais par les serveurs NOUT, qui ne reçoivent que des jetons à usage unique.
// Cas rares (vérification renforcée, ancien compte déjà actif) : repli sur le parcours sécurisé
// hébergé existant (create-connect-account, redirection).

const FN = '/.netlify/functions'

// ── Utilitaires locaux ────────────────────────────────────────────────────────────────────────

// 06/02 local → E.164. Réunion d'abord (0692/0693 mobile, 0262/0263 fixe), sinon métropole.
function toE164(input) {
  const p = input.replace(/[\s.\-()]/g, '')
  if (p.startsWith('+')) return p
  if (/^0(692|693|262|263)\d{6}$/.test(p)) return '+262' + p.slice(1)
  if (/^0[1-9]\d{8}$/.test(p)) return '+33' + p.slice(1)
  return p
}

// Contrôle IBAN complet (format + clé mod 97) — attrape les fautes de frappe AVANT l'envoi.
function ibanValid(raw) {
  const iban = raw.replace(/\s+/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false
  if (iban.startsWith('FR') && iban.length !== 27) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let rem = 0
  for (const ch of rearranged) {
    const v = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch
    for (const d of v) rem = (rem * 10 + Number(d)) % 97
  }
  return rem === 1
}

// Photo de pièce → JPEG couleur raisonnable (Stripe : JPG/PNG, ≤ 10 Mo, ≤ 8000 px).
async function compressImage(file, maxDim = 2400, quality = 0.88) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Photo illisible. Réessaie avec une autre photo.'))
      i.src = url
    })
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width  = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', quality))
    if (!blob) throw new Error('Photo illisible. Réessaie avec une autre photo.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

const STEPS_ORDER = ['identity', 'details', 'iban', 'confirm']

// Défini au niveau module (PAS dans le composant) : sinon React le recrée à chaque frappe et
// les inputs perdent le focus (clavier mobile qui se referme).
function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-[13px] font-medium text-nout-texte mb-1.5">{label}</span>
      {children}
    </label>
  )
}

export default function VerifyPayments() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // step : loading | intro | identity | details | iban | confirm | processing | document | fallback | done
  const [step, setStep]         = useState('loading')
  const [status, setStatus]     = useState(null)   // snapshot serveur (mode, needs, errors…)
  const [error, setError]       = useState('')
  const [busy, setBusy]         = useState(false)
  const [ibanOnly, setIbanOnly] = useState(false)  // compte déjà vérifié : changement d'IBAN seul

  const stripeRef  = useRef(null) // instance Stripe.js (chargée en fond, invisible)
  const pkRef      = useRef(null)
  const pollRef    = useRef(null)

  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '',
    dobDay: '', dobMonth: '', dobYear: '',
    line1: '', postalCode: '', city: '',
    ibanName: '', iban: '', acceptTos: false,
  })
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: v }))
  }

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token ?? ''}` }
  }, [])

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`${FN}/connect-kyc-status`, { method: 'POST', headers: await authHeaders() })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Chargement impossible.')
    return data
  }, [authHeaders])

  // Charge Stripe.js en arrière-plan (aucune UI Stripe : sert uniquement à chiffrer/tokeniser).
  const getStripe = useCallback(async () => {
    if (stripeRef.current) return stripeRef.current
    if (!pkRef.current) throw new Error('La vérification n\'est pas disponible pour le moment. Réessaie plus tard.')
    const { loadStripe } = await import('@stripe/stripe-js')
    const instance = await loadStripe(pkRef.current)
    if (!instance) throw new Error('La vérification n\'est pas disponible pour le moment. Réessaie plus tard.')
    stripeRef.current = instance
    return instance
  }, [])

  // Oriente le parcours selon l'état du compte.
  const routeFromStatus = useCallback((s) => {
    setStatus(s)
    // Compte rejeté par le prestataire (fraude, plateforme en pause…) : aucun formulaire n'y changera
    // rien — on ne laisse pas le vendeur tourner sur un spinner sans fin.
    if (s.disabledReason && /^rejected|platform_paused/.test(s.disabledReason)) { setStep('rejected'); return }
    if (s.mode === 'legacy') { setStep('fallback'); return }
    if (s.mode === 'api') {
      if (s.needsLiveness) { setStep('fallback'); return }
      if (s.payoutsEnabled && !s.needsDocument && !s.needsAdditionalDocument && !s.hasErrors) { setIbanOnly(true); setStep('done'); return }
      if (s.needsDocument || s.needsAdditionalDocument) { setStep('document'); return }
      if (s.hasErrors) {
        // Erreur de CHAMP (téléphone, âge, adresse…) : un document n'y changerait rien → on renvoie
        // au formulaire avec le message, pour corriger et re-soumettre.
        setError(s.errors.join(' '))
        setStep('identity')
        return
      }
      if (s.pendingVerification || s.detailsSubmitted) { setStep('processing'); return }
    }
    setStep('intro')
  }, [])

  const loadInitial = useCallback(async () => {
    setError('')
    setStep('loading')
    try {
      const s = await fetchStatus()
      pkRef.current = s.publishableKey ?? (import.meta.env.VITE_STRIPE_PUBLIC_KEY || null)
      if (!pkRef.current && s.mode !== 'legacy') {
        // Sans clé publique, la tokenisation navigateur est impossible : on n'embarque PAS le vendeur
        // dans 4 écrans voués à échouer — direction le parcours hébergé (qui n'en a pas besoin).
        setStatus(s)
        setStep('fallback')
        return
      }
      routeFromStatus(s)
    } catch (e) {
      setError(e.message)
      setStep('load-error')
    }
  }, [fetchStatus, routeFromStatus])

  useEffect(() => {
    loadInitial()
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [loadInitial])

  // Pendant « vérification en cours » : on re-lit le statut quelques fois (la vérif Stripe prend
  // souvent moins d'une minute), puis on laisse la main (le statut re-s'affiche dans Mon argent).
  useEffect(() => {
    if (step !== 'processing') return
    let tries = 0
    const tick = async () => {
      try {
        const s = await fetchStatus()
        setStatus(s)
        if (s.payoutsEnabled) { setIbanOnly(true); setStep('done'); return }
        if (s.disabledReason && /^rejected|platform_paused/.test(s.disabledReason)) { setStep('rejected'); return }
        if (s.needsLiveness) { setStep('fallback'); return }
        if (s.needsDocument || s.needsAdditionalDocument) { setStep('document'); return }
        if (s.hasErrors) { setError(s.errors.join(' ')); setStep('identity'); return }
      } catch { /* transitoire : on retentera */ }
      tries++
      if (tries < 20) pollRef.current = setTimeout(tick, 4500)
    }
    pollRef.current = setTimeout(tick, 3500)
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [step, fetchStatus])

  // ── Validation par écran ────────────────────────────────────────────────────────────────────
  const validate = (which) => {
    if (which === 'identity') {
      if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) return 'Indique ton prénom et ton nom (comme sur ta pièce d\'identité).'
      const e164 = toE164(form.phone)
      if (!/^\+\d{9,15}$/.test(e164)) return 'Le numéro de téléphone semble invalide (ex. 0692 12 34 56).'
    }
    if (which === 'details') {
      const d = Number(form.dobDay), m = Number(form.dobMonth), y = Number(form.dobYear)
      const date = new Date(y, m - 1, d)
      if (!y || !m || !d || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return 'La date de naissance semble invalide.'
      const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000)
      if (age < 18) return 'Il faut avoir 18 ans pour recevoir des paiements.'
      if (age > 120) return 'La date de naissance semble invalide.'
      if (form.line1.trim().length < 4) return 'Indique ton adresse (numéro et rue).'
      if (!/^\d{5}$/.test(form.postalCode.trim())) return 'Le code postal doit faire 5 chiffres (ex. 97400).'
      if (form.city.trim().length < 2) return 'Indique ta ville.'
    }
    if (which === 'iban') {
      if (form.ibanName.trim().length < 4) return 'Indique le nom du titulaire du compte.'
      if (!ibanValid(form.iban)) return 'Cet IBAN semble invalide. Vérifie-le (il commence par FR).'
    }
    if (which === 'confirm' && !ibanOnly) {
      if (!form.acceptTos) return 'Coche la case pour accepter les conditions du prestataire de paiement.'
    }
    return ''
  }

  const goNext = (from) => {
    const err = validate(from)
    if (err) { setError(err); return }
    setError('')
    const i = STEPS_ORDER.indexOf(from)
    setStep(STEPS_ORDER[i + 1] ?? 'confirm')
  }
  const goBack = (from) => {
    setError('')
    const i = STEPS_ORDER.indexOf(from)
    if (i > 0) setStep(STEPS_ORDER[i - 1])
    else setStep('intro')
  }

  // ── Soumission finale : tokens navigateur → Stripe, puis jetons → serveur NOUT ─────────────
  const submitAll = async () => {
    if (busy) return
    const err = validate('confirm') || validate('iban') || validate('details') || validate('identity')
    if (err) { setError(err); return }
    setError('')
    setBusy(true)
    try {
      const stripeJs = await getStripe()

      // 1) Identité + acceptation des conditions → jeton (les données partent chiffrées de TON
      //    navigateur vers Stripe ; NOUT ne les reçoit pas).
      const accountRes = await stripeJs.createToken('account', {
        business_type: 'individual',
        individual: {
          first_name: form.firstName.trim(),
          last_name:  form.lastName.trim(),
          email:      user?.email,
          phone:      toE164(form.phone),
          dob: { day: Number(form.dobDay), month: Number(form.dobMonth), year: Number(form.dobYear) },
          address: {
            line1:       form.line1.trim(),
            postal_code: form.postalCode.trim(),
            city:        form.city.trim(),
            country:     'FR',
          },
        },
        tos_shown_and_accepted: form.acceptTos,
      })
      if (accountRes.error) throw new Error('Une information n\'a pas pu être validée. Vérifie tes réponses et réessaie.')

      // 2) IBAN → jeton bancaire (même principe : jamais par NOUT).
      const iban = form.iban.replace(/\s+/g, '').toUpperCase()
      const bankRes = await stripeJs.createToken('bank_account', {
        country: iban.slice(0, 2),
        currency: 'eur',
        account_holder_name: form.ibanName.trim(),
        account_holder_type: 'individual',
        account_number: iban,
      })
      if (bankRes.error) throw new Error('Cet IBAN n\'a pas pu être validé. Vérifie-le et réessaie.')

      // 3) Les deux JETONS (aucune donnée en clair) partent au serveur NOUT.
      const res = await fetch(`${FN}/connect-kyc-submit`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ accountToken: accountRes.token.id, bankToken: bankRes.token.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.platformNotReady || data.mode === 'legacy') { setStatus(s => ({ ...(s ?? {}), ...data })); setStep('fallback'); return }
        throw new Error(data.error ?? 'Enregistrement impossible. Réessaie.')
      }
      routeAfterSubmit(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // Changement d'IBAN seul (compte déjà vérifié).
  const submitIbanOnly = async () => {
    if (busy) return
    const err = validate('iban')
    if (err) { setError(err); return }
    setError('')
    setBusy(true)
    try {
      const stripeJs = await getStripe()
      const iban = form.iban.replace(/\s+/g, '').toUpperCase()
      const bankRes = await stripeJs.createToken('bank_account', {
        country: iban.slice(0, 2), currency: 'eur',
        account_holder_name: form.ibanName.trim(), account_holder_type: 'individual',
        account_number: iban,
      })
      if (bankRes.error) throw new Error('Cet IBAN n\'a pas pu être validé. Vérifie-le et réessaie.')
      const res = await fetch(`${FN}/connect-kyc-submit`, {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ bankToken: bankRes.token.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible. Réessaie.')
      setIbanOnly(true)
      setStep('done')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const routeAfterSubmit = (s) => {
    setStatus(s)
    if (s.payoutsEnabled) { setIbanOnly(true); setStep('done'); return }
    if (s.disabledReason && /^rejected|platform_paused/.test(s.disabledReason)) { setStep('rejected'); return }
    if (s.needsLiveness) { setStep('fallback'); return }
    if (s.needsDocument || s.needsAdditionalDocument) { setStep('document'); return }
    if (s.hasErrors) { setError(s.errors.join(' ')); setStep('identity'); return }
    setStep('processing')
  }

  // ── Pièce d'identité (uniquement si Stripe la demande) ─────────────────────────────────────
  const [docFront, setDocFront] = useState(null)
  const [docBack, setDocBack]   = useState(null)

  const uploadDocFile = async (file) => {
    const blob = await compressImage(file)
    const fd = new FormData()
    fd.append('purpose', 'identity_document')
    fd.append('file', blob, 'piece-identite.jpg')
    // Envoi DIRECT navigateur → Stripe (clé publique) : la photo ne passe jamais par NOUT.
    const res = await fetch('https://files.stripe.com/v1/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${pkRef.current}` },
      body: fd,
    })
    const data = await res.json()
    if (!res.ok || !data.id) throw new Error('L\'envoi de la photo a échoué. Réessaie.')
    return data.id
  }

  // Slot Stripe visé par l'écran document : pièce d'identité (document) OU justificatif de
  // domicile (additional_document) — deux exigences distinctes, à ne JAMAIS croiser (sinon le
  // vendeur remplit le mauvais slot et tourne en boucle). Si les deux sont dus : la pièce d'abord.
  const docSlot = status?.needsDocument || !status?.needsAdditionalDocument ? 'document' : 'additional_document'

  const submitDocument = async () => {
    if (busy) return
    if (!docFront) { setError(docSlot === 'document' ? 'Ajoute la photo du recto de ta pièce d\'identité.' : 'Ajoute la photo de ton justificatif de domicile.'); return }
    setError('')
    setBusy(true)
    try {
      await getStripe() // s'assure que la clé publique est prête
      const frontId = await uploadDocFile(docFront)
      const backId  = docBack ? await uploadDocFile(docBack) : null
      const stripeJs = await getStripe()
      const tokenRes = await stripeJs.createToken('account', {
        business_type: 'individual',
        individual: { verification: { [docSlot]: { front: frontId, ...(backId ? { back: backId } : {}) } } },
      })
      if (tokenRes.error) throw new Error('La photo n\'a pas pu être validée. Réessaie.')
      const res = await fetch(`${FN}/connect-kyc-submit`, {
        method: 'POST', headers: await authHeaders(),
        body: JSON.stringify({ accountToken: tokenRes.token.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible. Réessaie.')
      setDocFront(null); setDocBack(null)
      routeAfterSubmit(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // ── Repli : parcours hébergé sécurisé existant (cas rares / ancien compte) ─────────────────
  const [fallbackLoading, setFallbackLoading] = useState(false)
  const startHostedFallback = async () => {
    if (fallbackLoading) return
    setError('')
    setFallbackLoading(true)
    try {
      const res = await fetch(`${FN}/create-connect-account`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Activation impossible. Réessaie.')
      window.location.href = data.url
    } catch (e) {
      setError(e.message)
      setFallbackLoading(false)
    }
  }

  // ── UI ──────────────────────────────────────────────────────────────────────────────────────

  const stepIndex = STEPS_ORDER.indexOf(step)
  const showProgress = stepIndex >= 0

  return (
    <div className="max-w-lg">
      {/* En-tête + retour */}
      <div className="flex items-center gap-2 mb-1">
        {step !== 'done' && (
          <button
            type="button"
            onClick={() => {
              if (step === 'iban-only') { setStep('done'); return }        // retour à l'écran « compte prêt »
              if (showProgress) { goBack(step) }                            // écran 1 → intro, sinon écran précédent
              else navigate('/compte/paiements')
            }}
            className="p-1 -ml-1 text-gray-400 hover:text-nout-texte"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="font-title text-[22px] font-bold text-nout-texte">
          {ibanOnly && step !== 'done' ? 'Changer mon IBAN' : 'Vérifier mon identité'}
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-5 leading-relaxed">
        Tout se passe ici, sur NOUT. Les informations de ce formulaire partent chiffrées directement
        chez notre prestataire de paiement agréé — elles ne passent pas par les serveurs de NOUT.
      </p>

      {/* Barre de progression sobre */}
      {showProgress && (
        <div className="flex gap-1.5 mb-6" aria-hidden="true">
          {STEPS_ORDER.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-[#0E8C82]' : 'bg-gray-200'}`} />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {step === 'loading' && (
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 rounded-2xl" />
          <div className="h-12 bg-gray-100 rounded-xl w-2/3" />
        </div>
      )}

      {/* ÉCRAN 0 — réassurance */}
      {step === 'intro' && (
        <div>
          <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] p-5 mb-5 space-y-4">
            {[
              ['Tu restes un particulier', 'Aucune entreprise à créer, aucun SIRET. Se vérifier ne fait pas de toi un professionnel.'],
              ['2 minutes, une seule fois', 'Ton nom, ta date de naissance, ton adresse et ton IBAN. C\'est tout, dans la plupart des cas.'],
              ['Ton IBAN sert uniquement à recevoir', 'Il permet de t\'envoyer tes gains. Il ne sert jamais à payer sur NOUT, et tout prélèvement non autorisé sur ton compte est remboursable par ta banque.'],
              ['C\'est la loi, comme sur Vinted ou Leboncoin', 'La vérification est une obligation légale anti-fraude, réalisée par Stripe, prestataire de paiement agréé. Elle garantit que la personne qui vend est bien celle qui reçoit l\'argent.'],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <ShieldCheck size={18} className="text-[#0E8C82] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-nout-texte">{title}</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{text}</p>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => { setError(''); setStep('identity') }} className="btn-primary w-full py-3 text-sm">
            Commencer — 2 minutes
          </button>

          {/* Questions fréquentes (honnêtes, sans promesse trompeuse) */}
          <div className="mt-6 space-y-2">
            {[
              ['Est-ce que je vais payer des impôts ?',
                'Vendre tes affaires personnelles d\'occasion n\'est en général pas imposable en France (sauf cas particuliers : métaux précieux, ou bijou/objet d\'art/de collection vendu plus de 5 000 €). La loi demande seulement aux plateformes (NOUT comme Vinted ou Leboncoin) de déclarer les vendeurs qui dépassent 30 ventes OU 2 000 € encaissés dans l\'année — c\'est une simple déclaration, pas un impôt, et tu en serais informé. En cas de doute sur ta situation : impots.gouv.fr.'],
              ['Est-ce que ça crée une entreprise ?',
                'Non. Recevoir l\'argent de tes ventes ne crée ni entreprise, ni SIRET, ni obligation URSSAF. Attention seulement si tu achètes pour revendre, ou si tu fabriques/crées des articles pour les vendre régulièrement : là, l\'activité devient professionnelle au sens de la loi et doit être déclarée — quelle que soit la plateforme.'],
              ['Qui voit mes informations ?',
                'Les informations de ce formulaire partent chiffrées de ton téléphone directement chez Stripe, le prestataire de paiement agréé qui sécurise les paiements de NOUT. Elles ne passent pas par les serveurs de NOUT et n\'y sont pas conservées.'],
              ['Pourquoi c\'est obligatoire ?',
                'C\'est la réglementation anti-blanchiment et anti-fraude (LCB-FT), la même pour toutes les plateformes de paiement. Elle sert à vérifier que l\'argent de tes ventes arrive bien à toi, et à personne d\'autre.'],
            ].map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-[#E6EAF0] px-4 py-3">
                <summary className="text-sm font-medium text-nout-texte cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-lg leading-none" aria-hidden="true">+</span>
                </summary>
                <p className="text-[13px] text-gray-500 leading-relaxed mt-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* ÉCRAN 1 — identité */}
      {step === 'identity' && (
        <form onSubmit={(e) => { e.preventDefault(); goNext('identity') }}>
          <Field label="Prénom (comme sur ta pièce d'identité)">
            <input type="text" className="input-field text-base" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} />
          </Field>
          <Field label="Nom">
            <input type="text" className="input-field text-base" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} />
          </Field>
          <Field label="Téléphone">
            <input type="tel" className="input-field text-base" autoComplete="tel" placeholder="0692 12 34 56" value={form.phone} onChange={set('phone')} />
          </Field>
          <button type="submit" className="btn-primary w-full py-3 text-sm mt-2">Continuer</button>
        </form>
      )}

      {/* ÉCRAN 2 — naissance + adresse */}
      {step === 'details' && (
        <form onSubmit={(e) => { e.preventDefault(); goNext('details') }}>
          <span className="block text-[13px] font-medium text-nout-texte mb-1.5">Date de naissance</span>
          <div className="flex gap-2 mb-4">
            <input type="text" inputMode="numeric" maxLength={2} placeholder="JJ" aria-label="Jour de naissance"
              className="input-field text-base w-1/4 text-center" value={form.dobDay} onChange={set('dobDay')} />
            <input type="text" inputMode="numeric" maxLength={2} placeholder="MM" aria-label="Mois de naissance"
              className="input-field text-base w-1/4 text-center" value={form.dobMonth} onChange={set('dobMonth')} />
            <input type="text" inputMode="numeric" maxLength={4} placeholder="AAAA" aria-label="Année de naissance"
              className="input-field text-base flex-1 text-center" value={form.dobYear} onChange={set('dobYear')} />
          </div>
          <Field label="Adresse (numéro et rue)">
            <input type="text" className="input-field text-base" autoComplete="address-line1" placeholder="12 rue du Général de Gaulle" value={form.line1} onChange={set('line1')} />
          </Field>
          <div className="flex gap-2">
            <div className="w-1/3">
              <Field label="Code postal">
                <input type="text" inputMode="numeric" maxLength={5} className="input-field text-base" autoComplete="postal-code" placeholder="97400" value={form.postalCode} onChange={set('postalCode')} />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Ville">
                <input type="text" className="input-field text-base" autoComplete="address-level2" placeholder="Saint-Denis" value={form.city} onChange={set('city')} />
              </Field>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-3 text-sm mt-2">Continuer</button>
        </form>
      )}

      {/* ÉCRAN 3 — IBAN */}
      {(step === 'iban' || (ibanOnly && step === 'iban-only')) && (
        <form onSubmit={(e) => { e.preventDefault(); if (ibanOnly) submitIbanOnly(); else goNext('iban') }}>
          <p className="text-[13px] text-gray-500 leading-relaxed bg-[#F8FAFC] border border-[#E6EAF0] rounded-lg px-3 py-2 mb-4">
            Ton IBAN sert uniquement à recevoir tes virements. Il part chiffré directement chez le
            prestataire de paiement — il ne passe pas par les serveurs de NOUT.
          </p>
          <Field label="Titulaire du compte">
            <input type="text" className="input-field text-base" autoComplete="name" value={form.ibanName} onChange={set('ibanName')} />
          </Field>
          <Field label="IBAN">
            <input type="text" className="input-field text-base font-mono tracking-wide" autoComplete="off" spellCheck={false}
              placeholder="FR76 …" value={form.iban} onChange={set('iban')} />
          </Field>
          <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-sm mt-2 disabled:opacity-60">
            {ibanOnly ? (busy ? 'Enregistrement…' : 'Enregistrer mon nouvel IBAN') : 'Continuer'}
          </button>
        </form>
      )}

      {/* ÉCRAN 4 — récap + validation */}
      {step === 'confirm' && (
        <div>
          <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] p-4 mb-4 text-sm text-nout-texte space-y-1.5">
            <p><span className="text-gray-500">Nom :</span> {form.firstName} {form.lastName}</p>
            <p><span className="text-gray-500">Naissance :</span> {form.dobDay}/{form.dobMonth}/{form.dobYear}</p>
            <p><span className="text-gray-500">Adresse :</span> {form.line1}, {form.postalCode} {form.city}</p>
            <p><span className="text-gray-500">IBAN :</span> ···· {form.iban.replace(/\s+/g, '').slice(-4)}</p>
          </div>

          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input type="checkbox" checked={form.acceptTos} onChange={set('acceptTos')} className="mt-1 accent-[#0E8C82]" />
            <span className="text-[13px] text-gray-500 leading-relaxed">
              Les paiements sont traités par Stripe, prestataire de paiement de NOUT. J'accepte le{' '}
              <a href="https://stripe.com/fr/legal/connect-account" target="_blank" rel="noopener noreferrer" className="text-[#0E8C82] underline">
                Stripe Connected Account Agreement
              </a>
              , qui inclut les{' '}
              <a href="https://stripe.com/fr/legal/ssa" target="_blank" rel="noopener noreferrer" className="text-[#0E8C82] underline">
                Stripe Terms of Service
              </a>
              , tels que Stripe peut les modifier de temps à autre, et j'autorise NOUT à transmettre à
              Stripe les informations de ce formulaire ainsi que celles liées à mes ventes.{' '}
              <a href="https://stripe.com/fr/privacy" target="_blank" rel="noopener noreferrer" className="text-[#0E8C82] underline">
                Politique de confidentialité Stripe
              </a>{' '}
              ·{' '}
              <Link to="/legal/confidentialite" className="text-[#0E8C82] underline">
                Politique de confidentialité NOUT
              </Link>.
            </span>
          </label>

          <button type="button" onClick={submitAll} disabled={busy} className="btn-primary w-full py-3 text-sm disabled:opacity-60">
            {busy ? 'Vérification en cours…' : 'Valider ma vérification'}
          </button>
        </div>
      )}

      {/* Vérification en cours */}
      {step === 'processing' && (
        <div className="text-center py-8">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-[#0E8C82] border-t-transparent animate-spin" aria-hidden="true" />
          <p className="text-sm font-semibold text-nout-texte mb-1">Vérification en cours</p>
          <p className="text-[13px] text-gray-500 leading-relaxed max-w-sm mx-auto">
            C'est souvent l'affaire de quelques minutes. Tu peux quitter cette page : ton statut se
            mettra à jour tout seul dans « Mon argent ».
          </p>
          <Link to="/compte/paiements" className="inline-block mt-5 text-sm text-[#0E8C82] font-medium hover:underline">
            Revenir à Mon argent
          </Link>
        </div>
      )}

      {/* Document (demandé seulement si nécessaire) : pièce d'identité OU justificatif de domicile */}
      {step === 'document' && (
        <div>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">
            {docSlot === 'document'
              ? 'Pour finaliser, ajoute une photo de ta pièce d\'identité (carte d\'identité ou passeport). Elle part chiffrée directement chez le prestataire de paiement — elle ne passe pas par NOUT.'
              : 'Pour finaliser, ajoute une photo d\'un justificatif de domicile récent (facture d\'électricité, d\'eau, de téléphone ou avis d\'imposition). Il part chiffré directement chez le prestataire de paiement — il ne passe pas par NOUT.'}
          </p>
          {status?.errors?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[13px] rounded-lg px-3 py-2 mb-3 space-y-1">
              {status.errors.map((m) => <p key={m}>{m}</p>)}
            </div>
          )}
          <p className="text-[12px] text-gray-400 mb-4">Photo en couleur, nette, document entier visible. JPG ou PNG.</p>

          <Field label={docSlot === 'document' ? 'Recto (obligatoire)' : 'Justificatif (obligatoire)'}>
            <input type="file" accept="image/jpeg,image/png,image/*"
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#F8FAFC] file:px-4 file:py-2 file:text-sm file:font-medium file:text-nout-texte hover:file:bg-gray-100"
              onChange={(e) => setDocFront(e.target.files?.[0] ?? null)} />
          </Field>
          {docSlot === 'document' && (
            <Field label="Verso (si carte d'identité)">
              <input type="file" accept="image/jpeg,image/png,image/*"
                className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#F8FAFC] file:px-4 file:py-2 file:text-sm file:font-medium file:text-nout-texte hover:file:bg-gray-100"
                onChange={(e) => setDocBack(e.target.files?.[0] ?? null)} />
            </Field>
          )}

          <button type="button" onClick={submitDocument} disabled={busy || !docFront} className="btn-primary w-full py-3 text-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {busy ? 'Envoi en cours…' : docSlot === 'document' ? 'Envoyer ma pièce d\'identité' : 'Envoyer mon justificatif'}
          </button>
        </div>
      )}

      {/* Échec de chargement du statut au démarrage */}
      {step === 'load-error' && (
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-nout-texte mb-1">Impossible de charger ton statut</p>
          <p className="text-[13px] text-gray-500 leading-relaxed max-w-sm mx-auto mb-5">
            Vérifie ta connexion puis réessaie.
          </p>
          <button type="button" onClick={loadInitial} className="btn-primary px-6 py-3 text-sm">
            Réessayer
          </button>
        </div>
      )}

      {/* Vérification refusée par le prestataire : aucun formulaire n'y changera rien */}
      {step === 'rejected' && (
        <div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Ta vérification n'a pas pu aboutir auprès de notre prestataire de paiement. Écris-nous à{' '}
            <a href="mailto:contact@nout.re" className="text-[#0E8C82] underline">contact@nout.re</a>{' '}
            pour qu'on regarde ça ensemble.
          </p>
          <Link to="/compte/paiements" className="btn-primary inline-block px-6 py-3 text-sm">
            Revenir à Mon argent
          </Link>
        </div>
      )}

      {/* Repli : étape sécurisée hébergée (cas rares / ancien compte) */}
      {step === 'fallback' && (
        <div>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {status?.platformNotReady
              ? 'La vérification directe sur NOUT arrive bientôt. En attendant, tu peux te vérifier via la page sécurisée de notre prestataire de paiement — ça prend quelques minutes, puis tu reviens automatiquement sur NOUT.'
              : status?.mode === 'legacy'
                ? 'Ton compte de paiement a été créé avec notre ancien parcours : il se gère via la page sécurisée de notre prestataire de paiement.'
                : 'Pour ton compte, notre prestataire de paiement demande une étape de vérification renforcée (c\'est rare, et c\'est lui qui l\'exige — pas NOUT). Elle se fait sur sa page sécurisée, puis tu reviens automatiquement sur NOUT.'}
          </p>
          <button type="button" onClick={startHostedFallback} disabled={fallbackLoading} className="btn-primary w-full py-3 text-sm disabled:opacity-60">
            {fallbackLoading ? 'Redirection…' : 'Continuer la vérification sécurisée'}
          </button>
          <Link to="/compte/paiements" className="inline-block mt-4 text-sm text-gray-400 hover:underline">
            Plus tard
          </Link>
        </div>
      )}

      {/* Terminé */}
      {step === 'done' && (
        <div className="text-center py-8">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
            <Check size={22} className="text-green-600" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-nout-texte mb-1">
            {status?.payoutsEnabled ? 'Ton compte est prêt' : 'C\'est enregistré'}
          </p>
          <p className="text-[13px] text-gray-500 leading-relaxed max-w-sm mx-auto mb-5">
            {status?.payoutsEnabled
              ? 'Tu peux recevoir l\'argent de tes ventes et le retirer quand tu veux depuis « Mon argent ».'
              : 'Ton statut se mettra à jour dans « Mon argent ».'}
          </p>
          {ibanOnly && status?.payoutsEnabled && step === 'done' && (
            <button type="button" onClick={() => { setError(''); setStep('iban-only') }} className="block mx-auto mb-3 text-sm text-[#0E8C82] font-medium hover:underline">
              Changer mon IBAN
            </button>
          )}
          <Link to="/compte/paiements" className="btn-primary inline-block px-6 py-3 text-sm">
            Aller à Mon argent
          </Link>
        </div>
      )}

      {/* Mention PSP (transparence) */}
      <p className="text-xs text-gray-400 mt-8 leading-relaxed border-t border-gray-100 pt-4">
        La vérification d'identité est une obligation légale (lutte anti-fraude et anti-blanchiment)
        qui s'applique à toutes les plateformes de paiement. Elle est réalisée par Stripe, prestataire
        de services de paiement agréé — les documents et l'IBAN saisis ici sont transmis chiffrés à
        Stripe, sans passer par les serveurs de NOUT.
      </p>
    </div>
  )
}
