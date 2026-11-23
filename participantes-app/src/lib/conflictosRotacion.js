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

export const TIPO_BADGE_LABEL = {
  P: 'Presidente',
  ORACION: 'Oración',
  ORACION_C: 'Oración final',
  OC: 'Oración final',
  CONCLU: 'Conclusión',
  TB: 'Tesoros',
  PE: 'Perlas',
  LB: 'Lectura',
  SMT_EST: 'Estudiante',
  SMT_EXP: 'Creencias',
  SMT_DSC: 'Discurso',
  DSC: 'Discurso',
  SMT_AYU: 'Ayudante',
  A: 'Ayudante',
  T: 'Estudiante',
  VC: 'Vida Cristiana',
  NC: 'Necesidades',
  EBC_CON: 'Conductor EBC',
  EBC: 'Conductor EBC',
  LEBC: 'Lector EBC',
  SMT_VACIO: 'SMT',
}

export const ESTADOS_REVISION = {
  BORRADOR: 'borrador',
  EN_REVISION: 'en_revision',
  VERIFICADA: 'verificada',
}

export const ESTADO_REVISION_META = {
  borrador: {
    id: 'borrador',
    label: 'Borrador',
    shortLabel: 'Borrador',
    badgeVariant: 'neutral',
    description: 'Semana en armado o pendiente de revisión formal',
  },
  en_revision: {
    id: 'en_revision',
    label: 'En revisión',
    shortLabel: 'En revisión',
    badgeVariant: 'info',
    description: 'Marcada para verificar cambios o disponibilidad antes de emitir el S-140',
  },
  verificada: {
    id: 'verificada',
    label: 'Verificada',
    shortLabel: 'Verificada',
    badgeVariant: 'success',
    description: 'Revisada y aprobada, lista para publicar/imprimir el S-140',
  },
}

export function normalizarEstadoRevision(valor) {
  if (valor === 'en_revision' || valor === 'verificada' || valor === 'borrador') {
    return valor
  }
  return 'borrador'
}

export function evaluarReconfirmacionParte(parte, asigP, asigA, historial = []) {
  const hist = Array.isArray(historial) ? historial : []
  const pr = asigP?.participacion_id ? hist.find(h => h.id === asigP.participacion_id) : null
  const ar = asigA?.participacion_id ? hist.find(h => h.id === asigA.participacion_id) : null

  const principalCambiado = !!asigP?.participacion_id && !!pr && pr.clave !== asigP?.clave
  const ayudanteCambiado = !!asigA?.participacion_id && !!ar && ar.clave !== asigA?.clave
  const ayudanteNuevo =
    Boolean(parte?.requiere_ayudante) &&
    Boolean(asigA?.clave) &&
    Boolean(asigP?.participacion_id) &&
    !asigA?.participacion_id
  const ayudanteRemovido =
    Boolean(parte?.requiere_ayudante) && !asigA?.clave && Boolean(ar)

  return {
    principalCambiado,
    ayudanteCambiado,
    ayudanteNuevo,
    ayudanteRemovido,
    necesitaReconfirmar:
      principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido,
  }
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

export function calcularEstadoSemana(
  semanaOrId,
  todasPartes,
  todasAsignaciones,
  todoHistorial,
  eventos,
  config,
  personas = null
) {
  const semanaId = typeof semanaOrId === 'object' ? semanaOrId?.id : semanaOrId
  const semanaObj = typeof semanaOrId === 'object' ? semanaOrId : null
  const estadoRevision = normalizarEstadoRevision(semanaObj?.estado_revision)

  const impacto =
    semanaObj && Array.isArray(eventos) && eventos.length > 0
      ? getImpactoEventoSemana(
          semanaObj,
          eventos,
          config?.diaReunionEntreSemana,
          config?.diaReunionFinSemana
        )
      : null

  if (impacto?.cancelaEntreSemana) {
    return {
      totalPartes: 0,
      asignadas: 0,
      confirmadas: 0,
      sinAsignar: 0,
      porConfirmar: 0,
      hayReconfirmaciones: false,
      reconfirmacionesCount: 0,
      faltanAyudantes: 0,
      alertasCount: 0,
      pct: 100,
      esCompleta: true,
      esCancelada: true,
      esVisita: false,
      estadoRevision,
    }
  }

  const esVisita = Boolean(impacto?.esVisita)
  const oracionVisitanteActiva = esVisita && impacto?.oracionVisitante !== false

  const partesSemana = (todasPartes || []).filter(p => p.semana_id === semanaId)
  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU', ...(esVisita ? ['LEBC'] : [])]
  const partesContables = partesSemana.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
  const totalPartes = partesContables.length

  if (totalPartes === 0) {
    return {
      totalPartes: 0,
      asignadas: 0,
      confirmadas: 0,
      sinAsignar: 0,
      porConfirmar: 0,
      hayReconfirmaciones: false,
      reconfirmacionesCount: 0,
      faltanAyudantes: 0,
      alertasCount: 0,
      pct: 0,
      esCompleta: false,
      esCancelada: false,
      esVisita,
      estadoRevision,
    }
  }

  const asigSemana = (todasAsignaciones || []).filter(a =>
    partesSemana.some(p => p.id === a.parte_id)
  )

  const semanaAsignados = asigSemana
    .filter(a => a.clave)
    .map(a => {
      const parteObj = partesSemana.find(p => p.id === a.parte_id)
      return {
        id: a.id,
        parte_id: a.parte_id,
        rol: a.rol,
        clave: a.clave,
        tipo: a.rol === 'ayudante' ? 'SMT_AYU' : (parteObj?.tipo_asignacion || ''),
      }
    })

  let asignadas = 0
  let confirmadas = 0
  let reconfirmacionesCount = 0
  let faltanAyudantes = 0
  let alertasCount = 0

  for (const p of partesContables) {
    if (esVisita && p.tipo_asignacion === 'EBC_CON') {
      asignadas++
      confirmadas++
      continue
    }

    const asigP = asigSemana.find(a => a.parte_id === p.id && a.rol === 'principal')
    const asigA = asigSemana.find(a => a.parte_id === p.id && a.rol === 'ayudante')

    if (oracionVisitanteActiva && p.tipo_asignacion === 'ORACION_C' && !asigP?.clave) {
      asignadas++
      confirmadas++
      continue
    }

    if (asigP?.clave) {
      asignadas++
    }

    if (p.requiere_ayudante && asigP?.clave && !asigA?.clave) {
      faltanAyudantes++
    }

    const { necesitaReconfirmar } = evaluarReconfirmacionParte(p, asigP, asigA, todoHistorial)
    if (asigP?.clave && necesitaReconfirmar) {
      reconfirmacionesCount++
    }

    if (asigP?.confirmado && !necesitaReconfirmar) {
      confirmadas++
    }

    // Contar alertas de rotación si se suministra catálogo de personas
    if (Array.isArray(personas) && personas.length > 0) {
      if (asigP?.clave) {
        const personaP = personas.find(per => per.clave === asigP.clave)
        if (personaP) {
          const yaParaP = semanaAsignados
            .filter(a => !(a.parte_id === p.id && a.rol === 'principal'))
            .map(a =>
              a.parte_id === p.id && a.rol === 'ayudante'
                ? { ...a, esTitularMismaParte: true }
                : a
            )
          const confsP = evaluarConflictosPersona(
            personaP,
            p.tipo_asignacion,
            todoHistorial,
            semanaObj?.mes,
            semanaObj?.fecha_inicio,
            yaParaP
          )
          if (confsP.some(c => c.severity === 'warning')) {
            alertasCount++
          }
        }
      }
      if (p.requiere_ayudante && asigA?.clave) {
        const personaA = personas.find(per => per.clave === asigA.clave)
        if (personaA) {
          const yaParaA = semanaAsignados
            .filter(a => !(a.parte_id === p.id && a.rol === 'ayudante'))
            .map(a =>
              a.parte_id === p.id && a.rol === 'principal'
                ? { ...a, esTitularMismaParte: true }
                : a
            )
          const confsA = evaluarConflictosPersona(
            personaA,
            'SMT_AYU',
            todoHistorial,
            semanaObj?.mes,
            semanaObj?.fecha_inicio,
            yaParaA
          )
          if (confsA.some(c => c.severity === 'warning')) {
            alertasCount++
          }
        }
      }
    }
  }

  const sinAsignar = Math.max(0, totalPartes - asignadas)
  const porConfirmar = Math.max(0, totalPartes - confirmadas)
  const pct = Math.round((confirmadas / totalPartes) * 100)

  return {
    totalPartes,
    asignadas,
    confirmadas,
    sinAsignar,
    porConfirmar,
    hayReconfirmaciones: reconfirmacionesCount > 0,
    reconfirmacionesCount,
    faltanAyudantes,
    alertasCount,
    pct,
    esCompleta: confirmadas === totalPartes,
    esCancelada: false,
    esVisita,
    estadoRevision,
  }
}
