// ============================================================
// asignacionSugerida.js
// Motor de sugerencias de asignación basado en reglas de rotación
// ============================================================

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// Devuelve el mes anterior como string
function mesAnterior(mes) {
  const idx = MESES.indexOf(mes)
  if (idx <= 0) return MESES[11]
  return MESES[idx - 1]
}

// ──────────────────────────────────────────────────────────────
// Reglas por tipo de asignación
// ──────────────────────────────────────────────────────────────

/**
 * Candidatos para una parte dada, ordenados por preferencia.
 * @param {string}   tipo         - tipo_asignacion de la parte
 * @param {Array}    personas     - catálogo completo de personas activas
 * @param {Array}    historial    - participaciones previas de Supabase
 * @param {string}   mes          - mes actual ('Julio', 'Agosto'...)
 * @param {Array}    yaAsignados  - claves ya asignadas en esta semana
 * @returns {Array}  personas ordenadas por prioridad (mejor candidato primero)
 */
export function sugerirCandidatos(tipo, personas, historial, mes, yaAsignados = []) {
  const mesAnt = mesAnterior(mes)

  // Helper: ¿participó en el mes anterior?
  const participoMesAnt = (clave) =>
    historial.some(h => h.clave === clave && h.mes === mesAnt)

  // Helper: ¿cuántas veces participó este mes ya?
  const vecesEsteMes = (clave) =>
    historial.filter(h => h.clave === clave && h.mes === mes).length

  // Helper: último tipo que tuvo en el mes anterior
  const ultimoTipoMesAnt = (clave) => {
    const regs = historial.filter(h => h.clave === clave && h.mes === mesAnt)
    return regs.length ? regs[regs.length - 1].tipo : null
  }

  // Helper: penalización si ya está asignado esta semana
  const yaEstaEnSemana = (clave) => yaAsignados.includes(clave)

  let pool = []

  switch (tipo) {

    // ── Presidente, Oración, Intro, Conclusión ──────────────
    case 'P':
    case 'ORACION':
    case 'ORACION_C':
    case 'INTRO':
    case 'CONCLU': {
      // Ancianos y SM (y ocasionalmente Mat M para oraciones)
      pool = personas.filter(p =>
        p.lista === 'Anc/SM' ||
        (tipo.includes('ORACION') && p.lista === 'Mat' && p.sexo === 'M')
      )
      break
    }

    // ── Tesoros de la Biblia (TB) ───────────────────────────
    case 'TB': {
      pool = personas.filter(p => p.lista === 'Anc/SM')
      break
    }

    // ── Perlas Escondidas (PE) ──────────────────────────────
    case 'PE': {
      pool = personas.filter(p => p.lista === 'Anc/SM')
      break
    }

    // ── Lectura de la Biblia (LB) ───────────────────────────
    case 'LB': {
      // Varones matriculados (bautizados o no)
      pool = personas.filter(p => p.lista === 'Mat' && p.sexo === 'M')
      break
    }

    // ── SMT — Estudiante dama (con ayudante) ─────────────────
    case 'SMT_EST': {
      pool = personas.filter(p => p.lista === 'Mat' && p.sexo === 'F')
      break
    }

    // ── SMT — Discurso varón ─────────────────────────────────
    case 'SMT_DSC': {
      pool = personas.filter(p => p.lista === 'Mat' && p.sexo === 'M')
      break
    }

    // ── Vida Cristiana (VC) ──────────────────────────────────
    case 'VC': {
      pool = personas.filter(p => p.lista === 'Anc/SM')
      break
    }

    // ── Necesidades de la congregación (NC) ──────────────────
    case 'NC': {
      pool = personas.filter(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')
      break
    }

    // ── Conductor EBC ────────────────────────────────────────
    case 'EBC_CON': {
      // Ancianos preferente, SM si no hay anciano disponible
      const ancianos = personas.filter(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')
      const sm       = personas.filter(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')
      pool = [...ancianos, ...sm]
      break
    }

    // ── Lector EBC ───────────────────────────────────────────
    case 'EBC_LEC': {
      // Varones matriculados bautizados
      pool = personas.filter(p =>
        p.lista === 'Mat' && p.sexo === 'M' &&
        (p.estatus === 'Matriculado bautizado')
      )
      break
    }

    default:
      pool = personas
  }

  // ── Aplicar reglas de rotación y puntuar ──────────────────
  const scored = pool.map(p => {
    let score = 100 // base
    const lista = p.lista
    const sexo  = p.sexo

    // Penalizar si ya está asignado esta semana
    if (yaEstaEnSemana(p.clave)) score -= 50

    if (lista === 'Mat') {
      // REGLA: Matriculados no pueden participar 2 meses seguidos
      if (participoMesAnt(p.clave)) score -= 80

      // REGLA: Damas rotan T → A → T → A
      if (sexo === 'F') {
        const ultTipo = ultimoTipoMesAnt(p.clave)
        if (tipo === 'SMT_EST') {
          // Sugerir la que no participó recientemente
          if (!participoMesAnt(p.clave)) score += 20
        }
      }
    }

    if (lista === 'Anc/SM') {
      // REGLA: Ancianos máx 3 asignaciones por mes
      const veces = vecesEsteMes(p.clave)
      if (veces >= 3) score -= 90
      else if (veces === 2) score -= 30
      else if (veces === 1) score -= 10

      // REGLA: No repetir misma asignación 2 meses seguidos
      if (ultimoTipoMesAnt(p.clave) === tipo) score -= 40

      // REGLA SM: al menos 1 vez al mes (bonificar a los que no han participado)
      if (p.estatus === 'Siervo Ministerial' && vecesEsteMes(p.clave) === 0) score += 25
    }

    // Aleatorizar un poco para evitar siempre el mismo orden cuando el score empata
    score += Math.random() * 5

    return { ...p, _score: score }
  })

  // Ordenar de mayor a menor score (mejor candidato primero)
  return scored.sort((a, b) => b._score - a._score)
}

/**
 * Para damas SMT: sugiere también la ayudante
 * La ayudante es una dama diferente a la estudiante
 */
export function sugerirAyudante(claveEstudiante, personas, historial, mes, yaAsignados = []) {
  return sugerirCandidatos(
    'SMT_EST',
    personas,
    historial,
    mes,
    [...yaAsignados, claveEstudiante]
  )
}