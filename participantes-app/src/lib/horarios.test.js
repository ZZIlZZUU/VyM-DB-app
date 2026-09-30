import { describe, it, expect } from 'vitest'
import {
  timeToMinutes,
  minutesToTime,
  formatHora12,
  extraerDuracion,
  calcularHorariosSMT,
  calcularHorariosVC,
  obtenerHorariosS140,
  simularCronogramaReunion,
  parseHoraFlexible,
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

    it('soporta hora de inicio matutina (AM) ej: 09:30', () => {
      const h = obtenerHorariosS140(semanaEjemplo, '09:30')
      expect(h.apertura.cancion).toBe('9:30')
      expect(h.apertura.intro).toBe('9:34')
      expect(h.tb.discurso).toBe('9:35')
      expect(h.meta.horaInicio).toBe('09:30')
    })
  })

  describe('Control fino de horarios con objeto de configuración avanzado', () => {
    it('simularCronogramaReunion genera el cronograma completo con metadatos oficiales', () => {
      const config = {
        horaReunionEntreSemana: '19:00',
        horarioModoTb: 'estatico',
        horarioOffsetSmt: 30,
        horarioModoSmt: 'dinamico',
        horarioOffsetCancionVc: 45,
        horarioOffsetVc: 50,
        horarioModoVc: 'estatico',
        margenTransicionMin: 1,
      }
      const sim = simularCronogramaReunion(config)
      expect(sim.apertura.cancion).toBe('7:00')
      expect(sim.tb.discurso).toBe('7:05')
      expect(sim.smtHoras[0]).toBe('7:30')
      expect(sim.vc.cancion).toBe('7:45')
      expect(sim.vc.partesHoras[0]).toBe('7:50')
      expect(sim.meta).toBeDefined()
      expect(sim.meta.duracionTotalMin).toBeLessThanOrEqual(105)
      expect(sim.meta.esExceso105Min).toBe(false)
    })

    it('detecta correctamente exceso del umbral de 105 minutos', () => {
      const configExcesiva = {
        horaReunionEntreSemana: '19:00',
        horarioModoTb: 'dinamico',
        horarioOffsetSmt: 50,
        horarioModoSmt: 'dinamico',
        horarioOffsetCancionVc: 75,
        horarioOffsetVc: 85,
        horarioModoVc: 'dinamico',
        margenTransicionMin: 3,
      }
      const sim = simularCronogramaReunion(configExcesiva)
      expect(sim.meta.duracionTotalMin).toBeGreaterThan(105)
      expect(sim.meta.esExceso105Min).toBe(true)
      expect(sim.meta.diferencia105Min).toBeGreaterThan(0)
    })
  })

  describe('parseHoraFlexible e inferencia inteligente de AM/PM', () => {
    it('infiere tarde (PM) si la reunión base es vespertina', () => {
      // Base a las 19:30, usuario escribe 7:05 -> 19:05
      expect(parseHoraFlexible('7:05', '19:30')).toBe(19 * 60 + 5)
      expect(parseHoraFlexible('7:32', '19:00')).toBe(19 * 60 + 32)
      expect(parseHoraFlexible('19:05', '19:30')).toBe(19 * 60 + 5)
    })

    it('respeta mañana (AM) si la reunión base es matutina', () => {
      // Base a las 09:30, usuario escribe 9:35 -> 09:35
      expect(parseHoraFlexible('9:35', '09:30')).toBe(9 * 60 + 35)
      expect(parseHoraFlexible('10:15', '09:30')).toBe(10 * 60 + 15)
    })

    it('respeta sufijos explícitos am / pm', () => {
      expect(parseHoraFlexible('7:00 am', '19:00')).toBe(7 * 60)
      expect(parseHoraFlexible('7:00 pm', '09:00')).toBe(19 * 60)
    })
  })

  describe('Lienzo S-140 con personalización fina por fila (ESTÁTICO / DINÁMICO)', () => {
    it('retorna filasDetalladas con modo y etiquetas para cada asignación', () => {
      const sim = simularCronogramaReunion({ horaReunionEntreSemana: '19:30' })
      expect(sim.filasDetalladas).toBeInstanceOf(Array)
      expect(sim.filasDetalladas.length).toBeGreaterThan(10)

      const filaCancion = sim.filasDetalladas.find(f => f.id === 'apertura_cancion')
      expect(filaCancion).toBeDefined()
      expect(filaCancion.modo).toBe('estatico')
      expect(filaCancion.hora12).toBe('7:30')

      const filaTb = sim.filasDetalladas.find(f => f.id === 'tb_discurso')
      expect(filaTb).toBeDefined()
      expect(filaTb.seccion).toBe('TB')
      expect(filaTb.hora12).toBe('7:35')
    })

    it('permite sobrescribir una fila como ESTÁTICO a una hora fija y las siguientes DINÁMICAS recalculan en cascada', () => {
      // Simulador estándar con 3 partes SMT (3m, 4m, 5m), margen 1m.
      // SMT normalmente iniciaría a las 7:30.
      // Si el usuario fija smt_0 a las 7:32:
      // smt_0: 7:32 (3m + 1m margen) -> termina 7:35 + 1m = 7:36
      // smt_1: 7:36 (4m + 1m margen) -> termina 7:40 + 1m = 7:41
      // smt_2: 7:41
      const configConOverride = {
        horaReunionEntreSemana: '19:00',
        horarioPersonalizadoFilas: {
          smt_0: { modo: 'estatico', hora: '7:32' },
        },
      }

      const sim = simularCronogramaReunion(configConOverride)
      const smt0 = sim.filasDetalladas.find(f => f.id === 'smt_0')
      const smt1 = sim.filasDetalladas.find(f => f.id === 'smt_1')
      const smt2 = sim.filasDetalladas.find(f => f.id === 'smt_2')

      expect(smt0.modo).toBe('estatico')
      expect(smt0.hora12).toBe('7:32')

      expect(smt1.modo).toBe('dinamico')
      expect(smt1.hora12).toBe('7:36')

      expect(smt2.modo).toBe('dinamico')
      expect(smt2.hora12).toBe('7:41')
    })

    it('permite forzar una fila previamente estática a DINÁMICO calculándose desde el cursor previo', () => {
      // TB normalmente tiene lectura de la biblia como estática (7:25 en reunión 19:00)
      // Si forzamos tb_lectura a modo: 'dinamico':
      // tb_discurso (10m) 7:05 -> 7:15
      // tb_perlas (10m) 7:15 -> 7:25
      // tb_lectura dinámico = 7:25
      const configDinamica = {
        horaReunionEntreSemana: '19:00',
        horarioPersonalizadoFilas: {
          tb_lectura: { modo: 'dinamico' },
        },
      }

      const sim = simularCronogramaReunion(configDinamica)
      const tbLectura = sim.filasDetalladas.find(f => f.id === 'tb_lectura')
      expect(tbLectura.modo).toBe('dinamico')
      expect(tbLectura.hora12).toBe('7:25')
    })
  })
})
