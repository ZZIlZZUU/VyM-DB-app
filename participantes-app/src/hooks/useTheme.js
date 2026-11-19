import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  THEME_PRESETS,
  AVATAR_COLORS,
  getThemeMeta,
  getThemeForFamilyAndMode,
  toggleThemePolarity,
  resolveInitialTheme,
} from '../lib/themes'

function getSystemPrefersDark() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function safeGetStorage(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetStorage(key, value) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore storage errors
  }
}

export function useTheme() {
  const [initial] = useState(() =>
    resolveInitialTheme({
      savedThemeId: safeGetStorage('theme_id'),
      savedPolarityPref: safeGetStorage('theme_mode_pref'),
      legacyTheme: safeGetStorage('theme'),
      systemPrefersDark: getSystemPrefersDark(),
    })
  )

  const [themeId, setThemeId] = useState(initial.themeId)
  const [polarityPref, setPolarityPref] = useState(initial.polarityPref)

  const [density, setDensityState] = useState(() =>
    safeGetStorage('pref_density') === 'compact' ? 'compact' : 'comfortable'
  )
  const [fontSize, setFontSizeState] = useState(() =>
    safeGetStorage('pref_font_size') === 'large' ? 'large' : 'normal'
  )
  const [reduceMotion, setReduceMotionState] = useState(
    () => safeGetStorage('pref_reduce_motion') === 'true'
  )
  const [avatarColor, setAvatarColorState] = useState(() => {
    const saved = safeGetStorage('pref_avatar_color')
    return AVATAR_COLORS.some(c => c.id === saved) ? saved : 'accent'
  })

  const themeMeta = useMemo(() => getThemeMeta(themeId), [themeId])
  const theme = themeMeta.mode

  // Sync CSS theme classes, data-theme, meta tag, and localStorage
  useEffect(() => {
    const root = document.documentElement
    const isDark = themeMeta.mode === 'dark'

    root.setAttribute('data-theme', themeMeta.id)
    if (isDark) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }

    safeSetStorage('theme_id', themeMeta.id)
    safeSetStorage('theme_mode_pref', polarityPref)
    safeSetStorage('theme', themeMeta.mode)

    const meta =
      document.getElementById('app-theme-color') ||
      document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', themeMeta.themeColor)
    }
  }, [themeMeta, polarityPref])

  // Sync visual accessibility / density classes
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('density-compact', density === 'compact')
    root.classList.toggle('text-scale-large', fontSize === 'large')
    root.classList.toggle('reduce-motion', Boolean(reduceMotion))

    safeSetStorage('pref_density', density)
    safeSetStorage('pref_font_size', fontSize)
    safeSetStorage('pref_reduce_motion', String(Boolean(reduceMotion)))
    safeSetStorage('pref_avatar_color', avatarColor)
  }, [density, fontSize, reduceMotion, avatarColor])

  // Follow OS prefers-color-scheme when polarityPref === 'system'
  useEffect(() => {
    if (polarityPref !== 'system') return undefined
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(e) {
      const nextMode = e.matches ? 'dark' : 'light'
      setThemeId(prev => {
        const currentFamily = getThemeMeta(prev).family
        return getThemeForFamilyAndMode(currentFamily, nextMode)
      })
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [polarityPref])

  const selectTheme = useCallback(nextThemeId => {
    const preset = THEME_PRESETS[nextThemeId]
    if (!preset) return
    setThemeId(preset.id)
    setPolarityPref(preset.mode)
  }, [])

  const setPolarity = useCallback(nextPref => {
    if (nextPref === 'system') {
      setPolarityPref('system')
      const mode = getSystemPrefersDark() ? 'dark' : 'light'
      setThemeId(prev => getThemeForFamilyAndMode(getThemeMeta(prev).family, mode))
      return
    }
    const normMode = nextPref === 'dark' ? 'dark' : 'light'
    setPolarityPref(normMode)
    setThemeId(prev => getThemeForFamilyAndMode(getThemeMeta(prev).family, normMode))
  }, [])

  const toggle = useCallback(() => {
    setThemeId(prev => {
      const nextId = toggleThemePolarity(prev)
      setPolarityPref(getThemeMeta(nextId).mode)
      return nextId
    })
  }, [])

  const setDensity = useCallback(val => {
    setDensityState(val === 'compact' ? 'compact' : 'comfortable')
  }, [])

  const setFontSize = useCallback(val => {
    setFontSizeState(val === 'large' ? 'large' : 'normal')
  }, [])

  const setReduceMotion = useCallback(val => {
    setReduceMotionState(Boolean(val))
  }, [])

  const setAvatarColor = useCallback(val => {
    setAvatarColorState(AVATAR_COLORS.some(c => c.id === val) ? val : 'accent')
  }, [])

  const resetVisualPrefs = useCallback(() => {
    setThemeId('light-calido')
    setPolarityPref('light')
    setDensityState('comfortable')
    setFontSizeState('normal')
    setReduceMotionState(false)
    setAvatarColorState('accent')
  }, [])

  return {
    theme,
    themeId: themeMeta.id,
    themeMeta,
    polarityPref,
    toggle,
    selectTheme,
    setPolarity,
    setTheme: selectTheme,
    density,
    setDensity,
    fontSize,
    setFontSize,
    reduceMotion,
    setReduceMotion,
    avatarColor,
    setAvatarColor,
    resetVisualPrefs,
  }
}
