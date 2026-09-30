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
 * Parsea una hora en formato 'H:MM', 'HH:MM', 'H:MM AM/PM' o similar,
 * deduciendo si corresponde a la tarde (PM) según la hora base de inicio de la reunión.
 *
 * @param {string|number} val Hora a interpretar
 * @param {string} [baseHourStr='19:00'] Hora base de inicio de reunión (ej: '19:00' o '09:30')
 * @returns {number} Minutos transcurridos desde las 00:00
 */
export function parseHoraFlexible(val, baseHourStr = '19:00') {
  if (val == null) return 0
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (!str) return 0

  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i)
  if (!match) return timeToMinutes(str)

  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3]?.toLowerCase()

  if (ampm === 'pm' && h < 12) h += 12
  if (ampm === 'am' && h === 12) h = 0

  if (!ampm) {
    const baseMins = timeToMinutes(baseHourStr)
    const baseIsPM = baseMins >= 12 * 60
    // Si la reunión base es de tarde (ej: 19:00) y el usuario escribe 7:00, 7:05, 8:06, interpretarlo como tarde (19:00, 19:05, 20:06)
    if (baseIsPM && h < 12) {
      h += 12
    }
  }

  return h * 60 + m
}

/**
 * Calcula todas las marcas horarias en formato 12h para la vista S-140 de una semana.
 * Soporta tanto una cadena simple 'HH:MM' como un objeto de configuración avanzado
 * con personalización por fila individual (ESTÁTICO / DINÁMICO y horas fijas).
 * 
 * @param {Object} semana Datos de la semana (smt, vc, etc.)
 * @param {string|Object} [configOpciones='19:00'] Hora de inicio 'HH:MM' o config global
 * @returns {Object}
 */
export function obtenerHorariosS140(semana, configOpciones = '19:00') {
  const isObj = typeof configOpciones === 'object' && configOpciones !== null
  const horaInicioStr = isObj
    ? (configOpciones.horaReunionEntreSemana || '19:00')
    : (configOpciones || '19:00')
  const baseMins = timeToMinutes(horaInicioStr)

  const margen = isObj && configOpciones.margenTransicionMin != null
    ? Number(configOpciones.margenTransicionMin)
    : 1

  const filasCustom = (isObj && configOpciones.horarioPersonalizadoFilas) || {}
  const modoTBGlobal = (isObj && configOpciones.horarioModoTb) || 'estatico'
  const offsetSMTGlobal = isObj && configOpciones.horarioOffsetSmt != null ? Number(configOpciones.horarioOffsetSmt) : 30
  const modoSMTGlobal = (isObj && configOpciones.horarioModoSmt) || 'dinamico'
  const offsetCancionVCGlobal = isObj && configOpciones.horarioOffsetCancionVc != null ? Number(configOpciones.horarioOffsetCancionVc) : 45
  const offsetVCGlobal = isObj && configOpciones.horarioOffsetVc != null ? Number(configOpciones.horarioOffsetVc) : 50
  const modoVCGlobal = (isObj && configOpciones.horarioModoVc) || 'estatico'

  let cursorMins = baseMins
  const filasDetalladas = []

  function procesarFila({
    id,
    seccion,
    titulo,
    duracion,
    defaultModo = 'estatico',
    defaultOffset = 0,
    aplicaMargen = true,
    numero = null,
  }) {
    const custom = filasCustom[id] || {}
    const modo = custom.modo || defaultModo
    let horaInicioFilaMins

    if (modo === 'estatico') {
      if (custom.hora) {
        horaInicioFilaMins = parseHoraFlexible(custom.hora, horaInicioStr)
      } else {
        horaInicioFilaMins = baseMins + defaultOffset
      }
      cursorMins = horaInicioFilaMins + duracion + (aplicaMargen ? margen : 0)
    } else {
      horaInicioFilaMins = cursorMins
      cursorMins = cursorMins + duracion + (aplicaMargen ? margen : 0)
    }

    const filaObj = {
      id,
      seccion,
      titulo,
      numero,
      duracion,
      modo,
      horaMins: horaInicioFilaMins,
      hora12: formatHora12(horaInicioFilaMins),
      hora24: minutesToTime(horaInicioFilaMins),
    }

    filasDetalladas.push(filaObj)
    return filaObj
  }

  // 1. Apertura
  const fCancionApertura = procesarFila({
    id: 'apertura_cancion',
    seccion: 'APERTURA',
    titulo: `Canción ${semana?.can_ap || 1}`,
    duracion: 4,
    defaultModo: 'estatico',
    defaultOffset: 0,
    aplicaMargen: false,
  })

  const fIntro = procesarFila({
    id: 'apertura_intro',
    seccion: 'APERTURA',
    titulo: 'Palabras de introducción (1 min.)',
    duracion: 1,
    defaultModo: 'estatico',
    defaultOffset: 4,
    aplicaMargen: false,
  })

  // 2. Tesoros de la Biblia
  const fTbDiscurso = procesarFila({
    id: 'tb_discurso',
    seccion: 'TB',
    titulo: '1. Meditar en las cualidades de Jehová (10 mins.)',
    numero: 1,
    duracion: 10,
    defaultModo: modoTBGlobal,
    defaultOffset: 5,
    aplicaMargen: false,
  })

  const fTbPerlas = procesarFila({
    id: 'tb_perlas',
    seccion: 'TB',
    titulo: '2. Busquemos perlas escondidas (10 mins.)',
    numero: 2,
    duracion: 10,
    defaultModo: modoTBGlobal,
    defaultOffset: 15,
    aplicaMargen: false,
  })

  const fTbLectura = procesarFila({
    id: 'tb_lectura',
    seccion: 'TB',
    titulo: '3. Lectura de la Biblia (4 mins.)',
    numero: 3,
    duracion: 4,
    defaultModo: modoTBGlobal,
    defaultOffset: 25,
    aplicaMargen: true,
  })

  // 3. Seamos Mejores Maestros
  const partesSMT = (semana?.smt || []).filter(p => p && p.titulo && String(p.titulo).trim() !== '')
  const smtFilas = []
  const partesSMTProcesar = partesSMT.length > 0 ? partesSMT : [
    { titulo: 'Asignación estudiantil 1 (3 mins.)', duracion_min: 3 },
    { titulo: 'Asignación estudiantil 2 (4 mins.)', duracion_min: 4 },
    { titulo: 'Asignación estudiantil 3 (5 mins.)', duracion_min: 5 },
  ]

  for (let i = 0; i < partesSMTProcesar.length; i++) {
    const p = partesSMTProcesar[i]
    const dur = extraerDuracion(p) || 4
    const defaultModo = i === 0 ? (modoSMTGlobal === 'estatico' ? 'estatico' : 'estatico') : 'dinamico'
    const defaultOffset = offsetSMTGlobal + (i === 0 ? 0 : i * 4)

    const fSmt = procesarFila({
      id: `smt_${i}`,
      seccion: 'SMT',
      titulo: `${i + 4}. ${p.titulo || `Asignación estudiantil ${i + 1} (${dur} mins.)`}`,
      numero: i + 4,
      duracion: dur,
      defaultModo,
      defaultOffset,
      aplicaMargen: true,
    })
    smtFilas.push(fSmt)
  }

  // 4. Nuestra Vida Cristiana
  const fVcCancion = procesarFila({
    id: 'vc_cancion',
    seccion: 'VC',
    titulo: `Canción intermedia ${semana?.can_vc || 128}`,
    duracion: 4,
    defaultModo: modoVCGlobal,
    defaultOffset: offsetCancionVCGlobal,
    aplicaMargen: true,
  })

  const partesVC = (semana?.vc || []).filter(v => v && v.titulo && String(v.titulo).trim() !== '')
  const partesVCProcesar = partesVC.length > 0 ? partesVC : [
    { titulo: 'En esta campaña, ni un golpe al aire (15 mins.)', duracion_min: 15 },
  ]
  const vcFilas = []

  for (let j = 0; j < partesVCProcesar.length; j++) {
    const v = partesVCProcesar[j]
    const dur = extraerDuracion(v) || 15
    const defaultModo = j === 0 ? modoVCGlobal : 'dinamico'
    const defaultOffset = offsetVCGlobal + (j === 0 ? 0 : j * 10)

    const fVc = procesarFila({
      id: `vc_${j}`,
      seccion: 'VC',
      titulo: `${smtFilas.length + 4 + j}. ${v.titulo || `Parte de Vida Cristiana (${dur} mins.)`}`,
      numero: smtFilas.length + 4 + j,
      duracion: dur,
      defaultModo,
      defaultOffset,
      aplicaMargen: true,
    })
    vcFilas.push(fVc)
  }

  // EBC
  const numeroEbc = smtFilas.length + 4 + vcFilas.length
  const fVcEbc = procesarFila({
    id: 'vc_ebc',
    seccion: 'VC',
    titulo: `${numeroEbc}. Estudio bíblico de la congregación (30 mins.)`,
    numero: numeroEbc,
    duracion: 30,
    defaultModo: 'dinamico',
    defaultOffset: offsetVCGlobal + 16,
    aplicaMargen: true,
  })

  // 5. Cierre
  const fCierreConclu = procesarFila({
    id: 'cierre_conclu',
    seccion: 'CIERRE',
    titulo: 'Palabras de conclusión (3 min.)',
    duracion: 3,
    defaultModo: modoVCGlobal === 'dinamico' ? 'dinamico' : 'estatico',
    defaultOffset: 97,
    aplicaMargen: false,
  })

  const fCierreCancion = procesarFila({
    id: 'cierre_cancion',
    seccion: 'CIERRE',
    titulo: `Canción ${semana?.can_ci || 143} y Oración final`,
    duracion: 5,
    defaultModo: modoVCGlobal === 'dinamico' ? 'dinamico' : 'estatico',
    defaultOffset: 100,
    aplicaMargen: false,
  })

  const horaFinMins = cursorMins
  const duracionTotalMin = horaFinMins - baseMins

  return {
    apertura: {
      cancion: fCancionApertura.hora12,
      intro: fIntro.hora12,
    },
    tb: {
      discurso: fTbDiscurso.hora12,
      perlas: fTbPerlas.hora12,
      lectura: fTbLectura.hora12,
    },
    smtHoras: smtFilas.map(f => f.hora12),
    vc: {
      cancion: fVcCancion.hora12,
      partesHoras: vcFilas.map(f => f.hora12),
      ebcHora: fVcEbc.hora12,
    },
    cierre: {
      conclu: fCierreConclu.hora12,
      cancion: fCierreCancion.hora12,
    },
    filasDetalladas,
    meta: {
      horaInicio: horaInicioStr,
      horaFin: formatHora12(horaFinMins),
      duracionTotalMin,
      esExceso105Min: duracionTotalMin > 105,
      diferencia105Min: duracionTotalMin - 105,
    },
  }
}

/**
 * Genera una simulación visual compacta del programa S-140 para el configurador.
 */
export function simularCronogramaReunion(config = {}) {
  const semanaSimulada = {
    smt: [
      { titulo: 'Asignación estudiantil 1 (3 mins.)', duracion_min: 3 },
      { titulo: 'Asignación estudiantil 2 (4 mins.)', duracion_min: 4 },
      { titulo: 'Asignación estudiantil 3 (5 mins.)', duracion_min: 5 },
    ],
    vc: [
      { titulo: 'En esta campaña, ni un golpe al aire (15 mins.)', duracion_min: 15 },
    ],
  }

  return obtenerHorariosS140(semanaSimulada, config)
}
