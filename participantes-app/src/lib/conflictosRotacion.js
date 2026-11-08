import {
  mesAnterior,
  normalizarTipo,
  getCargaMensualTipo,
  tieneRachaDosSemanasSeguidas,
  tuvoMismoTipoDosMesesSeguidos,
  obtenerUltimoRolSMTDama,
  evaluarImpactoMismaSemana,
} from './asignacionesSugeridas'
import { getImpactoEventoSemana } from './fechas'

export const SECCION_LABEL = {
  APERTURA: 'Apertura',
  TB: 'Tesoros de la Biblia',
  SMT: 'Seamos Mejores Maestros',
  VC: 'Nuestra Vida Cristiana',
  CIERRE: 'Cierre',
}

export const TIPO_LABEL = {
  P: 'Presidente',
  ORACION: 'Oración apertura',
  ORACION_C: 'Oración cierre',
  OC: 'Oración cierre',
  CONCLU: 'Palabras de conclusión',
  TB: 'Tesoros de la Biblia',
  PE: 'Perlas escondidas',
  LB: 'Lectura de la Biblia',
  SMT_EST: 'Estudiante',
  SMT_EXP: 'Explique sus creencias',
  SMT_EXP_M: 'Ayudante',
  SMT_EXP_F: 'Ayudante',
  SMT_AYU_M: 'Ayudante',
  SMT_AYU_F: 'Ayudante',
  SMT_DSC: 'Discurso',
  DSC: 'Discurso',
  SMT_AYU: 'Ayudante',
  A: 'Ayudante',
  T: 'Estudiante',
  VC: 'Vida Cristiana',
  NC: 'Nec. de la congregación',
  EBC_CON: 'Conductor EBC',
  EBC: 'Conductor EBC',
  LEBC: 'Lector EBC',
  SMT_VACIO: '—',
}

export const TIPO_COLOR = {
  P: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  ORACION: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  ORACION_C: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  CONCLU: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60',
  TB: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  PE: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  LB: 'bg-cyan-50 text-cyan-800 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
  SMT_EST: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  SMT_EXP: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  SMT_DSC: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  SMT_AYU: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  VC: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  NC: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  EBC_CON: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  LEBC: 'bg-pink-50 text-pink-800 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/40',
  SMT_VACIO: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60',
}

export const PESO_TIPO = {
  T: 2,
  SMT_EST: 2,
  SMT_EXP: 2,
  A: 1,
  SMT_AYU: 1,
  SMT_EXP_M: 1,
  SMT_EXP_F: 1,
  LB: 1,
  DSC: 1,
  SMT_DSC: 1,
  TB: 1,
  PE: 1,
  VC: 1,
  NC: 1,
  EBC: 1,
  EBC_CON: 1,
  LEBC: 1,
  P: 1,
  ORACION: 0,
  ORACION_C: 0,
  OC: 0,
}

export const TIPO_PARTICIPACION = {
  P: 'P',
  ORACION: 'P',
  ORACION_C: 'OC',
  CONCLU: 'P',
  TB: 'TB',
  PE: 'PE',
  LB: 'LB',
  SMT_EST: 'T',
  SMT_EXP: 'T',
  SMT_DSC: 'DSC',
  SMT_AYU: 'A',
  VC: 'VC',
  NC: 'NC',
  EBC_CON: 'EBC',
  LEBC: 'LEBC',
}

export function formatearIssueLegible(issue) {
  if (!issue || typeof issue !== 'string' || issue.length !== 6) return issue || ''
  const anio = issue.slice(0, 4)
  const mesNum = parseInt(issue.slice(4, 6), 10)
  const bimestres = {
    1: 'Enero - Febrero',
    2: 'Enero - Febrero',
    3: 'Marzo - Abril',
    4: 'Marzo - Abril',
    5: 'Mayo - Junio',
    6: 'Mayo - Junio',
    7: 'Julio - Agosto',
    8: 'Julio - Agosto',
    9: 'Septiembre - Octubre',
    10: 'Septiembre - Octubre',
    11: 'Noviembre - Diciembre',
    12: 'Noviembre - Diciembre',
  }
  return `${bimestres[mesNum] || `Bimestre ${mesNum}`} ${anio}`
}

export function buildHistorialParaSemana(semanaActualId, semanas, partes, asignaciones, historialBase) {
  const base = Array.isArray(historialBase) ? historialBase : []
  if (!Array.isArray(asignaciones) || !Array.isArray(partes) || !Array.isArray(semanas)) {
    return base
  }

  const virtuales = []
  for (const a of asignaciones) {
    if (!a.clave) continue
    const parte = partes.find(p => p.id === a.parte_id)
    if (!parte || parte.semana_id === semanaActualId) continue
    if (
      parte.tipo_asignacion === 'ORACION' ||
      parte.tipo_asignacion === 'CONCLU' ||
      parte.tipo_asignacion === 'SMT_VACIO'
    ) {
      continue
    }

    if (a.confirmado && a.participacion_id && base.some(h => h.id === a.participacion_id)) {
      continue
    }

    const semOtra = semanas.find(s => s.id === parte.semana_id)
    if (!semOtra) continue

    const tipoPart =
      a.rol === 'ayudante' ? 'A' : (TIPO_PARTICIPACION[parte.tipo_asignacion] || parte.tipo_asignacion)

    virtuales.push({
      id: `prog-${a.id || `${a.parte_id}-${a.rol}`}`,
      clave: a.clave,
      fecha: semOtra.fecha_inicio,
      mes: semOtra.mes,
      tipo: tipoPart,
      peso: PESO_TIPO[tipoPart] ?? 1,
      _virtual: true,
    })
  }

  return virtuales.length > 0 ? [...base, ...virtuales] : base
}

export function evaluarConflictosPersona(
  persona,
  tipo,
  historial,
  mes,
  fechaSemana,
  yaAsignados = []
) {
  if (!persona || !persona.clave) return []
  const clave = persona.clave
  const hist = Array.isArray(historial) ? historial : []
  const conflictos = []

  // 1. Evaluar asignaciones en la misma semana
  const impactoSem = evaluarImpactoMismaSemana(persona, tipo, yaAsignados)
  if (impactoSem.conflicto) {
    conflictos.push(impactoSem.conflicto)
  }

  // 2. Participó 2 semanas seguidas
  if (fechaSemana && tieneRachaDosSemanasSeguidas(clave, hist, fechaSemana)) {
    conflictos.push({
      tipo: 'rotacion_semanas_seguidas',
      severity: 'warning',
      mensaje: 'Participó 2 semanas seguidas',
    })
  }

  // 3. Tuvo la misma asignación por más de 2 meses seguidos (M-1 y M-2)
  if (mes && tuvoMismoTipoDosMesesSeguidos(clave, tipo, hist, mes)) {
    const nombreTipo = TIPO_LABEL[tipo] || tipo
    conflictos.push({
      tipo: 'mismo_tipo_meses_seguidos',
      severity: 'warning',
      mensaje: `Tuvo ${nombreTipo} por más de 2 meses seguidos`,
    })
  }

  // 4. Reglas específicas de Matriculados
  if (persona.lista === 'Mat') {
    const mesAnt = mes ? mesAnterior(mes) : null
    if (mesAnt) {
      const participoMesAnt = hist.some(
        h => h.clave === clave && h.mes === mesAnt && normalizarTipo(h.tipo) !== 'OC'
      )
      if (participoMesAnt) {
        conflictos.push({
          tipo: 'mat_mes_anterior',
          severity: 'warning',
          mensaje: `Participó en ${mesAnt.toLowerCase()} (descanso mensual de matriculados)`,
        })
      }
    }

    if (mes) {
      const cargaMat = hist
        .filter(h => h.clave === clave && h.mes === mes)
        .reduce((acc, h) => acc + getCargaMensualTipo(h.tipo), 0)
      if (cargaMat >= 1) {
        conflictos.push({
          tipo: 'mat_mismo_mes',
          severity: 'warning',
          mensaje: `Ya tiene una asignación en ${mes.toLowerCase()}`,
        })
      }
    }

    // Alternancia histórica T ↔ A en Damas
    if (persona.sexo === 'F') {
      const esBuscandoAyudanteF =
        tipo === 'SMT_EXP_F' || tipo === 'SMT_AYU_F' || tipo === 'SMT_AYU' || tipo === 'A'
      const esBuscandoTitularSMT = tipo === 'SMT_EST' || tipo === 'SMT_EXP' || tipo === 'T'
      if (esBuscandoTitularSMT || esBuscandoAyudanteF) {
        const ultRol = obtenerUltimoRolSMTDama(clave, hist, mes ? mesAnterior(mes) : null)
        if (
          (esBuscandoTitularSMT && ultRol === 'T') ||
          (esBuscandoAyudanteF && ultRol === 'A')
        ) {
          conflictos.push({
            tipo: 'dama_repite_rol',
            severity: 'info',
            mensaje: `Su última asignación también fue como ${ultRol === 'T' ? 'Titular' : 'Ayudante'}`,
          })
        }
      }
    }
  }

  // 5. Límite mensual para Ancianos y Siervos Ministeriales
  if (persona.lista === 'Anc/SM' && mes) {
    const regsMes = hist.filter(
      h => h.clave === clave && h.mes === mes && normalizarTipo(h.tipo) !== 'OC'
    )
    const cargaMes = regsMes.reduce((acc, h) => acc + getCargaMensualTipo(h.tipo), 0)
    if (cargaMes >= 3) {
      conflictos.push({
        tipo: 'limite_mensual',
        severity: 'warning',
        mensaje: `Ya tiene ${regsMes.length} asignaciones este mes`,
      })
    }
  }

  // 6. Red de seguridad (Fallback de diagnóstico)
  const tieneAdvertencia = conflictos.some(c => c.severity === 'warning')
  if (typeof persona._score === 'number' && persona._score < 50 && !tieneAdvertencia) {
    conflictos.push({
      tipo: 'error_inesperado_score',
      severity: 'warning',
      mensaje: `Alerta inesperada en cálculo de puntaje (Score: ${persona._score}) — posible anomalía en historial`,
    })
  }

  return conflictos
}

export function getEventoParaSemana(s, eventos) {
  if (!s || !eventos?.length) return null
  const fechaInicio = String(s.fecha_inicio || '').slice(0, 10)
  const fechaFin = String(s.fecha_fin || '').slice(0, 10)
  return (
    eventos.find(e => {
      if (e.semana_id && e.semana_id === s.id) return true
      if (e.fecha_original && fechaInicio && fechaFin && e.fecha_original >= fechaInicio && e.fecha_original <= fechaFin) return true
      if (e.fecha_efectiva && fechaInicio && fechaFin && e.fecha_efectiva >= fechaInicio && e.fecha_efectiva <= fechaFin) return true
      return false
    }) || null
  )
}

export function calcularEstadoSemana(semanaOrId, todasPartes, todasAsignaciones, todoHistorial, eventos, config) {
  const semanaId = typeof semanaOrId === 'object' ? semanaOrId?.id : semanaOrId
  const semanaObj = typeof semanaOrId === 'object' ? semanaOrId : null

  if (semanaObj && eventos?.length) {
    const impacto = getImpactoEventoSemana(
      semanaObj,
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) {
      return { totalPartes: 0, confirmadas: 0, esCompleta: true }
    }
  }

  const partesSemana = todasPartes.filter(p => p.semana_id === semanaId)
  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']
  const partesContables = partesSemana.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
  const totalPartes = partesContables.length
  if (totalPartes === 0) return { totalPartes: 0, confirmadas: 0, esCompleta: false }

  const confirmadas = partesContables.filter(p => {
    const asigParte = todasAsignaciones.filter(a => a.parte_id === p.id && a.confirmado)
    const asigP = todasAsignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    const asigA = todasAsignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')

    const pr = asigP?.participacion_id ? todoHistorial.find(h => h.id === asigP.participacion_id) : null
    const ar = asigA?.participacion_id ? todoHistorial.find(h => h.id === asigA.participacion_id) : null
    const pCambio = !!asigP?.participacion_id && pr && pr.clave !== asigP?.clave
    const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
    const aNuevo =
      p.requiere_ayudante && asigA?.clave && asigP?.participacion_id && !asigA?.participacion_id
    const aRem = p.requiere_ayudante && !asigA?.clave && ar
    const necesitaRec = pCambio || aCambio || aNuevo || aRem

    return asigParte.some(a => a.rol === 'principal') && !necesitaRec
  }).length

  return {
    totalPartes,
    confirmadas,
    esCompleta: confirmadas === totalPartes,
  }
}
