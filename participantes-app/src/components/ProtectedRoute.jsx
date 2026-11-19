import { useEffect, useState, useCallback, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { ShieldBan } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../core/queryClient'
import { limpiarDatosSensiblesLogout, registrarEventoSeguridad } from '../lib/seguridad'
import { EmptyState } from './ui/EmptyState'
import MfaChallengeCard from './MfaChallengeCard'

export default function ProtectedRoute({ children }) {
  const [session, setSession] = useState(undefined) // undefined = cargando sesión
  const [autorizado, setAutorizado] = useState(undefined) // undefined = cargando comprobación DB
  const [mfaChallenge, setMfaChallenge] = useState(null) // null = no requerido/cargando, { factorId, email } = pendiente AAL2
  const [totpCode, setTotpCode] = useState('')
  const [mfaError, setMfaError] = useState('')
  const [verifyingMfa, setVerifyingMfa] = useState(false)

  const checkingRef = useRef(false)

  const verificarAcceso = useCallback(async (userObj) => {
    const cleanEmail = userObj?.email?.trim().toLowerCase()
    if (!cleanEmail) {
      setAutorizado(false)
      setMfaChallenge(null)
      return
    }
    if (checkingRef.current) return
    checkingRef.current = true
    try {
      const [authRes, aalRes] = await Promise.allSettled([
        supabase
          .from('usuarios_autorizados')
          .select('activo')
          .ilike('email', cleanEmail)
          .single(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ])

      const { data, error } =
        authRes.status === 'fulfilled' && authRes.value
          ? authRes.value
          : { data: null, error: true }

      if (error || !data || data.activo !== true) {
        setAutorizado(false)
        setMfaChallenge(null)
        return
      }

      const aal = aalRes.status === 'fulfilled' ? aalRes.value?.data : null
      if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa
          .listFactors()
          .catch(() => ({ data: null }))
        const verifiedTotp = factors?.totp?.find((f) => f.status === 'verified')
        if (verifiedTotp) {
          setMfaChallenge({ factorId: verifiedTotp.id, email: cleanEmail })
          setAutorizado(true)
          return
        }
      }

      setMfaChallenge(null)
      setAutorizado(true)
    } catch {
      setAutorizado(false)
    } finally {
      checkingRef.current = false
    }
  }, [])

  useEffect(() => {
    let ignore = false

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (ignore) return
      setSession(currentSession)
      if (currentSession?.user?.email) {
        verificarAcceso(currentSession.user)
      } else {
        setAutorizado(false)
        setMfaChallenge(null)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (ignore) return
      setSession(nextSession)
      if (nextSession?.user?.email) {
        verificarAcceso(nextSession.user)
      } else {
        setAutorizado(false)
        setMfaChallenge(null)
      }
    })

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [verificarAcceso])

  // Revocación en tiempo real: expulsión inmediata si un admin desactiva o elimina la cuenta
  useEffect(() => {
    const cleanEmail = session?.user?.email?.trim().toLowerCase()
    if (!cleanEmail || autorizado !== true) return undefined

    const handleRevocation = async () => {
      setAutorizado(false)
      await limpiarDatosSensiblesLogout(queryClient)
      await supabase.auth.signOut().catch(() => {})
    }

    const channel = supabase
      .channel(`seguridad-acceso-${cleanEmail}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios_autorizados' },
        (payload) => {
          const rowEmail = (payload.new?.email || payload.old?.email || '').trim().toLowerCase()
          if (rowEmail !== cleanEmail) return
          if (payload.eventType === 'DELETE' || payload.new?.activo === false) {
            handleRevocation()
          }
        }
      )
      .subscribe()

    const handleFocusRevalidate = () => {
      if (session?.user) {
        verificarAcceso(session.user)
      }
    }

    window.addEventListener('focus', handleFocusRevalidate)
    return () => {
      window.removeEventListener('focus', handleFocusRevalidate)
      supabase.removeChannel(channel)
    }
  }, [session?.user, autorizado, verificarAcceso])

  async function handleVerifyMfa(e) {
    e.preventDefault()
    if (!mfaChallenge?.factorId) return
    const cleanCode = totpCode.replace(/\s+/g, '').trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      setMfaError('Ingresa un código válido de 6 dígitos.')
      return
    }

    setMfaError('')
    setVerifyingMfa(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaChallenge.factorId,
      code: cleanCode,
    })

    if (error) {
      setMfaError('Código inválido o expirado. Verifica tu app autenticadora.')
      setVerifyingMfa(false)
      return
    }

    await registrarEventoSeguridad(supabase, { tipo: 'MFA_CHALLENGE_OK' })
    setTotpCode('')
    setMfaChallenge(null)
    setVerifyingMfa(false)
  }

  async function handleSignOutClean() {
    await limpiarDatosSensiblesLogout(queryClient)
    await supabase.auth.signOut()
  }

  // Pantalla de carga mientras verifica sesión o autorización
  if (session === undefined || (session && autorizado === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text3 font-mono text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Verificando sesión...
        </div>
      </div>
    )
  }

  // Sin sesión → Login
  if (!session) return <Navigate to="/login" replace />

  // Sesión activa pero no autorizado
  if (!autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-lg">
          <EmptyState
            icon={ShieldBan}
            title="Acceso no autorizado"
            description="Tu cuenta no tiene permisos para acceder a esta aplicación o fue desactivada. Contacta al administrador para solicitar acceso."
            action={
              <button
                type="button"
                onClick={handleSignOutClean}
                className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                Cerrar sesión
              </button>
            }
          />
        </div>
      </div>
    )
  }

  // Sesión requiere completar verificación 2FA (AAL2) antes de exponer la app
  if (mfaChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-lg">
          <MfaChallengeCard
            email={mfaChallenge.email}
            code={totpCode}
            onChangeCode={setTotpCode}
            onSubmit={handleVerifyMfa}
            onCancel={handleSignOutClean}
            loading={verifyingMfa}
            error={mfaError}
            title="Verificación 2FA requerida"
            submitLabel="Confirmar código"
            cancelLabel="Cerrar sesión y cambiar de cuenta"
          />
        </div>
      </div>
    )
  }

  return children
}
