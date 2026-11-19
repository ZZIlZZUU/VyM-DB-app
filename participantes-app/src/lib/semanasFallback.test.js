import { describe, it, expect } from 'vitest'
import {
  getWeekBoundsIso,
  mapParticipacionToSeccion,
  buildSemanasConParticipaciones,
  buildPartesVirtualesDeSemana,
  buildAsignacionesDesdeParticipaciones,
} from './semanasFallback'

describe('semanasFallback', () => {
  describe('getWeekBoundsIso', () => {
    it('calcula correctamente Lunes a Domingo para cualquier día de la semana', () => {
      // Martes 17 Nov 2026 -> Lunes 16 Nov a Domingo 22 Nov
      expect(getWeekBoundsIso('2026-11-17')).toEqual({
        monday: '2026-11-16',
        sunday: '2026-11-22',
        mes: 'Noviembre',
        anio: 2026,
      })

      // Domingo 15 Nov 2026 -> Lunes 9 Nov a Domingo 15 Nov
      expect(getWeekBoundsIso('2026-11-15')).toEqual({
        monday: '2026-11-09',
        sunday: '2026-11-15',
        mes: 'Noviembre',
        anio: 2026,
      })
    })
  })

  describe('mapParticipacionToSeccion', () => {
    it('clasifica tipos de participación en las secciones del programa incluyendo códigos heredados DSC y OC', () => {
      expect(mapParticipacionToSeccion('P')).toBe('APERTURA')
      expect(mapParticipacionToSeccion('TB')).toBe('TB')
      expect(mapParticipacionToSeccion('LB')).toBe('TB')
      expect(mapParticipacionToSeccion('T')).toBe('SMT')
      expect(mapParticipacionToSeccion('A')).toBe('SMT')
      expect(mapParticipacionToSeccion('DSC')).toBe('SMT')
      expect(mapParticipacionToSeccion('EBC')).toBe('VC')
      expect(mapParticipacionToSeccion('LEBC')).toBe('VC')
      expect(mapParticipacionToSeccion('ORACION_C')).toBe('CIERRE')
      expect(mapParticipacionToSeccion('OC')).toBe('CIERRE')
    })
  })

  describe('buildSemanasConParticipaciones', () => {
    it('no duplica semanas cubiertas por EPUB y crea semanas virtuales ordenadas para el resto', () => {
      const semanasEpub = [
        {
          id: 'sem-ene',
          fecha_inicio: '2027-01-04',
          fecha_fin: '2027-01-10',
          mes: 'Enero',
          anio: 2027,
        },
      ]

      const participaciones = [
        { id: 1, clave: 'A-001', fecha: '2026-11-17', mes: 'Noviembre', tipo: 'P' },
        { id: 2, clave: 'M-010', fecha: '2026-11-17', mes: 'Noviembre', tipo: 'T' },
        { id: 3, clave: 'A-002', fecha: '2026-12-08', mes: 'Diciembre', tipo: 'EBC' },
        { id: 4, clave: 'A-003', fecha: '2027-01-05', mes: 'Enero', tipo: 'TB' },
      ]

      const result = buildSemanasConParticipaciones(semanasEpub, participaciones)
      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        id: 'virtual_2026-11-16',
        fecha_inicio: '2026-11-16',
        fecha_fin: '2026-11-22',
        mes: 'Noviembre',
        isVirtual: true,
      })
      expect(result[0].participaciones).toHaveLength(2)
      expect(result[1]).toMatchObject({
        id: 'virtual_2026-12-07',
        mes: 'Diciembre',
        isVirtual: true,
      })
      expect(result[2]).toMatchObject({
        id: 'sem-ene',
        isVirtual: false,
      })
    })
  })

  describe('buildPartesVirtualesDeSemana', () => {
    it('construye partes con títulos reales desde observaciones y une Titular + Ayudante en una sola parte', () => {
      const semanaVirtual = {
        id: 'virtual_2026-11-16',
        isVirtual: true,
        participaciones: [
          { id: 10, clave: 'A-002', fecha: '2026-11-17', tipo: 'LEBC' },
          { id: 11, clave: 'A-001', fecha: '2026-11-17', tipo: 'P' },
          {
            id: 12,
            clave: 'M-005',
            fecha: '2026-11-17',
            tipo: 'T',
            observaciones: 'Empiece conversaciones (De casa en casa)',
          },
          {
            id: 13,
            clave: 'M-006',
            fecha: '2026-11-17',
            tipo: 'A',
            observaciones: 'Ayudante SMT',
          },
          {
            id: 14,
            clave: 'A-004',
            fecha: '2026-11-17',
            tipo: 'DSC',
            observaciones: 'Cómo ser más pacientes',
          },
          { id: 15, clave: 'A-005', fecha: '2026-11-17', tipo: 'OC' },
        ],
      }

      const { partes, asignaciones } = buildPartesVirtualesDeSemana(semanaVirtual)
      expect(partes).toHaveLength(5)
      expect(partes.map(p => p.seccion)).toEqual(['APERTURA', 'SMT', 'SMT', 'VC', 'CIERRE'])
      expect(partes[1].titulo).toBe('Empiece conversaciones (De casa en casa)')
      expect(partes[2].titulo).toBe('Cómo ser más pacientes')
      expect(partes[4].titulo).toBe('Oración de conclusión')

      expect(asignaciones).toHaveLength(6)
      expect(asignaciones.find(a => a.parte_id === partes[1].id && a.rol === 'principal')).toMatchObject({
        clave: 'M-005',
        confirmado: true,
      })
      expect(asignaciones.find(a => a.parte_id === partes[1].id && a.rol === 'ayudante')).toMatchObject({
        clave: 'M-006',
        confirmado: true,
      })
    })
  })

  describe('buildAsignacionesDesdeParticipaciones', () => {
    it('revincula partes del EPUB con participaciones confirmadas incluyendo Titular+Ayudante, DSC y OC', () => {
      const partesEpub = [
        { id: 'p1', numero_parte: 1, tipo_asignacion: 'P', requiere_ayudante: false },
        { id: 'p2', numero_parte: 2, tipo_asignacion: 'ORACION', requiere_ayudante: false },
        { id: 'p5', numero_parte: 5, tipo_asignacion: 'SMT_EST', requiere_ayudante: true },
        { id: 'p6', numero_parte: 6, tipo_asignacion: 'SMT_DSC', requiere_ayudante: false },
        { id: 'p9', numero_parte: 9, tipo_asignacion: 'ORACION_C', requiere_ayudante: false },
      ]
      const regsSemana = [
        { id: 101, clave: 'A-001', tipo: 'P' },
        { id: 102, clave: 'M-005', tipo: 'T' },
        { id: 103, clave: 'M-006', tipo: 'A' },
        { id: 104, clave: 'A-004', tipo: 'DSC' },
        { id: 105, clave: 'A-005', tipo: 'OC' },
      ]

      const linked = buildAsignacionesDesdeParticipaciones(partesEpub, regsSemana)
      expect(linked).toEqual([
        { parte_id: 'p1', clave: 'A-001', rol: 'principal', sugerido_por_app: false, confirmado: true, participacion_id: 101 },
        { parte_id: 'p5', clave: 'M-005', rol: 'principal', sugerido_por_app: false, confirmado: true, participacion_id: 102 },
        { parte_id: 'p5', clave: 'M-006', rol: 'ayudante', sugerido_por_app: false, confirmado: true, participacion_id: 103 },
        { parte_id: 'p6', clave: 'A-004', rol: 'principal', sugerido_por_app: false, confirmado: true, participacion_id: 104 },
        { parte_id: 'p9', clave: 'A-005', rol: 'principal', sugerido_por_app: false, confirmado: true, participacion_id: 105 },
      ])
    })
  })
})
