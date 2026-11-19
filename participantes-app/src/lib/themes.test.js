// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  THEME_PRESETS,
  LIGHT_THEME_IDS,
  DARK_THEME_IDS,
  AVATAR_COLORS,
  getAvatarColorClasses,
  getThemeMeta,
  getThemeForFamilyAndMode,
  toggleThemePolarity,
  resolveInitialTheme,
  DEFAULT_HOME_ALERT_PREFS,
  loadHomeAlertPrefs,
  saveHomeAlertPrefs,
} from './themes'

describe('themes', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('define los 6 presets esperados (3 claros y 3 oscuros) con metadatos completos', () => {
    expect(LIGHT_THEME_IDS).toEqual(['light-calido', 'light-contraste', 'light-mono'])
    expect(DARK_THEME_IDS).toEqual(['dark-calido', 'dark-oled', 'dark-mono'])

    for (const id of [...LIGHT_THEME_IDS, ...DARK_THEME_IDS]) {
      const preset = THEME_PRESETS[id]
      expect(preset).toBeDefined()
      expect(preset.id).toBe(id)
      expect(preset.name).toBeTruthy()
      expect(preset.desc).toBeTruthy()
      expect(preset.themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(preset.preview).toMatchObject({
        bg: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        surface: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        accent: expect.stringMatching(/^#[0-9A-Fa-f]{6}$/),
      })
    }
  })

  it('conserva exactamente los valores originales de Cálido claro y Cálido oscuro', () => {
    expect(THEME_PRESETS['light-calido'].themeColor).toBe('#F5F0E6')
    expect(THEME_PRESETS['light-calido'].preview).toMatchObject({
      bg: '#F5F0E6',
      surface: '#FFFDF8',
      surfaceAlt: '#EEE6D6',
      border: '#E2D8C6',
      text1: '#1F1B16',
      text2: '#564E43',
      text3: '#7A7062',
      accent: '#059669',
    })

    expect(THEME_PRESETS['dark-calido'].themeColor).toBe('#12100E')
    expect(THEME_PRESETS['dark-calido'].preview).toMatchObject({
      bg: '#12100E',
      surface: '#1A1714',
      surfaceAlt: '#24201C',
      border: '#2E2923',
      text1: '#F5F0E6',
      text2: '#B5ACA0',
      text3: '#857B6E',
      accent: '#15803D',
    })
  })

  it('usa #FFFFFF como fondo en Alto contraste claro y #000000 en OLED oscuro', () => {
    expect(THEME_PRESETS['light-contraste'].themeColor).toBe('#FFFFFF')
    expect(THEME_PRESETS['light-contraste'].preview.bg).toBe('#FFFFFF')
    expect(THEME_PRESETS['dark-oled'].themeColor).toBe('#000000')
    expect(THEME_PRESETS['dark-oled'].preview.bg).toBe('#000000')
  })

  it('toggleThemePolarity alterna claro↔oscuro manteniendo la misma familia', () => {
    expect(toggleThemePolarity('light-calido')).toBe('dark-calido')
    expect(toggleThemePolarity('dark-calido')).toBe('light-calido')
    expect(toggleThemePolarity('light-contraste')).toBe('dark-oled')
    expect(toggleThemePolarity('dark-oled')).toBe('light-contraste')
    expect(toggleThemePolarity('light-mono')).toBe('dark-mono')
    expect(toggleThemePolarity('dark-mono')).toBe('light-mono')
  })

  it('getThemeForFamilyAndMode y getThemeMeta manejan fallbacks de forma segura', () => {
    expect(getThemeForFamilyAndMode('contraste', 'dark')).toBe('dark-oled')
    expect(getThemeForFamilyAndMode('desconocida', 'light')).toBe('light-calido')

    expect(getThemeMeta('dark-oled')).toMatchObject({
      id: 'dark-oled',
      modeLabel: 'Oscuro',
      fullLabel: 'Oscuro · OLED',
    })
    expect(getThemeMeta('no-existe').id).toBe('light-calido')
  })

  it('resolveInitialTheme soporta instalación limpia, migración legacy, theme_id explícito y modo sistema', () => {
    expect(resolveInitialTheme({ systemPrefersDark: false })).toEqual({
      themeId: 'light-calido',
      polarityPref: 'system',
    })
    expect(resolveInitialTheme({ systemPrefersDark: true })).toEqual({
      themeId: 'dark-calido',
      polarityPref: 'system',
    })

    expect(resolveInitialTheme({ legacyTheme: 'dark' })).toEqual({
      themeId: 'dark-calido',
      polarityPref: 'dark',
    })
    expect(resolveInitialTheme({ legacyTheme: 'light' })).toEqual({
      themeId: 'light-calido',
      polarityPref: 'light',
    })

    expect(
      resolveInitialTheme({
        savedThemeId: 'dark-oled',
        savedPolarityPref: 'dark',
        legacyTheme: 'light',
      })
    ).toEqual({
      themeId: 'dark-oled',
      polarityPref: 'dark',
    })

    expect(
      resolveInitialTheme({
        savedThemeId: 'light-mono',
        savedPolarityPref: 'system',
        systemPrefersDark: true,
      })
    ).toEqual({
      themeId: 'dark-mono',
      polarityPref: 'system',
    })
  })

  it('loadHomeAlertPrefs y saveHomeAlertPrefs persisten y normalizan las preferencias de alertas', () => {
    expect(loadHomeAlertPrefs()).toEqual(DEFAULT_HOME_ALERT_PREFS)

    saveHomeAlertPrefs({
      semanasIncompletas: false,
      personasInactivas: true,
      epubDisponible: false,
    })

    expect(loadHomeAlertPrefs()).toEqual({
      semanasIncompletas: false,
      personasInactivas: true,
      epubDisponible: false,
    })
  })

  it('getAvatarColorClasses retorna clases válidas y hace fallback al color del tema', () => {
    expect(getAvatarColorClasses('blue')).toContain('text-blue')
    expect(getAvatarColorClasses('invalid')).toBe(AVATAR_COLORS[0].boxClass)
  })
})
