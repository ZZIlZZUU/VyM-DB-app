import { useState, useCallback } from 'react'

export function useToast(duration = 3000) {
  const [toast, setToast] = useState(null) // { msg, type }

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), duration)
  }, [duration])

  // Atajos semánticos
  const success = useCallback((msg) => showToast(msg, 'success'), [showToast])
  const error   = useCallback((msg) => showToast(msg, 'error'),   [showToast])
  const warning = useCallback((msg) => showToast(msg, 'warning'), [showToast])
  const info    = useCallback((msg) => showToast(msg, 'info'),    [showToast])

  return { toast, showToast, success, error, warning, info }
}