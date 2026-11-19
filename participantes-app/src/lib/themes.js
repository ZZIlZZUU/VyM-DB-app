export const THEME_PRESETS = {
  'light-calido': {
    id: 'light-calido',
    mode: 'light',
    family: 'calido',
    name: 'Cálido',
    tag: 'Actual',
    desc: 'Papel crema y verde bosque.',
    themeColor: '#F5F0E6',
    preview: {
      bg: '#F5F0E6',
      surface: '#FFFDF8',
      surfaceAlt: '#EEE6D6',
      border: '#E2D8C6',
      text1: '#1F1B16',
      text2: '#564E43',
      text3: '#7A7062',
      accent: '#059669',
    },
  },
  'light-contraste': {
    id: 'light-contraste',
    mode: 'light',
    family: 'contraste',
    name: 'Alto contraste',
    tag: 'Nítido',
    desc: 'Blanco puro y bordes bien definidos.',
    themeColor: '#FFFFFF',
    preview: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceAlt: '#E2E6EA',
      border: '#9AA3AF',
      text1: '#000000',
      text2: '#1F2937',
      text3: '#374151',
      accent: '#047857',
    },
  },
  'light-mono': {
    id: 'light-mono',
    mode: 'light',
    family: 'mono',
    name: 'Monocromático',
    tag: 'Editorial',
    desc: 'Escala de grises neutra con carbón.',
    themeColor: '#F4F4F5',
    preview: {
      bg: '#F4F4F5',
      surface: '#FFFFFF',
      surfaceAlt: '#E4E4E7',
      border: '#D4D4D8',
      text1: '#09090B',
      text2: '#52525B',
      text3: '#71717A',
      accent: '#18181B',
    },
  },
  'dark-calido': {
    id: 'dark-calido',
    mode: 'dark',
    family: 'calido',
    name: 'Cálido',
    tag: 'Actual',
    desc: 'Carbón cálido y verde bosque.',
    themeColor: '#12100E',
    preview: {
      bg: '#12100E',
      surface: '#1A1714',
      surfaceAlt: '#24201C',
      border: '#2E2923',
      text1: '#F5F0E6',
      text2: '#B5ACA0',
      text3: '#857B6E',
      accent: '#15803D',
    },
  },
  'dark-oled': {
    id: 'dark-oled',
    mode: 'dark',
    family: 'contraste',
    name: 'OLED',
    tag: 'Negro Puro',
    desc: 'Negro #000000 con acento esmeralda.',
    themeColor: '#000000',
    preview: {
      bg: '#000000',
      surface: '#09090B',
      surfaceAlt: '#141418',
      border: '#202026',
      text1: '#FAFAFA',
      text2: '#A1A1AA',
      text3: '#71717A',
      accent: '#10B981',
    },
  },
  'dark-mono': {
    id: 'dark-mono',
    mode: 'dark',
    family: 'mono',
    name: 'Monocromático',
    tag: 'Obsidiana',
    desc: 'Grafito neutro y acento alabastro.',
    themeColor: '#111113',
    preview: {
      bg: '#111113',
      surface: '#18181B',
      surfaceAlt: '#27272A',
      border: '#2E2E34',
      text1: '#F4F4F5',
      text2: '#A1A1AA',
      text3: '#71717A',
      accent: '#E4E4E7',
    },
  },
}

export const LIGHT_THEME_IDS = ['light-calido', 'light-contraste', 'light-mono']
export const DARK_THEME_IDS = ['dark-calido', 'dark-oled', 'dark-mono']

export const AVATAR_COLORS = [
  {
    id: 'accent',
    label: 'Tema',
    dotColor: '#059669',
    boxClass: 'bg-accent-muted-bg text-accent border-accent-muted-border',
  },
  {
    id: 'blue',
    label: 'Azul',
    dotColor: '#2563EB',
    boxClass: 'bg-blue-bg text-blue border-blue/30',
  },
  {
    id: 'amber',
    label: 'Ámbar',
    dotColor: '#D97706',
    boxClass: 'bg-amber-bg text-amber border-amber/30',
  },
  {
    id: 'purple',
    label: 'Violeta',
    dotColor: '#7C3AED',
    boxClass: 'bg-purple-bg text-purple border-purple/30',
  },
  {
    id: 'rose',
    label: 'Rosa',
    dotColor: '#E11D48',
    boxClass: 'bg-rose-bg text-rose border-rose/30',
  },
]

export function getAvatarColorClasses(id) {
  const found = AVATAR_COLORS.find(c => c.id === id)
  return found ? found.boxClass : AVATAR_COLORS[0].boxClass
}

export function getThemeMeta(themeId) {
  const preset = THEME_PRESETS[themeId] || THEME_PRESETS['light-calido']
  const modeLabel = preset.mode === 'dark' ? 'Oscuro' : 'Claro'
  return {
    ...preset,
    modeLabel,
    fullLabel: `${modeLabel} · ${preset.name}`,
  }
}

const FAMILY_MODE_MAP = {
  calido: { light: 'light-calido', dark: 'dark-calido' },
  contraste: { light: 'light-contraste', dark: 'dark-oled' },
  mono: { light: 'light-mono', dark: 'dark-mono' },
}

export function getThemeForFamilyAndMode(family, mode) {
  const normMode = mode === 'dark' ? 'dark' : 'light'
  const entry = FAMILY_MODE_MAP[family] || FAMILY_MODE_MAP.calido
  return entry[normMode]
}

export function toggleThemePolarity(themeId) {
  const meta = getThemeMeta(themeId)
  const nextMode = meta.mode === 'dark' ? 'light' : 'dark'
  return getThemeForFamilyAndMode(meta.family, nextMode)
}

export function resolveInitialTheme({
  savedThemeId,
  savedPolarityPref,
  legacyTheme,
  systemPrefersDark = false,
} = {}) {
  const validSavedId = savedThemeId && THEME_PRESETS[savedThemeId] ? savedThemeId : null

  if (savedPolarityPref === 'system') {
    const family = validSavedId ? THEME_PRESETS[validSavedId].family : 'calido'
    const mode = systemPrefersDark ? 'dark' : 'light'
    return {
      themeId: getThemeForFamilyAndMode(family, mode),
      polarityPref: 'system',
    }
  }

  if (validSavedId) {
    const preset = THEME_PRESETS[validSavedId]
    const polarityPref =
      savedPolarityPref === 'light' || savedPolarityPref === 'dark'
        ? savedPolarityPref
        : preset.mode
    return {
      themeId: validSavedId,
      polarityPref,
    }
  }

  if (legacyTheme === 'dark' || legacyTheme === 'light') {
    return {
      themeId: legacyTheme === 'dark' ? 'dark-calido' : 'light-calido',
      polarityPref: legacyTheme,
    }
  }

  return {
    themeId: systemPrefersDark ? 'dark-calido' : 'light-calido',
    polarityPref: 'system',
  }
}

export const HOME_ALERTS_PREFS_KEY = 'pref_home_alerts'

export const DEFAULT_HOME_ALERT_PREFS = {
  semanasIncompletas: true,
  personasInactivas: true,
  epubDisponible: true,
}

export function loadHomeAlertPrefs() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_HOME_ALERT_PREFS }
    }
    const raw = window.localStorage.getItem(HOME_ALERTS_PREFS_KEY)
    if (!raw) return { ...DEFAULT_HOME_ALERT_PREFS }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_HOME_ALERT_PREFS }
    }
    return {
      semanasIncompletas:
        typeof parsed.semanasIncompletas === 'boolean'
          ? parsed.semanasIncompletas
          : DEFAULT_HOME_ALERT_PREFS.semanasIncompletas,
      personasInactivas:
        typeof parsed.personasInactivas === 'boolean'
          ? parsed.personasInactivas
          : DEFAULT_HOME_ALERT_PREFS.personasInactivas,
      epubDisponible:
        typeof parsed.epubDisponible === 'boolean'
          ? parsed.epubDisponible
          : DEFAULT_HOME_ALERT_PREFS.epubDisponible,
    }
  } catch {
    return { ...DEFAULT_HOME_ALERT_PREFS }
  }
}

export function saveHomeAlertPrefs(next) {
  const normalized = {
    semanasIncompletas:
      typeof next?.semanasIncompletas === 'boolean'
        ? next.semanasIncompletas
        : DEFAULT_HOME_ALERT_PREFS.semanasIncompletas,
    personasInactivas:
      typeof next?.personasInactivas === 'boolean'
        ? next.personasInactivas
        : DEFAULT_HOME_ALERT_PREFS.personasInactivas,
    epubDisponible:
      typeof next?.epubDisponible === 'boolean'
        ? next.epubDisponible
        : DEFAULT_HOME_ALERT_PREFS.epubDisponible,
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(HOME_ALERTS_PREFS_KEY, JSON.stringify(normalized))
    }
  } catch {
    // ignore storage errors
  }
  return normalized
}

export function dispatchPreferencesUpdated(detail = {}) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('preferences-updated', { detail }))
    }
  } catch {
    // ignore dispatch errors
  }
}
