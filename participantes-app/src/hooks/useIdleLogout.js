import { useCallback, useEffect, useRef, useState } from 'react'
import { loadIdleTimeoutMinutes } from '../lib/seguridad'

const LAST_ACTIVITY_STORAGE_KEY = 'vym_last_activity_ts'
const WARNING_WINDOW_MS = 60 * 1000

function readSharedActivityTs() {
  try {
    const raw = localStorage.getItem(LAST_ACTIVITY_STORAGE_KEY)
    const parsed = parseInt(raw || '0', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

function writeSharedActivityTs(ts) {
  try {
    localStorage.setItem(LAST_ACTIVITY_STORAGE_KEY, String(ts))
  } catch {
    // ignore storage errors
  }
}

/**
 * Monitorea inactividad real del usuario (sincronizada entre pestañas) y dispara
 * una cuenta regresiva de aviso de 60 segundos antes de cerrar sesión automáticamente.
 */
export function useIdleLogout({ enabled = true, onIdleLogout }) {
  const [timeoutMinutes, setTimeoutMinutes] = useState(() => loadIdleTimeoutMinutes())
  const [secondsLeft, setSecondsLeft] = useState(null)

  const lastActivityRef = useRef(0)
  const lastMoveWriteRef = useRef(0)
  const triggeredRef = useRef(false)
  const onIdleLogoutRef = useRef(onIdleLogout)

  useEffect(() => {
    onIdleLogoutRef.current = onIdleLogout
  }, [onIdleLogout])

  useEffect(() => {
    const syncPref = () => {
      const next = loadIdleTimeoutMinutes()
      setTimeoutMinutes(next)
      setSecondsLeft(null)
      triggeredRef.current = false
      const now = Date.now()
      lastActivityRef.current = now
      writeSharedActivityTs(now)
    }

    const handleStorage = (e) => {
      if (e.key === LAST_ACTIVITY_STORAGE_KEY && e.newValue) {
        const ts = parseInt(e.newValue, 10)
        if (ts > lastActivityRef.current) {
          lastActivityRef.current = ts
          setSecondsLeft(null)
          triggeredRef.current = false
        }
        return
      }
      syncPref()
    }

    window.addEventListener('preferences-updated', syncPref)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener('preferences-updated', syncPref)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const staySignedIn = useCallback(() => {
    const now = Date.now()
    lastActivityRef.current = now
    triggeredRef.current = false
    writeSharedActivityTs(now)
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) {
      return undefined
    }

    const totalMs = timeoutMinutes * 60 * 1000
    const initTs = Date.now()
    lastActivityRef.current = initTs
    triggeredRef.current = false
    writeSharedActivityTs(initTs)

    const bumpActivity = (isMouseMove = false) => {
      const latestShared = Math.max(lastActivityRef.current, readSharedActivityTs())
      const now = Date.now()
      // Una vez mostrado el modal de advertencia (últimos 60s), exigir confirmación explícita
      if (totalMs - (now - latestShared) <= WARNING_WINDOW_MS) {
        return
      }
      if (isMouseMove && now - lastMoveWriteRef.current < 1500) {
        return
      }
      if (isMouseMove) lastMoveWriteRef.current = now
      lastActivityRef.current = now
      writeSharedActivityTs(now)
    }

    const onKeyOrPointer = () => bumpActivity(false)
    const onMouseMove = () => bumpActivity(true)

    window.addEventListener('keydown', onKeyOrPointer, { passive: true })
    window.addEventListener('pointerdown', onKeyOrPointer, { passive: true })
    window.addEventListener('scroll', onKeyOrPointer, { passive: true })
    window.addEventListener('touchstart', onKeyOrPointer, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })

    const intervalId = setInterval(() => {
      if (triggeredRef.current) return
      const now = Date.now()
      const latest = Math.max(lastActivityRef.current, readSharedActivityTs())
      const remainingMs = totalMs - (now - latest)

      if (remainingMs <= 0) {
        triggeredRef.current = true
        setSecondsLeft(null)
        onIdleLogoutRef.current?.()
        return
      }

      if (remainingMs <= WARNING_WINDOW_MS) {
        setSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)))
      } else {
        setSecondsLeft((prev) => (prev !== null ? null : prev))
      }
    }, 1000)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('keydown', onKeyOrPointer)
      window.removeEventListener('pointerdown', onKeyOrPointer)
      window.removeEventListener('scroll', onKeyOrPointer)
      window.removeEventListener('touchstart', onKeyOrPointer)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [enabled, timeoutMinutes])

  return {
    timeoutMinutes,
    warningOpen: enabled && timeoutMinutes > 0 && secondsLeft !== null,
    secondsLeft: secondsLeft ?? 60,
    staySignedIn,
  }
}
