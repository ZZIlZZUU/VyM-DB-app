import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { createAttemptThrottle, registrarEventoSeguridad } from '../lib/seguridad'
import MfaChallengeCard from '../components/MfaChallengeCard'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)
  const [lockSeconds, setLockSeconds] = useState(0)

  // Paso 2FA (TOTP) tras autenticación primaria
  const [mfaChallenge, setMfaChallenge] = useState(null) // { factorId, email }
  const [totpCode, setTotpCode] = useState('')
  const [verifyingMfa, setVerifyingMfa] = useState(false)

  const navigate = useNavigate()

  const loginThrottle = useMemo(
    () => createAttemptThrottle('vym_login_throttle', { maxAttempts: 5, windowMs: 300000 }),
    []
  )

  useEffect(() => {
    let ignore = false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (ignore || !session?.user?.email) return
      const cleanEmail = session.user.email.trim().toLowerCase()
      const { data } = await supabase
        .from('usuarios_autorizados')
        .select('activo')
        .ilike('email', cleanEmail)
        .single()

      if (ignore || !data?.activo) return

      const { data: aal } = await supabase.auth.mfa
        .getAuthenticatorAssuranceLevel()
        .catch(() => ({ data: null }))

      if (ignore) return
      if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
        const { data: factors } = await supabase.auth.mfa.listFactors().catch(() => ({ data: null }))
        const totp = factors?.totp?.find((f) => f.status === 'verified')
        if (totp && !ignore) {
          setMfaChallenge({ factorId: totp.id, email: cleanEmail })
          return
        }
      }

      navigate('/', { replace: true })
    })
    return () => {
      ignore = true
    }
  }, [navigate])

  useEffect(() => {
    if (lockSeconds <= 0 && resetCooldown <= 0) return undefined
    const id = setInterval(() => {
      setLockSeconds((s) => (s > 1 ? s - 1 : 0))
      setResetCooldown((s) => (s > 1 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [lockSeconds, resetCooldown])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setResetMessage('')

    const lock = loginThrottle.getStatus()
    if (lock.locked) {
      setLockSeconds(lock.remainingSeconds)
      setError(`Demasiados intentos fallidos. Espera ${lock.remainingSeconds}s antes de reintentar.`)
      return
    }

    const emailClean = email.trim().toLowerCase()
    if (!emailClean) return
    setLoading(true)

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: emailClean,
      password,
    })

    if (authErr) {
      const nextStatus = loginThrottle.recordFailure()
      if (nextStatus.locked) {
        setLockSeconds(nextStatus.remainingSeconds)
        setError(`Demasiados intentos fallidos. Espera ${nextStatus.remainingSeconds}s.`)
      } else {
        setError('Correo o contraseña incorrectos.')
      }
      setLoading(false)
      return
    }

    // Verificar si está activo en usuarios_autorizados
    const { data } = await supabase
      .from('usuarios_autorizados')
      .select('activo')
      .ilike('email', emailClean)
      .single()

    if (!data?.activo) {
      await supabase.auth.signOut()
      setError('Tu cuenta no tiene acceso autorizado. Contacta al administrador.')
      setLoading(false)
      return
    }

    loginThrottle.reset()

    // Comprobar si la cuenta requiere desafío 2FA (AAL2)
    const { data: aal } = await supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .catch(() => ({ data: null }))

    if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
      const { data: factors } = await supabase.auth.mfa.listFactors().catch(() => ({ data: null }))
      const totp = factors?.totp?.find((f) => f.status === 'verified')
      if (totp) {
        setMfaChallenge({ factorId: totp.id, email: emailClean })
        setTotpCode('')
        setLoading(false)
        return
      }
    }

    await registrarEventoSeguridad(supabase, { tipo: 'LOGIN_OK' })
    navigate('/')
  }

  async function handleVerifyMfa(e) {
    e.preventDefault()
    if (!mfaChallenge?.factorId) return
    const lock = loginThrottle.getStatus()
    if (lock.locked) {
      setLockSeconds(lock.remainingSeconds)
      setError(`Demasiados intentos fallidos. Espera ${lock.remainingSeconds}s.`)
      return
    }

    const cleanCode = totpCode.replace(/\s+/g, '').trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Ingresa el código de 6 dígitos de tu aplicación autenticadora.')
      return
    }

    setError('')
    setVerifyingMfa(true)
    const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaChallenge.factorId,
      code: cleanCode,
    })

    if (verifyErr) {
      const nextStatus = loginThrottle.recordFailure()
      if (nextStatus.locked) {
        setLockSeconds(nextStatus.remainingSeconds)
        setError(`Demasiados intentos fallidos. Espera ${nextStatus.remainingSeconds}s.`)
      } else {
        setError('Código de verificación inválido o expirado.')
      }
      setVerifyingMfa(false)
      return
    }

    loginThrottle.reset()
    await registrarEventoSeguridad(supabase, { tipo: 'MFA_CHALLENGE_OK' })
    await registrarEventoSeguridad(supabase, { tipo: 'LOGIN_OK' })
    navigate('/')
  }

  async function handleCancelMfa() {
    await supabase.auth.signOut()
    setMfaChallenge(null)
    setTotpCode('')
    setPassword('')
    setError('')
  }

  async function handleResetPassword() {
    if (resetCooldown > 0) return
    const emailClean = email.trim().toLowerCase()
    if (!emailClean) {
      setError('Ingresa tu correo electrónico para restablecer o definir tu contraseña.')
      return
    }
    setError('')
    setResetMessage('')
    setResetLoading(true)

    const redirectUrl = `${window.location.origin}/set-password`
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(emailClean, {
      redirectTo: redirectUrl,
    })

    if (resetErr) {
      setError('No se pudo procesar la solicitud en este momento. Intenta de nuevo en unos minutos.')
    } else {
      setResetCooldown(60)
      setResetMessage(
        'Si el correo está autorizado, recibirás un enlace para definir o restablecer tu contraseña.'
      )
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className={`w-full ${mfaChallenge ? 'max-w-md' : 'max-w-sm'}`}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-mono text-xs text-text3 tracking-widest uppercase mb-1">
            Base de datos
          </div>
          <h1 className="text-xl font-medium text-text1">Participantes 2026</h1>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-7">
          {mfaChallenge ? (
            <MfaChallengeCard
              email={mfaChallenge.email}
              code={totpCode}
              onChangeCode={setTotpCode}
              onSubmit={handleVerifyMfa}
              onCancel={handleCancelMfa}
              loading={verifyingMfa}
              lockSeconds={lockSeconds}
              error={error}
            />
          ) : (
            <>
              <div className="text-sm font-medium text-text1 mb-5">Iniciar sesión</div>

              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                    className="px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full pl-3 pr-9 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text3 hover:text-text1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-danger bg-danger-bg border border-danger/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                {resetMessage && (
                  <div className="text-xs text-accent bg-accent-bg border border-accent/30 rounded-lg px-3 py-2">
                    {resetMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || lockSeconds > 0}
                  className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading
                    ? 'Verificando...'
                    : lockSeconds > 0
                    ? `Bloqueado (${lockSeconds}s)`
                    : 'Entrar'}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetLoading || resetCooldown > 0}
                    className="text-xs text-text3 hover:text-accent underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {resetLoading
                      ? 'Enviando correo...'
                      : resetCooldown > 0
                      ? `Reintentar en ${resetCooldown}s`
                      : '¿Olvidaste tu contraseña?'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-5 text-xs text-text3">Acceso solo por invitación</div>
      </div>
    </div>
  )
}
