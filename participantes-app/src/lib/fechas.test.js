import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  formatFecha,
  formatFechaLegible,
  formatFechaConDia,
  formatRangoSemanaLegible,
  formatRangoSemanaPrograma,
  formatFechaSinAnio,
  formatFechaCorta,
  getPrefFormatoFecha,
  MESES,
  MESES_ABBR,
} from './fechas'

// Mock globalThis.localStorage for test environment
let storage = {}
globalThis.localStorage = {
  getItem: key => storage[key] ?? null,
  setItem: (key, val) => { storage[key] = String(val) },
  removeItem: key => { delete storage[key] },
  clear: () => { storage = {} },
}

describe('fechas helper utils (abreviaturas, preferencias y programa S-140)', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  afterEach(() => {
    globalThis.localStorage.clear()
  })

  describe('formatFecha & preferencias', () => {
    it('formatea "2026-10-26" a "26/10/2026" por defecto (dd/mm/yyyy)', () => {
      expect(formatFecha('2026-10-26')).toBe('26/10/2026')
    })

    it('formatea "2026-10-26" a "26 oct 2026" cuando pref_formato_fecha es "dd mmm yyyy"', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd mmm yyyy')
      expect(formatFecha('2026-10-26')).toBe('26 oct 2026')
    })

    it('respeta formatoOverride explícito', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd/mm/yyyy')
      expect(formatFecha('2026-10-26', 'dd mmm yyyy')).toBe('26 oct 2026')
    })
  })

  describe('formatFechaLegible', () => {
    it('formatea "2026-10-26" a "26 oct 2026" con forceLegible=true', () => {
      expect(formatFechaLegible('2026-10-26', true)).toBe('26 oct 2026')
    })

    it('formatea "2026-01-05" con forceLegible=true a "5 ene 2026"', () => {
      expect(formatFechaLegible('2026-01-05', true)).toBe('5 ene 2026')
    })

    it('retorna vacío si recibe null o undefined', () => {
      expect(formatFechaLegible(null)).toBe('')
      expect(formatFechaLegible(undefined)).toBe('')
      expect(formatFechaLegible('')).toBe('')
    })

    it('retorna el string original si no tiene formato de fecha', () => {
      expect(formatFechaLegible('no-es-fecha')).toBe('no-es-fecha')
    })
  })

  describe('formatFechaConDia', () => {
    it('formatea "2025-09-01" con día de la semana', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd mmm yyyy')
      expect(formatFechaConDia('2025-09-01')).toBe('Lunes 1 sep 2025')
    })

    it('formatea "2025-09-01" con día en formato dd/mm/yyyy', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd/mm/yyyy')
      expect(formatFechaConDia('2025-09-01')).toBe('Lunes 01/09/2025')
    })

    it('maneja valores vacíos', () => {
      expect(formatFechaConDia(null)).toBe('')
      expect(formatFechaConDia('')).toBe('')
    })
  })

  describe('formatRangoSemanaLegible', () => {
    it('formatea "2026-10-26" y "2026-11-01" según preferencia', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd mmm yyyy')
      expect(formatRangoSemanaLegible('2026-10-26', '2026-11-01')).toBe(
        '26 oct 2026 al 1 nov 2026'
      )
    })

    it('maneja cuando falta fechaInicio o fechaFin', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd mmm yyyy')
      expect(formatRangoSemanaLegible('2026-07-06', null)).toBe('6 jul 2026')
      expect(formatRangoSemanaLegible(null, '2026-07-12')).toBe('12 jul 2026')
      expect(formatRangoSemanaLegible(null, null)).toBe('')
    })
  })

  describe('formatRangoSemanaPrograma (sin año, formato natural)', () => {
    it('formatea semanas dentro del mismo mes como "7 - 13 de Septiembre"', () => {
      expect(formatRangoSemanaPrograma('2026-09-07', '2026-09-13')).toBe('7 - 13 de Septiembre')
      expect(formatRangoSemanaPrograma('2026-09-14', '2026-09-20')).toBe('14 - 20 de Septiembre')
      expect(formatRangoSemanaPrograma('2026-09-21', '2026-09-27')).toBe('21 - 27 de Septiembre')
    })

    it('formatea semanas entre 2 meses como "28 de Septiembre - 4 de Octubre"', () => {
      expect(formatRangoSemanaPrograma('2026-09-28', '2026-10-04')).toBe('28 de Septiembre - 4 de Octubre')
      expect(formatRangoSemanaPrograma('2026-12-28', '2027-01-03')).toBe('28 de Diciembre - 3 de Enero')
    })

    it('maneja casos borde o nulos', () => {
      expect(formatRangoSemanaPrograma(null, null)).toBe('')
      expect(formatRangoSemanaPrograma('2026-09-07', null)).toBe('7 de Septiembre')
      expect(formatRangoSemanaPrograma(null, '2026-10-04')).toBe('4 de Octubre')
    })
  })

  describe('formatFechaSinAnio', () => {
    it('formatea "2026-10-26" a "26 oct"', () => {
      expect(formatFechaSinAnio('2026-10-26')).toBe('26 oct')
    })
  })

  describe('MESES_ABBR', () => {
    it('contiene las 12 abreviaturas en orden', () => {
      expect(MESES_ABBR).toEqual([
        'ene', 'feb', 'mar', 'abr', 'may', 'jun',
        'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
      ])
    })
  })

  describe('MESES', () => {
    it('contiene los 12 meses del año en orden', () => {
      expect(MESES).toHaveLength(12)
      expect(MESES[0]).toBe('Enero')
      expect(MESES[11]).toBe('Diciembre')
    })
  })
})
