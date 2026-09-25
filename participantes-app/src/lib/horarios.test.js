import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  minutesToTime,
  formatHora12,
  extraerDuracion,
  calcularHorariosSMT,
  calcularHorariosVC,
  obtenerHorariosS140,
} from './horarios'

describe('Utilidades de Horarios — Reunión y Formulario S-140', () => {
  describe('Conversión de tiempos y formateo 12h', () => {
    it('convierte HH:MM a minutos y viceversa', () => {
      expect(timeToMinutes('19:30')).toBe(19 * 60 + 30)
      expect(minutesToTime(19 * 60 + 30)).toBe('19:30')
      expect(minutesToTime(20 * 60 + 7)).toBe('20:07')
    })

    it('formatea horas 24h a 12h legible', () => {
      expect(formatHora12('19:00')).toBe('7:00')
      expect(formatHora12('19:04:00')).toBe('7:04')
      expect(formatHora12('19:30')).toBe('7:30')
      expect(formatHora12('19:33')).toBe('7:33')
      expect(formatHora12('20:07')).toBe('8:07')
      expect(formatHora12('20:37')).toBe('8:37')
      expect(formatHora12('20:40:00')).toBe('8:40')
    })

    it('extrae duración de número o del título', () => {
      expect(extraerDuracion({ duracion_min: 10 })).toBe(10)
      expect(extraerDuracion({ titulo: 'Empiece conversaciones (2 mins.)' })).toBe(2)
      expect(extraerDuracion({ titulo: 'Haga revisitas (4 min.)' })).toBe(4)
      expect(extraerDuracion({ titulo: 'Discurso sin duración' })).toBeNull()
    })
  })

  describe('Semana de ejemplo del usuario: 14 - 20 de septiembre', () => {
    // Semana con 4 partes SMT (2m, 2m, 3m, 4m)
    // y 2 partes VC (6m, 9m) + EBC (30m)
    const semanaEjemplo = {
      smt: [
        { titulo: 'Empiece conversaciones', duracion_min: 2 },
        { titulo: 'Empiece conversaciones', duracion_min: 2 },
        { titulo: 'Haga revisitas', duracion_min: 3 },
        { titulo: 'Haga discípulos', duracion_min: 4 },
      ],
      vc: [
        { titulo: 'El autocontrol nos ayuda a obedecer', duracion_min: 6 },
        { titulo: 'Logros de la organización para el mes de septiembre', duracion_min: 9 },
      ],
    }

    it('calcula horarios SMT en formato 24h con +1 min de margen', () => {
      const smt = calcularHorariosSMT(semanaEjemplo.smt)
      expect(smt[0].hora_inicio).toBe('19:30')
      expect(smt[1].hora_inicio).toBe('19:33') // 19:30 + 2 + 1
      expect(smt[2].hora_inicio).toBe('19:36') // 19:33 + 2 + 1
      expect(smt[3].hora_inicio).toBe('19:40') // 19:36 + 3 + 1
    })

    it('calcula horarios VC en formato 24h con +1 min de margen', () => {
      const vc = calcularHorariosVC([
        ...semanaEjemplo.vc,
        { titulo: 'Estudio bíblico de la congregación', duracion_min: 30, tipo: 'EBC_CON' },
      ])
      expect(vc[0].hora_inicio).toBe('19:50')
      expect(vc[1].hora_inicio).toBe('19:57') // 19:50 + 6 + 1
      expect(vc[2].hora_inicio).toBe('20:07') // 19:57 + 9 + 1 (EBC)
    })

    it('obtenerHorariosS140 produce exactamente las marcas 12h del usuario', () => {
      const h = obtenerHorariosS140(semanaEjemplo)

      // Estáticos
      expect(h.apertura.cancion).toBe('7:00')
      expect(h.apertura.intro).toBe('7:04')
      expect(h.tb.discurso).toBe('7:05')
      expect(h.tb.perlas).toBe('7:15')
      expect(h.tb.lectura).toBe('7:25')
      expect(h.vc.cancion).toBe('7:45')
      expect(h.cierre.conclu).toBe('8:37')
      expect(h.cierre.cancion).toBe('8:40')

      // Dinámicos SMT
      expect(h.smtHoras).toEqual(['7:30', '7:33', '7:36', '7:40'])

      // Dinámicos VC y EBC
      expect(h.vc.partesHoras).toEqual(['7:50', '7:57'])
      expect(h.vc.ebcHora).toBe('8:07')
    })
  })

  describe('Semana con 1 sola parte de Vida Cristiana (15 mins)', () => {
    const semanaUnaParteVC = {
      smt: [
        { titulo: 'Empiece conversaciones', duracion_min: 3 },
        { titulo: 'Haga revisitas', duracion_min: 4 },
        { titulo: 'Haga discípulos', duracion_min: 5 },
      ],
      vc: [
        { titulo: 'En esta campaña, ni un golpe al aire', duracion_min: 15 },
      ],
    }

    it('calcula SMT con 3 partes y EBC a las 8:06', () => {
      const h = obtenerHorariosS140(semanaUnaParteVC)

      // SMT: 7:30, 7:30 + 3 + 1 = 7:34, 7:34 + 4 + 1 = 7:39
      expect(h.smtHoras).toEqual(['7:30', '7:34', '7:39'])

      // VC: 7:50
      expect(h.vc.partesHoras).toEqual(['7:50'])

      // EBC: 7:50 + 15 + 1 = 8:06
      expect(h.vc.ebcHora).toBe('8:06')
    })
  })

  describe('Extracción de duración desde el texto del título si duracion_min no viene', () => {
    const semanaSinDuracionMin = {
      smt: [
        { titulo: 'Empiece conversaciones (3 mins.)' },
        { titulo: 'Haga revisitas (4 mins.)' },
      ],
      vc: [
        { titulo: 'Tema local (15 mins.)' },
      ],
    }

    it('calcula correctamente parseando la duración del título', () => {
      const h = obtenerHorariosS140(semanaSinDuracionMin)
      expect(h.smtHoras).toEqual(['7:30', '7:34'])
      expect(h.vc.partesHoras).toEqual(['7:50'])
      expect(h.vc.ebcHora).toBe('8:06')
    })
  })

  describe('Horarios configurables con hora de inicio personalizada', () => {
    const semanaEjemplo = {
      smt: [
        { titulo: 'Empiece conversaciones', duracion_min: 3 },
      ],
      vc: [
        { titulo: 'Tema local', duracion_min: 15 },
      ],
    }

    it('ajusta la línea temporal a las 19:30 (7:30)', () => {
      const h = obtenerHorariosS140(semanaEjemplo, '19:30')
      expect(h.apertura.cancion).toBe('7:30')
      expect(h.apertura.intro).toBe('7:34')
      expect(h.tb.discurso).toBe('7:35')
      expect(h.tb.perlas).toBe('7:45')
      expect(h.tb.lectura).toBe('7:55')
      expect(h.smtHoras).toEqual(['8:00'])
      expect(h.vc.cancion).toBe('8:15')
      expect(h.vc.partesHoras).toEqual(['8:20'])
      expect(h.vc.ebcHora).toBe('8:36')
      expect(h.cierre.conclu).toBe('9:07')
      expect(h.cierre.cancion).toBe('9:10')
    })
  })
})
