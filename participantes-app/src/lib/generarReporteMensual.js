// src/lib/generarReporteMensual.js — Construcción de reporte mensual consolidado y helpers de mes
import { MESES } from './fechas'

export const TIPO_LABEL = {
  T: 'Titular',
  A: 'Asistente',
  X: 'Participación',
  LB: 'Lectura Bíblica',
  P: 'Presidente',
  TB: 'Tesoros',
  PE: 'Perlas',
  SMT_DSC: 'Discurso',
  EBC: 'Est. Bíblico',
  LEBC: 'Lector EBC',
  VC: 'Vida Cristiana',
  NC: 'Nec. Congr.',
  ORACION_C: 'Oración conclusión',
}

/**
 * Convierte un código 'YYYYMM' (ej: '202608') a formato legible (ej: 'Agosto 2026').
 * @param {string} mesStr
 * @returns {string}
 */
export function formatMesYYYYMM(mesStr) {
  if (!mesStr || typeof mesStr !== 'string' || mesStr.length < 6) return String(mesStr || '')
  const y = mesStr.slice(0, 4)
  const mIndex = parseInt(mesStr.slice(4, 6), 10) - 1
  const nombreMes = MESES[mIndex] || mesStr.slice(4, 6)
  return `${nombreMes} ${y}`
}

/**
 * Retorna el código YYYYMM del mes anterior al de la fecha dada (por defecto hoy).
 * Ej: Si hoy es Septiembre 2026 -> '202608'
 *     Si hoy es Enero 2027     -> '202612'
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getMesAnteriorYYYYMM(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth() // 0 = Enero, 1 = Feb, ..., 11 = Dic
  if (m === 0) {
    return `${y - 1}12`
  }
  return `${y}${String(m).padStart(2, '0')}`
}

/**
 * Retorna el código YYYYMM del mes actual (por defecto hoy).
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getMesActualYYYYMM(date = new Date()) {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  return `${y}${String(m).padStart(2, '0')}`
}

/**
 * Escapa valores para formato CSV RFC 4180
 * @param {any} val
 * @returns {string}
 */
function escapeCSV(val) {
  if (val == null) return ''
  const str = String(val)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Construye el contenido del reporte mensual en formato CSV con sección
 * inicial de resumen comentada (#) y detalle por asignación.
 *
 * @param {Object} params
 * @param {string} params.mes - Código YYYYMM (ej: '202608')
 * @param {Array} params.participaciones - Filas de la tabla participaciones
 * @param {Array} [params.personas=[]] - Filas de la tabla personas para cruce
 * @param {Date|string} [params.fechaGeneracion=new Date()] - Fecha del reporte
 * @returns {{ csv: string, totalParticipaciones: number, totalPersonas: number, resumenListas: Object, resumenTipos: Object }}
 */
export function construirCSVReporteMensual({
  mes,
  participaciones = [],
  personas = [],
  fechaGeneracion = new Date(),
}) {
  const personasMap = new Map()
  personas.forEach(p => {
    if (p.clave) personasMap.set(p.clave, p)
  })

  // 1. Normalizar y ordenar filas
  const filasNormalizadas = participaciones.map(r => {
    const persona = r.clave ? personasMap.get(r.clave) : null
    const nombre = r.nombre || persona?.nombre || 'Sin nombre'
    const lista = r.lista || persona?.lista || 'Mat'
    const tipo = r.tipo || r.tipo_asignacion || 'X'
    const tipoLabel = TIPO_LABEL[tipo] || tipo
    const fecha = String(r.fecha || '').slice(0, 10)
    const observaciones = r.observaciones || ''

    return {
      clave: r.clave || '',
      nombre,
      lista,
      fecha,
      tipo,
      tipoLabel,
      observaciones,
    }
  })

  // Ordenar cronológicamente por fecha ASC y luego por nombre ASC
  filasNormalizadas.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
    return a.nombre.localeCompare(b.nombre, 'es')
  })

  // 2. Cálculos estadísticos para el bloque de resumen
  const totalParticipaciones = filasNormalizadas.length
  const personasUnicas = new Set(
    filasNormalizadas.map(f => f.clave || f.nombre.toLowerCase())
  )
  const totalPersonas = personasUnicas.size

  const resumenListas = {}
  const resumenTipos = {}
  const conteoPorPersona = {}

  filasNormalizadas.forEach(f => {
    // Por lista
    resumenListas[f.lista] = (resumenListas[f.lista] || 0) + 1

    // Por tipo
    const keyTipo = `${f.tipoLabel} (${f.tipo})`
    resumenTipos[keyTipo] = (resumenTipos[keyTipo] || 0) + 1

    // Por persona
    const keyPersona = `${f.nombre} [${f.lista}]`
    conteoPorPersona[keyPersona] = (conteoPorPersona[keyPersona] || 0) + 1
  })

  // 3. Generar líneas de comentario iniciales (#)
  const fechaGenStr =
    fechaGeneracion instanceof Date
      ? fechaGeneracion.toISOString().replace('T', ' ').slice(0, 19)
      : String(fechaGeneracion)

  const lineasComentario = [
    `# ============================================================`,
    `# REPORTE MENSUAL DE PARTICIPACIONES — ${formatMesYYYYMM(mes).toUpperCase()}`,
    `# Mes: ${mes}`,
    `# Generado: ${fechaGenStr}`,
    `#`,
    `# RESUMEN GENERAL:`,
    `# Total participaciones: ${totalParticipaciones}`,
    `# Total personas participantes: ${totalPersonas}`,
    `#`,
    `# TOTALES POR LISTA:`,
  ]

  Object.entries(resumenListas).forEach(([lista, cant]) => {
    lineasComentario.push(`# - Total ${lista}: ${cant}`)
  })

  lineasComentario.push(`#`)
  lineasComentario.push(`# TOTALES POR TIPO DE ASIGNACIÓN:`)
  Object.entries(resumenTipos)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipoStr, cant]) => {
      lineasComentario.push(`# - ${tipoStr}: ${cant}`)
    })

  lineasComentario.push(`#`)
  lineasComentario.push(`# PARTICIPACIONES POR PERSONA:`)
  Object.entries(conteoPorPersona)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .forEach(([personaStr, cant]) => {
      lineasComentario.push(`# - ${personaStr}: ${cant}`)
    })

  lineasComentario.push(`# ============================================================`)

  // 4. Cabeceras del CSV de datos
  const cabecerasCSV = 'Nombre,Lista,Fecha,Tipo,Observaciones'

  // 5. Filas de datos
  const filasCSV = filasNormalizadas.map(f =>
    [
      escapeCSV(f.nombre),
      escapeCSV(f.lista),
      escapeCSV(f.fecha),
      escapeCSV(f.tipoLabel),
      escapeCSV(f.observaciones),
    ].join(',')
  )

  const BOM = '\uFEFF'
  const csv = [
    BOM + lineasComentario.join('\n'),
    cabecerasCSV,
    ...filasCSV,
  ].join('\n')

  return {
    csv,
    totalParticipaciones,
    totalPersonas,
    resumenListas,
    resumenTipos,
  }
}
