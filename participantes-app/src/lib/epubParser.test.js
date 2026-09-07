import { describe, it, expect } from 'vitest'
import { parsearFechas } from './epubParser'

describe('parsearFechas — Extracción de fechas de la Guía de Actividades', () => {
  describe('Formato mismo mes', () => {
    it('parsea rango simple "2-8 DE NOVIEMBRE"', () => {
      const res = parsearFechas('2-8 DE NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-02', fin: '2026-11-08' })
    })

    it('parsea con guión en-dash "2–8 DE NOVIEMBRE"', () => {
      const res = parsearFechas('2–8 DE NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-02', fin: '2026-11-08' })
    })

    it('parsea con espacios alrededor del guión "9 - 15 DE NOVIEMBRE"', () => {
      const res = parsearFechas('9 - 15 DE NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-09', fin: '2026-11-15' })
    })

    it('parsea con año explícito "6-12 DE JULIO DE 2026"', () => {
      const res = parsearFechas('6-12 DE JULIO DE 2026', 2024)
      expect(res).toEqual({ inicio: '2026-07-06', fin: '2026-07-12' })
    })

    it('soporta non-breaking spaces (NBSP)', () => {
      const res = parsearFechas('16\u00A0-\u00A022\u00A0DE\u00A0NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-16', fin: '2026-11-22' })
    })
  })

  describe('Formato entre dos meses (mismo año)', () => {
    it('parsea con "A": "30 DE NOVIEMBRE A 6 DE DICIEMBRE"', () => {
      const res = parsearFechas('30 DE NOVIEMBRE A 6 DE DICIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-30', fin: '2026-12-06' })
    })

    it('parsea con "AL": "27 DE JULIO AL 2 DE AGOSTO"', () => {
      const res = parsearFechas('27 DE JULIO AL 2 DE AGOSTO', 2026)
      expect(res).toEqual({ inicio: '2026-07-27', fin: '2026-08-02' })
    })

    it('parsea con guión: "30 DE NOVIEMBRE - 6 DE DICIEMBRE"', () => {
      const res = parsearFechas('30 DE NOVIEMBRE - 6 DE DICIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-30', fin: '2026-12-06' })
    })

    it('parsea "31 DE AGOSTO A 6 DE SEPTIEMBRE"', () => {
      const res = parsearFechas('31 DE AGOSTO A 6 DE SEPTIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-08-31', fin: '2026-09-06' })
    })
  })

  describe('Formato entre dos meses (cruce de año)', () => {
    it('parsea cruce de año con años explícitos: "28 DE DICIEMBRE DE 2026 A 3 DE ENERO DE 2027"', () => {
      const res = parsearFechas('28 DE DICIEMBRE DE 2026 A 3 DE ENERO DE 2027', 2026)
      expect(res).toEqual({ inicio: '2026-12-28', fin: '2027-01-03' })
    })

    it('parsea cruce de año con "AL": "28 DE DICIEMBRE DE 2026 AL 3 DE ENERO DE 2027"', () => {
      const res = parsearFechas('28 DE DICIEMBRE DE 2026 AL 3 DE ENERO DE 2027', 2026)
      expect(res).toEqual({ inicio: '2026-12-28', fin: '2027-01-03' })
    })

    it('parsea año anterior: "29 DE DICIEMBRE DE 2025 A 4 DE ENERO DE 2026"', () => {
      const res = parsearFechas('29 DE DICIEMBRE DE 2025 A 4 DE ENERO DE 2026', 2025)
      expect(res).toEqual({ inicio: '2025-12-29', fin: '2026-01-04' })
    })

    it('infiere año siguiente si no hay año explícito: "29 DE DICIEMBRE A 4 DE ENERO"', () => {
      const res = parsearFechas('29 DE DICIEMBRE A 4 DE ENERO', 2026)
      expect(res).toEqual({ inicio: '2026-12-29', fin: '2027-01-04' })
    })
  })

  describe('Casos inválidos o vacíos', () => {
    it('retorna null para strings vacíos o no relacionados', () => {
      expect(parsearFechas('')).toEqual({ inicio: null, fin: null })
      expect(parsearFechas(null)).toEqual({ inicio: null, fin: null })
      expect(parsearFechas('Guía de actividades para la reunión')).toEqual({ inicio: null, fin: null })
      expect(parsearFechas('Lectura bíblica para la Conmemoración')).toEqual({ inicio: null, fin: null })
    })
  })
})
