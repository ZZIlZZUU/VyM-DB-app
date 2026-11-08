import { useState, useEffect } from 'react'

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

/**
 * Hook reactivo para detectar el entorno activo:
 * - isDesktop: >= 768px (Entorno de Escritorio: tablas densas, sheets laterales, atajos de teclado)
 * - isMobile:  < 768px  (Entorno Móvil 19.5:9: tarjetas verticales, bottom sheets con Vaul, bottom nav)
 */
export function useEnvironment() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return true
    }
    return window.matchMedia(DESKTOP_MEDIA_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mql = window.matchMedia(DESKTOP_MEDIA_QUERY)
    const handleChange = event => {
      setIsDesktop(event.matches)
    }

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return {
    isDesktop,
    isMobile: !isDesktop,
  }
}

export default useEnvironment
