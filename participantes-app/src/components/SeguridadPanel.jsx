import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Smartphone,
  Mail,
  Laptop,
  AlertTriangle,
  Eye,
  EyeOff,
  Check,
  X,
  Copy,
  RefreshCw,
  Clock,
  Lock,
  LogOut,
  QrCode,
  Maximize2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFechaHora } from '../lib/fechas'
import {
  IDLE_TIMEOUT_OPTIONS,
  EVENTO_SEGURIDAD_META,
  getDeviceLabel,
  evaluarFortalezaPassword,
  verificarPasswordFiltradaHIBP,
  verificarContrasenaActualSeguro,
  calcularSaludSeguridad,
  registrarEventoSeguridad,
  loadIdleTimeoutMinutes,
  saveIdleTimeoutMinutes,
  createAttemptThrottle,
} from '../lib/seguridad'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Select } from './ui/Select'

const STRENGTH_BAR_COLORS = [
  'bg-danger',
  'bg-danger',
  'bg-amber',
  'bg-blue',
  'bg-accent',
]

function normalizeQrSrc(qrCode) {
  if (!qrCode || typeof qrCode !== 'string') return ''
  const trimmed = qrCode.trim()
  if (trimmed.startsWith('data:')) return trimmed
  if (trimmed.startsWith('<svg')) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(trimmed)}`
  }
  return trimmed
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  minLength,
  autoComplete,
  ariaLabel,
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className="w-full h-9 pl-3 pr-9 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent disabled:bg-surface-alt/60 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        disabled={disabled}
        tabIndex={-1}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-text3 hover:text-text1 disabled:opacity-40 cursor-pointer"
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

export default function SeguridadPanel({
  user,
  rol,
  displayName,
  onClose,
  onLogout,
  onUserUpdated,
  confirm,
  success,
  error,
  showToast,
}) {
  // ── Estado MFA / Salud / Sesiones ──
  const [mfaLoading, setMfaLoading] = useState(true)
  const [mfaAvailable, setMfaAvailable] = useState(true)
  const [verifiedFactors, setVerifiedFactors] = useState([])
  const [aalInfo, setAalInfo] = useState({ currentLevel: 'aal1', nextLevel: 'aal1' })
  const [idleMinutes, setIdleMinutes] = useState(() => loadIdleTimeoutMinutes())

  // Enrolamiento 2FA TOTP
  const [enrollingFactor, setEnrollingFactor] = useState(null)
  const [enrollCode, setEnrollCode] = useState('')
  const [startingEnroll, setStartingEnroll] = useState(false)
  const [verifyingEnroll, setVerifyingEnroll] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)

  // Desactivación 2FA TOTP
  const [showDisableMfa, setShowDisableMfa] = useState(false)
  const [disableMfaPassword, setDisableMfaPassword] = useState('')
  const [disablingMfa, setDisablingMfa] = useState(false)

  // ── Cambio de Contraseña ──
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [signOutOthersOnPwd, setSignOutOthersOnPwd] = useState(true)
  const [savingPassword, setSavingPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)
  const [pwdLockSeconds, setPwdLockSeconds] = useState(0)

  // ── Cambio de Correo ──
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  // ── Sesiones y Eventos de Seguridad ──
  const [closingOthers, setClosingOthers] = useState(false)
  const [securityEvents, setSecurityEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  // ── Zona de Peligro (Baja de cuenta) ──
  const [bajaCheck, setBajaCheck] = useState({ permitido: true, motivo: null })
  const [showBajaForm, setShowBajaForm] = useState(false)
  const [bajaPassword, setBajaPassword] = useState('')
  const [bajaConfirmText, setBajaConfirmText] = useState('')
  const [processingBaja, setProcessingBaja] = useState(false)

  const idleSectionRef = useRef(null)
  const idleSelectRef = useRef(null)

  const pwdThrottle = useMemo(
    () => createAttemptThrottle(`vym_reauth_pwd_${user?.id || 'anon'}`),
    [user?.id]
  )

  const loadSecurityContext = useCallback(async () => {
    setMfaLoading(true)
    setEventsLoading(true)
    try {
      const [factorsSettled, aalSettled, bajaSettled, eventsSettled] = await Promise.allSettled([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.rpc('puede_dar_de_baja_mi_cuenta'),
        supabase
          .from('eventos_seguridad')
          .select('id, tipo, dispositivo, detalle, created_at')
          .order('created_at', { ascending: false })
          .limit(15),
      ])

      const factorsRes = factorsSettled.status === 'fulfilled' ? factorsSettled.value : null
      const aalRes = aalSettled.status === 'fulfilled' ? aalSettled.value : null
      const bajaRes = bajaSettled.status === 'fulfilled' ? bajaSettled.value : null
      const eventsRes = eventsSettled.status === 'fulfilled' ? eventsSettled.value : null

      if (!factorsRes || factorsRes.error) {
        setMfaAvailable(false)
        setVerifiedFactors([])
      } else {
        setMfaAvailable(true)
        const candidates = [
          ...(factorsRes.data?.totp || []),
          ...(factorsRes.data?.all || []).filter((f) => f.factor_type === 'totp'),
        ]
        const uniqueVerified = []
        const seenIds = new Set()
        for (const f of candidates) {
          if (f?.status === 'verified' && f.id && !seenIds.has(f.id)) {
            seenIds.add(f.id)
            uniqueVerified.push(f)
          }
        }
        setVerifiedFactors(uniqueVerified)
      }

      if (aalRes?.data) {
        setAalInfo({
          currentLevel: aalRes.data.currentLevel || 'aal1',
          nextLevel: aalRes.data.nextLevel || 'aal1',
        })
      }

      if (bajaRes?.data && typeof bajaRes.data === 'object') {
        setBajaCheck({
          permitido: bajaRes.data.permitido !== false,
          motivo: bajaRes.data.motivo || null,
        })
      }

      setSecurityEvents(Array.isArray(eventsRes?.data) ? eventsRes.data : [])
    } finally {
      setMfaLoading(false)
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function run() {
      if (ignore) return
      await loadSecurityContext()
    }
    run()
    return () => {
      ignore = true
    }
  }, [loadSecurityContext])

  // Temporizador para cooldowns activos (recuperación o bloqueo por intentos)
  useEffect(() => {
    if (resetCooldown <= 0 && pwdLockSeconds <= 0) return undefined
    const id = setInterval(() => {
      setResetCooldown((s) => (s > 1 ? s - 1 : 0))
      setPwdLockSeconds((s) => (s > 1 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [resetCooldown, pwdLockSeconds])

  // Cerrar vista ampliada del QR con Escape sin cerrar el modal de Perfil padre
  useEffect(() => {
    if (!qrExpanded) return undefined
    function onEsc(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setQrExpanded(false)
      }
    }
    window.addEventListener('keydown', onEsc, true)
    return () => window.removeEventListener('keydown', onEsc, true)
  }, [qrExpanded])

  const mfaEnabled = verifiedFactors.length > 0
  const hasPendingEmail = Boolean(user?.new_email)
  const salud = useMemo(
    () =>
      calcularSaludSeguridad({
        mfaEnabled,
        emailConfirmed: !hasPendingEmail,
        idleTimeoutMinutes: idleMinutes,
        rol,
      }),
    [mfaEnabled, hasPendingEmail, idleMinutes, rol]
  )

  const pwdStrength = useMemo(
    () =>
      evaluarFortalezaPassword(password, {
        email: user?.email || '',
        nombre: displayName || '',
        currentPassword,
      }),
    [password, user?.email, displayName, currentPassword]
  )

  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword)

  async function refreshEventsOnly() {
    setEventsLoading(true)
    try {
      const { data } = await supabase
        .from('eventos_seguridad')
        .select('id, tipo, dispositivo, detalle, created_at')
        .order('created_at', { ascending: false })
        .limit(15)
      setSecurityEvents(Array.isArray(data) ? data : [])
    } catch {
      // ignore if table not present yet
    } finally {
      setEventsLoading(false)
    }
  }

  // ── Handlers 2FA TOTP ──
  async function handleStartEnrollMfa() {
    setStartingEnroll(true)
    try {
      const { data: existing } = await supabase.auth.mfa.listFactors()
      const allFactors = existing?.all || []
      const alreadyVerified = [
        ...(existing?.totp || []),
        ...allFactors.filter((f) => f.factor_type === 'totp'),
      ].some((f) => f?.status === 'verified')

      if (alreadyVerified) {
        await loadSecurityContext()
        showToast('La autenticación en 2 pasos ya está activa en tu cuenta.', 'info')
        return
      }

      const staleUnverified = allFactors.filter(
        (f) => f.factor_type === 'totp' && f.status === 'unverified'
      )
      for (const stale of staleUnverified) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id }).catch(() => {})
      }

      const baseFriendlyName = `VyM-DB (${getDeviceLabel()})`
      const usedNames = new Set(allFactors.map((f) => f?.friendly_name).filter(Boolean))
      const friendlyName = usedNames.has(baseFriendlyName)
        ? `${baseFriendlyName} #${Date.now().toString(36).slice(-4)}`
        : baseFriendlyName

      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      })
      if (enrollErr) {
        error(enrollErr.message || 'No se pudo iniciar la configuración de 2FA.')
        return
      }
      setEnrollingFactor(data)
      setEnrollCode('')
    } catch (err) {
      error(err?.message || 'El proyecto Supabase aún no tiene 2FA TOTP habilitado.')
    } finally {
      setStartingEnroll(false)
    }
  }

  async function handleCancelEnrollMfa() {
    const targetId = enrollingFactor?.id
    setQrExpanded(false)
    setEnrollingFactor(null)
    setEnrollCode('')
    if (targetId) {
      await supabase.auth.mfa.unenroll({ factorId: targetId }).catch(() => {})
    }
  }

  async function handleVerifyEnrollMfa(e) {
    e.preventDefault()
    if (!enrollingFactor?.id) return
    const cleanCode = enrollCode.replace(/\s+/g, '').trim()
    if (!/^\d{6}$/.test(cleanCode)) {
      error('Ingresa el código de 6 dígitos de tu aplicación autenticadora.')
      return
    }

    setVerifyingEnroll(true)
    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollingFactor.id,
        code: cleanCode,
      })
      if (verifyErr) {
        error('Código inválido o expirado. Verifica la hora de tu dispositivo e inténtalo de nuevo.')
        return
      }

      setQrExpanded(false)
      setEnrollingFactor(null)
      setEnrollCode('')
      await supabase.auth.refreshSession().catch(() => {})
      await registrarEventoSeguridad(supabase, { tipo: 'MFA_ENROLLED' })
      await loadSecurityContext()
      success('Autenticación en 2 pasos (2FA) activada correctamente.')
    } finally {
      setVerifyingEnroll(false)
    }
  }

  async function handleCopyTotpSecret() {
    const secret = enrollingFactor?.totp?.secret
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      success('Clave secreta copiada al portapapeles')
    } catch {
      error('No se pudo copiar la clave automáticamente.')
    }
  }

  async function handleDisableMfa(e) {
    e.preventDefault()
    if (!disableMfaPassword) {
      error('Ingresa tu contraseña actual para desactivar 2FA.')
      return
    }
    setDisablingMfa(true)
    try {
      const authCheck = await verificarContrasenaActualSeguro(supabase, {
        email: user?.email,
        password: disableMfaPassword,
        hasMfa: true,
      })
      if (!authCheck.ok) {
        error(authCheck.error)
        return
      }

      for (const factor of verifiedFactors) {
        const { error: unenrollErr } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
        if (unenrollErr) {
          error(unenrollErr.message || 'No se pudo desactivar el factor 2FA.')
          return
        }
      }

      setShowDisableMfa(false)
      setDisableMfaPassword('')
      await registrarEventoSeguridad(supabase, { tipo: 'MFA_DISABLED' })
      await loadSecurityContext()
      success('Autenticación en 2 pasos desactivada.')
    } finally {
      setDisablingMfa(false)
    }
  }

  // ── Handler Contraseña ──
  async function handleSavePassword(e) {
    e.preventDefault()
    const lock = pwdThrottle.getStatus()
    if (lock.locked) {
      setPwdLockSeconds(lock.remainingSeconds)
      error(`Demasiados intentos fallidos. Espera ${lock.remainingSeconds}s para reintentar.`)
      return
    }

    if (!currentPassword) {
      error('Ingresa tu contraseña actual.')
      return
    }
    if (!pwdStrength.cumpleMinimo) {
      error(pwdStrength.bloqueos[0] || 'La nueva contraseña no cumple los requisitos mínimos.')
      return
    }
    if (!passwordsMatch) {
      error('Las contraseñas nuevas no coinciden.')
      return
    }

    setSavingPassword(true)
    try {
      const authCheck = await verificarContrasenaActualSeguro(supabase, {
        email: user?.email,
        password: currentPassword,
        hasMfa: mfaEnabled,
      })
      if (!authCheck.ok) {
        const nextStatus = pwdThrottle.recordFailure()
        if (nextStatus.locked) setPwdLockSeconds(nextStatus.remainingSeconds)
        error(authCheck.error)
        return
      }
      pwdThrottle.reset()

      // Chequeo privado k-Anonymity contra contraseñas filtradas (HIBP)
      const hibp = await verificarPasswordFiltradaHIBP(password)
      if (hibp.filtrada) {
        const aceptar = await confirm({
          title: 'Contraseña expuesta en filtraciones públicas',
          message: `Esta contraseña ha aparecido ${hibp.conteo.toLocaleString('es-MX')} veces en bases de datos filtradas conocidas. Se recomienda elegir otra combinación única. ¿Deseas usarla de todas formas?`,
          danger: true,
        })
        if (!aceptar) {
          setSavingPassword(false)
          return
        }
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) {
        error(updateErr.message || 'Error al actualizar la contraseña.')
        return
      }

      if (signOutOthersOnPwd) {
        await supabase.auth.signOut({ scope: 'others' }).catch(() => {})
      }

      await registrarEventoSeguridad(supabase, {
        tipo: 'PASSWORD_CHANGED',
        detalle: { revocoOtrasSesiones: signOutOthersOnPwd },
      })
      await refreshEventsOnly()

      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      success(
        signOutOthersOnPwd
          ? 'Contraseña actualizada y otras sesiones cerradas.'
          : 'Contraseña actualizada correctamente.'
      )
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleForgotCurrentPassword() {
    if (!user?.email || resetCooldown > 0) return
    setResetLoading(true)
    try {
      const redirectUrl = `${window.location.origin}/set-password`
      const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: redirectUrl,
      })
      if (err) {
        error(err.message || 'Error al enviar correo de recuperación.')
      } else {
        setResetCooldown(60)
        await registrarEventoSeguridad(supabase, { tipo: 'PASSWORD_RESET_REQUESTED' })
        await refreshEventsOnly()
        showToast(`Correo de recuperación enviado a ${user.email}`, 'info')
      }
    } finally {
      setResetLoading(false)
    }
  }

  // ── Handler Correo ──
  async function handleSaveEmail(e) {
    e.preventDefault()
    const emailTrimmed = newEmail.trim().toLowerCase()
    if (!emailTrimmed || emailTrimmed === user?.email?.toLowerCase()) {
      error('Ingresa una dirección de correo diferente a la actual.')
      return
    }
    if (!emailPassword) {
      error('Ingresa tu contraseña actual para autorizar el cambio de correo.')
      return
    }

    const lock = pwdThrottle.getStatus()
    if (lock.locked) {
      setPwdLockSeconds(lock.remainingSeconds)
      error(`Demasiados intentos fallidos. Espera ${lock.remainingSeconds}s.`)
      return
    }

    setSavingEmail(true)
    try {
      const authCheck = await verificarContrasenaActualSeguro(supabase, {
        email: user?.email,
        password: emailPassword,
        hasMfa: mfaEnabled,
      })
      if (!authCheck.ok) {
        const nextStatus = pwdThrottle.recordFailure()
        if (nextStatus.locked) setPwdLockSeconds(nextStatus.remainingSeconds)
        error(authCheck.error)
        return
      }
      pwdThrottle.reset()

      // Pre-validar disponibilidad en usuarios_autorizados y auth.users
      const { data: availData, error: availErr } = await supabase.rpc(
        'verificar_cambio_correo_disponible',
        { p_nuevo_email: emailTrimmed }
      )
      if (!availErr && availData && availData.disponible === false) {
        error(availData.motivo || 'El correo elegido no está disponible.')
        return
      }

      const { error: err } = await supabase.auth.updateUser(
        { email: emailTrimmed },
        { emailRedirectTo: window.location.origin }
      )
      if (err) {
        error(err.message || 'Error al solicitar el cambio de correo.')
        return
      }

      await registrarEventoSeguridad(supabase, {
        tipo: 'EMAIL_CHANGE_REQUESTED',
        detalle: { destino: emailTrimmed },
      })
      await onUserUpdated?.()
      await refreshEventsOnly()

      showToast(
        `Se enviaron enlaces de confirmación a tu correo actual y a ${emailTrimmed}.`,
        'info'
      )
      setNewEmail('')
      setEmailPassword('')
    } finally {
      setSavingEmail(false)
    }
  }

  // ── Handlers Sesiones & Inactividad ──
  async function handleSignOutOthers() {
    const ok = await confirm({
      title: '¿Cerrar sesiones en los demás dispositivos?',
      message:
        'Tu sesión actual permanecerá abierta, pero cualquier otro navegador o equipo conectado tendrá que volver a iniciar sesión.',
    })
    if (!ok) return

    setClosingOthers(true)
    try {
      const { error: err } = await supabase.auth.signOut({ scope: 'others' })
      if (err) {
        error(err.message || 'No se pudieron cerrar las otras sesiones.')
        return
      }
      await registrarEventoSeguridad(supabase, { tipo: 'SIGN_OUT_OTHERS' })
      await refreshEventsOnly()
      success('Todas las demás sesiones han sido cerradas.')
    } finally {
      setClosingOthers(false)
    }
  }

  async function handleSignOutAll() {
    const ok = await confirm({
      title: '¿Cerrar sesión en todos los dispositivos?',
      message:
        'Se invalidarán todas tus sesiones activas, incluida esta, y deberás iniciar sesión nuevamente.',
    })
    if (!ok) return

    await registrarEventoSeguridad(supabase, { tipo: 'SIGN_OUT_ALL' })
    const { error: err } = await supabase.auth.signOut({ scope: 'global' })
    if (err) {
      error(err.message || 'Error al cerrar las sesiones globales.')
    } else {
      onClose?.()
      onLogout?.({ skipConfirm: true })
    }
  }

  function handleIdleTimeoutChange(val) {
    const saved = saveIdleTimeoutMinutes(Number(val))
    setIdleMinutes(saved)
    success(
      saved > 0
        ? `Cierre automático por inactividad configurado a ${saved} min`
        : 'Cierre automático por inactividad desactivado'
    )
  }

  // ── Handler Baja Segura ──
  async function handleConfirmBajaCuenta(e) {
    e.preventDefault()
    if (!bajaCheck.permitido) {
      error(bajaCheck.motivo || 'No puedes dar de baja esta cuenta.')
      return
    }
    if (!bajaPassword) {
      error('Ingresa tu contraseña actual para confirmar.')
      return
    }
    if (bajaConfirmText.trim().toUpperCase() !== 'DESACTIVAR') {
      error('Escribe la palabra DESACTIVAR exactamente para continuar.')
      return
    }

    setProcessingBaja(true)
    try {
      const authCheck = await verificarContrasenaActualSeguro(supabase, {
        email: user?.email,
        password: bajaPassword,
        hasMfa: mfaEnabled,
      })
      if (!authCheck.ok) {
        error(authCheck.error)
        return
      }

      const { error: err } = await supabase
        .from('usuarios_autorizados')
        .update({ activo: false })
        .ilike('email', user.email)

      if (err) {
        error(err.message || 'No se pudo dar de baja la cuenta.')
        return
      }

      await registrarEventoSeguridad(supabase, { tipo: 'ACCOUNT_DEACTIVATED' })
      await supabase.auth.signOut({ scope: 'global' }).catch(() => {})
      onClose?.()
      onLogout?.({ skipConfirm: true })
    } finally {
      setProcessingBaja(false)
    }
  }

  const qrImageSrc = normalizeQrSrc(enrollingFactor?.totp?.qr_code)

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Resumen de Salud de Seguridad */}
      <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {salud.score >= 85 ? (
              <ShieldCheck className="w-4 h-4 text-accent shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber shrink-0" />
            )}
            <span className="text-xs font-semibold text-text1">Estado de seguridad de tu cuenta</span>
          </div>
          <Badge variant={salud.variant} size="xs">
            Nivel {salud.nivel} · {salud.score}%
          </Badge>
        </div>

        <div className="h-2 rounded-full bg-surface border border-border overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              salud.score >= 85 ? 'bg-accent' : salud.score >= 55 ? 'bg-amber' : 'bg-danger'
            }`}
            style={{ width: `${salud.score}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <Badge variant={mfaEnabled ? 'success' : rol === 'admin' ? 'danger' : 'warning'} size="xs">
            2FA TOTP: {mfaEnabled ? 'Activo' : 'Inactivo'}
          </Badge>
          <Badge variant={aalInfo.currentLevel === 'aal2' ? 'success' : 'neutral'} size="xs">
            Sesión: {aalInfo.currentLevel.toUpperCase()}
          </Badge>
          <Badge variant={hasPendingEmail ? 'warning' : 'success'} size="xs">
            Correo: {hasPendingEmail ? 'Cambio pendiente' : 'Verificado'}
          </Badge>
          <Badge variant={idleMinutes > 0 ? 'info' : 'neutral'} size="xs">
            Inactividad: {idleMinutes > 0 ? `${idleMinutes} min` : 'Sin límite'}
          </Badge>
        </div>

        {salud.pendientes.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {salud.pendientes.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-[11px]"
              >
                <div>
                  <div className="font-medium text-text1">{item.title}</div>
                  <div className="text-text3">{item.detail}</div>
                </div>
                {item.id === 'mfa' && mfaAvailable && !enrollingFactor && (
                  <Button
                    type="button"
                    variant="accent"
                    size="xs"
                    onClick={handleStartEnrollMfa}
                    loading={startingEnroll}
                    className="shrink-0"
                  >
                    Activar 2FA
                  </Button>
                )}
                {item.id === 'idle' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      idleSectionRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                      })
                      setTimeout(() => idleSelectRef.current?.focus(), 200)
                    }}
                    className="shrink-0"
                  >
                    Configurar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Autenticación en Dos Pasos (2FA TOTP) */}
      <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-muted-bg text-accent border border-accent-muted-border flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text1 flex items-center gap-2 flex-wrap">
                <span>Autenticación en dos pasos (2FA · TOTP)</span>
                {mfaEnabled ? (
                  <Badge variant="success" size="xs" dot>
                    Protegida
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="xs">
                    Desactivada
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-text3 mt-0.5">
                Solicita un código temporal de 6 dígitos desde Google Authenticator, 1Password o Authy al iniciar sesión.
              </p>
            </div>
          </div>

          {!mfaLoading && mfaAvailable && !mfaEnabled && !enrollingFactor && (
            <Button
              type="button"
              variant="accent"
              size="sm"
              icon={QrCode}
              loading={startingEnroll}
              onClick={handleStartEnrollMfa}
              className="shrink-0 self-start sm:self-center"
            >
              Configurar 2FA
            </Button>
          )}

          {!mfaLoading && mfaEnabled && !showDisableMfa && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDisableMfa(true)
                setDisableMfaPassword('')
              }}
              className="shrink-0 self-start sm:self-center"
            >
              Desactivar 2FA
            </Button>
          )}
        </div>

        {mfaEnabled && verifiedFactors.length > 0 && !showDisableMfa && (
          <div className="space-y-1.5">
            {verifiedFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface border border-border text-xs"
              >
                <div className="min-w-0">
                  <div className="font-medium text-text1 truncate">
                    {factor.friendly_name || 'App autenticadora'}
                  </div>
                  {factor.created_at && (
                    <div className="text-[10px] font-mono text-text3">
                      Activado el {formatFechaHora(factor.created_at)}
                    </div>
                  )}
                </div>
                <Badge variant="success" size="xs" dot className="shrink-0">
                  Verificado
                </Badge>
              </div>
            ))}
          </div>
        )}

        {!mfaAvailable && (
          <div className="text-[11px] text-amber bg-amber-bg border border-amber/20 rounded-lg px-3 py-2">
            La API de TOTP no respondió en este proyecto. Verifica que <strong>TOTP (App Authenticator)</strong> esté activado en Supabase Dashboard → Authentication → Multi-Factor.
          </div>
        )}

        {enrollingFactor && (
          <form
            onSubmit={handleVerifyEnrollMfa}
            className="p-3.5 rounded-xl bg-surface border border-border2 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-text1">
                Escanea este código QR con tu app autenticadora
              </span>
              <Button type="button" variant="ghost" size="xs" onClick={handleCancelEnrollMfa}>
                Cancelar
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {qrImageSrc && (
                <button
                  type="button"
                  onClick={() => setQrExpanded(true)}
                  className="group relative flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
                  title="Haz clic para ampliar el código QR y las instrucciones"
                  aria-label="Ampliar código QR de configuración 2FA"
                >
                  <div className="relative rounded-xl overflow-hidden bg-white p-2 border border-border group-hover:border-accent transition-colors">
                    <img
                      src={qrImageSrc}
                      alt="Código QR para configurar 2FA TOTP"
                      className="w-36 h-36 block"
                    />
                    <span className="absolute inset-0 bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-[11px] font-medium">
                      <Maximize2 className="w-4 h-4" />
                      Ampliar QR
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent group-hover:underline">
                    <Maximize2 className="w-3 h-3" />
                    Haz clic para ampliar
                  </span>
                </button>
              )}

              <div className="flex-1 w-full space-y-2.5 min-w-0">
                <div>
                  <div className="text-[11px] text-text3 mb-1">
                    ¿No puedes escanear el QR? Copia la clave manual:
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface-alt border border-border font-mono text-[11px] text-text1 truncate select-all">
                      {enrollingFactor?.totp?.secret || ''}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      icon={Copy}
                      onClick={handleCopyTotpSecret}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text2 mb-1">
                    Código de verificación (6 dígitos) *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      required
                      className="w-36 h-9 px-3 border border-border2 rounded-lg text-sm font-mono tracking-widest bg-surface text-text1 outline-none focus:border-accent"
                    />
                    <Button
                      type="submit"
                      variant="accent"
                      size="sm"
                      loading={verifyingEnroll}
                      disabled={enrollCode.length !== 6}
                    >
                      Verificar y activar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {showDisableMfa && mfaEnabled && (
          <form
            onSubmit={handleDisableMfa}
            className="p-3.5 rounded-xl bg-surface border border-danger/30 space-y-3"
          >
            <div className="text-xs font-semibold text-text1">
              Confirma tu contraseña para desactivar 2FA
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <PasswordInput
                  value={disableMfaPassword}
                  onChange={(e) => setDisableMfaPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  required
                  autoComplete="current-password"
                  ariaLabel="Contraseña actual para desactivar 2FA"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="dangerGhost"
                  size="sm"
                  loading={disablingMfa}
                  className="border border-danger/30"
                >
                  Confirmar desactivación
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisableMfa(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* 3. Auto-cierre por Inactividad (junto a 2FA para acceso inmediato) */}
      <div
        ref={idleSectionRef}
        className="p-4 rounded-xl bg-surface-alt/35 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-muted-bg text-accent border border-accent-muted-border flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-text1">Auto-cierre por inactividad</div>
            <p className="text-[11px] text-text3 mt-0.5">
              Cierra tu sesión automáticamente tras un periodo sin actividad (con aviso previo de 60s).
            </p>
          </div>
        </div>
        <div className="w-full sm:w-58 shrink-0">
          <Select
            ref={idleSelectRef}
            size="sm"
            value={String(idleMinutes)}
            onChange={(e) => handleIdleTimeoutChange(e.target.value)}
            aria-label="Tiempo de auto-cierre por inactividad"
          >
            {IDLE_TIMEOUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface text-text1">
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* 4. Cambio de Contraseña Reforzado */}
      <form
        onSubmit={handleSavePassword}
        className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-text1 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-accent" />
              <span>Cambiar contraseña</span>
            </div>
            <p className="text-[11px] text-text3 mt-0.5">
              Política reforzada con validación de fortaleza y revisión de filtraciones conocidas.
            </p>
          </div>
          {pwdLockSeconds > 0 && (
            <Badge variant="danger" size="xs">
              Bloqueado {pwdLockSeconds}s
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-text2">Contraseña actual *</label>
              <button
                type="button"
                onClick={handleForgotCurrentPassword}
                disabled={resetLoading || resetCooldown > 0}
                className="text-[11px] text-text3 hover:text-accent underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {resetLoading
                  ? 'Enviando...'
                  : resetCooldown > 0
                  ? `Espera ${resetCooldown}s`
                  : '¿Olvidaste tu contraseña actual?'}
              </button>
            </div>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Ingresa tu contraseña actual"
              required
              autoComplete="current-password"
              ariaLabel="Contraseña actual"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text2 mb-1">
                Nueva contraseña *
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 8 chars (Aa + 0-9)"
                required
                minLength={8}
                autoComplete="new-password"
                ariaLabel="Nueva contraseña"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text2 mb-1">
                Confirmar nueva contraseña *
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
                required
                minLength={8}
                autoComplete="new-password"
                ariaLabel="Confirmar nueva contraseña"
              />
            </div>
          </div>

          {/* Medidor de fortaleza y requisitos en tiempo real */}
          {password.length > 0 && (
            <div className="p-3 rounded-lg bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text3">Fortaleza de la contraseña</span>
                <span className="font-mono font-semibold text-text1">{pwdStrength.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-colors ${
                      pwdStrength.score >= step
                        ? STRENGTH_BAR_COLORS[pwdStrength.score]
                        : 'bg-surface-alt'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
                {pwdStrength.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className={`flex items-center gap-1.5 text-[11px] ${
                      chk.met ? 'text-accent' : chk.required ? 'text-text3' : 'text-text3/80'
                    }`}
                  >
                    {chk.met ? (
                      <Check className="w-3 h-3 shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-border2 inline-block shrink-0" />
                    )}
                    <span>{chk.label}</span>
                  </div>
                ))}
              </div>
              {currentPassword && password === currentPassword && (
                <div className="text-[11px] text-danger font-medium">
                  La nueva contraseña no puede ser igual a la actual.
                </div>
              )}
              {confirmPassword && !passwordsMatch && (
                <div className="text-[11px] text-danger font-medium">
                  La confirmación no coincide con la nueva contraseña.
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-text2 cursor-pointer select-none pt-0.5">
            <input
              type="checkbox"
              checked={signOutOthersOnPwd}
              onChange={(e) => setSignOutOthersOnPwd(e.target.checked)}
              className="rounded border-border2 accent-accent"
            />
            <span>Cerrar sesión en los demás dispositivos al actualizar</span>
          </label>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="accent"
            size="sm"
            loading={savingPassword}
            disabled={
              savingPassword ||
              pwdLockSeconds > 0 ||
              !currentPassword ||
              !pwdStrength.cumpleMinimo ||
              !passwordsMatch
            }
          >
            {savingPassword ? 'Verificando y actualizando...' : 'Actualizar contraseña'}
          </Button>
        </div>
      </form>

      {/* 4. Cambio Seguro de Correo */}
      <form
        onSubmit={handleSaveEmail}
        className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3"
      >
        <div>
          <div className="text-xs font-semibold text-text1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-accent" />
            <span>Cambiar correo electrónico</span>
          </div>
          <p className="text-[11px] text-text3 mt-0.5">
            Pre-validamos que el correo esté libre y requerimos confirmación tanto en tu bandeja actual como en la nueva.
          </p>
        </div>

        {hasPendingEmail && (
          <div className="p-3 rounded-lg bg-amber-bg border border-amber/25 text-xs text-text1 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-amber shrink-0 mt-0.5" />
            <div>
              <div>
                Tienes un cambio pendiente hacia <strong className="font-mono">{user.new_email}</strong>.
              </div>
              <p className="text-[11px] text-text2 mt-0.5">
                Confirma los enlaces enviados tanto a <strong>{user.email}</strong> como al nuevo correo para completar el traslado.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text2 mb-1">Nuevo correo *</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="nuevo@correo.com"
              className="w-full h-9 px-3 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-text2 mb-1">Contraseña actual *</label>
            <PasswordInput
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder="Para autorizar el cambio"
              required
              autoComplete="current-password"
              ariaLabel="Contraseña actual para cambiar correo"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            loading={savingEmail}
            disabled={savingEmail || pwdLockSeconds > 0 || !newEmail.trim() || !emailPassword}
          >
            {savingEmail ? 'Verificando...' : 'Solicitar cambio de correo'}
          </Button>
        </div>
      </form>

      {/* 5. Sesiones Activas */}
      <div className="p-4 rounded-xl bg-surface-alt/35 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-muted-bg text-accent border border-accent-muted-border flex items-center justify-center shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-text1">
                Sesión actual · {getDeviceLabel()}
              </div>
              <div className="text-[11px] text-text3 mt-0.5">
                {user?.last_sign_in_at
                  ? `Último acceso: ${formatFechaHora(user.last_sign_in_at)}`
                  : 'Sesión activa en este navegador'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="xs"
              loading={closingOthers}
              onClick={handleSignOutOthers}
            >
              Cerrar en otros dispositivos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              icon={LogOut}
              onClick={handleSignOutAll}
            >
              Cerrar todas
            </Button>
          </div>
        </div>
      </div>

      {/* 6. Registro de Eventos de Seguridad */}
      <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold text-text1">Bitácora de seguridad de tu cuenta</div>
            <p className="text-[11px] text-text3 mt-0.5">
              Últimos eventos críticos registrados (accesos, 2FA, cambios de clave y sesiones).
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            icon={RefreshCw}
            loading={eventsLoading}
            onClick={refreshEventsOnly}
          >
            Actualizar
          </Button>
        </div>

        {eventsLoading ? (
          <div className="text-xs text-text3 py-4 text-center">Cargando eventos...</div>
        ) : securityEvents.length === 0 ? (
          <div className="text-xs text-text3 bg-surface border border-border rounded-lg p-3 text-center">
            Aún no hay eventos registrados para esta cuenta.
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl divide-y divide-border max-h-60 overflow-y-auto">
            {securityEvents.map((ev) => {
              const meta = EVENTO_SEGURIDAD_META[ev.tipo] || {
                label: ev.tipo,
                variant: 'neutral',
              }
              return (
                <div
                  key={ev.id}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={meta.variant} size="xs">
                        {meta.label}
                      </Badge>
                      {ev.dispositivo && (
                        <span className="text-[11px] text-text2 truncate">{ev.dispositivo}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-text3 shrink-0">
                    {ev.created_at ? formatFechaHora(ev.created_at) : ''}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 7. Zona de Peligro Protegida */}
      <div className="p-4 rounded-xl bg-danger-bg border border-danger/25 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-danger">
                Zona de peligro · Dar de baja mi cuenta
              </div>
              <p className="text-[11px] text-text2 mt-0.5">
                {!bajaCheck.permitido
                  ? bajaCheck.motivo
                  : 'Tu acceso quedará desactivado inmediatamente hasta que un administrador lo reactive.'}
              </p>
            </div>
          </div>

          {!showBajaForm && (
            <Button
              type="button"
              variant="dangerGhost"
              size="sm"
              disabled={!bajaCheck.permitido}
              onClick={() => {
                setShowBajaForm(true)
                setBajaPassword('')
                setBajaConfirmText('')
              }}
              className="border border-danger/30 shrink-0 self-start sm:self-center"
            >
              Dar de baja cuenta
            </Button>
          )}
        </div>

        {showBajaForm && bajaCheck.permitido && (
          <form
            onSubmit={handleConfirmBajaCuenta}
            className="p-3 rounded-xl bg-surface border border-danger/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-danger">
                Confirmación reforzada de baja
              </span>
              <button
                type="button"
                onClick={() => setShowBajaForm(false)}
                className="text-text3 hover:text-text1 cursor-pointer"
                aria-label="Cancelar baja de cuenta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text2 mb-1">Contraseña actual *</label>
                <PasswordInput
                  value={bajaPassword}
                  onChange={(e) => setBajaPassword(e.target.value)}
                  placeholder="Tu contraseña actual"
                  required
                  autoComplete="current-password"
                  ariaLabel="Contraseña actual para dar de baja la cuenta"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text2 mb-1">
                  Escribe <code className="font-mono font-semibold text-danger">DESACTIVAR</code> *
                </label>
                <input
                  type="text"
                  value={bajaConfirmText}
                  onChange={(e) => setBajaConfirmText(e.target.value)}
                  placeholder="DESACTIVAR"
                  required
                  className="w-full h-9 px-3 border border-border2 rounded-lg text-sm font-mono bg-surface text-text1 outline-none focus:border-danger"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowBajaForm(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="dangerGhost"
                size="xs"
                loading={processingBaja}
                disabled={
                  processingBaja ||
                  !bajaPassword ||
                  bajaConfirmText.trim().toUpperCase() !== 'DESACTIVAR'
                }
                className="border border-danger/40"
              >
                Confirmar baja permanente
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Modal ampliado de Código QR 2FA (vía Portal sobre el viewport) */}
      {qrExpanded &&
        enrollingFactor &&
        qrImageSrc &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 select-none"
            onClick={() => setQrExpanded(false)}
          >
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Código QR ampliado para autenticación 2FA"
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-2xl bg-surface border border-border2 rounded-2xl shadow-2xl overflow-hidden animate-scale-in max-h-[92dvh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-alt/40 shrink-0">
                <div>
                  <h3 className="text-base font-semibold text-text1">
                    Configurar Autenticación en Dos Pasos (2FA)
                  </h3>
                  <p className="text-xs text-text3 mt-0.5">
                    Escanea el código desde tu teléfono o ingresa la clave manualmente.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setQrExpanded(false)}
                  aria-label="Cerrar vista ampliada"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Columna izquierda: QR ampliado */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-2xl bg-white p-4 border border-border shadow-xs">
                      <img
                        src={qrImageSrc}
                        alt="Código QR ampliado para configurar 2FA TOTP"
                        className="w-56 h-56 sm:w-64 sm:h-64 block"
                      />
                    </div>
                    <span className="text-xs font-mono text-text3 text-center">
                      {enrollingFactor?.friendly_name || 'Autenticador VyM-DB'}
                    </span>
                  </div>

                  {/* Columna derecha: Instrucciones grandes y verificación */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="text-[15px] font-semibold text-text1">
                        1. Escanea el código QR
                      </div>
                      <p className="text-sm text-text2 leading-relaxed">
                        Abre tu aplicación de autenticación (Google Authenticator, Authy, 1Password o Microsoft Authenticator), elige añadir cuenta y apunta tu cámara al código QR de la izquierda.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[15px] font-semibold text-text1">
                        2. ¿No puedes escanear el código?
                      </div>
                      <p className="text-sm text-text2 leading-relaxed">
                        Selecciona entrada manual en tu aplicación e introduce esta clave secreta:
                      </p>
                      <div className="space-y-2">
                        <code className="block w-full px-3 py-2.5 rounded-lg bg-surface-alt border border-border font-mono text-sm tracking-wider text-text1 break-all select-all">
                          {enrollingFactor?.totp?.secret || ''}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          icon={Copy}
                          onClick={handleCopyTotpSecret}
                        >
                          Copiar clave secreta
                        </Button>
                      </div>
                    </div>

                    <form onSubmit={handleVerifyEnrollMfa} className="space-y-2 pt-2 border-t border-border">
                      <label className="block text-[15px] font-semibold text-text1">
                        3. Ingresa el código de 6 dígitos
                      </label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d{6}"
                          maxLength={6}
                          value={enrollCode}
                          onChange={(e) => setEnrollCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          required
                          className="w-40 h-10 px-3 border border-border2 rounded-lg text-base font-mono tracking-[0.25em] text-center bg-surface text-text1 outline-none focus:border-accent"
                        />
                        <Button
                          type="submit"
                          variant="accent"
                          size="md"
                          loading={verifyingEnroll}
                          disabled={enrollCode.length !== 6}
                        >
                          Verificar y activar
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
