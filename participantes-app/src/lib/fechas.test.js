import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  formatFecha,
  formatFechaLegible,
  formatFechaConDia,
  formatRangoSemanaLegible,
  formatRangoSemanaPrograma,
  formatFechaSinAnio,
  formatFechaCorta,
  formatFechaHora,
  getPrefFormatoFecha,
  MESES,
  MESES_ABBR,
  getProximaReunion,
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

  describe('formatFechaHora', () => {
    it('formatea timestamp ISO con preferencia dd/mm/yyyy por defecto', () => {
      const d = new Date(2025, 8, 1, 14, 30) // 1 sep 2025 14:30
      expect(formatFechaHora(d)).toBe('01/09/2025, 14:30')
    })

    it('formatea timestamp ISO con preferencia dd mmm yyyy', () => {
      globalThis.localStorage.setItem('pref_formato_fecha', 'dd mmm yyyy')
      const d = new Date(2025, 8, 1, 14, 30)
      expect(formatFechaHora(d)).toBe('1 sep 2025, 14:30')
    })

    it('retorna cadena vacía para null o undefined', () => {
      expect(formatFechaHora(null)).toBe('')
      expect(formatFechaHora(undefined)).toBe('')
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

  describe('getProximaReunion — Rotación dinámica entre reuniones', () => {
    const configDefault = {
      diaReunionEntreSemana: 'Martes',
      horaReunionEntreSemana: '19:30',
      diaReunionFinSemana: 'Sábado',
      horaReunionFinSemana: '18:00',
    }

    // 2026-09-21 es Lunes
    // 2026-09-22 es Martes
    // 2026-09-23 es Miércoles
    // 2026-09-24 es Jueves
    // 2026-09-25 es Viernes
    // 2026-09-26 es Sábado
    // 2026-09-27 es Domingo

    it('Lunes mañana: la próxima es Martes (Mañana)', () => {
      const lunes = new Date(2026, 8, 21, 10, 0)
      const res = getProximaReunion(configDefault, lunes)
      expect(res.tipo).toBe('entre_semana')
      expect(res.nombreDia).toBe('Martes')
      expect(res.diasRestantes).toBe(1)
      expect(res.badgeTexto).toBe('Mañana')
      expect(res.badgeVariant).toBe('warning')
    })

    it('Martes antes de la reunión (14:00): la próxima es Martes (Hoy)', () => {
      const martesTarde = new Date(2026, 8, 22, 14, 0)
      const res = getProximaReunion(configDefault, martesTarde)
      expect(res.tipo).toBe('entre_semana')
      expect(res.nombreDia).toBe('Martes')
      expect(res.diasRestantes).toBe(0)
      expect(res.badgeTexto).toBe('Hoy')
      expect(res.badgeVariant).toBe('success')
    })

    it('Martes después de la reunión (20:00): rota al Sábado (En 4 días)', () => {
      const martesNoche = new Date(2026, 8, 22, 20, 0)
      const res = getProximaReunion(configDefault, martesNoche)
      expect(res.tipo).toBe('fin_semana')
      expect(res.nombreDia).toBe('Sábado')
      expect(res.diasRestantes).toBe(4)
      expect(res.badgeTexto).toBe('En 4 días')
    })

    it('Miércoles: la próxima es Sábado (En 3 días)', () => {
      const miercoles = new Date(2026, 8, 23, 10, 0)
      const res = getProximaReunion(configDefault, miercoles)
      expect(res.tipo).toBe('fin_semana')
      expect(res.nombreDia).toBe('Sábado')
      expect(res.diasRestantes).toBe(3)
      expect(res.badgeTexto).toBe('En 3 días')
    })

    it('Viernes: la próxima es Sábado (Mañana)', () => {
      const viernes = new Date(2026, 8, 25, 10, 0)
      const res = getProximaReunion(configDefault, viernes)
      expect(res.tipo).toBe('fin_semana')
      expect(res.nombreDia).toBe('Sábado')
      expect(res.diasRestantes).toBe(1)
      expect(res.badgeTexto).toBe('Mañana')
      expect(res.badgeVariant).toBe('warning')
    })

    it('Sábado antes de la reunión (12:00): la próxima es Sábado (Hoy)', () => {
      const sabadoMediodia = new Date(2026, 8, 26, 12, 0)
      const res = getProximaReunion(configDefault, sabadoMediodia)
      expect(res.tipo).toBe('fin_semana')
      expect(res.nombreDia).toBe('Sábado')
      expect(res.diasRestantes).toBe(0)
      expect(res.badgeTexto).toBe('Hoy')
      expect(res.badgeVariant).toBe('success')
    })

    it('Sábado después de la reunión (19:00): rota al Martes (En 3 días)', () => {
      const sabadoNoche = new Date(2026, 8, 26, 19, 0)
      const res = getProximaReunion(configDefault, sabadoNoche)
      expect(res.tipo).toBe('entre_semana')
      expect(res.nombreDia).toBe('Martes')
      expect(res.diasRestantes).toBe(3)
      expect(res.badgeTexto).toBe('En 3 días')
    })

    it('Domingo: la próxima es Martes (En 2 días)', () => {
      const domingo = new Date(2026, 8, 27, 10, 0)
      const res = getProximaReunion(configDefault, domingo)
      expect(res.tipo).toBe('entre_semana')
      expect(res.nombreDia).toBe('Martes')
      expect(res.diasRestantes).toBe(2)
      expect(res.badgeTexto).toBe('En 2 días')
    })

    it('funciona con días personalizados como Jueves y Domingo', () => {
      const configCustom = {
        diaReunionEntreSemana: 'Jueves',
        horaReunionEntreSemana: '19:00',
        diaReunionFinSemana: 'Domingo',
        horaReunionFinSemana: '10:00',
      }
      // Miércoles 2026-09-23
      const miercoles = new Date(2026, 8, 23, 10, 0)
      const res = getProximaReunion(configCustom, miercoles)
      expect(res.tipo).toBe('entre_semana')
      expect(res.nombreDia).toBe('Jueves')
      expect(res.badgeTexto).toBe('Mañana')
    })
  })
})
