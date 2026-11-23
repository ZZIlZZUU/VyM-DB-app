import { describe, it, expect } from 'vitest'
import {
  normalizarEstadoRevision,
  evaluarReconfirmacionParte,
  calcularEstadoSemana,
} from './conflictosRotacion'

describe('normalizarEstadoRevision', () => {
  it('conserva estados válidos y hace fallback seguro a borrador', () => {
    expect(normalizarEstadoRevision('borrador')).toBe('borrador')
    expect(normalizarEstadoRevision('en_revision')).toBe('en_revision')
    expect(normalizarEstadoRevision('verificada')).toBe('verificada')
    expect(normalizarEstadoRevision(null)).toBe('borrador')
    expect(normalizarEstadoRevision('desconocido')).toBe('borrador')
  })
})

describe('evaluarReconfirmacionParte', () => {
  const parteSmt = { id: 'p1', tipo_asignacion: 'SMT_EST', requiere_ayudante: true }

  it('detecta cambio de titular respecto a participacion_id en historial', () => {
    const res = evaluarReconfirmacionParte(
      parteSmt,
      { clave: 'M-002', participacion_id: 10 },
      { clave: 'M-003', participacion_id: 11 },
      [
        { id: 10, clave: 'M-001' },
        { id: 11, clave: 'M-003' },
      ]
    )
    expect(res.principalCambiado).toBe(true)
    expect(res.ayudanteCambiado).toBe(false)
    expect(res.necesitaReconfirmar).toBe(true)
  })

  it('detecta ayudante nuevo o removido sobre una parte ya confirmada', () => {
    const nuevo = evaluarReconfirmacionParte(
      parteSmt,
      { clave: 'M-001', participacion_id: 10 },
      { clave: 'M-004', participacion_id: null },
      [{ id: 10, clave: 'M-001' }]
    )
    expect(nuevo.ayudanteNuevo).toBe(true)
    expect(nuevo.necesitaReconfirmar).toBe(true)

    const removido = evaluarReconfirmacionParte(
      parteSmt,
      { clave: 'M-001', participacion_id: 10 },
      { clave: null, participacion_id: 11 },
      [
        { id: 10, clave: 'M-001' },
        { id: 11, clave: 'M-003' },
      ]
    )
    expect(removido.ayudanteRemovido).toBe(true)
    expect(removido.necesitaReconfirmar).toBe(true)
  })
})

describe('calcularEstadoSemana', () => {
  const semanaBase = {
    id: 'sem-1',
    fecha_inicio: '2026-11-16',
    fecha_fin: '2026-11-22',
    mes: 'Noviembre',
    estado_revision: 'en_revision',
  }

  const partesBase = [
    { id: 'p-pres', semana_id: 'sem-1', tipo_asignacion: 'P', requiere_ayudante: false },
    { id: 'p-ora', semana_id: 'sem-1', tipo_asignacion: 'ORACION', requiere_ayudante: false },
    { id: 'p-smt', semana_id: 'sem-1', tipo_asignacion: 'SMT_EST', requiere_ayudante: true },
    { id: 'p-vacio', semana_id: 'sem-1', tipo_asignacion: 'SMT_VACIO', requiere_ayudante: false },
    { id: 'p-ebc', semana_id: 'sem-1', tipo_asignacion: 'EBC_CON', requiere_ayudante: false },
    { id: 'p-lebc', semana_id: 'sem-1', tipo_asignacion: 'LEBC', requiere_ayudante: false },
    { id: 'p-conclu', semana_id: 'sem-1', tipo_asignacion: 'CONCLU', requiere_ayudante: false },
    { id: 'p-oc', semana_id: 'sem-1', tipo_asignacion: 'ORACION_C', requiere_ayudante: false },
  ]

  it('excluye partes solo visuales, calcula progreso y detecta ayudantes faltantes', () => {
    const asignaciones = [
      { id: 'a1', parte_id: 'p-pres', rol: 'principal', clave: 'A-001', confirmado: true, participacion_id: 1 },
      { id: 'a2', parte_id: 'p-smt', rol: 'principal', clave: 'M-001', confirmado: false, participacion_id: null },
    ]
    const historial = [{ id: 1, clave: 'A-001', fecha: '2026-11-16', mes: 'Noviembre', tipo: 'P' }]

    const est = calcularEstadoSemana(semanaBase, partesBase, asignaciones, historial, [], {})

    // Contables: P, SMT_EST, EBC_CON, LEBC, ORACION_C = 5
    expect(est.totalPartes).toBe(5)
    expect(est.asignadas).toBe(2)
    expect(est.confirmadas).toBe(1)
    expect(est.sinAsignar).toBe(3)
    expect(est.faltanAyudantes).toBe(1)
    expect(est.esCompleta).toBe(false)
    expect(est.estadoRevision).toBe('en_revision')
  })

  it('considera visita del SC como completa cuando las partes locales están confirmadas', () => {
    const eventos = [
      {
        id: 'ev-sc',
        semana_id: 'sem-1',
        tipo_evento: 'visita_sc',
        titulo_evento: 'Visita del SC',
        fecha_original: '2026-11-17',
        fecha_efectiva: '2026-11-17',
        nombre_visitante: 'Hno. Visitante',
        oracion_visitante: true,
      },
    ]

    const asignaciones = [
      { id: 'a1', parte_id: 'p-pres', rol: 'principal', clave: 'A-001', confirmado: true, participacion_id: 1 },
      { id: 'a2', parte_id: 'p-smt', rol: 'principal', clave: 'M-001', confirmado: true, participacion_id: 2 },
      { id: 'a3', parte_id: 'p-smt', rol: 'ayudante', clave: 'M-002', confirmado: true, participacion_id: 3 },
    ]
    const historial = [
      { id: 1, clave: 'A-001', fecha: '2026-11-16', mes: 'Noviembre', tipo: 'P' },
      { id: 2, clave: 'M-001', fecha: '2026-11-16', mes: 'Noviembre', tipo: 'T' },
      { id: 3, clave: 'M-002', fecha: '2026-11-16', mes: 'Noviembre', tipo: 'A' },
    ]

    const est = calcularEstadoSemana(
      { ...semanaBase, estado_revision: 'verificada' },
      partesBase,
      asignaciones,
      historial,
      eventos,
      { diaReunionEntreSemana: 'Martes', diaReunionFinSemana: 'Sábado' }
    )

    // En visita SC: LEBC se excluye; EBC_CON y ORACION_C cuentan cubiertas por visitante
    // Contables = P, SMT_EST, EBC_CON, ORACION_C = 4
    expect(est.esVisita).toBe(true)
    expect(est.totalPartes).toBe(4)
    expect(est.confirmadas).toBe(4)
    expect(est.pct).toBe(100)
    expect(est.esCompleta).toBe(true)
    expect(est.estadoRevision).toBe('verificada')
  })

  it('marca semanas canceladas por asamblea como completas y canceladas', () => {
    const eventos = [
      {
        id: 'ev-asamb',
        semana_id: 'sem-1',
        tipo_evento: 'asamblea_regional',
        titulo_evento: 'Asamblea Regional',
        fecha_original: '2026-11-20',
        fecha_efectiva: '2026-11-20',
      },
    ]

    const est = calcularEstadoSemana(
      semanaBase,
      partesBase,
      [],
      [],
      eventos,
      { diaReunionEntreSemana: 'Martes', diaReunionFinSemana: 'Sábado' }
    )

    expect(est.esCancelada).toBe(true)
    expect(est.esCompleta).toBe(true)
    expect(est.totalPartes).toBe(0)
  })
})
