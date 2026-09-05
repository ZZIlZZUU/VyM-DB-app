import { useState, useCallback, useRef } from 'react'

export function useToast(defaultDuration = 3000) {
  const [toast, setToast] = useState(null) // { msg, type, duration, id }
  const timerRef = useRef(null)

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast(null)
  }, [])

  const showToast = useCallback(
    (msg, type = 'info', customDuration = defaultDuration) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      const id = Date.now() + Math.random()
      setToast({ msg, type, duration: customDuration, id })
      timerRef.current = setTimeout(() => {
        setToast(curr => (curr?.id === id ? null : curr))
      }, customDuration)
    },
    [defaultDuration]
  )

  // Atajos semánticos
  const success = useCallback((msg, customDur) => showToast(msg, 'success', customDur), [showToast])
  const error   = useCallback((msg, customDur) => showToast(msg, 'error', customDur),   [showToast])
  const warning = useCallback((msg, customDur) => showToast(msg, 'warning', customDur), [showToast])
  const info    = useCallback((msg, customDur) => showToast(msg, 'info', customDur),    [showToast])

  return { toast, showToast, success, error, warning, info, dismiss }
}