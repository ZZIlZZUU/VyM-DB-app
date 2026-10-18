// ============================================================
// asignacionesSugeridas.js
// Motor de sugerencias de asignación basado en reglas de rotación y pesos
// ============================================================

import { getImpactoEventoSemana } from './fechas'

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Devuelve el mes anterior como string
export function mesAnterior(mes) {
  if (!mes) return null
  const idx = MESES.indexOf(mes)
  if (idx === -1) return MESES[11]
  if (idx === 0) return MESES[11]
  return MESES[idx - 1]
}

/**
 * Normaliza cualquier código de tipo_asignacion (Programa) o tipo (BD participaciones)
 * a su código canónico unificado para comparaciones consistentes.
 */
export function normalizarTipo(tipo) {
  if (!tipo) return ''
  switch (tipo) {
    case 'P':
    case 'ORACION':
    case 'CONCLU':
      return 'P'
    case 'ORACION_C':
    case 'OC':
      return 'OC'
    case 'SMT_EST':
    case 'SMT_EXP':
    case 'T':
      return 'T'
    case 'SMT_AYU':
    case 'SMT_AYU_M':
    case 'SMT_AYU_F':
    case 'SMT_EXP_M':
    case 'SMT_EXP_F':
    case 'A':
      return 'A'
    case 'SMT_DSC':
    case 'DSC':
      return 'DSC'
    case 'EBC_CON':
    case 'EBC':
      return 'EBC'
    default:
      return tipo // 'TB', 'PE', 'LB', 'VC', 'NC', 'LEBC', 'X', etc.
  }
}

/**
 * Determina si un tipo de asignación pertenece a la categoría de "Bajo Peso" (Apoyo).
 * Bajo peso: Oración de cierre (OC), Presidente (P) y Ayudante SMT (A).
 * Mayor peso: TB, PE, LB, LEBC, T (SMT_EST/EXP), DSC (SMT_DSC), VC, NC, EBC (EBC_CON).
 */
export function esTipoBajoPeso(tipo) {
  const norm = normalizarTipo(tipo)
  return norm === 'OC' || norm === 'P' || norm === 'A'
}

/**
 * Devuelve el desgaste/carga mensual efectiva de un tipo de participación.
 * - OC (Oración de cierre): 0 (no consume cupo mensual)
 * - P (Presidente) y A (Ayudante): 0.5 (carga ligera)
 * - Todas las demás partes principales (incluyendo LEBC, LB, TB, PE, VC, NC, EBC, DSC, T): 1.0
 */
export function getCargaMensualTipo(tipo) {
  const norm = normalizarTipo(tipo)
  if (norm === 'OC') return 0
  if (norm === 'P' || norm === 'A') return 0.5
  return 1.0
}

/**
 * Devuelve el lunes (en ms UTC a mediodía) correspondiente a la semana de una fecha YYYY-MM-DD.
 */
export function getLunesSemanaMs(fechaStr) {
  if (!fechaStr) return null
  const clean = String(fechaStr).trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null
  const d = new Date(clean + 'T12:00:00Z')
  if (isNaN(d.getTime())) return null
  const day = d.getUTCDay() // 0 = Dom, 1 = Lun, ..., 6 = Sáb
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diffToMonday)
  return d.getTime()
}

/**
 * Verifica si el participante participó en las 2 semanas consecutivas inmediatamente
 * anteriores a `fechaSemana` (intentar asignarlo por 3.ª semana seguida).
 * Ignora registros de Oración de cierre (OC, peso 0).
 */
export function tieneRachaDosSemanasSeguidas(clave, historial, fechaSemana) {
  const lunesActualMs = getLunesSemanaMs(fechaSemana)
  if (!lunesActualMs || !Array.isArray(historial)) return false

  const MS_POR_SEMANA = 7 * 24 * 60 * 60 * 1000
  let participoSemAnterior1 = false // W - 1
  let participoSemAnterior2 = false // W - 2

  for (const h of historial) {
    const fechaReg = h.fecha || h.fecha_inicio
    if (h.clave !== clave || !fechaReg) continue
    if (normalizarTipo(h.tipo) === 'OC') continue
    const lunesH = getLunesSemanaMs(fechaReg)
    if (!lunesH) continue
    const diffWeeks = Math.round((lunesActualMs - lunesH) / MS_POR_SEMANA)
    if (diffWeeks === 1) participoSemAnterior1 = true
    if (diffWeeks === 2) participoSemAnterior2 = true
    if (participoSemAnterior1 && participoSemAnterior2) return true
  }

  return false
}

/**
 * Verifica si el participante tuvo la misma asignación en los 2 meses consecutivos
 * anteriores (M-1 y M-2), lo que significaría dársela por más de 2 meses seguidos.
 * Ignora el tipo histórico deprecado 'X'.
 */
export function tuvoMismoTipoDosMesesSeguidos(clave, tipo, historial, mes) {
  if (!mes || !tipo || !Array.isArray(historial)) return false
  const tipoNorm = normalizarTipo(tipo)
  if (!tipoNorm || tipoNorm === 'X') return false

  const idxMes = MESES.indexOf(mes)
  if (idxMes === -1) return false

  const mesAnt = mesAnterior(mes)
  const mesTrasAnt = mesAnterior(mesAnt)

  const enMesAnt = historial.some(
    h => h.clave === clave && h.mes === mesAnt && normalizarTipo(h.tipo) === tipoNorm
  )
  if (!enMesAnt) return false

  const enMesTrasAnt = historial.some(
    h => h.clave === clave && h.mes === mesTrasAnt && normalizarTipo(h.tipo) === tipoNorm
  )
  return enMesTrasAnt
}

/**
 * Obtiene el último rol en SMT ('T' o 'A') de una participante dama en todo su historial,
 * para no perder la referencia de alternancia cuando descansa un mes.
 */
export function obtenerUltimoRolSMTDama(clave, historial, mesAnt = null) {
  if (!Array.isArray(historial)) return null
  const regsSMT = historial.filter(h => {
    if (h.clave !== clave) return false
    const norm = normalizarTipo(h.tipo)
    return norm === 'T' || norm === 'A'
  })
  if (regsSMT.length === 0) return null

  // Si los registros tienen fecha válida, ordenar cronológicamente y tomar el más reciente
  const conFecha = regsSMT.filter(r => {
    const f = r.fecha || r.fecha_inicio
    return f && /^\d{4}-\d{2}-\d{2}/.test(String(f).trim())
  })
  if (conFecha.length > 0) {
    const ordenados = [...conFecha].sort((a, b) =>
      String(a.fecha || a.fecha_inicio)
        .slice(0, 10)
        .localeCompare(String(b.fecha || b.fecha_inicio).slice(0, 10))
    )
    return normalizarTipo(ordenados[ordenados.length - 1].tipo)
  }

  // Fallback para tests sin campo fecha: priorizar mesAnt si existe, o el último del array
  if (mesAnt) {
    const enMesAnt = regsSMT.filter(r => r.mes === mesAnt)
    if (enMesAnt.length > 0) {
      return normalizarTipo(enMesAnt[enMesAnt.length - 1].tipo)
    }
  }
  return normalizarTipo(regsSMT[regsSMT.length - 1].tipo)
}

/**
 * Evalúa el impacto de las asignaciones que la persona ya tiene en la misma semana.
 * Soporta tanto formato simple `['A01']` como objetos `{ clave, tipo, esTitularMismaParte }`.
 *
 * @returns {{ penalty: number, conflicto: null | { tipo: string, severity: 'warning'|'info', mensaje: string } }}
 */
export function evaluarImpactoMismaSemana(persona, tipoNuevo, yaAsignados = []) {
  if (!persona?.clave || !Array.isArray(yaAsignados) || yaAsignados.length === 0) {
    return { penalty: 0, conflicto: null }
  }

  const coincidencias = yaAsignados.filter(item =>
    typeof item === 'string' ? item === persona.clave : item?.clave === persona.clave
  )

  if (coincidencias.length === 0) {
    return { penalty: 0, conflicto: null }
  }

  // Si todos los items son strings simples (modo legacy / tests unitarios básicos)
  const tieneObjetosDetallados = coincidencias.some(item => typeof item === 'object' && item !== null)
  if (!tieneObjetosDetallados) {
    return {
      penalty: 50,
      conflicto: {
        tipo: 'misma_semana',
        severity: 'warning',
        mensaje: 'Ya tiene una asignación en esta semana',
      },
    }
  }

  // 1. Si es el titular de esta misma parte y se evalúa como su propio ayudante
  if (coincidencias.some(item => item.esTitularMismaParte)) {
    return {
      penalty: 80,
      conflicto: {
        tipo: 'titular_misma_parte',
        severity: 'warning',
        mensaje: 'Ya figura como titular en esta misma parte',
      },
    }
  }

  // 2. Damas: máximo 1 asignación por semana
  if (persona.sexo === 'F') {
    return {
      penalty: 65,
      conflicto: {
        tipo: 'misma_semana_dama',
        severity: 'warning',
        mensaje: 'Ya tiene una asignación en esta semana',
      },
    }
  }

  // 3. Varones con 2 o más asignaciones ya asignadas en la misma semana
  if (coincidencias.length >= 2) {
    return {
      penalty: 90,
      conflicto: {
        tipo: 'misma_semana_multiple',
        severity: 'warning',
        mensaje: `Ya tiene ${coincidencias.length} asignaciones en esta semana`,
      },
    }
  }

  // 4. Varón con exactamente 1 asignación previa en la misma semana
  const previa = coincidencias[0]
  const tipoPrevioNorm = normalizarTipo(previa.tipo)
  const tipoNuevoNorm = normalizarTipo(tipoNuevo)

  // Regla dura: Presidente (P) no hace la Oración de cierre (OC) ni viceversa
  if (
    (tipoPrevioNorm === 'P' && tipoNuevoNorm === 'OC') ||
    (tipoPrevioNorm === 'OC' && tipoNuevoNorm === 'P')
  ) {
    return {
      penalty: 80,
      conflicto: {
        tipo: 'presidente_oracion_cierre',
        severity: 'warning',
        mensaje:
          tipoPrevioNorm === 'P'
            ? 'Es el Presidente de esta semana'
            : 'Ya tiene la Oración de cierre esta semana',
      },
    }
  }

  // Regla dura: No repetir exactamente el mismo tipo en la misma noche (salvo ayudante en distinta parte si aplica)
  if (tipoPrevioNorm && tipoPrevioNorm === tipoNuevoNorm && tipoNuevoNorm !== 'A') {
    return {
      penalty: 65,
      conflicto: {
        tipo: 'misma_semana_mismo_tipo',
        severity: 'warning',
        mensaje: 'Ya tiene una asignación de este mismo tipo en la semana',
      },
    }
  }

  const previoEsBajo = esTipoBajoPeso(tipoPrevioNorm)
  const nuevoEsBajo = esTipoBajoPeso(tipoNuevoNorm)

  // Combinación permitida en varones: 1 de Bajo Peso (P, OC, A) + 1 de Mayor Peso (o 2 de Bajo Peso compatibles)
  if (previoEsBajo || nuevoEsBajo) {
    return {
      penalty: 15,
      conflicto: {
        tipo: 'misma_semana_combinable',
        severity: 'info',
        mensaje: 'Tiene 1 asignación adicional esta semana (combinación permitida)',
      },
    }
  }

  // Combinación restringida: Ya tiene 1 de Mayor Peso y se evalúa para otra de Mayor Peso
  return {
    penalty: 65,
    conflicto: {
      tipo: 'misma_semana_alto_peso',
      severity: 'warning',
      mensaje: 'Ya tiene una asignación principal en esta semana',
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Reglas por tipo de asignación
// ──────────────────────────────────────────────────────────────

/**
 * Candidatos para una parte dada, ordenados por preferencia.
 * Nota: El campo `estatus` de los Matriculados ('Matriculado bautizado' / 'Matriculada bautizada')
 * se mantiene aislado y en desuso en el motor; solo se filtra por `lista` y `sexo`.
 *
 * @param {string}   tipo         - tipo_asignacion de la parte
 * @param {Array}    personas     - catálogo completo de personas activas
 * @param {Array}    historial    - participaciones previas de Supabase
 * @param {string}   mes          - mes actual ('Julio', 'Agosto'...)
 * @param {Array}    yaAsignados  - claves (string[]) o asignaciones ({ clave, tipo }[]) ya asignadas en esta semana
 * @param {Object}   opciones     - opciones adicionales como `{ fechaSemana }`
 * @returns {Array}  personas ordenadas por prioridad (mejor candidato primero)
 */
export function sugerirCandidatos(
  tipo,
  personas,
  historial = [],
  mes = '',
  yaAsignados = [],
  opciones = {}
) {
  if (!Array.isArray(personas) || personas.length === 0) return []
  if (opciones?.cancelaEntreSemana) return []
  if (opciones?.semana && opciones?.eventos) {
    const impacto = getImpactoEventoSemana(
      opciones.semana,
      opciones.eventos,
      opciones.diaReunionEntreSemana,
      opciones.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) return []
    if ((normalizarTipo(tipo) === 'OC' || tipo === 'ORACION_C') && impacto.esVisita && impacto.oracionVisitante !== false) {
      return []
    }
  }
  const hist = Array.isArray(historial) ? historial : []
  const mesValido = MESES.includes(mes)
  const mesAnt = mesValido ? mesAnterior(mes) : null
  const fechaSemana = typeof opciones === 'string' ? opciones : opciones?.fechaSemana || null
  const tipoNorm = normalizarTipo(tipo)

  // Helper: ¿participó en el mes anterior? (Ignora OC de peso 0)
  const participoMesAnt = clave => {
    if (!mesAnt) return false
    return hist.some(
      h => h.clave === clave && h.mes === mesAnt && normalizarTipo(h.tipo) !== 'OC'
    )
  }

  // Helper: carga efectiva acumulada en el mes actual
  const cargaEsteMes = clave => {
    if (!mesValido) return 0
    return hist
      .filter(h => h.clave === clave && h.mes === mes)
      .reduce((acc, h) => acc + getCargaMensualTipo(h.tipo), 0)
  }

  // Helper: ¿tuvo la misma asignación en el mes inmediatamente anterior?
  const tuvoMismoTipoMesAnt = clave => {
    if (!mesAnt || !tipoNorm || tipoNorm === 'X') return false
    return hist.some(
      h => h.clave === clave && h.mes === mesAnt && normalizarTipo(h.tipo) === tipoNorm
    )
  }

  let pool = []

  switch (tipo) {
    // ── Presidente, Oración apertura/cierre, Conclusión ──────
    case 'P':
    case 'ORACION':
    case 'ORACION_C':
    case 'CONCLU': {
      // Ancianos y SM (y Mat M para oraciones; estatus bautizado aislado/ignorado)
      pool = personas.filter(
        p =>
          p.lista === 'Anc/SM' ||
          (tipo.includes('ORACION') && p.lista === 'Mat' && p.sexo === 'M')
      )
      break
    }

    // ── Tesoros de la Biblia / Perlas Escondidas ─────────────
    case 'TB':
    case 'PE': {
      pool = personas.filter(p => p.lista === 'Anc/SM')
      break
    }

    // ── Lectura de la Biblia (LB) ───────────────────────────
    case 'LB': {
      pool = personas.filter(
        p => p.lista === 'Anc/SM' || (p.lista === 'Mat' && p.sexo === 'M')
      )
      break
    }

    // ── SMT — Estudiante y Explique sus creencias (con ayudante) ──
    case 'SMT_EST':
    case 'SMT_EXP': {
      pool = personas.filter(p => p.lista === 'Anc/SM' || p.lista === 'Mat')
      break
    }

    // ── Ayudante SMT — mismo sexo que el principal ───────────
    case 'SMT_AYU_M':
    case 'SMT_EXP_M': {
      pool = personas.filter(
        p => p.lista === 'Anc/SM' || (p.lista === 'Mat' && p.sexo === 'M')
      )
      break
    }
    case 'SMT_AYU_F':
    case 'SMT_EXP_F': {
      pool = personas.filter(p => p.lista === 'Mat' && p.sexo === 'F')
      break
    }

    // ── SMT — Discurso varón ─────────────────────────────────
    case 'SMT_DSC': {
      pool = personas.filter(
        p => p.lista === 'Anc/SM' || (p.lista === 'Mat' && p.sexo === 'M')
      )
      break
    }

    // ── Vida Cristiana (VC) ──────────────────────────────────
    case 'VC': {
      pool = personas.filter(p => p.lista === 'Anc/SM')
      break
    }

    // ── Necesidades de la congregación (NC) y Conductor EBC ──
    case 'NC': {
      const ancianos = personas.filter(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')
      const sm = personas.filter(p => p.lista === 'Anc/SM' && p.estatus !== 'Anciano')
      pool = [...ancianos, ...sm]
      break
    }

    case 'EBC_CON': {
      const ancianos = personas.filter(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')
      const sm = personas.filter(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')
      pool = [...ancianos, ...sm]
      break
    }

    // ── Lector EBC ───────────────────────────────────────────
    case 'LEBC': {
      pool = personas.filter(p => p.sexo === 'M')
      break
    }

    default:
      pool = personas
  }

  const esBuscandoAyudanteF = tipo === 'SMT_EXP_F' || tipo === 'SMT_AYU_F'
  const esBuscandoTitularSMT = tipo === 'SMT_EST' || tipo === 'SMT_EXP'

  // ── Aplicar reglas de rotación y puntuar ──────────────────
  const scored = pool.map(p => {
    let score = 100 // base
    const lista = p.lista
    const sexo = p.sexo

    // 1. Impacto por asignaciones en esta misma semana (considerando Bajo Peso vs Mayor Peso)
    const { penalty: sameWeekPenalty } = evaluarImpactoMismaSemana(p, tipo, yaAsignados)
    score -= sameWeekPenalty

    // 2. Racha de 2 semanas consecutivas previas (intentar 3.ª semana seguida)
    if (fechaSemana && tieneRachaDosSemanasSeguidas(p.clave, hist, fechaSemana)) {
      score -= 45
    }

    // 3. Repetición de la misma asignación por más de 2 meses seguidos (M-1 y M-2)
    if (mesValido && tuvoMismoTipoDosMesesSeguidos(p.clave, tipo, hist, mes)) {
      score -= 45
    } else if (mesValido && tuvoMismoTipoMesAnt(p.clave)) {
      // Desempate suave si solo la tuvo el mes pasado (1 mes), sin disparar alerta
      score -= 15
    }

    // 4. Reglas específicas para Matriculados (Mat)
    if (lista === 'Mat') {
      // REGLA: Matriculados descansan tras participar el mes anterior (salvo OC de peso 0)
      if (participoMesAnt(p.clave)) {
        score -= 40
      }

      // Si ya participó este mismo mes (con carga > 0), penalizar para no sobrecargar a un Mat
      const cargaMat = cargaEsteMes(p.clave)
      if (cargaMat >= 1) {
        score -= 45
      }

      // REGLA: Damas rotan T ↔ A mirando su última participación real en SMT
      if (sexo === 'F' && (esBuscandoTitularSMT || esBuscandoAyudanteF)) {
        const ultRol = obtenerUltimoRolSMTDama(p.clave, hist, mesAnt)
        if (esBuscandoTitularSMT) {
          if (ultRol === 'T') score -= 20 // Fue titular → preferir que ahora sea ayudante
          if (ultRol === 'A') score += 15 // Fue ayudante → bonificar para ser titular
          if (!ultRol) score += 10        // Sin historial previo → bonificación leve
        } else if (esBuscandoAyudanteF) {
          if (ultRol === 'T') score += 15 // Fue titular → bonificar para que rote a ayudante
          if (ultRol === 'A') score -= 20 // Fue ayudante → preferir que ahora sea titular
          if (!ultRol) score += 10
        }
      }
    }

    // 5. Reglas específicas para Ancianos y Siervos Ministeriales (Anc/SM)
    if (lista === 'Anc/SM') {
      const carga = cargaEsteMes(p.clave)
      if (carga >= 3) score -= 60
      else if (carga >= 2) score -= 25
      else if (carga >= 1) score -= 10
      else if (carga > 0) score -= 5

      // REGLA SM: al menos 1 vez al mes (bonificar a los que aún no tienen carga en el mes)
      if (p.estatus === 'Siervo Ministerial' && carga === 0) {
        score += 25
      }
    }

    return { ...p, _score: score }
  })

  // Ordenar de mayor a menor score (mejor candidato primero)
  return scored.sort((a, b) => b._score - a._score)
}

/**
 * Sugiere candidatos para el rol de ayudante SMT.
 * Excluye al titular (claveEstudiante) del primer lugar vía yaAsignados.
 */
export function sugerirAyudante(
  claveEstudiante,
  personas,
  historial,
  mes,
  yaAsignados = [],
  opciones = {}
) {
  if (!Array.isArray(personas) || personas.length === 0) return []
  if (opciones?.cancelaEntreSemana) return []
  if (opciones?.semana && opciones?.eventos) {
    const impacto = getImpactoEventoSemana(
      opciones.semana,
      opciones.eventos,
      opciones.diaReunionEntreSemana,
      opciones.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) return []
  }
  const titular = personas.find(p => p.clave === claveEstudiante)
  const tipoAyu = titular?.sexo === 'M' ? 'SMT_EXP_M' : 'SMT_EXP_F'
  const tieneObjetos = yaAsignados.some(item => typeof item === 'object' && item !== null)
  const yaIncluyeTitular = yaAsignados.some(
    item => (typeof item === 'string' ? item : item?.clave) === claveEstudiante
  )

  let listaYaAsignados
  if (yaIncluyeTitular) {
    listaYaAsignados = yaAsignados.map(item => {
      if (typeof item === 'object' && item !== null && item.clave === claveEstudiante) {
        return { ...item, esTitularMismaParte: true }
      }
      return item
    })
  } else {
    const entradaTitular = tieneObjetos
      ? { clave: claveEstudiante, tipo: 'SMT_EST', esTitularMismaParte: true }
      : claveEstudiante
    listaYaAsignados = [entradaTitular, ...yaAsignados]
  }

  return sugerirCandidatos(
    tipoAyu,
    personas,
    historial,
    mes,
    listaYaAsignados,
    opciones
  )
}