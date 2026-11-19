import { normalizarTextoBusqueda } from './auditoria'
import { dispatchPreferencesUpdated } from './themes'

export const IDLE_TIMEOUT_STORAGE_KEY = 'pref_idle_timeout_min'
export const IDLE_TIMEOUT_OPTIONS = [
  { value: '0', minutes: 0, label: 'Desactivado (no cerrar automáticamente)' },
  { value: '15', minutes: 15, label: '15 minutos de inactividad' },
  { value: '30', minutes: 30, label: '30 minutos de inactividad' },
  { value: '60', minutes: 60, label: '1 hora de inactividad' },
  { value: '240', minutes: 240, label: '4 horas de inactividad' },
]

const VALID_IDLE_MINUTES = new Set(IDLE_TIMEOUT_OPTIONS.map((o) => o.minutes))

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '00000000',
  '11111111',
  'password',
  'password1',
  'password123',
  'qwerty12',
  'qwerty123',
  'qwertyuiop',
  'admin123',
  'admin1234',
  'administrador',
  'abc12345',
  'abcd1234',
  'contrasena',
  'contrasena1',
  'contraseña',
  'iloveyou',
  'letmein1',
  'welcome1',
  'bienvenido',
  'participantes',
  'congregacion',
  'reunion123',
])

export const EVENTO_SEGURIDAD_META = {
  LOGIN_OK: {
    label: 'Inicio de sesión',
    variant: 'info',
  },
  MFA_ENROLLED: {
    label: '2FA activado',
    variant: 'success',
  },
  MFA_DISABLED: {
    label: '2FA desactivado',
    variant: 'warning',
  },
  MFA_CHALLENGE_OK: {
    label: 'Verificación 2FA',
    variant: 'success',
  },
  PASSWORD_CHANGED: {
    label: 'Contraseña actualizada',
    variant: 'success',
  },
  PASSWORD_RESET_REQUESTED: {
    label: 'Recuperación solicitada',
    variant: 'info',
  },
  EMAIL_CHANGE_REQUESTED: {
    label: 'Cambio de correo solicitado',
    variant: 'warning',
  },
  SIGN_OUT_OTHERS: {
    label: 'Otras sesiones cerradas',
    variant: 'info',
  },
  SIGN_OUT_ALL: {
    label: 'Cierre global de sesiones',
    variant: 'warning',
  },
  ACCOUNT_DEACTIVATED: {
    label: 'Cuenta dada de baja',
    variant: 'danger',
  },
  IDLE_LOGOUT: {
    label: 'Cierre por inactividad',
    variant: 'neutral',
  },
}

/**
 * Devuelve una descripción compacta de navegador + sistema operativo actual.
 */
export function getDeviceLabel(uaInput) {
  const ua =
    typeof uaInput === 'string'
      ? uaInput
      : typeof navigator !== 'undefined'
      ? navigator.userAgent || ''
      : ''

  let browser = 'Navegador'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua)) browser = 'Safari'

  let os = 'Dispositivo'
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS'
  else if (/Mac/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  return `${browser} en ${os}`
}

function isSequentialOrRepeated(pwd) {
  const compact = pwd.toLowerCase()
  if (/^(.)\1+$/.test(compact)) return true
  if (compact.length >= 8 && /^\d+$/.test(compact)) {
    const asc = '01234567890123456789'
    const desc = '98765432109876543210'
    if (asc.includes(compact) || desc.includes(compact)) return true
  }
  return false
}

/**
 * Evalúa la fortaleza de una contraseña aplicando lineamientos NIST/OWASP.
 */
export function evaluarFortalezaPassword(
  password = '',
  { email = '', nombre = '', currentPassword = '' } = {}
) {
  const pwd = String(password || '')
  const normalizedPwd = normalizarTextoBusqueda(pwd).replace(/\s+/g, '')

  const minLength = pwd.length >= 8
  const recommendedLength = pwd.length >= 12
  const hasLowerAndUpper = /[a-z]/.test(pwd) && /[A-Z]/.test(pwd)
  const hasDigit = /\d/.test(pwd)
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd)
  const notCommon =
    pwd.length > 0 &&
    !COMMON_PASSWORDS.has(normalizedPwd) &&
    !isSequentialOrRepeated(pwd)

  const localEmail = String(email || '').split('@')[0] || ''
  const personalTokens = [
    normalizarTextoBusqueda(localEmail).replace(/\s+/g, ''),
    ...normalizarTextoBusqueda(nombre).split(' ').filter(Boolean),
  ].filter((t) => t.length >= 3)

  const containsPersonal =
    pwd.length > 0 && personalTokens.some((token) => normalizedPwd.includes(token))
  const noPersonalInfo = pwd.length > 0 && !containsPersonal

  const notSameAsCurrent = !currentPassword || (pwd.length > 0 && pwd !== currentPassword)

  const cumpleMinimo = Boolean(
    minLength &&
      hasLowerAndUpper &&
      hasDigit &&
      notCommon &&
      noPersonalInfo &&
      notSameAsCurrent
  )

  let score = 0
  if (pwd.length > 0) {
    let raw = 0
    if (minLength) raw += 1
    if (recommendedLength) raw += 1
    if (hasLowerAndUpper && hasDigit) raw += 1
    if (hasSymbol || pwd.length >= 16) raw += 1

    if (!minLength) raw = Math.min(raw, 1)
    if (!notCommon || !noPersonalInfo || !notSameAsCurrent) {
      raw = Math.min(raw, 1)
    }
    score = Math.max(0, Math.min(4, raw))
  }

  const LABELS = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Muy fuerte']

  const checks = [
    { id: 'minLength', label: 'Al menos 8 caracteres', met: minLength, required: true },
    {
      id: 'hasLowerAndUpper',
      label: 'Mayúsculas y minúsculas',
      met: hasLowerAndUpper,
      required: true,
    },
    { id: 'hasDigit', label: 'Al menos un número', met: hasDigit, required: true },
    {
      id: 'noPersonalInfo',
      label: 'Sin tu nombre o correo ni claves comunes',
      met: Boolean(notCommon && noPersonalInfo),
      required: true,
    },
    {
      id: 'recommendedLength',
      label: '12+ caracteres o símbolo especial (recomendado)',
      met: recommendedLength || hasSymbol,
      required: false,
    },
  ]

  const bloqueos = []
  if (!minLength) bloqueos.push('Debe tener al menos 8 caracteres.')
  if (!hasLowerAndUpper) bloqueos.push('Incluye letras mayúsculas y minúsculas.')
  if (!hasDigit) bloqueos.push('Incluye al menos un número.')
  if (!notCommon) bloqueos.push('Evita contraseñas comunes o secuencias predecibles.')
  if (!noPersonalInfo) bloqueos.push('No uses partes de tu nombre ni de tu correo.')
  if (currentPassword && pwd && pwd === currentPassword) {
    bloqueos.push('La nueva contraseña debe ser diferente a la actual.')
  }

  return {
    score,
    label: LABELS[score],
    cumpleMinimo,
    checks,
    bloqueos,
  }
}

async function sha1UpperHex(text) {
  const bytes = new TextEncoder().encode(text)
  const buf = await globalThis.crypto.subtle.digest('SHA-1', bytes)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

/**
 * Consulta privada k-Anonymity contra Have I Been Pwned (solo envía 5 chars del hash SHA-1).
 * Nunca bloquea si la red o Web Crypto no están disponibles.
 */
export async function verificarPasswordFiltradaHIBP(
  password,
  { fetchImpl = globalThis.fetch, timeoutMs = 2500 } = {}
) {
  if (!password || typeof fetchImpl !== 'function' || !globalThis.crypto?.subtle) {
    return { filtrada: false, conteo: 0, omitido: true }
  }

  let timerId = null
  try {
    const hash = await sha1UpperHex(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    if (controller) {
      timerId = setTimeout(() => controller.abort(), timeoutMs)
    }

    const res = await fetchImpl(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: controller?.signal,
    })

    if (!res?.ok) {
      return { filtrada: false, conteo: 0, omitido: true }
    }

    const text = await res.text()
    for (const line of text.split(/\r?\n/)) {
      const [lineSuffix, countStr] = line.split(':')
      if (lineSuffix && lineSuffix.trim().toUpperCase() === suffix) {
        const count = parseInt(countStr || '0', 10) || 1
        return { filtrada: count > 0, conteo: count, omitido: false }
      }
    }

    return { filtrada: false, conteo: 0, omitido: false }
  } catch {
    return { filtrada: false, conteo: 0, omitido: true }
  } finally {
    if (timerId) clearTimeout(timerId)
  }
}

/**
 * Verifica la contraseña actual usando la RPC `verificar_mi_contrasena`
 * para NO degradar sesiones MFA (AAL2 -> AAL1).
 */
export async function verificarContrasenaActualSeguro(
  supabase,
  { email, password, hasMfa = false }
) {
  if (!supabase || !password) {
    return { ok: false, error: 'Ingresa tu contraseña actual.' }
  }

  const { data, error: rpcErr } = await supabase.rpc('verificar_mi_contrasena', {
    p_password: password,
  })

  if (!rpcErr) {
    return data === true
      ? { ok: true }
      : { ok: false, error: 'La contraseña actual es incorrecta.' }
  }

  const errMsg = `${rpcErr.code || ''} ${rpcErr.message || ''}`
  const missingFn =
    rpcErr.code === '42883' ||
    rpcErr.code === 'PGRST202' ||
    /verificar_mi_contrasena/i.test(errMsg) ||
    /does not exist/i.test(errMsg)

  if (missingFn) {
    if (hasMfa) {
      return {
        ok: false,
        error:
          'Falta aplicar la migración SQL de seguridad (verificar_mi_contrasena) para validar tu clave sin cerrar tu sesión 2FA.',
      }
    }
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return authErr
      ? { ok: false, error: 'La contraseña actual es incorrecta.' }
      : { ok: true }
  }

  return {
    ok: false,
    error: rpcErr.message || 'No se pudo verificar la contraseña actual.',
  }
}

/**
 * Calcula un puntaje de salud y recomendaciones accionables para la cuenta.
 */
export function calcularSaludSeguridad({
  mfaEnabled = false,
  emailConfirmed = true,
  idleTimeoutMinutes = 0,
  rol = 'editor',
} = {}) {
  let score = 20 // Base por lista blanca + acceso protegido
  if (emailConfirmed) score += 25
  if (mfaEnabled) score += 40
  if (Number(idleTimeoutMinutes) > 0) score += 15

  score = Math.min(100, Math.max(0, score))

  let nivel = 'Básico'
  let variant = 'danger'
  if (score >= 85) {
    nivel = 'Robusto'
    variant = 'success'
  } else if (score >= 55) {
    nivel = 'Bueno'
    variant = 'warning'
  }

  const pendientes = []
  if (!mfaEnabled) {
    pendientes.push({
      id: 'mfa',
      title:
        rol === 'admin'
          ? 'Activa 2FA (TOTP) — Recomendado para Administradores'
          : 'Activa verificación en 2 pasos (2FA)',
      detail: 'Protege tu acceso ante robo de contraseñas usando Google Authenticator o 1Password.',
      priority: rol === 'admin' ? 'alta' : 'media',
    })
  }
  if (!Number(idleTimeoutMinutes) || Number(idleTimeoutMinutes) <= 0) {
    pendientes.push({
      id: 'idle',
      title: 'Configura cierre automático por inactividad',
      detail: 'Útil si accedes desde computadoras o tabletas compartidas.',
      priority: 'baja',
    })
  }
  if (!emailConfirmed) {
    pendientes.push({
      id: 'email',
      title: 'Confirma tu cambio de correo pendiente',
      detail: 'Revisa ambas bandejas de entrada para finalizar la verificación.',
      priority: 'media',
    })
  }

  return { score, nivel, variant, pendientes }
}

/**
 * Registra un evento en public.eventos_seguridad (best-effort, no bloquea el flujo).
 */
export async function registrarEventoSeguridad(supabase, { tipo, detalle = {} } = {}) {
  if (!supabase || !tipo) return
  try {
    await supabase.rpc('registrar_evento_seguridad', {
      p_tipo: tipo,
      p_dispositivo: getDeviceLabel(),
      p_detalle: detalle || {},
    })
  } catch {
    // Best-effort: si la migración aún no existe, no interrumpir al usuario
  }
}

export function loadIdleTimeoutMinutes() {
  try {
    const raw = localStorage.getItem(IDLE_TIMEOUT_STORAGE_KEY)
    const parsed = parseInt(raw || '0', 10)
    return VALID_IDLE_MINUTES.has(parsed) ? parsed : 0
  } catch {
    return 0
  }
}

export function saveIdleTimeoutMinutes(minutes) {
  const val = VALID_IDLE_MINUTES.has(Number(minutes)) ? Number(minutes) : 0
  try {
    localStorage.setItem(IDLE_TIMEOUT_STORAGE_KEY, String(val))
    dispatchPreferencesUpdated({ pref_idle_timeout_min: val })
  } catch {
    // ignore storage errors
  }
  return val
}

/**
 * Purga la caché en memoria de React Query, caches locales de datos
 * y el runtime cache del Service Worker al cerrar sesión.
 */
export async function limpiarDatosSensiblesLogout(queryClientInstance) {
  try {
    queryClientInstance?.clear?.()
  } catch {
    // ignore
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('app_config_cache')
      localStorage.removeItem('app_eventos_cache')
    }
  } catch {
    // ignore
  }

  try {
    if (typeof window !== 'undefined' && window.caches?.delete) {
      await window.caches.delete('supabase-api-cache')
    }
  } catch {
    // ignore
  }
}

const MEMORY_THROTTLES = new Map()

/**
 * Controlador de enfriamiento progresivo anti-fuerza bruta por intentos fallidos.
 */
export function createAttemptThrottle(
  storageKey,
  { maxAttempts = 5, windowMs = 300000, baseLockoutMs = 30000 } = {}
) {
  function readState() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && typeof parsed === 'object') return parsed
        }
      }
    } catch {
      // fallback a memoria
    }
    return MEMORY_THROTTLES.get(storageKey) || { attempts: [], lockedUntil: 0, lockCount: 0 }
  }

  function writeState(next) {
    MEMORY_THROTTLES.set(storageKey, next)
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(storageKey, JSON.stringify(next))
      }
    } catch {
      // ignore storage quota errors
    }
  }

  function getStatus(now = Date.now()) {
    const state = readState()
    const validAttempts = (state.attempts || []).filter((ts) => now - ts <= windowMs)
    const lockedUntil = Number(state.lockedUntil) || 0
    if (lockedUntil > now) {
      return {
        locked: true,
        remainingSeconds: Math.max(1, Math.ceil((lockedUntil - now) / 1000)),
        attemptsInWindow: validAttempts.length,
      }
    }
    return {
      locked: false,
      remainingSeconds: 0,
      attemptsInWindow: validAttempts.length,
    }
  }

  function recordFailure(now = Date.now()) {
    const state = readState()
    const validAttempts = (state.attempts || []).filter((ts) => now - ts <= windowMs)
    validAttempts.push(now)

    let lockCount = Number(state.lockCount) || 0
    let lockedUntil = Number(state.lockedUntil) || 0

    if (validAttempts.length >= maxAttempts) {
      lockCount += 1
      const durationMs = Math.min(300000, baseLockoutMs * Math.pow(2, lockCount - 1))
      lockedUntil = now + durationMs
      writeState({ attempts: [], lockedUntil, lockCount })
    } else {
      writeState({ attempts: validAttempts, lockedUntil, lockCount })
    }

    return getStatus(now)
  }

  function reset() {
    MEMORY_THROTTLES.delete(storageKey)
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(storageKey)
      }
    } catch {
      // ignore
    }
  }

  return { getStatus, recordFailure, reset }
}
