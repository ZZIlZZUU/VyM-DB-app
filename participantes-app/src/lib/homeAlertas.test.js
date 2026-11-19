// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  DISMISSED_ALERTS_STORAGE_KEY,
  loadDismissedAlertIds,
  saveDismissedAlertIds,
  countParticipacionesEnMes,
  sortPersonasPorEspera,
  buildHomeAlertas,
  buildLogResumenCorto,
} from './homeAlertas'

describe('homeAlertas', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('countParticipacionesEnMes y degradación de prioridad', () => {
    it('degrada programa_proximo_mes de danger (rojo) a warning (ámbar) cuando ya hay registros para ese mes', () => {
      const alertas = buildHomeAlertas({
        mesActual: 'Noviembre',
        anioActual: 2026,
        semanasProximoMes: [],
        proxMesInfo: { mes: 'Diciembre', anio: 2026 },
        participaciones: [
          { id: 1, fecha: '2026-12-01', mes: 'Diciembre', tipo: 'P', clave: 'A-001' },
          { id: 2, fecha: '2026-12-08', mes: 'Diciembre', tipo: 'T', clave: 'M-001' },
          { id: 3, fecha: '2025-12-02', mes: 'Diciembre', tipo: 'T', clave: 'M-002' },
        ],
      })

      expect(alertas).toHaveLength(1)
      expect(alertas[0]).toMatchObject({
        id: 'programa_proximo_mes_2026_Diciembre',
        tipo: 'warning',
        titulo: 'Programa de Diciembre sin EPUB (con registros)',
        secondaryLinkTexto: 'Ver semanas →',
      })
      expect(alertas[0].mensaje).toContain('2 asignación(es) registradas')
    })

    it('mantiene danger (rojo) si el próximo mes no tiene EPUB ni registros en el año correspondiente', () => {
      expect(
        countParticipacionesEnMes(
          [{ id: 1, fecha: '2025-12-02', mes: 'Diciembre' }],
          'Diciembre',
          2026
        )
      ).toBe(0)

      const alertas = buildHomeAlertas({
        mesActual: 'Noviembre',
        anioActual: 2026,
        semanasProximoMes: [],
        proxMesInfo: { mes: 'Diciembre', anio: 2026 },
        participaciones: [{ id: 1, fecha: '2025-12-02', mes: 'Diciembre' }],
      })

      expect(alertas).toHaveLength(1)
      expect(alertas[0].tipo).toBe('danger')
      expect(alertas[0].titulo).toBe('Programa de Diciembre sin cargar')
    })
  })

  describe('prioridad y roles', () => {
    it('ordena danger antes de warning e info y dirige eventoProximo según rol', () => {
      const called = []
      const nav = (view, params) => called.push({ view, params })

      const alertas = buildHomeAlertas({
        mesActual: 'Noviembre',
        anioActual: 2026,
        semanasIncompletasMesActual: [{ id: 's1' }],
        personasSinActividad2Meses: [{ clave: 'M-001' }],
        eventoProximo: { id: 9, titulo_evento: 'Asamblea', fecha_original: '2026-11-28' },
        semanasProximoMes: [],
        proxMesInfo: { mes: 'Diciembre', anio: 2026 },
        participaciones: [],
        rol: 'operador',
        onNavigate: nav,
      })

      expect(alertas.map(a => a.tipo)).toEqual(['danger', 'warning', 'info', 'info'])
      const evtAlert = alertas.find(a => a.id === 'evento_9')
      expect(evtAlert.linkTexto).toBe('Ver calendario →')
      evtAlert.onAction()
      expect(called[0]).toEqual({ view: 'calendario', params: undefined })
    })
  })

  describe('persistencia de descartes y ordenamiento de espera', () => {
    it('persiste y limpia IDs descartados en localStorage', () => {
      saveDismissedAlertIds(['personas_inactivas_2026_Noviembre'])
      expect(window.localStorage.getItem(DISMISSED_ALERTS_STORAGE_KEY)).toBeTruthy()
      expect(loadDismissedAlertIds()).toEqual(['personas_inactivas_2026_Noviembre'])

      saveDismissedAlertIds([])
      expect(loadDismissedAlertIds()).toEqual([])
    })

    it('ordena participantes rezagados poniendo primero a quienes no tienen registros y luego fecha más antigua', () => {
      const personas = [
        { clave: 'A', nombre: 'Zulema', activo: true },
        { clave: 'B', nombre: 'Ana', activo: true },
        { clave: 'C', nombre: 'Carlos', activo: true },
        { clave: 'D', nombre: 'Inactivo', activo: false },
      ]
      const participaciones = [
        { clave: 'A', fecha: '2026-08-10' },
        { clave: 'C', fecha: '2026-06-01' },
      ]
      const res = sortPersonasPorEspera(personas, participaciones, '2026-09-18')
      expect(res.map(p => p.clave)).toEqual(['B', 'C', 'A'])
    })

    it('construye un resumen corto legible para logs de bitácora', () => {
      expect(
        buildLogResumenCorto({
          registro_id: 42,
          datos_despues: JSON.stringify({
            nombre: 'Julio Arteaga',
            tipo: 'DSC',
            fecha: '2026-11-17',
          }),
        })
      ).toBe('Julio Arteaga · DSC · 17 nov 2026')
    })
  })
})
