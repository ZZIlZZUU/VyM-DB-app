// src/lib/fechas.js — Utilidades centralizadas para formateo de fechas legibles

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const MESES_ABBR = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

export const MESES_CORTOS = MESES_ABBR

/**
 * Convierte "2026-10-26" a "26 oct 2026"
 * @param {string|Date} fechaStr 
 * @returns {string}
 */
export function formatFechaLegible(fechaStr) {
  if (!fechaStr) return ''
  const str = String(fechaStr).trim().slice(0, 10)
  const partes = str.split('-')
  if (partes.length < 3) return fechaStr

  const anio = parseInt(partes[0], 10)
  const mesIndex = parseInt(partes[1], 10) - 1
  const dia = parseInt(partes[2], 10)

  if (isNaN(anio) || isNaN(mesIndex) || isNaN(dia)) return fechaStr

  const mesAbbr = MESES_ABBR[mesIndex] || ''
  return `${dia} ${mesAbbr} ${anio}`
}

/**
 * Convierte "2025-09-01" a "Lunes 1 sep 2025"
 * @param {string|Date} fechaStr 
 * @returns {string}
 */
export function formatFechaConDia(fechaStr) {
  if (!fechaStr) return ''
  const str = String(fechaStr).trim().slice(0, 10)
  const partes = str.split('-')
  if (partes.length < 3) return fechaStr

  const anio = parseInt(partes[0], 10)
  const mesIndex = parseInt(partes[1], 10) - 1
  const dia = parseInt(partes[2], 10)

  if (isNaN(anio) || isNaN(mesIndex) || isNaN(dia)) return fechaStr

  const d = new Date(anio, mesIndex, dia)
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const diaSemana = dias[d.getDay()] || ''
  const mesAbbr = MESES_ABBR[mesIndex] || ''

  return `${diaSemana} ${dia} ${mesAbbr} ${anio}`
}

/**
 * Convierte "2026-10-26" y "2026-11-01" a:
 * "26 oct 2026 al 1 nov 2026"
 * @param {string} fechaInicio 
 * @param {string} fechaFin 
 * @returns {string}
 */
export function formatRangoSemanaLegible(fechaInicio, fechaFin) {
  if (!fechaInicio && !fechaFin) return ''
  if (!fechaFin) return formatFechaLegible(fechaInicio)
  if (!fechaInicio) return formatFechaLegible(fechaFin)
  return `${formatFechaLegible(fechaInicio)} al ${formatFechaLegible(fechaFin)}`
}

/**
 * Formato de Programa S-140 (sin año):
 * - Mismo mes: "7 - 13 de Septiembre"
 * - Entre 2 meses: "28 de Septiembre - 4 de Octubre"
 * @param {string} fechaInicio 
 * @param {string} fechaFin 
 * @returns {string}
 */
export function formatRangoSemanaPrograma(fechaInicio, fechaFin) {
  if (!fechaInicio && !fechaFin) return ''
  const strIni = String(fechaInicio || '').trim().slice(0, 10)
  const strFin = String(fechaFin || '').trim().slice(0, 10)

  const pIni = strIni.split('-')
  const pFin = strFin.split('-')

  if (pIni.length < 3 && pFin.length < 3) return `${fechaInicio} - ${fechaFin}`

  if (pFin.length < 3) {
    const d = parseInt(pIni[2], 10)
    const m = MESES[parseInt(pIni[1], 10) - 1] || ''
    return `${d} de ${m}`
  }
  if (pIni.length < 3) {
    const d = parseInt(pFin[2], 10)
    const m = MESES[parseInt(pFin[1], 10) - 1] || ''
    return `${d} de ${m}`
  }

  const dIni = parseInt(pIni[2], 10)
  const mIndexIni = parseInt(pIni[1], 10) - 1
  const mIni = MESES[mIndexIni] || ''

  const dFin = parseInt(pFin[2], 10)
  const mIndexFin = parseInt(pFin[1], 10) - 1
  const mFin = MESES[mIndexFin] || ''

  if (isNaN(dIni) || isNaN(dFin)) return `${fechaInicio} - ${fechaFin}`

  if (mIndexIni === mIndexFin) {
    return `${dIni} - ${dFin} de ${mIni}`
  }

  return `${dIni} de ${mIni} - ${dFin} de ${mFin}`
}

/**
 * Convierte "2026-10-26" a "26 oct"
 * @param {string} fechaStr 
 * @returns {string}
 */
export function formatFechaSinAnio(fechaStr) {
  if (!fechaStr) return ''
  const str = String(fechaStr).trim().slice(0, 10)
  const partes = str.split('-')
  if (partes.length < 3) return fechaStr

  const mesIndex = parseInt(partes[1], 10) - 1
  const dia = parseInt(partes[2], 10)

  if (isNaN(mesIndex) || isNaN(dia)) return fechaStr

  const mesAbbr = MESES_ABBR[mesIndex] || ''
  return `${dia} ${mesAbbr}`
}

/**
 * Convierte "2026-10-26" a "26 oct 2026"
 * @param {string} fechaStr 
 * @returns {string}
 */
export function formatFechaCorta(fechaStr) {
  return formatFechaLegible(fechaStr)
}
