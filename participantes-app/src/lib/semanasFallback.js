import { MESES, addDaysIso } from './fechas'
import { TIPO_LABEL } from '../components/matriz/matrizUtils'

const SECCION_POR_TIPO = {
  P: 'APERTURA',
  TB: 'TB',
  PE: 'TB',
  LB: 'TB',
  T: 'SMT',
  A: 'SMT',
  X: 'SMT',
  DSC: 'SMT',
  SMT_DSC: 'SMT',
  SMT_EST: 'SMT',
  SMT_EXP: 'SMT',
  SMT_AYU: 'SMT',
  VC: 'VC',
  NC: 'VC',
  EBC: 'VC',
  EBC_CON: 'VC',
  LEBC: 'VC',
  ORACION: 'CIERRE',
  ORACION_C: 'CIERRE',
  OC: 'CIERRE',
  CONCLU: 'CIERRE',
}

const SECCION_ORDEN = {
  APERTURA: 0,
  TB: 1,
  SMT: 2,
  VC: 3,
  CIERRE: 4,
}

/**
 * Calcula los límites Lunes–Domingo (YYYY-MM-DD) de la semana a la que pertenece `fechaIso`.
 */
export function getWeekBoundsIso(fechaIso) {
  const str = String(fechaIso || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return null
  const [y, m, d] = str.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (Number.isNaN(dt.getTime())) return null

  const day = dt.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = addDaysIso(str, diffToMon)
  const sunday = addDaysIso(monday, 6)
  const mesIdx = parseInt(monday.slice(5, 7), 10) - 1
  return {
    monday,
    sunday,
    mes: MESES[mesIdx] || '',
    anio: Number(monday.slice(0, 4)),
  }
}

export function mapParticipacionToSeccion(tipo) {
  return SECCION_POR_TIPO[tipo] || 'SMT'
}

/**
 * Combina semanas oficiales importadas por EPUB (`programa_semanas`) con semanas virtuales
 * agrupadas desde `participaciones` para fechas que aún no tienen guía EPUB cargada.
 */
export function buildSemanasConParticipaciones(semanas = [], participaciones = []) {
  const realWeeks = (semanas || []).map(s => ({ ...s, isVirtual: false }))
  const realRanges = realWeeks
    .map(s => ({
      ini: String(s.fecha_inicio || '').slice(0, 10),
      fin: String(s.fecha_fin || '').slice(0, 10),
    }))
    .filter(r => r.ini && r.fin)

  const virtualByMonday = new Map()

  for (const p of participaciones || []) {
    const fecha = String(p?.fecha || '').trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) continue

    const cubiertoPorEpub = realRanges.some(r => fecha >= r.ini && fecha <= r.fin)
    if (cubiertoPorEpub) continue

    const bounds = getWeekBoundsIso(fecha)
    if (!bounds) continue

    let vw = virtualByMonday.get(bounds.monday)
    if (!vw) {
      const mesSemana = p.mes && MESES.includes(p.mes) ? p.mes : bounds.mes
      vw = {
        id: `virtual_${bounds.monday}`,
        fecha_inicio: bounds.monday,
        fecha_fin: bounds.sunday,
        mes: mesSemana,
        anio: bounds.anio,
        capitulo_biblico: 'Registros sin guía EPUB',
        isVirtual: true,
        participaciones: [],
      }
      virtualByMonday.set(bounds.monday, vw)
    }
    vw.participaciones.push(p)
  }

  return [...realWeeks, ...virtualByMonday.values()].sort((a, b) =>
    String(a.fecha_inicio || '').slice(0, 10).localeCompare(String(b.fecha_inicio || '').slice(0, 10))
  )
}

const TITULO_DESCRIPTIVO_POR_TIPO = {
  P: 'Presidente de la reunión',
  ORACION: 'Oración de apertura',
  ORACION_C: 'Oración de conclusión',
  OC: 'Oración de conclusión',
  CONCLU: 'Palabras de conclusión',
  TB: 'Tesoros de la Biblia',
  PE: 'Busquemos perlas escondidas',
  LB: 'Lectura de la Biblia',
  T: 'Intervención estudiantil (Titular)',
  A: 'Ayudante en demostración',
  X: 'Participación asignada',
  DSC: 'Discurso estudiantil',
  SMT_EST: 'Asignación estudiantil',
  SMT_EXP: 'Explique sus creencias',
  SMT_DSC: 'Discurso estudiantil',
  SMT_AYU: 'Ayudante SMT',
  VC: 'Nuestra Vida Cristiana',
  NC: 'Necesidades de la congregación',
  EBC: 'Estudio bíblico de la congregación',
  EBC_CON: 'Conductor del Estudio bíblico',
  LEBC: 'Lector del Estudio bíblico',
}

function extractTituloReal(p) {
  const raw = String(p?.titulo_parte || p?.observaciones || '').trim()
  if (!raw) return ''
  if (/^ayudante\s+smt$/i.test(raw)) return ''
  const stripped = raw.replace(/^ayudante\s+smt\s*[—-]\s*/i, '').trim()
  return stripped || ''
}

/**
 * Convierte las `participaciones` de una semana virtual en `partes` y `asignaciones`
 * compatibles con HomeWidgetGrid y VistaSemanal, emparejando Titular y Ayudante.
 */
export function buildPartesVirtualesDeSemana(semana) {
  if (!semana || !semana.isVirtual || !Array.isArray(semana.participaciones)) {
    return { partes: [], asignaciones: [] }
  }

  const ordenadas = [...semana.participaciones].sort((a, b) => {
    const secA = SECCION_ORDEN[mapParticipacionToSeccion(a?.tipo)] ?? 9
    const secB = SECCION_ORDEN[mapParticipacionToSeccion(b?.tipo)] ?? 9
    if (secA !== secB) return secA - secB
    const fCmp = String(a?.fecha || '').localeCompare(String(b?.fecha || ''))
    if (fCmp !== 0) return fCmp
    return (a?.id || 0) - (b?.id || 0)
  })

  const primaries = []
  const ayudantes = []
  for (const p of ordenadas) {
    if (p?.tipo === 'A' || p?.tipo === 'SMT_AYU') {
      ayudantes.push(p)
    } else {
      primaries.push(p)
    }
  }

  const partes = []
  const asignaciones = []
  const studentTargets = []

  const TIPOS_TITULAR_CON_AYUDANTE = new Set(['T', 'SMT_EST', 'SMT_EXP'])

  primaries.forEach((p, idx) => {
    const parteId = `vparte_${semana.id}_${p.id ?? idx}`
    const seccion = mapParticipacionToSeccion(p.tipo)
    const fallbackLabel =
      TITULO_DESCRIPTIVO_POR_TIPO[p.tipo] || TIPO_LABEL[p.tipo] || p.tipo || 'Participación'
    const tituloReal = extractTituloReal(p)
    const esTitularEstudiantil = TIPOS_TITULAR_CON_AYUDANTE.has(p.tipo)

    partes.push({
      id: parteId,
      semana_id: semana.id,
      numero_parte: partes.length + 1,
      seccion,
      tipo_asignacion: p.tipo || 'T',
      titulo: tituloReal || fallbackLabel,
      duracion_min: null,
      requiere_ayudante: esTitularEstudiantil,
      isVirtual: true,
    })

    asignaciones.push({
      id: `vasig_${semana.id}_${p.id ?? idx}`,
      parte_id: parteId,
      rol: 'principal',
      clave: p.clave,
      confirmado: true,
      participacion_id: p.id ?? null,
    })

    if (esTitularEstudiantil) {
      studentTargets.push({ parteId, regId: p.id || 0, paired: false })
    }
  })

  ayudantes.forEach((ayu, idx) => {
    const ayuId = ayu.id || 0
    // Buscar titular estudiantil sin ayudante más cercano (preferiblemente inmediatamente anterior en id)
    let target = studentTargets.find(st => !st.paired && st.regId < ayuId)
    if (!target) {
      target = studentTargets.find(st => !st.paired)
    }

    if (target) {
      target.paired = true
      asignaciones.push({
        id: `vasig_${semana.id}_ayu_${ayu.id ?? idx}`,
        parte_id: target.parteId,
        rol: 'ayudante',
        clave: ayu.clave,
        confirmado: true,
        participacion_id: ayu.id ?? null,
      })
      return
    }

    // Respaldo: si existe ayudante huérfano sin titular registrado en la semana
    const parteId = `vparte_${semana.id}_ayu_${ayu.id ?? idx}`
    const tituloReal = extractTituloReal(ayu)
    partes.push({
      id: parteId,
      semana_id: semana.id,
      numero_parte: partes.length + 1,
      seccion: 'SMT',
      tipo_asignacion: ayu.tipo || 'A',
      titulo: tituloReal || TITULO_DESCRIPTIVO_POR_TIPO[ayu.tipo] || 'Ayudante en demostración',
      duracion_min: null,
      requiere_ayudante: false,
      isVirtual: true,
    })
    asignaciones.push({
      id: `vasig_${semana.id}_ayu_p_${ayu.id ?? idx}`,
      parte_id: parteId,
      rol: 'principal',
      clave: ayu.clave,
      confirmado: true,
      participacion_id: ayu.id ?? null,
    })
  })

  return { partes, asignaciones }
}

const TIPO_REG_ESPERADO_POR_PARTE = {
  P: ['P'],
  TB: ['TB'],
  PE: ['PE'],
  LB: ['LB'],
  SMT_EST: ['T', 'SMT_EST'],
  SMT_EXP: ['T', 'SMT_EXP'],
  SMT_DSC: ['DSC', 'SMT_DSC'],
  VC: ['VC'],
  NC: ['NC'],
  EBC_CON: ['EBC', 'EBC_CON'],
  LEBC: ['LEBC'],
  ORACION_C: ['OC', 'ORACION_C'],
}

/**
 * Empareja partes recién importadas de un EPUB con filas existentes en `participaciones`
 * para esa semana, generando filas listas de `programa_asignaciones` confirmadas.
 */
export function buildAsignacionesDesdeParticipaciones(
  partesInsertadas = [],
  participacionesSemana = []
) {
  if (!partesInsertadas.length || !participacionesSemana.length) return []

  const partesOrdenadas = [...partesInsertadas].sort(
    (a, b) => (a.numero_parte || 0) - (b.numero_parte || 0)
  )
  const regsOrdenados = [...participacionesSemana].sort((a, b) => (a.id || 0) - (b.id || 0))
  const usedRegIds = new Set()
  const result = []

  for (const parte of partesOrdenadas) {
    if (
      !parte?.id ||
      parte.tipo_asignacion === 'ORACION' ||
      parte.tipo_asignacion === 'CONCLU' ||
      parte.tipo_asignacion === 'SMT_VACIO'
    ) {
      continue
    }

    const validTipos = TIPO_REG_ESPERADO_POR_PARTE[parte.tipo_asignacion]
    if (!validTipos) continue

    const regP = regsOrdenados.find(
      r => r?.clave && !usedRegIds.has(r.id) && validTipos.includes(r.tipo)
    )
    if (!regP) continue

    usedRegIds.add(regP.id)
    result.push({
      parte_id: parte.id,
      clave: regP.clave,
      rol: 'principal',
      sugerido_por_app: false,
      confirmado: true,
      participacion_id: regP.id || null,
    })

    if (parte.requiere_ayudante) {
      const regA =
        regsOrdenados.find(
          r =>
            r?.clave &&
            !usedRegIds.has(r.id) &&
            (r.tipo === 'A' || r.tipo === 'SMT_AYU') &&
            (r.id || 0) > (regP.id || 0)
        ) ||
        regsOrdenados.find(
          r => r?.clave && !usedRegIds.has(r.id) && (r.tipo === 'A' || r.tipo === 'SMT_AYU')
        )

      if (regA) {
        usedRegIds.add(regA.id)
        result.push({
          parte_id: parte.id,
          clave: regA.clave,
          rol: 'ayudante',
          sugerido_por_app: false,
          confirmado: true,
          participacion_id: regA.id || null,
        })
      }
    }
  }

  return result
}
