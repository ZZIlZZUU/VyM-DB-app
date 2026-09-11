import { describe, it, expect } from 'vitest'
import {
  formatMesYYYYMM,
  getMesAnteriorYYYYMM,
  getMesActualYYYYMM,
  construirCSVReporteMensual,
} from './generarReporteMensual'

describe('generarReporteMensual utilities', () => {
  describe('formatMesYYYYMM', () => {
    it('formatea correctamente códigos YYYYMM comunes', () => {
      expect(formatMesYYYYMM('202608')).toBe('Agosto 2026')
      expect(formatMesYYYYMM('202501')).toBe('Enero 2025')
      expect(formatMesYYYYMM('202512')).toBe('Diciembre 2025')
    })

    it('maneja valores vacíos o inválidos con gracia', () => {
      expect(formatMesYYYYMM('')).toBe('')
      expect(formatMesYYYYMM(null)).toBe('')
      expect(formatMesYYYYMM('123')).toBe('123')
    })
  })

  describe('getMesAnteriorYYYYMM', () => {
    it('calcula mes anterior en el mismo año', () => {
      const fechaSept = new Date(2026, 8, 15) // Mes 8 es Septiembre
      expect(getMesAnteriorYYYYMM(fechaSept)).toBe('202608')
    })

    it('cruza correctamente de enero a diciembre del año anterior', () => {
      const fechaEnero = new Date(2027, 0, 5) // Mes 0 es Enero
      expect(getMesAnteriorYYYYMM(fechaEnero)).toBe('202612')
    })
  })

  describe('getMesActualYYYYMM', () => {
    it('retorna YYYYMM del mes actual', () => {
      const d = new Date(2026, 8, 8)
      expect(getMesActualYYYYMM(d)).toBe('202609')
    })
  })

  describe('construirCSVReporteMensual', () => {
    it('construye CSV con BOM, resumen y detalle ordenado', () => {
      const participaciones = [
        {
          clave: 'M01',
          nombre: 'Carlos López',
          lista: 'Mat',
          fecha: '2026-08-10',
          tipo: 'TB',
          observaciones: 'Muy buena preparación',
        },
        {
          clave: 'A01',
          nombre: 'Ana Gómez',
          lista: 'Anc/SM',
          fecha: '2026-08-03',
          tipo: 'LB',
          observaciones: 'Lectura clara, con pausas',
        },
        {
          clave: 'M01',
          nombre: 'Carlos López',
          lista: 'Mat',
          fecha: '2026-08-17',
          tipo: 'T',
          observaciones: '',
        },
      ]

      const resultado = construirCSVReporteMensual({
        mes: '202608',
        participaciones,
        fechaGeneracion: '2026-09-01 10:00:00',
      })

      expect(resultado.totalParticipaciones).toBe(3)
      expect(resultado.totalPersonas).toBe(2)
      expect(resultado.resumenListas.Mat).toBe(2)
      expect(resultado.resumenListas['Anc/SM']).toBe(1)

      // El CSV debe comenzar con BOM UTF-8
      expect(resultado.csv.startsWith('\uFEFF')).toBe(true)

      // Debe contener líneas de resumen
      expect(resultado.csv).toContain('# REPORTE MENSUAL DE PARTICIPACIONES — AGOSTO 2026')
      expect(resultado.csv).toContain('# Total participaciones: 3')
      expect(resultado.csv).toContain('# Total personas participantes: 2')
      expect(resultado.csv).toContain('# - Total Mat: 2')
      expect(resultado.csv).toContain('# - Total Anc/SM: 1')

      // Debe contener cabeceras de columnas
      expect(resultado.csv).toContain('Nombre,Lista,Fecha,Tipo,Observaciones')

      // Debe ordenar cronológicamente en las filas de datos: 2026-08-03 antes de 2026-08-10
      const seccionDatos = resultado.csv.split('Nombre,Lista,Fecha,Tipo,Observaciones')[1]
      const idxAna = seccionDatos.indexOf('Ana Gómez')
      const idxCarlos = seccionDatos.indexOf('Carlos López')
      expect(idxAna).toBeLessThan(idxCarlos)

      // Escape de comas en observaciones
      expect(resultado.csv).toContain('"Lectura clara, con pausas"')
    })

    it('maneja participaciones vacías correctamente', () => {
      const resultado = construirCSVReporteMensual({
        mes: '202608',
        participaciones: [],
      })

      expect(resultado.totalParticipaciones).toBe(0)
      expect(resultado.totalPersonas).toBe(0)
      expect(resultado.csv).toContain('# Total participaciones: 0')
    })
  })
})
