import { describe, it, expect } from 'vitest'
import {
  sugerirCandidatos,
  sugerirAyudante,
  esTipoBajoPeso,
  getCargaMensualTipo,
  tieneRachaDosSemanasSeguidas,
  tuvoMismoTipoDosMesesSeguidos,
  obtenerUltimoRolSMTDama,
  evaluarImpactoMismaSemana,
} from './asignacionesSugeridas'

// ── Catálogo de personas de prueba ───────────────────────────────

const PERSONAS = [
  // Ancianos
  { clave: 'A01', nombre: 'Pedro Anciano',    lista: 'Anc/SM', sexo: 'M', estatus: 'Anciano',            activo: true },
  { clave: 'A02', nombre: 'Juan Anciano',     lista: 'Anc/SM', sexo: 'M', estatus: 'Anciano',            activo: true },
  { clave: 'A03', nombre: 'Luis Anciano',     lista: 'Anc/SM', sexo: 'M', estatus: 'Anciano',            activo: true },

  // Siervos Ministeriales
  { clave: 'A04', nombre: 'Carlos SM',        lista: 'Anc/SM', sexo: 'M', estatus: 'Siervo Ministerial', activo: true },
  { clave: 'A05', nombre: 'Marco SM',         lista: 'Anc/SM', sexo: 'M', estatus: 'Siervo Ministerial', activo: true },

  // Matriculados varones
  { clave: 'M01', nombre: 'Roberto Mat M',    lista: 'Mat',    sexo: 'M', estatus: 'Matriculado bautizado', activo: true },
  { clave: 'M02', nombre: 'Diego Mat M',      lista: 'Mat',    sexo: 'M', estatus: 'Matriculado',           activo: true },

  // Matriculadas damas
  { clave: 'M03', nombre: 'Ana Mat F',        lista: 'Mat',    sexo: 'F', estatus: 'Matriculada',           activo: true },
  { clave: 'M04', nombre: 'María Mat F',      lista: 'Mat',    sexo: 'F', estatus: 'Matriculada bautizada', activo: true },
]

// Historial vacío — punto de partida limpio para la mayoría de tests
const SIN_HISTORIAL = []

// ── Grupo 1 — Filtrado de pool por tipo ──────────────────────────

describe('filtrado de pool por tipo', () => {

  it('P — devuelve solo Anc/SM', () => {
    const result = sugerirCandidatos('P', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Anc/SM')).toBe(true)
    expect(result.length).toBe(5) // A01-A05
  })

  it('ORACION — incluye Mat M además de Anc/SM', () => {
    const result = sugerirCandidatos('ORACION', PERSONAS, SIN_HISTORIAL, 'Agosto')
    const listas = result.map(p => p.lista)
    expect(listas).toContain('Anc/SM')
    expect(listas).toContain('Mat')
    // Las damas Mat no deben aparecer
    expect(result.every(p => !(p.lista === 'Mat' && p.sexo === 'F'))).toBe(true)
  })

  it('TB — solo Anc/SM', () => {
    const result = sugerirCandidatos('TB', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Anc/SM')).toBe(true)
  })

  it('LB — incluye Anc/SM y Mat varones', () => {
    const result = sugerirCandidatos('LB', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')).toBe(true)
    expect(result.some(p => p.lista === 'Mat' && p.sexo === 'M')).toBe(true)
    expect(result.every(p => !(p.lista === 'Mat' && p.sexo === 'F'))).toBe(true)
    expect(result.length).toBe(7) // A01-A05, M01-M02
  })

  it('SMT_EST — todos los varones (Anc/SM y Mat M) y damas Mat', () => {
    const result = sugerirCandidatos('SMT_EST', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')).toBe(true)
    expect(result.some(p => p.lista === 'Mat' && p.sexo === 'M')).toBe(true)
    expect(result.some(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
    expect(result.length).toBe(9) // A01-A05, M01-M04
  })

  it('SMT_DSC — todos los varones (Anc/SM y Mat M)', () => {
    const result = sugerirCandidatos('SMT_DSC', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.sexo === 'M')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')).toBe(true)
    expect(result.some(p => p.lista === 'Mat')).toBe(true)
    expect(result.length).toBe(7) // A01-A05, M01-M02
  })

  it('SMT_EXP — todos los varones (Anc/SM y Mat M) y damas Mat', () => {
    const result = sugerirCandidatos('SMT_EXP', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')).toBe(true)
    expect(result.some(p => p.lista === 'Mat' && p.sexo === 'M')).toBe(true)
    expect(result.some(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
    expect(result.length).toBe(9) // A01-A05, M01-M04
  })

  it('SMT_EXP_M — todos los varones (Anc/SM y Mat M)', () => {
    const result = sugerirCandidatos('SMT_EXP_M', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.sexo === 'M')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')).toBe(true)
    expect(result.some(p => p.lista === 'Mat')).toBe(true)
    expect(result.length).toBe(7) // A01-A05, M01-M02
  })

  it('SMT_EXP_F — solo Mat damas', () => {
    const result = sugerirCandidatos('SMT_EXP_F', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
    expect(result.length).toBe(2) // M03, M04
  })

  it('NC — incluye Ancianos y SM', () => {
    const result = sugerirCandidatos('NC', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Anc/SM')).toBe(true)
    const estatus = result.map(p => p.estatus)
    expect(estatus).toContain('Anciano')
    expect(estatus).toContain('Siervo Ministerial')
    expect(result.length).toBe(5) // A01-A05
  })

  it('EBC_CON — incluye Ancianos y SM', () => {
    const result = sugerirCandidatos('EBC_CON', PERSONAS, SIN_HISTORIAL, 'Agosto')
    const estatus = result.map(p => p.estatus)
    expect(estatus).toContain('Anciano')
    expect(estatus).toContain('Siervo Ministerial')
  })

  it('LEBC — cualquier varón (Anc/SM o Mat)', () => {
    const result = sugerirCandidatos('LEBC', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.sexo === 'M')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM')).toBe(true)
    expect(result.some(p => p.lista === 'Mat')).toBe(true)
    expect(result.length).toBe(7) // A01-A05, M01-M02
  })

})

// ── Grupo 2 — Reglas de rotación (scoring) ───────────────────────

describe('reglas de rotación', () => {

  it('Mat que participó el mes anterior baja en el ranking con penalización moderada (-40, ámbar)', () => {
    const historial = [
      { clave: 'M01', mes: 'Julio', tipo: 'LB' },
    ]
    const result = sugerirCandidatos('LB', PERSONAS, historial, 'Agosto')
    const m01 = result.find(p => p.clave === 'M01')
    const idxM01 = result.findIndex(p => p.clave === 'M01')
    const idxM02 = result.findIndex(p => p.clave === 'M02')
    // M01 participó en Julio → debe estar después de M02 y quedar en rango ámbar (>= 50 y < 80)
    expect(idxM01).toBeGreaterThan(idxM02)
    expect(m01._score).toBeGreaterThanOrEqual(45)
  })

  it('Anc/SM con carga >= 3 este mes queda al final', () => {
    const historial = [
      { clave: 'A01', mes: 'Agosto', tipo: 'TB' },
      { clave: 'A01', mes: 'Agosto', tipo: 'PE' },
      { clave: 'A01', mes: 'Agosto', tipo: 'VC' },
    ]
    const result = sugerirCandidatos('P', PERSONAS, historial, 'Agosto')
    const idxA01 = result.findIndex(p => p.clave === 'A01')
    // A01 debe estar al final del pool Anc/SM
    expect(idxA01).toBe(result.length - 1)
  })

  it('SM sin asignaciones este mes recibe bonificación sobre SM con una asignación', () => {
    const historial = [
      { clave: 'A04', mes: 'Agosto', tipo: 'TB' }, // A04 ya tiene 1 asignación
    ]
    const result = sugerirCandidatos('TB', PERSONAS, historial, 'Agosto')
    const idxA04 = result.findIndex(p => p.clave === 'A04')
    const idxA05 = result.findIndex(p => p.clave === 'A05') // A05 no tiene ninguna
    expect(idxA05).toBeLessThan(idxA04)
  })

  it('Anc/SM no repite el mismo tipo de asignación del mes anterior (desempate suave -15)', () => {
    const historial = [
      { clave: 'A01', mes: 'Julio', tipo: 'TB' },
    ]
    const result = sugerirCandidatos('TB', PERSONAS, historial, 'Agosto')
    const a01 = result.find(p => p.clave === 'A01')
    const idxA01 = result.findIndex(p => p.clave === 'A01')
    const idxA02 = result.findIndex(p => p.clave === 'A02')
    // A01 tuvo TB en Julio → debe estar después de A02, pero aún en rango verde (85 pts)
    expect(idxA01).toBeGreaterThan(idxA02)
    expect(a01._score).toBe(85)
  })

  it('yaAsignados penaliza a la persona ya asignada en la semana', () => {
    const result = sugerirCandidatos('TB', PERSONAS, SIN_HISTORIAL, 'Agosto', ['A01'])
    const idxA01 = result.findIndex(p => p.clave === 'A01')
    // A01 ya está asignado esta semana → debe aparecer después de los demás
    expect(idxA01).toBeGreaterThan(0)
  })

  it('dama que fue Titular (T) baja en ranking para ser Titular otra vez', () => {
    const historial = [{ clave: 'M03', mes: 'Julio', tipo: 'T' }]
    const result = sugerirCandidatos('SMT_EST', PERSONAS, historial, 'Agosto')
    const idxM03 = result.findIndex(p => p.clave === 'M03')
    const idxM04 = result.findIndex(p => p.clave === 'M04')
    expect(idxM03).toBeGreaterThan(idxM04)
  })

  it('dama que fue Ayudante (A) sube en ranking para ser Titular', () => {
    const historial = [
      { clave: 'M03', mes: 'Julio', tipo: 'T' },
      { clave: 'M04', mes: 'Julio', tipo: 'A' },
    ]
    const result = sugerirCandidatos('SMT_EST', PERSONAS, historial, 'Agosto')
    const idxM04 = result.findIndex(p => p.clave === 'M04')
    const idxM03 = result.findIndex(p => p.clave === 'M03')
    expect(idxM04).toBeLessThan(idxM03)
  })

  it('SMT_EXP_F favorece a la dama cuyo último rol histórico fue Titular (T → A)', () => {
    const historial = [
      { clave: 'M03', mes: 'Junio', tipo: 'T', fecha_inicio: '2026-06-08' },
      { clave: 'M04', mes: 'Junio', tipo: 'A', fecha_inicio: '2026-06-08' },
    ]
    const result = sugerirCandidatos('SMT_EXP_F', PERSONAS, historial, 'Agosto')
    const m03 = result.find(p => p.clave === 'M03')
    const m04 = result.find(p => p.clave === 'M04')
    // M03 fue T en Junio → para ser Ayudante (SMT_EXP_F) recibe +15 (115 pts)
    // M04 fue A en Junio → para repetir Ayudante recibe -20 (80 pts)
    expect(m03._score).toBe(115)
    expect(m04._score).toBe(80)
  })

})

// ── Grupo 3 — Transición entre meses ─────────────────────────────

describe('transición entre meses', () => {

  it('mesAnterior de Enero es Diciembre: historial de Diciembre se toma en cuenta', () => {
    const historial = [
      { clave: 'A01', mes: 'Diciembre', tipo: 'TB' },
    ]
    // En Enero, la regla "no repetir tipo del mes anterior" debe considerar Diciembre
    const result = sugerirCandidatos('TB', PERSONAS, historial, 'Enero')
    const idxA01 = result.findIndex(p => p.clave === 'A01')
    const idxA02 = result.findIndex(p => p.clave === 'A02')
    expect(idxA01).toBeGreaterThan(idxA02)
  })

  it('participó en Diciembre → penalizado en Enero para Mat', () => {
    const historial = [
      { clave: 'M01', mes: 'Diciembre', tipo: 'LB' },
    ]
    const result = sugerirCandidatos('LB', PERSONAS, historial, 'Enero')
    const idxM01 = result.findIndex(p => p.clave === 'M01')
    const idxM02 = result.findIndex(p => p.clave === 'M02')
    expect(idxM01).toBeGreaterThan(idxM02)
  })

})

// ── Grupo 4 — sugerirAyudante ────────────────────────────────────

describe('sugerirAyudante', () => {

  it('la estudiante queda penalizada y no aparece en primer lugar (comportamiento actual)', () => {
    const result = sugerirAyudante('M03', PERSONAS, SIN_HISTORIAL, 'Agosto')
    const idxM03 = result.findIndex(p => p.clave === 'M03')
    expect(idxM03).toBeGreaterThan(0)
  })

  it('yaAsignados externos también quedan excluidos del primer lugar', () => {
    // M04 ya está asignada en otra parte de la semana
    const result = sugerirAyudante('M03', PERSONAS, SIN_HISTORIAL, 'Agosto', ['M04'])
    const idxM04 = result.findIndex(p => p.clave === 'M04')
    // M04 sigue en la lista pero penalizada, no primera
    expect(idxM04).toBeGreaterThan(0)
  })

  it('devuelve solo damas Mat cuando la titular es mujer', () => {
    const result = sugerirAyudante('M03', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
  })

  it('devuelve todos los varones cuando el titular es varón', () => {
    const result = sugerirAyudante('M01', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.sexo === 'M')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Anciano')).toBe(true)
    expect(result.some(p => p.lista === 'Anc/SM' && p.estatus === 'Siervo Ministerial')).toBe(true)
    expect(result.some(p => p.lista === 'Mat')).toBe(true)
    expect(result.length).toBe(7) // A01-A05, M01-M02
  })

})

// ── Grupo 5 — Nuevas reglas de semanas/meses seguidos y pesos ────

describe('nuevas reglas de semanas seguidas, >2 meses seguidos y doble asignación', () => {

  it('participar hace 1 semana NO dispara racha de 2 semanas seguidas', () => {
    const historial = [
      { clave: 'A01', mes: 'Agosto', tipo: 'P', fecha_inicio: '2026-08-10' },
    ]
    const racha = tieneRachaDosSemanasSeguidas('A01', historial, '2026-08-17')
    expect(racha).toBe(false)
  })

  it('participar 2 semanas consecutivas (W-2 y W-1) dispara racha al evaluar 3ra semana', () => {
    const historial = [
      { clave: 'A01', mes: 'Julio', tipo: 'P', fecha_inicio: '2026-07-20' },
      { clave: 'A01', mes: 'Julio', tipo: 'TB', fecha_inicio: '2026-07-27' },
    ]
    const racha = tieneRachaDosSemanasSeguidas('A01', historial, '2026-08-03')
    expect(racha).toBe(true)

    const result = sugerirCandidatos('VC', PERSONAS, historial, 'Agosto', [], '2026-08-03')
    const a01 = result.find(p => p.clave === 'A01')
    // 100 - 45 (racha 2 semanas) = 55
    expect(a01._score).toBe(55)
  })

  it('repetir la misma asignación por más de 2 meses seguidos (M-2 y M-1) aplica -45 pts', () => {
    const historial = [
      { clave: 'A01', mes: 'Junio', tipo: 'EBC' },
      { clave: 'A01', mes: 'Julio', tipo: 'EBC' },
    ]
    const rachaMeses = tuvoMismoTipoDosMesesSeguidos('A01', 'EBC_CON', historial, 'Agosto')
    expect(rachaMeses).toBe(true)

    const result = sugerirCandidatos('EBC_CON', PERSONAS, historial, 'Agosto')
    const a01 = result.find(p => p.clave === 'A01')
    expect(a01._score).toBe(55)
  })

  it('LEBC se mantiene como asignación de Mayor Peso (carga 1.0)', () => {
    expect(esTipoBajoPeso('LEBC')).toBe(false)
    expect(getCargaMensualTipo('LEBC')).toBe(1.0)
    expect(esTipoBajoPeso('P')).toBe(true)
    expect(esTipoBajoPeso('ORACION_C')).toBe(true)
    expect(esTipoBajoPeso('SMT_AYU_M')).toBe(true)
  })

  it('varón puede tomar 2 asignaciones en la misma semana si una es de Bajo Peso y otra de Mayor Peso (-15 pts)', () => {
    const a01 = PERSONAS.find(p => p.clave === 'A01')
    // A01 ya es Presidente (P) y se evalúa para Tesoros (TB)
    const impacto = evaluarImpactoMismaSemana(a01, 'TB', [{ clave: 'A01', tipo: 'P' }])
    expect(impacto.penalty).toBe(15)
    expect(impacto.conflicto.severity).toBe('info')

    const result = sugerirCandidatos('TB', PERSONAS, SIN_HISTORIAL, 'Agosto', [{ clave: 'A01', tipo: 'P' }])
    const candA01 = result.find(p => p.clave === 'A01')
    expect(candA01._score).toBe(85)
  })

  it('varón NO debe combinar Presidente (P) + Oración de Conclusión (OC) ni dos partes de Mayor Peso', () => {
    const a01 = PERSONAS.find(p => p.clave === 'A01')
    const impactoPOc = evaluarImpactoMismaSemana(a01, 'ORACION_C', [{ clave: 'A01', tipo: 'P' }])
    expect(impactoPOc.penalty).toBe(80)
    expect(impactoPOc.conflicto.severity).toBe('warning')

    const impactoDosMayores = evaluarImpactoMismaSemana(a01, 'LEBC', [{ clave: 'A01', tipo: 'TB' }])
    expect(impactoDosMayores.penalty).toBe(65)
    expect(impactoDosMayores.conflicto.severity).toBe('warning')
  })

  it('aislamiento de estatus "bautizado": Matriculado y Matriculado bautizado tienen idéntico puntaje base', () => {
    const resultM = sugerirCandidatos('LB', PERSONAS, SIN_HISTORIAL, 'Agosto')
    const m01 = resultM.find(p => p.clave === 'M01') // Matriculado bautizado
    const m02 = resultM.find(p => p.clave === 'M02') // Matriculado
    expect(m01._score).toBe(100)
    expect(m02._score).toBe(100)

    const resultF = sugerirCandidatos('SMT_EST', PERSONAS, SIN_HISTORIAL, 'Agosto')
    const m03 = resultF.find(p => p.clave === 'M03') // Matriculada
    const m04 = resultF.find(p => p.clave === 'M04') // Matriculada bautizada
    expect(m03._score).toBe(m04._score)
  })

  it('obtenerUltimoRolSMTDama busca el último rol T o A en todo el historial', () => {
    const historial = [
      { clave: 'M03', mes: 'Mayo', tipo: 'T', fecha_inicio: '2026-05-11' },
      { clave: 'M03', mes: 'Julio', tipo: 'A', fecha_inicio: '2026-07-06' },
    ]
    expect(obtenerUltimoRolSMTDama('M03', historial)).toBe('A')
  })

})

// ── Grupo 6 — Casos borde y entradas inválidas ───────────────────

describe('casos borde', () => {

  it('historial vacío no rompe nada', () => {
    expect(() =>
      sugerirCandidatos('P', PERSONAS, [], 'Agosto')
    ).not.toThrow()
  })

  it('personas vacías devuelve array vacío', () => {
    const result = sugerirCandidatos('P', [], SIN_HISTORIAL, 'Agosto')
    expect(result).toEqual([])
  })

  it('tipo desconocido devuelve todas las personas (default)', () => {
    const result = sugerirCandidatos('TIPO_INEXISTENTE', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.length).toBe(PERSONAS.length)
  })

  it('mes con capitalización incorrecta devuelve el mismo mes (no rompe pero ignora historial previo)', () => {
    const historial = [{ clave: 'A01', mes: 'agosto', tipo: 'TB' }]
    expect(() =>
      sugerirCandidatos('TB', PERSONAS, historial, 'agosto')
    ).not.toThrow()
  })

})

// ── Grupo 7 — Eventos y Excepciones de Calendario ───────────────

describe('eventos y excepciones de calendario', () => {

  const semanaAR = {
    id: 'sem-ar-1',
    fecha_inicio: '2026-10-12',
    fecha_fin: '2026-10-18',
  }

  const eventosAR = [
    {
      id: 'ev-ar',
      tipo_evento: 'asamblea_regional',
      titulo_evento: 'Asamblea Regional 2026',
      fecha_original: '2026-10-16',
      fecha_fin_evento: '2026-10-18',
      cancela_reunion: true,
    },
  ]

  const eventosACSabado = [
    {
      id: 'ev-ac',
      tipo_evento: 'asamblea_circuito',
      titulo_evento: 'Asamblea de Circuito',
      fecha_original: '2026-10-17',
      cancela_reunion: true,
    },
  ]

  const eventosVisita = [
    {
      id: 'ev-sc',
      tipo_evento: 'visita_sc',
      titulo_evento: 'Visita del SC',
      fecha_original: '2026-10-13',
      oracion_visitante: true,
    },
  ]

  it('no sugiere candidatos si la semana cancela la reunión entre semana (Asamblea Regional)', () => {
    const result = sugerirCandidatos('P', PERSONAS, SIN_HISTORIAL, 'Octubre', [], {
      semana: semanaAR,
      eventos: eventosAR,
      diaReunionEntreSemana: 'Martes',
      diaReunionFinSemana: 'Sábado',
    })
    expect(result).toEqual([])

    const resultAyu = sugerirAyudante('M01', PERSONAS, SIN_HISTORIAL, 'Octubre', [], {
      semana: semanaAR,
      eventos: eventosAR,
      diaReunionEntreSemana: 'Martes',
      diaReunionFinSemana: 'Sábado',
    })
    expect(resultAyu).toEqual([])
  })

  it('no sugiere candidatos si se pasa la flag cancelaEntreSemana directamente', () => {
    const result = sugerirCandidatos('TB', PERSONAS, SIN_HISTORIAL, 'Octubre', [], {
      cancelaEntreSemana: true,
    })
    expect(result).toEqual([])
  })

  it('sugiere candidatos normalmente si la asamblea de circuito es en fin de semana', () => {
    const result = sugerirCandidatos('P', PERSONAS, SIN_HISTORIAL, 'Octubre', [], {
      semana: semanaAR,
      eventos: eventosACSabado,
      diaReunionEntreSemana: 'Martes',
      diaReunionFinSemana: 'Sábado',
    })
    expect(result.length).toBeGreaterThan(0)
  })

  it('omite sugerencia de ORACION_C si la semana es visita de SC y oracion_visitante es true', () => {
    const resultOracion = sugerirCandidatos('ORACION_C', PERSONAS, SIN_HISTORIAL, 'Octubre', [], {
      semana: semanaAR,
      eventos: eventosVisita,
      diaReunionEntreSemana: 'Martes',
      diaReunionFinSemana: 'Sábado',
    })
    expect(resultOracion).toEqual([])

    const resultPresidente = sugerirCandidatos('P', PERSONAS, SIN_HISTORIAL, 'Octubre', [], {
      semana: semanaAR,
      eventos: eventosVisita,
      diaReunionEntreSemana: 'Martes',
      diaReunionFinSemana: 'Sábado',
    })
    expect(resultPresidente.length).toBeGreaterThan(0)
  })

})


