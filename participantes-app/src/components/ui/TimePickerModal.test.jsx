import { describe, it, expect } from 'vitest'
import { TimePickerModal, parseInitialTimeToComponents } from './TimePickerModal'

describe('TimePickerModal - Pop-up tipo Android Material 3', () => {
  it('se exporta correctamente como componente React', () => {
    expect(TimePickerModal).toBeDefined()
    expect(typeof TimePickerModal).toBe('function')
  })

  describe('parseInitialTimeToComponents', () => {
    it('parsea correctamente hora 24h vespertina ej: 19:30', () => {
      const res = parseInitialTimeToComponents('19:30')
      expect(res.hour12).toBe(7)
      expect(res.minute).toBe(30)
      expect(res.ampm).toBe('PM')
    })

    it('parsea correctamente hora 12h vespertina ej: 7:05 con base 19:00', () => {
      const res = parseInitialTimeToComponents('7:05', '19:00')
      expect(res.hour12).toBe(7)
      expect(res.minute).toBe(5)
      expect(res.ampm).toBe('PM')
    })

    it('parsea correctamente hora matutina ej: 09:30', () => {
      const res = parseInitialTimeToComponents('09:30', '09:00')
      expect(res.hour12).toBe(9)
      expect(res.minute).toBe(30)
      expect(res.ampm).toBe('AM')
    })

    it('respeta indicador explícito AM o PM', () => {
      const resAm = parseInitialTimeToComponents('02:30 AM')
      expect(resAm.hour12).toBe(2)
      expect(resAm.minute).toBe(30)
      expect(resAm.ampm).toBe('AM')

      const resPm = parseInitialTimeToComponents('02:30 PM')
      expect(resPm.hour12).toBe(2)
      expect(resPm.minute).toBe(30)
      expect(resPm.ampm).toBe('PM')
    })

    it('normaliza las 12:00 mediodía y medianoche adecuadamente', () => {
      const mediodia = parseInitialTimeToComponents('12:00 PM')
      expect(mediodia.hour12).toBe(12)
      expect(mediodia.ampm).toBe('PM')

      const medianoche = parseInitialTimeToComponents('00:00')
      expect(medianoche.hour12).toBe(12)
      expect(medianoche.ampm).toBe('AM')
    })
  })
})
