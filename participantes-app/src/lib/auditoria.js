export const TABLA_LABELS = {
  personas: 'Participantes',
  participaciones: 'Registros',
  programa_semanas: 'Semanas',
  programa_partes: 'Partes',
  programa_asignaciones: 'Asignaciones',
  configuracion: 'Configuración',
  congregacion_config: 'Configuración',
  eventos_reunion: 'Calendario',
  usuarios_autorizados: 'Usuarios',
}

export function getTablaLabel(tabla) {
  if (!tabla) return '—'
  return TABLA_LABELS[tabla] || tabla
}

export function buildUsuariosByEmailMap(usuarios = []) {
  const map = new Map()
  for (const u of usuarios || []) {
    if (!u?.email) continue
    map.set(String(u.email).trim().toLowerCase(), u)
  }
  return map
}

const SYSTEM_EMAIL_MARKERS = new Set(['sistema', 'system', 'anon', 'postgres', 'service_role'])

export function isLogSistema(log) {
  const raw = String(log?.usuario_email || '').trim().toLowerCase()
  return !raw || SYSTEM_EMAIL_MARKERS.has(raw)
}

function computeInitials(nombre, email) {
  const cleanName = String(nombre || '').trim()
  if (cleanName) {
    const words = cleanName.split(/\s+/).filter(Boolean)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return cleanName.slice(0, 2).toUpperCase()
  }
  return String(email || 'SY').trim().slice(0, 2).toUpperCase()
}

export function resolveAutorLog(log, usuariosByEmail) {
  if (isLogSistema(log)) {
    return {
      esSistema: true,
      nombre: 'Sistema',
      email: null,
      rol: null,
      iniciales: 'SY',
      labelCorto: 'Sistema',
    }
  }

  const email = String(log.usuario_email).trim()
  const emailLower = email.toLowerCase()
  const ua = usuariosByEmail instanceof Map ? usuariosByEmail.get(emailLower) : null
  const nombre = ua?.nombre?.trim() || email.split('@')[0] || email

  return {
    esSistema: false,
    nombre,
    email,
    rol: ua?.rol || null,
    iniciales: computeInitials(ua?.nombre, email),
    labelCorto: nombre,
  }
}

export function normalizarTextoBusqueda(str = '') {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function sugerirPersonaParaUsuario(personas = [], nombreUsuario = '', email = '') {
  if (!Array.isArray(personas) || personas.length === 0) return null

  const fallbackLocal = String(email || '').split('@')[0].replace(/[._-]+/g, ' ')
  const queryNorm = normalizarTextoBusqueda(nombreUsuario || fallbackLocal)
  if (queryNorm.length < 3) return null

  const queryTokens = queryNorm.split(' ').filter(t => t.length >= 2)
  const ordered = [...personas].sort((a, b) => Number(Boolean(b?.activo)) - Number(Boolean(a?.activo)))

  const exact = ordered.find(p => normalizarTextoBusqueda(p?.nombre) === queryNorm)
  if (exact) return exact

  if (queryTokens.length >= 2) {
    const allTokensMatch = ordered.find(p => {
      const pNorm = normalizarTextoBusqueda(p?.nombre)
      return queryTokens.every(tok => pNorm.includes(tok))
    })
    if (allTokensMatch) return allTokensMatch
  }

  if (queryNorm.length >= 6) {
    const partial = ordered.find(p => normalizarTextoBusqueda(p?.nombre).includes(queryNorm))
    if (partial) return partial
  }

  return null
}

const DIA_SEMANA_TO_DOW = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
}

function addDaysIsoUtc(isoStr, days) {
  const parts = String(isoStr || '').slice(0, 10).split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return ''
  const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + days))
  return dt.toISOString().slice(0, 10)
}

function parseIsoDayUtcMs(isoStr) {
  const parts = String(isoStr || '').slice(0, 10).split('-').map(Number)
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return NaN
  return Date.UTC(parts[0], parts[1] - 1, parts[2])
}

/**
 * Calcula la fecha ISO exacta (`YYYY-MM-DD`) de la reunión de entre semana
 * correspondiente a `sem`, considerando `diaReunionEntreSemana` y posibles eventos
 * de tipo `reunion_desplazada`.
 */
export function getFechaReunionSemana(
  sem,
  { diaReunionEntreSemana = 'Martes', eventos = [] } = {}
) {
  const fInicio = String(sem?.fecha_inicio || '').slice(0, 10)
  const fFin = String(sem?.fecha_fin || sem?.fecha_inicio || '').slice(0, 10)
  if (!fInicio && !fFin) return ''

  if (Array.isArray(eventos) && eventos.length > 0 && fInicio && fFin) {
    const desplazada = eventos.find((e) => {
      if (e?.tipo_evento !== 'reunion_desplazada') return false
      const afecta = e.afecta_reunion || 'entre_semana'
      if (afecta !== 'entre_semana' && afecta !== 'ambas') return false
      const fOrig = String(e.fecha_original || '').slice(0, 10)
      const fEfect = String(e.fecha_efectiva || '').slice(0, 10)
      const enSemana =
        (fOrig && fOrig >= fInicio && fOrig <= fFin) ||
        (fEfect && fEfect >= fInicio && fEfect <= fFin)
      return Boolean(enSemana && fEfect)
    })
    if (desplazada?.fecha_efectiva) {
      return String(desplazada.fecha_efectiva).slice(0, 10)
    }
  }

  if (fInicio) {
    const normDia = normalizarTextoBusqueda(diaReunionEntreSemana || 'Martes')
    const targetDow = DIA_SEMANA_TO_DOW[normDia] ?? 2
    const startMs = parseIsoDayUtcMs(fInicio)
    if (!Number.isNaN(startMs)) {
      const startDow = new Date(startMs).getUTCDay()
      const offset = (targetDow - startDow + 7) % 7
      const candidate = addDaysIsoUtc(fInicio, offset)
      if (candidate && (!fFin || candidate <= fFin)) {
        return candidate
      }
    }
  }

  return fFin || fInicio
}

/**
 * Calcula la diferencia entera en días (`targetIso - refIso`).
 */
export function diffDaysIso(targetIso, refIso) {
  const tMs = parseIsoDayUtcMs(targetIso)
  const rMs = parseIsoDayUtcMs(refIso)
  if (Number.isNaN(tMs) || Number.isNaN(rMs)) return null
  return Math.round((tMs - rMs) / 86400000)
}

/**
 * Formatea un indicador corto de proximidad relativo a `hoyIso`
 * (`Hoy`, `Mañana`, `En N días`, `Ayer`, `Hace N días`).
 */
export function formatProximidadDias(targetIso, refIso) {
  const diff = diffDaysIso(targetIso, refIso)
  if (diff === null) return ''
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  if (diff > 1) return `En ${diff} días`
  return `Hace ${Math.abs(diff)} días`
}

/**
 * Clasifica y ordena las asignaciones de una persona en próximas y pasadas
 * tomando como referencia la fecha exacta de la reunión de entre semana
 * (y no el domingo de `fecha_fin`).
 */
export function clasificarAsignacionesUsuario(
  asignaciones = [],
  hoyIso = '',
  opciones = {}
) {
  const proximas = []
  const pasadas = []
  const refHoy = String(hoyIso || '').slice(0, 10)

  for (const a of asignaciones || []) {
    const sem = a?.programa_partes?.programa_semanas
    if (!a?.programa_partes || !sem) continue

    const fechaReunion = getFechaReunionSemana(sem, opciones)
    if (!refHoy || (fechaReunion && fechaReunion >= refHoy)) {
      proximas.push(a)
    } else {
      pasadas.push(a)
    }
  }

  proximas.sort((a, b) => {
    const semA = a.programa_partes.programa_semanas
    const semB = b.programa_partes.programa_semanas
    const fA = getFechaReunionSemana(semA, opciones) || String(semA.fecha_inicio || '').slice(0, 10)
    const fB = getFechaReunionSemana(semB, opciones) || String(semB.fecha_inicio || '').slice(0, 10)
    return fA.localeCompare(fB)
  })

  pasadas.sort((a, b) => {
    const semA = a.programa_partes.programa_semanas
    const semB = b.programa_partes.programa_semanas
    const fA = getFechaReunionSemana(semA, opciones) || String(semA.fecha_inicio || '').slice(0, 10)
    const fB = getFechaReunionSemana(semB, opciones) || String(semB.fecha_inicio || '').slice(0, 10)
    return fB.localeCompare(fA)
  })

  return { proximas, pasadas }
}

const DISMISSED_PAST_ASIG_PREFIX = 'app_dismissed_past_asig_'

function getDismissedStorageKey(email) {
  const clean = String(email || 'anon').trim().toLowerCase()
  return `${DISMISSED_PAST_ASIG_PREFIX}${clean}`
}

export function loadDismissedPastAsignacionIds(email) {
  try {
    const raw = localStorage.getItem(getDismissedStorageKey(email))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.length > 0) : []
  } catch {
    return []
  }
}

export function saveDismissedPastAsignacionIds(email, ids = []) {
  const unique = [...new Set((ids || []).map(String).filter(Boolean))]
  try {
    localStorage.setItem(getDismissedStorageKey(email), JSON.stringify(unique))
  } catch {
    // ignore quota errors
  }
  return unique
}

function formatRolAsignacion(rawRol) {
  const clean = String(rawRol || '').trim().toLowerCase()
  if (clean === 'ayudante') return 'Ayudante'
  if (clean === 'sala_b') return 'Titular (Sala B)'
  if (clean === 'titular') return 'Titular'
  return rawRol ? String(rawRol) : 'Titular'
}

export function buildAsignacionTextoRecordatorio(asig, fechaReunion) {
  const parte = asig?.programa_partes
  const titulo = parte?.titulo || parte?.titulo_parte || 'Asignación Vida y Ministerio'
  const seccion = parte?.seccion ? `[${parte.seccion}] ` : ''
  const tipoLabel = formatRolAsignacion(asig?.rol || asig?.tipo_asignacion)
  const duracion = parte?.duracion_min ? ` (${parte.duracion_min} min)` : ''
  const fechaTexto = fechaReunion || parte?.programa_semanas?.fecha_inicio || ''
  return `${seccion}${titulo}${duracion}\nRol: ${tipoLabel}\nFecha de reunión: ${fechaTexto}`
}

export function buildAsignacionIcs(asig, fechaReunion, { horaReunion = '19:30' } = {}) {
  const parte = asig?.programa_partes
  const f = String(fechaReunion || parte?.programa_semanas?.fecha_inicio || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return ''

  const [hhStr = '19', mmStr = '30'] = String(horaReunion || '19:30').split(':')
  const startH = Math.min(23, Math.max(0, parseInt(hhStr, 10) || 19))
  const startM = Math.min(59, Math.max(0, parseInt(mmStr, 10) || 30))
  const durMin = Number(parte?.duracion_min) > 0 ? Number(parte.duracion_min) : 15

  const [y, m, d] = f.split('-').map(Number)
  const startDt = new Date(y, m - 1, d, startH, startM, 0)
  const endDt = new Date(startDt.getTime() + durMin * 60000)

  const fmtLocal = (dt) => {
    const pad = (n) => String(n).padStart(2, '0')
    return (
      `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}` +
      `T${pad(dt.getHours())}${pad(dt.getMinutes())}00`
    )
  }

  const esc = (s) =>
    String(s || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n')

  const rolTexto = formatRolAsignacion(asig?.rol || asig?.tipo_asignacion)
  const tituloParte = parte?.titulo || parte?.titulo_parte || 'Asignación VyM'

  const summary = esc(`${tituloParte} (${rolTexto})`)
  const description = esc(
    `${parte?.seccion ? `${parte.seccion} · ` : ''}Rol: ${rolTexto} · Duración: ${durMin} min`
  )
  const uid = `vym-${asig?.id || f}-${f}@vym-db-app`

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VyM-DB-app//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${fmtLocal(startDt)}`,
    `DTSTART:${fmtLocal(startDt)}`,
    `DTEND:${fmtLocal(endDt)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
