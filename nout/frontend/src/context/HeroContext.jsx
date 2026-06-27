import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

// Pilote l'apparence de la navbar selon qu'on survole le hero ou non.
//   overHero = true  → navbar transparente, texte blanc (sur le hero immersif)
//   overHero = false → navbar verre dépoli, texte sombre (sur le contenu)
const HeroContext = createContext({ overHero: false, registerHero: () => {} })

export const NAVBAR_HEIGHT = 64 // px — doit rester synchro avec la hauteur du <header>

export function HeroProvider({ children }) {
  const [overHero, setOverHero] = useState(false)

  // Le hero appelle registerHero(node) sur sa racine. Un IntersectionObserver
  // bascule overHero tant que le hero couvre la zone sous la navbar.
  const observerRef = useRef(null)
  const registerHero = useCallback((node) => {
    // Nettoie l'observer précédent
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node) {            // hero démonté (changement de page) → navbar solide
      setOverHero(false)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { rootMargin: `-${NAVBAR_HEIGHT}px 0px 0px 0px`, threshold: 0 },
    )
    obs.observe(node)
    observerRef.current = obs
  }, [])

  // Sécurité : déconnecte l'observer au démontage du provider
  useEffect(() => () => observerRef.current?.disconnect(), [])

  return (
    <HeroContext.Provider value={{ overHero, registerHero }}>
      {children}
    </HeroContext.Provider>
  )
}

// Pour la navbar : lit l'état courant.
export const useHeroOverlay = () => useContext(HeroContext)

// Pour le hero : attache ce ref-callback à sa racine pour piloter la navbar.
export function useHeroRef() {
  const { registerHero } = useContext(HeroContext)
  return registerHero
}
