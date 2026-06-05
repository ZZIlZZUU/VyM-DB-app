// ============================================================
// generarS140.js — Generador S-140 con docxtemplater
// Usa la plantilla S-140_plantilla.docx que ya tiene los
// marcadores {{s1_presidente}}, {{s1_tb_titulo}}, etc.
//
// Instalar dependencias:
//   pnpm add docxtemplater pizzip
//
// La plantilla debe estar en: /public/S-140_plantilla.docx
// ============================================================

import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

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

export function buildDatosPlantilla(congregacion, semanas) {
  const datos = { congregacion }

  // La plantilla tiene 5 slots (s1..s5). Rellenar con semanas reales
  // y dejar en blanco los slots sobrantes.
  for (let i = 1; i <= 5; i++) {
    const s = semanas[i - 1] || null
    const pfx = `s${i}`

    datos[`${pfx}_fecha`]       = s?.fecha       || ''
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
// programa_asignaciones / personas al formato esperado arriba.
export function buildDatosDesdeSupabase(semanas, partes, asignaciones, personas) {
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
      }
    }).slice(0, 4) // max 4 slots SMT en la plantilla

    // VC partes (excluyendo EBC)
    const vcPartes = partesSemana
      .filter(p => p.seccion === 'VC' && p.tipo_asignacion !== 'EBC_CON' && p.tipo_asignacion !== 'EBC_LEC')
      .sort((a, b) => a.numero_parte - b.numero_parte)

    const vc = vcPartes.map(parte => {
      const asig = asigSemana.find(a => a.parte_id === parte.id && a.rol === 'principal')
      return {
        titulo: parte.titulo || '',
        cond:   asig ? nombrePorClave(asig.clave) : '',
      }
    }).slice(0, 2) // max 2 slots VC en la plantilla

    return {
      fecha:       `${fechaInicio} — ${fechaFin}`,
      presidente:  asigDe('P'),
      can_ap:      String(s.cancion_apertura || ''),
      oracion_ap:  asigDe('P'),              // mismo Presidente
      tb_titulo:   partesSemana.find(p => p.tipo_asignacion === 'TB')?.titulo || '',
      tb_cond:     asigDe('TB'),
      pe_cond:     asigDe('PE'),
      lb_est:      asigDe('LB'),
      smt,
      can_vc:      String(s.cancion_vc || ''),
      vc,
      ebc_cond:    asigDe('EBC_CON'),
      ebc_lect:    asigDe('EBC_LEC'),
      can_ci:      String(s.cancion_cierre || ''),
      oracion_ci:  asigDe('ORACION_C'),
    }
  })
}

// ── Función principal: genera y descarga el .docx ────────────
export async function generarYDescargarS140({ congregacion, semanas }) {
  // 1. Cargar la plantilla desde /public/
  const response = await fetch('/S-140_plantilla.docx')
  if (!response.ok) throw new Error('No se encontró la plantilla S-140_plantilla.docx en /public/')
  const arrayBuffer = await response.arrayBuffer()

  // 2. Preparar los datos
  const datos = buildDatosPlantilla(congregacion, semanas)

  // 3. Procesar con docxtemplater
  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, {
    paragraphLoop:  true,
    linebreaks:     true,
    nullGetter:     () => '',   // campos vacíos → cadena vacía
  })

  doc.render(datos)

  // 4. Generar blob y descargar
  const blob = doc.getZip().generate({
    type:        'blob',
    mimeType:    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
  })

  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `S-140_${new Date().toISOString().slice(0, 7)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}