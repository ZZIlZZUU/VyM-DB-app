import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  KEYBINDS_STORAGE_KEY,
  KEYBIND_DEFINITIONS,
  getDefaultKeybinds,
  normalizeBinding,
  loadKeybinds,
  saveKeybinds,
  resetKeybinds,
  getBindingKeysArray,
  formatBindingLabel,
  captureEventToBinding,
  findKeybindConflict,
  matchesBindingEvent,
  parseSequenceBinding,
} from './keybinds'

function createMemoryStorage() {
  let store = {}
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
    removeItem: (k) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
  }
}

describe('keybinds', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
    vi.stubGlobal('window', {
      dispatchEvent: vi.fn(),
    })
  })

  it('devuelve todos los atajos por defecto correctamente', () => {
    const defaults = getDefaultKeybinds()
    expect(Object.keys(defaults)).toHaveLength(KEYBIND_DEFINITIONS.length)
    expect(defaults.openPalette).toBe('Mod+K')
    expect(defaults.newAssignment).toBe('N')
    expect(defaults.openPerfil).toBe('Mod+,')
    expect(defaults.nav_semanal).toBe('G W')
  })

  it('normaliza modificadores y secuencias de forma consistente', () => {
    expect(normalizeBinding('ctrl+k')).toBe('Mod+K')
    expect(normalizeBinding('Cmd+Shift+e')).toBe('Mod+Shift+E')
    expect(normalizeBinding('g   w')).toBe('G W')
    expect(normalizeBinding('?')).toBe('?')
  })

  it('guarda, carga y restablece atajos en localStorage', () => {
    saveKeybinds({ ...getDefaultKeybinds(), newAssignment: 'Mod+N', nav_semanal: 'G S' })
    const loaded = loadKeybinds()
    expect(loaded.newAssignment).toBe('Mod+N')
    expect(loaded.nav_semanal).toBe('G S')
    expect(localStorage.getItem(KEYBINDS_STORAGE_KEY)).toContain('Mod+N')

    const partialReset = resetKeybinds('newAssignment')
    expect(partialReset.newAssignment).toBe('N')
    expect(partialReset.nav_semanal).toBe('G S')

    const fullReset = resetKeybinds()
    expect(fullReset.nav_semanal).toBe('G W')
  })

  it('formatea teclas para UI según plataforma', () => {
    expect(getBindingKeysArray('Mod+Shift+E', { isMac: false })).toEqual(['Ctrl', 'Shift', 'E'])
    expect(getBindingKeysArray('Mod+K', { isMac: true })).toEqual(['⌘', 'K'])
    expect(formatBindingLabel('G W', { isMac: false })).toBe('G W')
    expect(formatBindingLabel('Mod+,', { isMac: false })).toBe('Ctrl+,')
  })

  it('captura eventos de teclado para acciones globales y navegación', () => {
    expect(captureEventToBinding({ key: 'Escape' })).toEqual({ cancel: true })
    expect(captureEventToBinding({ key: 'Control', ctrlKey: true })).toEqual({ ignore: true })
    expect(captureEventToBinding({ key: 'm', ctrlKey: true })).toEqual({ binding: 'Mod+M' })
    expect(captureEventToBinding({ key: '?', shiftKey: true })).toEqual({ binding: '?' })
    expect(captureEventToBinding({ key: 's' }, { group: 'nav' })).toEqual({ binding: 'G S' })
    expect(captureEventToBinding({ key: '2', altKey: true }, { group: 'nav' })).toEqual({
      binding: 'Alt+2',
    })
  })

  it('detecta conflictos entre atajos y reserva del prefijo G', () => {
    const binds = getDefaultKeybinds()
    const dup = findKeybindConflict('Mod+K', 'newAssignment', binds)
    expect(dup?.conflictId).toBe('openPalette')

    const sameAllowed = findKeybindConflict('Mod+K', 'openPalette', binds)
    expect(sameAllowed).toBeNull()

    const bareG = findKeybindConflict('G', 'newAssignment', binds)
    expect(bareG?.conflictId).toBe('nav_leader')
  })

  it('evalúa coincidencias de KeyboardEvent contra combos, teclas simples y secuencias', () => {
    expect(
      matchesBindingEvent({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, 'Mod+K')
    ).toBe(true)
    expect(
      matchesBindingEvent({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }, 'Mod+K')
    ).toBe(false)
    expect(
      matchesBindingEvent({ key: 'n', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, 'N')
    ).toBe(true)
    expect(
      matchesBindingEvent({ key: '?', ctrlKey: false, metaKey: false, altKey: false, shiftKey: true }, '?')
    ).toBe(true)
    expect(parseSequenceBinding('G W')).toEqual({ leader: 'G', key: 'W' })
    expect(parseSequenceBinding('Mod+K')).toBeNull()
  })
})
