import { dispatchPreferencesUpdated } from './themes'

export const KEYBINDS_STORAGE_KEY = 'app_keybinds'

/**
 * Definición canónica de todos los atajos personalizables de la aplicación.
 * Los modificadores Ctrl/Cmd se almacenan de forma portable como `Mod`.
 * Las secuencias con prefijo `G` se almacenan separadas por espacio (`G I`).
 */
export const KEYBIND_DEFINITIONS = [
  // Acciones globales
  {
    id: 'openPalette',
    group: 'global',
    label: 'Paleta de comandos y búsqueda',
    description: 'Abre el buscador rápido de secciones y comandos.',
    defaultBinding: 'Mod+K',
    allowWhenTyping: true,
  },
  {
    id: 'newAssignment',
    group: 'global',
    label: 'Nueva asignación',
    description: 'Abre el diálogo para registrar una nueva participación.',
    defaultBinding: 'N',
    allowWhenTyping: false,
  },
  {
    id: 'openPerfil',
    group: 'global',
    label: 'Mi Perfil y Preferencias',
    description: 'Abre el panel modal de perfil, temas y configuración.',
    defaultBinding: 'Mod+,',
    allowWhenTyping: true,
  },
  {
    id: 'exportS140',
    group: 'global',
    label: 'Exportar programa S-140',
    description: 'Ejecuta o navega a la exportación del programa.',
    defaultBinding: 'Mod+Shift+E',
    allowWhenTyping: true,
  },
  {
    id: 'toggleTheme',
    group: 'global',
    label: 'Alternar Claro / Oscuro',
    description: 'Alterna entre el tema claro y oscuro de la variante activa.',
    defaultBinding: 'Mod+Shift+T',
    allowWhenTyping: true,
  },
  {
    id: 'openHelp',
    group: 'global',
    label: 'Guía de atajos de teclado',
    description: 'Muestra la ventana emergente con todos los atajos.',
    defaultBinding: '?',
    allowWhenTyping: false,
  },

  // Navegación (secuencia G + tecla o acceso directo con modificador)
  { id: 'nav_home', group: 'nav', navId: 'home', label: 'Inicio', description: 'Ir al panel principal', defaultBinding: 'G I' },
  { id: 'nav_semanal', group: 'nav', navId: 'semanal', label: 'Vista Semanal', description: 'Ir a la vista semanal de asignaciones', defaultBinding: 'G W' },
  { id: 'nav_calendario', group: 'nav', navId: 'calendario', label: 'Calendario', description: 'Ir al calendario y eventos', defaultBinding: 'G K' },
  { id: 'nav_editable', group: 'nav', navId: 'editable', label: 'Editor Rápido', description: 'Ir a la tabla de edición rápida', defaultBinding: 'G E' },
  { id: 'nav_personas', group: 'nav', navId: 'personas', label: 'Personas', description: 'Ir al directorio de participantes', defaultBinding: 'G P' },
  { id: 'nav_registros', group: 'nav', navId: 'registros', label: 'Registros', description: 'Ir al registro general de asignaciones', defaultBinding: 'G R' },
  { id: 'nav_programa', group: 'nav', navId: 'programa', label: 'Programa S-140', description: 'Ir al creador de programa semanal', defaultBinding: 'G O' },
  { id: 'nav_usuarios', group: 'nav', navId: 'usuarios', label: 'Usuarios', description: 'Ir a la gestión de accesos (Admin)', defaultBinding: 'G U' },
  { id: 'nav_configuracion', group: 'nav', navId: 'configuracion', label: 'Configuración', description: 'Ir a configuración general de congregación', defaultBinding: 'G C' },
  { id: 'nav_exportar', group: 'nav', navId: 'exportar', label: 'Exportar / Importar', description: 'Ir a respaldos e impresión S-140', defaultBinding: 'G X' },
  { id: 'nav_estadisticas', group: 'nav', navId: 'estadisticas', label: 'Estadísticas', description: 'Ir a reportes y métricas', defaultBinding: 'G T' },
  { id: 'nav_historial', group: 'nav', navId: 'historial', label: 'Historial de cambios', description: 'Ir a la bitácora de auditoría', defaultBinding: 'G H' },
]

const DEFINITION_MAP = Object.fromEntries(KEYBIND_DEFINITIONS.map((d) => [d.id, d]))
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])
const NON_ALPHA_KEY_MAP = {
  ' ': 'Space',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
}

export function getDefaultKeybinds() {
  return Object.fromEntries(KEYBIND_DEFINITIONS.map((d) => [d.id, d.defaultBinding]))
}

export function normalizeKeyToken(key) {
  if (!key) return ''
  if (NON_ALPHA_KEY_MAP[key]) return NON_ALPHA_KEY_MAP[key]
  if (key.length === 1) {
    if (/^[a-zA-Z]$/.test(key)) return key.toUpperCase()
    return key
  }
  if (/^F([1-9]|1[0-2])$/i.test(key)) return key.toUpperCase()
  return key
}

/**
 * Normaliza una cadena de atajo a formato canónico (`Mod+Shift+E` o `G W`).
 */
export function normalizeBinding(rawBinding) {
  if (!rawBinding || typeof rawBinding !== 'string') return ''
  const trimmed = rawBinding.trim()
  if (!trimmed) return ''

  // Secuencia tipo "G I"
  if (/^[a-zA-Z]\s+\S+$/.test(trimmed)) {
    const parts = trimmed.split(/\s+/)
    return `${parts[0].toUpperCase()} ${normalizeKeyToken(parts[1])}`
  }

  const parts = trimmed.split('+').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return ''

  let hasMod = false
  let hasAlt = false
  let hasShift = false
  let mainKey = ''

  for (const part of parts) {
    const low = part.toLowerCase()
    if (low === 'mod' || low === 'ctrl' || low === 'control' || low === 'cmd' || low === 'meta' || part === '⌘') {
      hasMod = true
    } else if (low === 'alt' || low === 'option' || part === '⌥') {
      hasAlt = true
    } else if (low === 'shift' || part === '⇧') {
      hasShift = true
    } else {
      mainKey = normalizeKeyToken(part)
    }
  }

  if (!mainKey) return ''

  const ordered = []
  if (hasMod) ordered.push('Mod')
  if (hasAlt) ordered.push('Alt')
  if (hasShift) ordered.push('Shift')
  ordered.push(mainKey)
  return ordered.join('+')
}

export function loadKeybinds() {
  const defaults = getDefaultKeybinds()
  try {
    const raw = localStorage.getItem(KEYBINDS_STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaults
    const merged = { ...defaults }
    for (const def of KEYBIND_DEFINITIONS) {
      if (typeof parsed[def.id] === 'string' && parsed[def.id].trim()) {
        const norm = normalizeBinding(parsed[def.id])
        if (norm) merged[def.id] = norm
      }
    }
    return merged
  } catch {
    return defaults
  }
}

export function saveKeybinds(nextBindings) {
  const defaults = getDefaultKeybinds()
  const sanitized = { ...defaults }
  if (nextBindings && typeof nextBindings === 'object') {
    for (const def of KEYBIND_DEFINITIONS) {
      const val = nextBindings[def.id]
      if (typeof val === 'string' && val.trim()) {
        const norm = normalizeBinding(val)
        if (norm) sanitized[def.id] = norm
      }
    }
  }
  try {
    localStorage.setItem(KEYBINDS_STORAGE_KEY, JSON.stringify(sanitized))
    dispatchPreferencesUpdated()
  } catch {
    // ignore storage quota errors
  }
  return sanitized
}

export function resetKeybinds(singleId = null) {
  if (singleId && DEFINITION_MAP[singleId]) {
    const current = loadKeybinds()
    return saveKeybinds({
      ...current,
      [singleId]: DEFINITION_MAP[singleId].defaultBinding,
    })
  }
  const defaults = getDefaultKeybinds()
  try {
    localStorage.removeItem(KEYBINDS_STORAGE_KEY)
    dispatchPreferencesUpdated()
  } catch {
    // ignore
  }
  return defaults
}

function getModDisplayToken(isMac) {
  if (typeof isMac === 'boolean') return isMac ? '⌘' : 'Ctrl'
  if (typeof navigator !== 'undefined') {
    const plat = String(navigator.platform || navigator.userAgent || '')
    if (/Mac|iPhone|iPad|iPod/i.test(plat)) return '⌘'
  }
  return 'Ctrl'
}

/**
 * Convierte un atajo canónico en un arreglo de teclas listas para mostrar en `<kbd>`.
 */
export function getBindingKeysArray(bindingStr, { isMac } = {}) {
  const norm = normalizeBinding(bindingStr)
  if (!norm) return []
  if (norm.includes(' ')) {
    return norm.split(' ')
  }
  const modLabel = getModDisplayToken(isMac)
  return norm.split('+').map((part) => (part === 'Mod' ? modLabel : part))
}

/**
 * Devuelve representación legible en una cadena (`Ctrl+K` o `G → W`).
 */
export function formatBindingLabel(bindingStr, options = {}) {
  const norm = normalizeBinding(bindingStr)
  if (!norm) return ''
  const parts = getBindingKeysArray(norm, options)
  return norm.includes(' ') ? parts.join(' ') : parts.join('+')
}

/**
 * Parsea un `KeyboardEvent` en un atajo canónico al grabar un mapeo nuevo.
 * Retorna `{ cancel: true }` con Escape, `{ ignore: true }` con modificadores solos,
 * o `{ binding: string }`.
 */
export function captureEventToBinding(e, { group = 'global' } = {}) {
  if (!e) return { ignore: true }
  if (e.key === 'Escape') return { cancel: true }
  if (MODIFIER_KEYS.has(e.key)) return { ignore: true }

  const keyToken = normalizeKeyToken(e.key)
  if (!keyToken || keyToken === 'Dead' || keyToken === 'Unidentified') {
    return { ignore: true }
  }

  const hasMod = Boolean(e.ctrlKey || e.metaKey)
  const hasAlt = Boolean(e.altKey)
  const hasShift = Boolean(e.shiftKey)

  // Para secuencias de navegación: una tecla sin modificadores se vincula bajo prefijo `G <tecla>`
  if (group === 'nav' && !hasMod && !hasAlt && !hasShift && /^[A-Z0-9]$/.test(keyToken)) {
    if (keyToken === 'G') {
      return {
        error: 'Usa una segunda tecla distinta de G para combinar con el prefijo G.',
      }
    }
    return { binding: `G ${keyToken}` }
  }

  const parts = []
  if (hasMod) parts.push('Mod')
  if (hasAlt) parts.push('Alt')
  // Si es un signo de puntuación ya desplazado como `?`, `!`, `@`, no anteponer Shift+
  const isLetter = /^[A-Z]$/.test(keyToken)
  const isMultiChar = keyToken.length > 1
  if (hasShift && (hasMod || hasAlt || isLetter || isMultiChar)) {
    parts.push('Shift')
  }
  parts.push(keyToken)

  return { binding: normalizeBinding(parts.join('+')) }
}

/**
 * Comprueba si `candidateBinding` entra en conflicto con otro atajo ya asignado.
 */
export function findKeybindConflict(candidateBinding, excludeId, allBindings) {
  const candidate = normalizeBinding(candidateBinding)
  if (!candidate) return null

  const entries = Object.entries(allBindings || {})
  const hasNavSequence = entries.some(
    ([id, val]) => id !== excludeId && String(val || '').startsWith('G ')
  )

  if (candidate === 'G' && hasNavSequence) {
    return {
      conflictId: 'nav_leader',
      label: 'Prefijo de navegación (G + tecla)',
    }
  }

  for (const [id, rawVal] of entries) {
    if (id === excludeId) continue
    const existing = normalizeBinding(rawVal)
    if (!existing) continue
    if (existing === candidate) {
      return {
        conflictId: id,
        label: DEFINITION_MAP[id]?.label || id,
      }
    }
    if (existing === 'G' && candidate.startsWith('G ')) {
      return {
        conflictId: id,
        label: DEFINITION_MAP[id]?.label || id,
      }
    }
  }

  return null
}

/**
 * Determina si un `KeyboardEvent` coincide exactamente con un binding simple o combo (`Mod+K`, `N`, `?`).
 * (Las secuencias de dos teclas como `G I` devuelven `false` aquí y se evalúan por separado.)
 */
export function matchesBindingEvent(e, bindingStr) {
  const norm = normalizeBinding(bindingStr)
  if (!norm || norm.includes(' ')) return false

  const tokens = norm.split('+')
  const expectedKey = tokens[tokens.length - 1]
  const needMod = tokens.includes('Mod')
  const needAlt = tokens.includes('Alt')
  const needShift = tokens.includes('Shift')

  const actualMod = Boolean(e.ctrlKey || e.metaKey)
  const actualAlt = Boolean(e.altKey)
  const actualShift = Boolean(e.shiftKey)

  if (actualMod !== needMod || actualAlt !== needAlt) return false

  const actualKey = normalizeKeyToken(e.key)
  if (actualKey !== expectedKey) return false

  // Signos de puntuación desplazados (`?`, `!`, etc.) sin Mod/Alt: no exigir false en shiftKey
  const isShiftedPunctuationWithoutMods =
    !needMod && !needAlt && !needShift && expectedKey.length === 1 && !/^[A-Z0-9]$/.test(expectedKey)
  if (!isShiftedPunctuationWithoutMods && actualShift !== needShift) {
    return false
  }

  return true
}

/**
 * Extrae el prefijo y la segunda tecla si `bindingStr` es una secuencia (`G I` -> `{ leader: 'G', key: 'I' }`).
 */
export function parseSequenceBinding(bindingStr) {
  const norm = normalizeBinding(bindingStr)
  if (!norm || !norm.includes(' ')) return null
  const [leader, key] = norm.split(' ')
  if (!leader || !key) return null
  return { leader, key }
}
