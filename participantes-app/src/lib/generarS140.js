// ============================================================
// generarS140.js — Generador S-140 con docxtemplater
// Usa la plantilla S-140_plantilla.docx que ya tiene los
// marcadores {$s1_presidente$}, {$s1_tb_titulo$}, etc.
// Delimitadores: {$ y $} (para evitar conflicto con Word XML)
//
// Instalar dependencias:
//   pnpm add docxtemplater pizzip
//
// La plantilla debe estar en: /public/S-140_plantilla.docx
// ============================================================

async function cargarDocxtemplater() {
  const [{ default: PizZip }, { default: Docxtemplater }] = await Promise.all([
    import('pizzip'),
    import('docxtemplater'),
  ])

  return { PizZip, Docxtemplater }
}

// ── Construir el objeto de datos para docxtemplater ──────────
// Recibe un array de hasta 5 semanas, cada una con sus partes
// y asignaciones ya resueltas.
//
// Cada semana debe tener la forma:
// {
//   fecha:         '2026-07-06 — 2026-07-12',
//   presidente:    'Juan Pérez',
//   can_ap:        '145',
//   oracion_ap:    'Juan Pérez',      // mismo que presidente
//   tb_titulo:     'La fe de Abraham',
//   tb_cond:       'Pedro López',
//   pe_cond:       'Carlos Ruiz',
//   lb_est:        'Mario García',
//   smt: [                            // 4 partes SMT
//     { titulo: 'Empiece conversaciones', est: 'Ana Torres', ayu: 'María Soto' },
//     { titulo: 'Haga revisitas',         est: 'Lucía Vega', ayu: 'Rosa Díaz' },
//     { titulo: 'Haga discípulos',        est: 'Elena Cruz', ayu: 'Irma Ramos' },
//     { titulo: 'Explique sus creencias', est: 'Sofia Luna', ayu: 'Laura Gil' },
//   ],
//   can_vc:        '100',
//   vc: [                             // 2 partes VC (antes del EBC)
//     { titulo: 'Cómo aplicar los principios', cond: 'Roberto Mora' },
//     { titulo: 'Necesidades de la congregación', cond: 'Andrés Vega' },
//   ],
//   ebc_cond:      'Andrés Vega',
//   ebc_lect:      'Tomás Ríos',
//   can_ci:        '60',
//   oracion_ci:    'Felipe Castro',
// }

import {
  MESES_S140,
  CONECTORES_MINUSCULA,
  SANGRIA_FECHA_CAPITULO,
  formatearFechaReunionMartes,
  formatearCapituloBiblico,
  formatearEncabezadoFechaS140,
  crearDocxNativo,
} from './generadorS140Xml.js'

export {
  MESES_S140,
  CONECTORES_MINUSCULA,
  SANGRIA_FECHA_CAPITULO,
  formatearFechaReunionMartes,
  formatearCapituloBiblico,
  formatearEncabezadoFechaS140,
  crearDocxNativo,
}

import { getImpactoEventoSemana } from './fechas.js'

export function buildDatosPlantilla(congregacion, semanas) {
  const datos = { congregacion }

  // La plantilla tiene 9 slots (s1..s9). Rellenar con semanas reales
  // y dejar en blanco los slots sobrantes.
  for (let i = 1; i <= 9; i++) {
    const s = semanas[i - 1] || null
    const pfx = `s${i}`

    let textoFecha = s?.fecha || ''
    if (s?.fecha_inicio && (!textoFecha || /^\d{4}-\d{2}-\d{2}/.test(textoFecha))) {
      textoFecha = formatearEncabezadoFechaS140(
        s.fecha_inicio,
        s.capitulo_biblico,
        s.esDesplazada ? s.fecha_efectiva : null
      )
    }

    datos[`${pfx}_fecha`]       = textoFecha
    datos[`${pfx}_presidente`]  = s?.presidente  || ''
    datos[`${pfx}_can_ap`]      = s?.can_ap      || ''
    datos[`${pfx}_oracion_ap`]  = s?.oracion_ap  || ''
    datos[`${pfx}_tb_titulo`]   = s?.tb_titulo   || ''
    datos[`${pfx}_tb_cond`]     = s?.tb_cond     || ''
    datos[`${pfx}_pe_cond`]     = s?.pe_cond     || ''
    datos[`${pfx}_lb_est`]      = s?.lb_est      || ''

    for (let j = 1; j <= 4; j++) {
      const smt = s?.smt?.[j - 1] || {}
      datos[`${pfx}_smt${j}_titulo`] = smt.titulo || ''
      datos[`${pfx}_smt${j}_est`]    = smt.est    || ''
      datos[`${pfx}_smt${j}_ayu`]    = smt.ayu    || ''
    }

    datos[`${pfx}_can_vc`]     = s?.can_vc      || ''

    for (let j = 1; j <= 2; j++) {
      const vc = s?.vc?.[j - 1] || {}
      datos[`${pfx}_vc${j}_titulo`] = vc.titulo || ''
      datos[`${pfx}_vc${j}_cond`]   = vc.cond   || ''
    }

    datos[`${pfx}_ebc_cond`]   = s?.ebc_cond    || ''
    datos[`${pfx}_ebc_lect`]   = s?.ebc_lect    || ''
    datos[`${pfx}_can_ci`]     = s?.can_ci      || ''
    datos[`${pfx}_oracion_ci`] = s?.oracion_ci  || ''
  }

  return datos
}

// ── Construir datos desde las estructuras de Supabase ────────
// Convierte las tablas programa_semanas / programa_partes /
// programa_asignaciones / personas al formato esperado arriba,
// aplicando eventos especiales (asambleas, desplazamientos, cancelaciones).
export function buildDatosDesdeSupabase(semanas, partes, asignaciones, personas, eventos = [], config = null) {
  const nombrePorClave = clave => personas.find(p => p.clave === clave)?.nombre || ''

  return semanas.map(s => {
    const partesSemana = partes.filter(p => p.semana_id === s.id)
    const asigSemana   = asignaciones.filter(a => partesSemana.some(p => p.id === a.parte_id))

    const asigDe = (tipo, rol = 'principal') => {
      const parte = partesSemana.find(p => p.tipo_asignacion === tipo)
      const asig  = asigSemana.find(a => a.parte_id === parte?.id && a.rol === rol)
      return asig ? nombrePorClave(asig.clave) : ''
    }

    const fechaInicio = String(s.fecha_inicio || '').slice(0, 10)
    const fechaFin    = String(s.fecha_fin    || '').slice(0, 10)
    const capituloFormateado = formatearCapituloBiblico(s.capitulo_biblico)

    // Buscar impacto exacto del evento para esta semana
    const impacto = getImpactoEventoSemana(s, eventos, config?.diaReunionEntreSemana, config?.diaReunionFinSemana)
    const evento = impacto.evento

    // SMT (4 partes: SMT_EST con ayudante + SMT_DSC sin ayudante)
    const smtPartes = partesSemana
      .filter(p => p.seccion === 'SMT')
      .sort((a, b) => a.numero_parte - b.numero_parte)

    const smt = smtPartes.map(parte => {
      const est = asigSemana.find(a => a.parte_id === parte.id && a.rol === 'principal')
      const ayu = asigSemana.find(a => a.parte_id === parte.id && a.rol === 'ayudante')
      return {
        titulo: parte.titulo || '',
        est:    est ? nombrePorClave(est.clave) : '',
        ayu:    ayu ? nombrePorClave(ayu.clave) : '',
        duracion_min: parte.duracion_min || null,
        hora_inicio: parte.hora_inicio || null,
      }
    }).slice(0, 4) // max 4 slots SMT en la plantilla

    // VC partes (excluyendo EBC)
    const vcPartes = partesSemana
      .filter(p => p.seccion === 'VC' && p.tipo_asignacion !== 'EBC_CON' && p.tipo_asignacion !== 'LEBC')
      .sort((a, b) => a.numero_parte - b.numero_parte)

    const vc = vcPartes.map(parte => {
      const asig = asigSemana.find(a => a.parte_id === parte.id && a.rol === 'principal')
      return {
        titulo: parte.titulo || '',
        cond:   asig ? nombrePorClave(asig.clave) : '',
        duracion_min: parte.duracion_min || null,
        hora_inicio: parte.hora_inicio || null,
      }
    }).slice(0, 2) // max 2 slots VC en la plantilla

    // Si la semana cancela la reunión de entre semana (Asamblea Regional, AC entre semana o Reunión Cancelada)
    const esAsamblea = impacto.cancelaEntreSemana && impacto.esAsamblea
    const esCancelada = impacto.cancelaEntreSemana && impacto.esCancelada
    const esDesplazada = impacto.esDesplazada
    const esVisitaSC = impacto.esVisitaSC
    const esVisitaSucursal = impacto.esVisitaSucursal
    const esVisita = impacto.esVisita

    const fechaEfectivaReunion = esDesplazada && impacto.fechaEfectiva ? impacto.fechaEfectiva : null
    const fechaDiaReunion = formatearFechaReunionMartes(fechaInicio, fechaEfectivaReunion)
    const fechaFormateada = formatearEncabezadoFechaS140(
      fechaInicio,
      capituloFormateado,
      fechaEfectivaReunion
    )

    if (esAsamblea) {
      const tituloAsamblea = impacto.tituloEvento
        ? impacto.tituloEvento.toUpperCase()
        : 'ASAMBLEA'

      return {
        id:               s.id,
        fecha:            fechaFormateada,
        fecha_reunion:    fechaDiaReunion,
        capitulo_biblico: capituloFormateado,
        fecha_inicio:     fechaInicio,
        fecha_fin:        fechaFin,
        presidente:       '',
        can_ap:           '',
        oracion_ap:       '',
        tb_titulo:        tituloAsamblea,
        tb_cond:          '',
        pe_cond:          '',
        lb_est:           '',
        smt:              [],
        can_vc:           '',
        vc:               [],
        ebc_cond:         '',
        ebc_lect:         '',
        ebc_hora_inicio:  null,
        can_ci:           '',
        oracion_ci:       '',
        esAsamblea:       true,
        tipo_evento:      evento?.tipo_evento,
        evento,
      }
    }

    if (esCancelada) {
      const tituloCancelada = impacto.tituloEvento
        ? `REUNIÓN CANCELADA (${impacto.tituloEvento.toUpperCase()})`
        : 'REUNIÓN CANCELADA'

      return {
        id:               s.id,
        fecha:            fechaFormateada,
        fecha_reunion:    fechaDiaReunion,
        capitulo_biblico: capituloFormateado,
        fecha_inicio:     fechaInicio,
        fecha_fin:        fechaFin,
        presidente:       '',
        can_ap:           '',
        oracion_ap:       '',
        tb_titulo:        tituloCancelada,
        tb_cond:          '',
        pe_cond:          '',
        lb_est:           '',
        smt:              [],
        can_vc:           '',
        vc:               [],
        ebc_cond:         '',
        ebc_lect:         '',
        ebc_hora_inicio:  null,
        can_ci:           '',
        oracion_ci:       '',
        esCancelada:      true,
        tipo_evento:      evento?.tipo_evento,
        evento,
      }
    }

    // Caso de Visita del SC o Representante de Sucursal
    let ebcCond = asigDe('EBC_CON')
    let ebcLect = asigDe('LEBC')
    let ebcTitulo = partesSemana.find(p => p.tipo_asignacion === 'EBC_CON')?.titulo || ''
    let oracionCi = asigDe('ORACION_C')

    if (esVisita) {
      const nombreVisitante =
        impacto.nombreVisitante ||
        (esVisitaSC ? 'Superintendente de Circuito' : 'Representante de la Sucursal')
      ebcCond = nombreVisitante
      ebcLect = '' // La visita no requiere lector en su discurso de servicio
      ebcTitulo = esVisitaSC
        ? 'Discurso del Superintendente (30 mins.)'
        : 'Discurso del Representante de la Sucursal (30 mins.)'

      if (impacto.oracionVisitante) {
        oracionCi = nombreVisitante
      }
    }

    return {
      id:               s.id,
      fecha:            fechaFormateada,
      fecha_reunion:    fechaDiaReunion,
      capitulo_biblico: capituloFormateado,
      fecha_inicio:     fechaInicio,
      fecha_fin:        fechaFin,
      presidente:       asigDe('P'),
      can_ap:           String(s.cancion_apertura || ''),
      oracion_ap:       asigDe('P'),              // mismo Presidente
      tb_titulo:        partesSemana.find(p => p.tipo_asignacion === 'TB')?.titulo || '',
      tb_cond:          asigDe('TB'),
      pe_cond:          asigDe('PE'),
      lb_est:           asigDe('LB'),
      smt,
      can_vc:           String(s.cancion_vc || ''),
      vc,
      ebc_cond:         ebcCond,
      ebc_lect:         ebcLect,
      ebc_titulo:       ebcTitulo,
      ebc_hora_inicio:  partesSemana.find(p => p.tipo_asignacion === 'EBC_CON')?.hora_inicio || null,
      can_ci:           String(s.cancion_cierre || ''),
      oracion_ci:       oracionCi,
      esDesplazada:     Boolean(esDesplazada),
      fecha_efectiva:   evento?.fecha_efectiva || null,
      hora_efectiva:    evento?.hora_efectiva || null,
      esVisitaSC:       Boolean(esVisitaSC),
      esVisitaSucursal: Boolean(esVisitaSucursal),
      esVisita:         Boolean(esVisita),
      nombreVisitante:  esVisita ? (evento.nombre_visitante || '') : null,
      tipo_evento:      evento?.tipo_evento || null,
      evento:           evento || null,
    }
  })
}

import { supabase } from './supabase'
import { parseConfigRows } from '../hooks/useConfiguracion'

const REGEX_CAMPOS_SERIF =
  /\{\$s\d+_(fecha|presidente|oracion_ap|tb_cond|pe_cond|lb_est|smt[1-4]_est|smt[1-4]_ayu|vc[1-2]_cond|ebc_cond|ebc_lect|oracion_ci)\$\}/

function inyectarPropiedadesRun(rPrInner, { font = null, sizeHalfPt = null }) {
  let inner = rPrInner || ''
  if (font) {
    const tagFont = `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>`
    if (/<w:rFonts\b[^>]*\/>/.test(inner)) {
      inner = inner.replace(/<w:rFonts\b[^>]*\/>/g, tagFont)
    } else {
      inner = tagFont + inner
    }
  }
  if (sizeHalfPt) {
    const tagSz = `<w:sz w:val="${sizeHalfPt}"/><w:szCs w:val="${sizeHalfPt}"/>`
    inner = inner.replace(/<w:sz\b[^>]*\/>/g, '').replace(/<w:szCs\b[^>]*\/>/g, '')
    inner += tagSz
  }
  return inner
}

/**
 * Aplica los ajustes tipográficos sobre el XML de la plantilla S-140:
 * - Nombre de la congregación (`{$congregacion$}`): 14 pt (w:sz="28") en negrita.
 * - Fecha + capítulos bíblicos (`{$sN_fecha$}`) y nombres de participantes: fuente Times New Roman.
 */
export function aplicarEstilosPlantillaXml(xml) {
  if (!xml) return xml

  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, pXml => {
    const plain = pXml.replace(/<[^>]+>/g, '').trim()

    // 1. Nombre de la congregación: tamaño 14 pt (28 half-points en Word)
    if (plain.includes('{$congregacion$}')) {
      let actualizado = pXml.replace(
        /<w:pPr>([\s\S]*?)<\/w:pPr>/,
        (m, pPrInner) =>
          `<w:pPr>${pPrInner.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (_, rInner) => `<w:rPr>${inyectarPropiedadesRun(rInner, { sizeHalfPt: 28 })}</w:rPr>`)}</w:pPr>`
      )
      actualizado = actualizado.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g, (match, rAttrs, rBody) => {
        if (/<w:rPr>([\s\S]*?)<\/w:rPr>/.test(rBody)) {
          return `<w:r${rAttrs}>${rBody.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (_, inner) => `<w:rPr>${inyectarPropiedadesRun(inner, { sizeHalfPt: 28 })}</w:rPr>`)}</w:r>`
        }
        return `<w:r${rAttrs}><w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>${rBody}</w:r>`
      })
      return actualizado
    }

    // 2. Fecha + capítulos bíblicos y Nombres de participantes: fuente Times New Roman
    if (REGEX_CAMPOS_SERIF.test(plain)) {
      let actualizado = pXml.replace(/(\$\})\/(\{?)/g, '$1\u00A0/\u00A0$2')
      actualizado = actualizado.replace(
        /<w:pPr>([\s\S]*?)<\/w:pPr>/,
        (m, pPrInner) =>
          `<w:pPr>${pPrInner.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (_, rInner) => `<w:rPr>${inyectarPropiedadesRun(rInner, { font: 'Times New Roman' })}</w:rPr>`)}</w:pPr>`
      )
      actualizado = actualizado.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g, (match, rAttrs, rBody) => {
        if (/<w:rPr>([\s\S]*?)<\/w:rPr>/.test(rBody)) {
          return `<w:r${rAttrs}>${rBody.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, (_, inner) => `<w:rPr>${inyectarPropiedadesRun(inner, { font: 'Times New Roman' })}</w:rPr>`)}</w:r>`
        }
        return `<w:r${rAttrs}><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr>${rBody}</w:r>`
      })
      return actualizado
    }

    return pXml
  })
}

/**
 * Fallback de seguridad: procesa la plantilla fija de 9 slots con docxtemplater.
 */
export async function generarS140PlantillaClasica({ congregacion, semanas, arrayBuffer }) {
  const datos = buildDatosPlantilla(congregacion, semanas)
  const { PizZip, Docxtemplater } = await cargarDocxtemplater()
  const zip = new PizZip(arrayBuffer)
  const docXmlFile = zip.file('word/document.xml')
  if (docXmlFile) {
    zip.file('word/document.xml', aplicarEstilosPlantillaXml(docXmlFile.asText()))
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop:  true,
    linebreaks:     true,
    nullGetter:     () => '',
    delimiters:     { start: '{$', end: '$}' },
  })

  doc.render(datos)
  return doc.getZip()
}

// ── Función principal: genera y descarga el .docx ────────────
export async function generarYDescargarS140({
  congregacion,
  semanas,
  config = null,
  modo = 'auto', // 'auto' (nativo con fallback automático) | 'clasico' (plantilla docxtemplater)
}) {
  // 1. Cargar la plantilla (primero Supabase Storage, luego local)
  let arrayBuffer
  try {
    const { data, error } = await supabase
      .storage
      .from('plantillas')
      .download('S-140_plantilla.docx')

    if (error || !data) {
      throw new Error(error?.message || 'Descarga vacía de Supabase Storage')
    }
    arrayBuffer = await data.arrayBuffer()
  } catch (storageErr) {
    const response = await fetch('/S-140_plantilla.docx')
    if (!response.ok) {
      throw new Error('No se encontró la plantilla S-140_plantilla.docx en Supabase Storage ni en /public/')
    }
    arrayBuffer = await response.arrayBuffer()
  }

  const { PizZip } = await cargarDocxtemplater()
  let zipFinal = null

  // 2. Compilar con generador nativo dinámico (si modo !== 'clasico')
  if (modo !== 'clasico') {
    try {
      zipFinal = crearDocxNativo({
        PizZip,
        templateArrayBuffer: arrayBuffer,
        congregacion,
        semanas,
        config,
      })
    } catch (errNativo) {
      console.warn(
        '[generarS140] La compilación nativa dinámica falló. Recurriendo automáticamente a la plantilla clásica...',
        errNativo
      )
      zipFinal = null
    }
  }

  // 3. Fallback a plantilla clásica si falló el modo nativo o si se solicitó explícitamente
  if (!zipFinal) {
    zipFinal = await generarS140PlantillaClasica({ congregacion, semanas, arrayBuffer })
  }

  // 4. Generar blob y descargar
  const blob = zipFinal.generate({
    type:        'blob',
    mimeType:    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })

  const primerFecha = semanas[0]?.fecha_inicio || semanas[0]?.fecha?.slice(0, 10)
  const periodoStr = primerFecha ? primerFecha.slice(0, 7) : new Date().toISOString().slice(0, 7)
  const congSlug = (congregacion || 'Congregacion')
    .trim()
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '_')
    .replace(/_+/g, '_')

  const sufijoModo = modo === 'clasico' ? '_clasico' : ''
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `S-140_${congSlug}_${periodoStr}${sufijoModo}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Obtener la semana actual o más próxima disponible ──────────
export async function getSemanaActualInfo() {
  try {
    const hoyIso = new Date().toISOString().slice(0, 10)
    const { data: semanas, error } = await supabase
      .from('programa_semanas')
      .select('*')
      .order('fecha_inicio', { ascending: true })

    if (error || !semanas || semanas.length === 0) return null

    // 1. Semana que contenga la fecha de hoy
    let semana = semanas.find(s => {
      const ini = String(s.fecha_inicio || '').slice(0, 10)
      const fin = String(s.fecha_fin || '').slice(0, 10)
      return hoyIso >= ini && hoyIso <= fin
    })

    // 2. Si no, la primera semana futura más próxima
    if (!semana) {
      const futuras = semanas.filter(s => String(s.fecha_inicio || '').slice(0, 10) >= hoyIso)
      semana = futuras.length > 0 ? futuras[0] : null
    }

    return semana || null
  } catch (err) {
    console.error('[getSemanaActualInfo]', err)
    return null
  }
}

// ── Exportación rápida del S-140 de la semana actual ──────────
export async function exportarS140SemanaActual() {
  const semanaActual = await getSemanaActualInfo()
  if (!semanaActual) {
    throw new Error('Sin programa para esta semana')
  }

  // 1. Cargar datos en paralelo
  const [partesRes, asigRes, personasRes, configRes, eventosRes] = await Promise.all([
    supabase.from('programa_partes').select('*').eq('semana_id', semanaActual.id),
    supabase.from('programa_asignaciones').select('*'),
    supabase.from('personas').select('*'),
    supabase.from('configuracion').select('clave, valor'),
    supabase.from('eventos_reunion').select('*'),
  ])

  if (partesRes.error) throw partesRes.error

  const partes = partesRes.data || []
  const asignaciones = (asigRes.data || []).filter(a => partes.some(p => p.id === a.parte_id))
  const personas = personasRes.data || []
  const configObj = parseConfigRows(configRes.data || [])
  const congregacion = configObj.nombreCongregacion || 'Congregación del Recreo'
  const eventos = eventosRes?.data || []

  const semanasNorm = buildDatosDesdeSupabase([semanaActual], partes, asignaciones, personas, eventos, configObj)

  await generarYDescargarS140({
    congregacion,
    semanas: semanasNorm,
    config: configObj,
  })

  return semanaActual
}