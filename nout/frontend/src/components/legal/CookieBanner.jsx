import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('nout_cookie_consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('nout_cookie_consent', 'all')
    setVisible(false)
  }

  const refuse = () => {
    localStorage.setItem('nout_cookie_consent', 'essential')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-nout-secondary border-t-2 border-nout-primary p-5 z-[1000] shadow-lg md:bottom-0 bottom-16">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm text-nout-dark text-center sm:text-left">
          Nous utilisons des cookies pour améliorer votre expérience sur NOUT.{' '}
          <Link to="/legal/cookies" className="text-nout-primary underline">
            Politique cookies
          </Link>
        </p>
        <div className="flex gap-3 shrink-0">
          <button
            onClick={refuse}
            className="px-4 py-2 border-2 border-nout-primary text-nout-primary rounded-nout text-sm hover:bg-nout-primary hover:text-white transition-all"
          >
            Refuser marketing
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 bg-nout-primary text-white rounded-nout text-sm hover:bg-[#E55A25] transition-all"
          >
            Accepter tout
          </button>
        </div>
      </div>
    </div>
  )
}
