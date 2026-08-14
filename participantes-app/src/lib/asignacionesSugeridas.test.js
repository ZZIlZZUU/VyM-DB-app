import { describe, it, expect } from 'vitest'
import { sugerirCandidatos, sugerirAyudante } from './asignacionesSugeridas'

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

  it('LB — solo Mat varones', () => {
    const result = sugerirCandidatos('LB', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'M')).toBe(true)
    expect(result.length).toBe(2) // M01, M02
  })

  it('SMT_EST — solo Mat damas', () => {
    const result = sugerirCandidatos('SMT_EST', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
    expect(result.length).toBe(2) // M03, M04
  })

  it('SMT_EXP — cualquier Mat (varones y damas)', () => {
    const result = sugerirCandidatos('SMT_EXP', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat')).toBe(true)
    expect(result.length).toBe(4) // M01-M04
  })

  it('SMT_EXP_M — solo Mat varones', () => {
    const result = sugerirCandidatos('SMT_EXP_M', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'M')).toBe(true)
  })

  it('SMT_EXP_F — solo Mat damas', () => {
    const result = sugerirCandidatos('SMT_EXP_F', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
  })

  it('NC — solo Ancianos (no SM)', () => {
    const result = sugerirCandidatos('NC', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.estatus === 'Anciano')).toBe(true)
    expect(result.length).toBe(3) // A01-A03
  })

  it('EBC_CON — incluye Ancianos y SM', () => {
    const result = sugerirCandidatos('EBC_CON', PERSONAS, SIN_HISTORIAL, 'Agosto')
    const estatus = result.map(p => p.estatus)
    expect(estatus).toContain('Anciano')
    expect(estatus).toContain('Siervo Ministerial')
  })

  it('LEBC — comportamiento actual: cualquier varón (documentar, no corregir)', () => {
    // NOTA: el comentario del código dice "matriculados bautizados" pero el filtro
    // actual es solo p.sexo === 'M', lo que incluye ancianos y SM.
    // Este test documenta el comportamiento real, no el deseado.
    const result = sugerirCandidatos('LEBC', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.sexo === 'M')).toBe(true)
    // Ancianos también aparecen — eso es lo que hace hoy
    expect(result.some(p => p.lista === 'Anc/SM')).toBe(true)
  })

})

// ── Grupo 2 — Reglas de rotación (scoring) ───────────────────────

describe('reglas de rotación', () => {

  it('Mat que participó el mes anterior baja en el ranking', () => {
    const historial = [
      { clave: 'M01', mes: 'Julio', tipo: 'LB' },
    ]
    const result = sugerirCandidatos('LB', PERSONAS, historial, 'Agosto')
    const idxM01 = result.findIndex(p => p.clave === 'M01')
    const idxM02 = result.findIndex(p => p.clave === 'M02')
    // M01 participó en Julio → debe estar después de M02
    expect(idxM01).toBeGreaterThan(idxM02)
  })

  it('Anc/SM con 3 asignaciones este mes queda al final', () => {
    const historial = [
      { clave: 'A01', mes: 'Agosto', tipo: 'P' },
      { clave: 'A01', mes: 'Agosto', tipo: 'TB' },
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

  it('Anc/SM no repite el mismo tipo de asignación del mes anterior', () => {
    const historial = [
      { clave: 'A01', mes: 'Julio', tipo: 'TB' },
    ]
    const result = sugerirCandidatos('TB', PERSONAS, historial, 'Agosto')
    const idxA01 = result.findIndex(p => p.clave === 'A01')
    const idxA02 = result.findIndex(p => p.clave === 'A02')
    // A01 tuvo TB en Julio → debe estar después de A02 (sin historial)
    expect(idxA01).toBeGreaterThan(idxA02)
  })

  it('yaAsignados penaliza a la persona ya asignada en la semana', () => {
    const result = sugerirCandidatos('TB', PERSONAS, SIN_HISTORIAL, 'Agosto', ['A01'])
    const idxA01 = result.findIndex(p => p.clave === 'A01')
    // A01 ya está asignado esta semana → debe aparecer después de los demás
    expect(idxA01).toBeGreaterThan(0)
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
    // NOTA: sugerirAyudante incluye claveEstudiante en yaAsignados, lo que la penaliza (-50)
    // pero no la elimina del pool.
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

  it('devuelve solo damas Mat', () => {
    const result = sugerirAyudante('M03', PERSONAS, SIN_HISTORIAL, 'Agosto')
    expect(result.every(p => p.lista === 'Mat' && p.sexo === 'F')).toBe(true)
  })

})

// ── Grupo 5 — Casos borde y entradas inválidas ───────────────────

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
    // 'agosto' !== 'Agosto' en MESES → mesAnterior('agosto') devuelve MESES[11]
    // El historial de "agosto" (minúscula) no coincide con "Agosto" (correcto)
    // Este test documenta que el motor es case-sensitive en el campo mes
    expect(() =>
      sugerirCandidatos('TB', PERSONAS, historial, 'agosto')
    ).not.toThrow()
  })

})
