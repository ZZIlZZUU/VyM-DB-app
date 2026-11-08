import { describe, it, expect } from 'vitest'
import {
  buildMatrizIndex,
  initials,
  assignmentDayOfMonth,
  getTiposPermitidos,
} from './matrizUtils'

describe('buildMatrizIndex (O(1) Matrix Lookup)', () => {
  it('indexes records by clave and mes in O(1) and sorts cell records by fecha ascending', () => {
    const registros = [
      { id: 1, clave: 'M01', mes: 'Marzo', fecha: '2026-03-20', tipo: 'T' },
      { id: 2, clave: 'M01', mes: 'Marzo', fecha: '2026-03-06', tipo: 'LB' },
      { id: 3, clave: 'M01', mes: 'Enero', fecha: '2026-01-15', tipo: 'A' },
      { id: 4, clave: 'A02', mes: 'Marzo', fecha: '2026-03-13', tipo: 'P' },
    ]

    const { byClaveMes, totalByClave } = buildMatrizIndex(registros)

    expect(totalByClave.get('M01')).toBe(3)
    expect(totalByClave.get('A02')).toBe(1)
    expect(totalByClave.get('UNKNOWN')).toBeUndefined()

    const marzoM01 = byClaveMes.get('M01').get('Marzo')
    expect(marzoM01).toHaveLength(2)
    expect(marzoM01[0].fecha).toBe('2026-03-06')
    expect(marzoM01[1].fecha).toBe('2026-03-20')
  })

  it('extracts initials and day of month accurately', () => {
    expect(initials('Juan Carlos Pérez')).toBe('JC')
    expect(assignmentDayOfMonth('2026-03-06')).toBe('6')
    expect(assignmentDayOfMonth('2026-11-25T00:00:00Z')).toBe('25')
  })

  it('returns allowed assignment types based on participant role and sex', () => {
    expect(getTiposPermitidos({ lista: 'Mat', sexo: 'F' })).toEqual(['T', 'A'])
    expect(getTiposPermitidos({ lista: 'Mat', sexo: 'M' })).toContain('LB')
    expect(getTiposPermitidos({ lista: 'Anc/SM', estatus: 'Anciano' })).toContain('VC')
    expect(getTiposPermitidos({ lista: 'Anc/SM', estatus: 'Siervo Ministerial' })).not.toContain('VC')
  })
})
