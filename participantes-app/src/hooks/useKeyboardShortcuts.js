import { useEffect, useRef } from 'react'
import {
  KEYBIND_DEFINITIONS,
  loadKeybinds,
  matchesBindingEvent,
  normalizeKeyToken,
  parseSequenceBinding,
} from '../lib/keybinds'

function isTyping() {
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName?.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    active.isContentEditable
  )
}

function bindingUsesModifier(binding) {
  return (
    typeof binding === 'string' &&
    (binding.includes('Mod+') || binding.includes('Alt+'))
  )
}

/**
 * Atajos globales de teclado de la aplicación leídos dinámicamente desde
 * `localStorage` (`app_keybinds`) y sincronizados al editarse desde Perfil.
 */
export function useKeyboardShortcuts({
  onOpenPalette,
  onNavigate,
  onOpenPerfil,
  onToggleTheme,
  onExportS140,
  onOpenShortcutsHelp,
  onOpenNuevaAsignacion,
}) {
  const waitingLeaderRef = useRef(null)
  const heldLeaderRef = useRef(null)
  const gTimer = useRef(null)
  const bindingsRef = useRef(loadKeybinds())

  useEffect(() => {
    const syncBindings = () => {
      bindingsRef.current = loadKeybinds()
    }
    window.addEventListener('preferences-updated', syncBindings)
    window.addEventListener('storage', syncBindings)
    return () => {
      window.removeEventListener('preferences-updated', syncBindings)
      window.removeEventListener('storage', syncBindings)
    }
  }, [])

  useEffect(() => {
    function clearLeader() {
      waitingLeaderRef.current = null
      if (gTimer.current) {
        clearTimeout(gTimer.current)
        gTimer.current = null
      }
    }

    function handler(e) {
      if (e.defaultPrevented) return
      if (document.body?.dataset?.recordingKeybind === 'true') return

      const modKeyOnly =
        e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta'
      if (modKeyOnly) return

      const currentBindings = bindingsRef.current || loadKeybinds()
      const typing = isTyping()

      // 1. Si estamos manteniendo o esperando la segunda tecla de una secuencia (G + tecla)
      const activeLeader = heldLeaderRef.current || waitingLeaderRef.current
      if (activeLeader) {
        const pressedToken = normalizeKeyToken(e.key)
        if (pressedToken === activeLeader && e.repeat) {
          return
        }
        if (!heldLeaderRef.current) {
          clearLeader()
        }
        if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
          for (const def of KEYBIND_DEFINITIONS) {
            if (def.group !== 'nav') continue
            const seq = parseSequenceBinding(currentBindings[def.id])
            if (seq && seq.leader === activeLeader && seq.key === pressedToken) {
              e.preventDefault()
              onNavigate?.(def.navId)
              return
            }
          }
        }
      }

      const globalHandlers = {
        openPalette: () => onOpenPalette?.(),
        newAssignment: () => onOpenNuevaAsignacion?.(),
        openPerfil: () => onOpenPerfil?.('perfil'),
        exportS140: () => onExportS140?.(),
        toggleTheme: () => onToggleTheme?.(),
        openHelp: () => onOpenShortcutsHelp?.(),
      }

      // 2. Comprobar atajos globales y atajos directos de navegación (sin secuencia)
      for (const def of KEYBIND_DEFINITIONS) {
        const binding = currentBindings[def.id]
        if (!binding || parseSequenceBinding(binding)) continue

        const allowTyping = Boolean(def.allowWhenTyping) || bindingUsesModifier(binding)
        if (typing && !allowTyping) continue

        if (matchesBindingEvent(e, binding)) {
          e.preventDefault()
          if (def.group === 'nav') {
            onNavigate?.(def.navId)
          } else {
            globalHandlers[def.id]?.()
          }
          return
        }
      }

      // 3. Activar prefijo `G` si hay al menos una ruta que use secuencia `G <tecla>`
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const token = normalizeKeyToken(e.key)
        const hasSequenceWithLeader = KEYBIND_DEFINITIONS.some((def) => {
          if (def.group !== 'nav') return false
          const seq = parseSequenceBinding(currentBindings[def.id])
          return seq?.leader === token
        })

        if (hasSequenceWithLeader) {
          clearLeader()
          heldLeaderRef.current = token
          waitingLeaderRef.current = token
          gTimer.current = setTimeout(() => {
            waitingLeaderRef.current = null
            gTimer.current = null
          }, 900)
        }
      }
    }

    function handleKeyUp(e) {
      if (heldLeaderRef.current && normalizeKeyToken(e.key) === heldLeaderRef.current) {
        heldLeaderRef.current = null
      }
    }

    function handleBlur() {
      heldLeaderRef.current = null
      clearLeader()
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        heldLeaderRef.current = null
        clearLeader()
      }
    }

    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      heldLeaderRef.current = null
      clearLeader()
    }
  }, [
    onOpenPalette,
    onNavigate,
    onOpenPerfil,
    onToggleTheme,
    onExportS140,
    onOpenShortcutsHelp,
    onOpenNuevaAsignacion,
  ])
}
