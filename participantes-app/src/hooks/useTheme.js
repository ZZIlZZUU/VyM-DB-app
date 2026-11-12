import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    const isDark = theme === 'dark'

    if (isDark) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
    }

    try {
      localStorage.setItem('theme', theme)
    } catch (_) {}

    const meta = document.getElementById('app-theme-color') || document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute('content', isDark ? '#09090B' : '#F8FAFC')
    }
  }, [theme])

  // Escuchar cambios en la preferencia del sistema (cuando no hay override explícito del usuario)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return // si el usuario eligió explícitamente, no sobreescribir

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    function handleChange(e) {
      setTheme(e.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle, setTheme }
}
