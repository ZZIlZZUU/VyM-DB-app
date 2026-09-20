// src/lib/horarios.js — Utilidades de cálculo y formateo de marcas de tiempo (horarios) para la reunión y S-140

/**
 * Convierte un string de hora 'HH:MM' o 'HH:MM:SS' a minutos desde las 00:00.
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0
  const parts = timeStr.trim().split(':').map(Number)
  const h = parts[0] || 0
  const m = parts[1] || 0
  return h * 60 + m
}

/**
 * Convierte minutos totales a string en formato 24h 'HH:MM'.
 */
export function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Convierte minutos totales o un string 'HH:MM' / 'HH:MM:SS' a formato 12h legible sin ceros iniciales (ej: '7:30', '8:07').
 */
export function formatHora12(val) {
  if (val == null) return ''
  let mins = 0
  if (typeof val === 'number') {
    mins = val
  } else if (typeof val === 'string') {
    const trimmed = val.trim()
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
    if (!match) return trimmed
    let h = parseInt(match[1], 10)
    const m = match[2]
    if (h >= 12) {
      if (h > 12) h -= 12
    } else if (h === 0) {
      h = 12
    }
    return `${h}:${m}`
  } else {
    return ''
  }
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  return `${h12}:${String(m).padStart(2, '0')}`
}

/**
 * Extrae la duración en minutos de un objeto de parte (campo duracion_min o parseando el título).
 */
export function extraerDuracion(parte) {
  if (!parte) return null
  if (typeof parte.duracion_min === 'number' && !isNaN(parte.duracion_min) && parte.duracion_min > 0) {
    return parte.duracion_min
  }
  if (parte.titulo && typeof parte.titulo === 'string') {
    const match = parte.titulo.match(/\((\d+)\s*mins?\.?\)/i)
    if (match) {
      return parseInt(match[1], 10)
    }
  }
  return null
}

/**
 * Calcula horarios para las partes de Seamos Mejores Maestros (SMT).
 * Regla:
 * - Parte 0 (primera parte, slot 4): Inicia a las 19:30 (7:30).
 * - Partes posteriores: Hora anterior + Duración anterior + 1 min de margen.
 */
export function calcularHorariosSMT(partesSMT, horaBase = '19:30') {
  if (!Array.isArray(partesSMT)) return []
  let cursor = timeToMinutes(horaBase)

  return partesSMT.map(p => {
    if (!p) return p
    const dur = extraerDuracion(p) || 5
    const inicio = minutesToTime(cursor)
    cursor += dur + 1 // +1 min de margen / transición
    const fin = minutesToTime(cursor - 1)
    return {
      ...p,
      duracion_min: p.duracion_min || dur,
      hora_inicio: inicio,
      hora_fin: fin,
    }
  })
}

/**
 * Calcula horarios para las partes de Nuestra Vida Cristiana (VC y EBC).
 * Regla:
 * - Parte 0 (primer discurso VC): Inicia a las 19:50 (7:50).
 * - Partes posteriores (incluyendo EBC): Hora anterior + Duración anterior + 1 min de margen.
 */
export function calcularHorariosVC(partesVC, horaBase = '19:50') {
  if (!Array.isArray(partesVC)) return []
  let cursor = timeToMinutes(horaBase)

  return partesVC.map(p => {
    if (!p) return p
    const dur = extraerDuracion(p) || (p.tipo === 'EBC_CON' ? 30 : 15)
    const inicio = minutesToTime(cursor)
    cursor += dur + 1 // +1 min de margen / transición
    const fin = minutesToTime(cursor - 1)
    return {
      ...p,
      duracion_min: p.duracion_min || dur,
      hora_inicio: inicio,
      hora_fin: fin,
    }
  })
}

/**
 * Calcula todas las marcas horarias en formato 12h para la vista S-140 de una semana.
 * Devuelve marcas fijas para lo estático y dinámicas para lo variable.
 */
export function obtenerHorariosS140(semana) {
  // 1. Estáticos de Apertura y Tesoros
  const apertura = {
    cancion: '7:00',
    intro: '7:04',
  }

  const tb = {
    discurso: '7:05',
    perlas: '7:15',
    lectura: '7:25',
  }

  // 2. SMT (dinámico desde 7:30)
  const partesSMT = (semana?.smt || []).filter(p => p && p.titulo && String(p.titulo).trim() !== '')
  let cursorSMT = timeToMinutes('19:30') // 19:30 = 7:30
  const smtHoras = []

  for (let i = 0; i < partesSMT.length; i++) {
    const p = partesSMT[i]
    smtHoras.push(formatHora12(cursorSMT))
    const dur = extraerDuracion(p) || 5
    cursorSMT += dur + 1 // +1 min margen
  }

  // 3. VC y EBC (dinámico desde 7:50)
  const cancionVC = '7:45'
  const partesVC = (semana?.vc || []).filter(v => v && v.titulo && String(v.titulo).trim() !== '')
  let cursorVC = timeToMinutes('19:50') // 19:50 = 7:50
  const vcHoras = []

  for (let i = 0; i < partesVC.length; i++) {
    const v = partesVC[i]
    vcHoras.push(formatHora12(cursorVC))
    const dur = extraerDuracion(v) || 15
    cursorVC += dur + 1 // +1 min margen
  }

  // EBC inicia después de la última parte de VC
  const ebcHora = formatHora12(cursorVC)

  // 4. Cierre
  const cierre = {
    conclu: '8:37',
    cancion: '8:40',
  }

  return {
    apertura,
    tb,
    smtHoras,
    vc: {
      cancion: cancionVC,
      partesHoras: vcHoras,
      ebcHora,
    },
    cierre,
  }
}
