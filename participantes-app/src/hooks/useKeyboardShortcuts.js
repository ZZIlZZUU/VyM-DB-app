import { useEffect, useRef } from 'react'

const isTyping = () => {
  const tag = document.activeElement?.tagName?.toLowerCase()
  return ['input', 'textarea', 'select'].includes(tag)
    || document.activeElement?.isContentEditable
}

export function useKeyboardShortcuts({ onOpenPalette, onNavigate, onOpenPerfil }) {
  const gPending = useRef(false)
  const gTimer   = useRef(null)

  useEffect(() => {
    function handler(e) {
      // Ctrl+K / Cmd+K → paleta
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        onOpenPalette()
        return
      }

      if (isTyping()) return

      // Secuencia G + letra
      if (e.key === 'g' || e.key === 'G') {
        gPending.current = true
        clearTimeout(gTimer.current)
        gTimer.current = setTimeout(() => { gPending.current = false }, 800)
        return
      }

      if (gPending.current) {
        gPending.current = false
        clearTimeout(gTimer.current)
        const map = {
          i: 'home',
          w: 'semanal',
          e: 'editable',
          s: 'sql',
          p: 'personas',
          r: 'registros',
          o: 'programa',
          u: 'usuarios',
          x: 'exportar',
          t: 'estadisticas',
          h: 'historial',
        }
        const dest = map[e.key.toLowerCase()]
        if (dest) {
          e.preventDefault()
          onNavigate(dest)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(gTimer.current)
    }
  }, [onOpenPalette, onNavigate, onOpenPerfil])
}
