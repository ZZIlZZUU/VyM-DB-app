// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  TABLA_LABELS,
  getTablaLabel,
  buildUsuariosByEmailMap,
  isLogSistema,
  resolveAutorLog,
  normalizarTextoBusqueda,
  sugerirPersonaParaUsuario,
  clasificarAsignacionesUsuario,
  formatProximidadDias,
  loadDismissedPastAsignacionIds,
  saveDismissedPastAsignacionIds,
  buildAsignacionTextoRecordatorio,
  buildAsignacionIcs,
} from './auditoria'

describe('auditoria', () => {
  describe('getTablaLabel', () => {
    it('retorna etiquetas legibles y hace fallback seguro al nombre crudo', () => {
      expect(getTablaLabel('participaciones')).toBe(TABLA_LABELS.participaciones)
      expect(getTablaLabel('programa_asignaciones')).toBe('Asignaciones')
      expect(getTablaLabel('otra_tabla')).toBe('otra_tabla')
      expect(getTablaLabel('')).toBe('—')
    })
  })

  describe('resolveAutorLog e isLogSistema', () => {
    const usuariosMap = buildUsuariosByEmailMap([
      { email: 'Carlos.Mendoza@Recreo.app', nombre: 'Carlos Mendoza', rol: 'admin' },
      { email: 'ana.ruiz@recreo.app', nombre: 'Ana Ruiz', rol: 'editor' },
    ])

    it('detecta registros sin email o marcados como sistema', () => {
      expect(isLogSistema({ usuario_email: null })).toBe(true)
      expect(isLogSistema({ usuario_email: '' })).toBe(true)
      expect(isLogSistema({ usuario_email: 'Sistema' })).toBe(true)
      expect(isLogSistema({ usuario_email: 'postgres' })).toBe(true)
      expect(isLogSistema({ usuario_email: 'ana.ruiz@recreo.app' })).toBe(false)

      expect(resolveAutorLog({ usuario_email: null }, usuariosMap)).toEqual({
        esSistema: true,
        nombre: 'Sistema',
        email: null,
        rol: null,
        iniciales: 'SY',
        labelCorto: 'Sistema',
      })
    })

    it('resuelve nombre, rol e iniciales sin importar mayúsculas/minúsculas del email', () => {
      expect(
        resolveAutorLog({ usuario_email: 'carlos.mendoza@recreo.app' }, usuariosMap)
      ).toEqual({
        esSistema: false,
        nombre: 'Carlos Mendoza',
        email: 'carlos.mendoza@recreo.app',
        rol: 'admin',
        iniciales: 'CM',
        labelCorto: 'Carlos Mendoza',
      })

      expect(
        resolveAutorLog({ usuario_email: 'ana.ruiz@recreo.app' }, usuariosMap)
      ).toMatchObject({
        esSistema: false,
        nombre: 'Ana Ruiz',
        rol: 'editor',
        iniciales: 'AR',
      })
    })

    it('usa la parte local del correo cuando el usuario ya no está en usuarios_autorizados', () => {
      expect(
        resolveAutorLog({ usuario_email: 'invitado.antiguo@recreo.app' }, usuariosMap)
      ).toEqual({
        esSistema: false,
        nombre: 'invitado.antiguo',
        email: 'invitado.antiguo@recreo.app',
        rol: null,
        iniciales: 'IN',
        labelCorto: 'invitado.antiguo',
      })
    })
  })

  describe('normalizarTextoBusqueda y sugerirPersonaParaUsuario', () => {
    const personas = [
      { clave: 'A-001', nombre: 'José Pérez', activo: false },
      { clave: 'A-002', nombre: 'José Pérez González', activo: true },
      { clave: 'M-010', nombre: 'Marta García', activo: true },
    ]

    it('normaliza tildes y espacios', () => {
      expect(normalizarTextoBusqueda('  José   Pérez  ')).toBe('jose perez')
    })

    it('encuentra coincidencias ignorando tildes y priorizando participantes activos', () => {
      const exacto = sugerirPersonaParaUsuario(personas, 'Jose Perez')
      expect(exacto?.clave).toBe('A-001')

      const porTokens = sugerirPersonaParaUsuario(personas, 'Jose Gonzalez')
      expect(porTokens?.clave).toBe('A-002')

      const porNombreCompleto = sugerirPersonaParaUsuario(personas, 'Marta Garcia')
      expect(porNombreCompleto?.clave).toBe('M-010')
    })

    it('evita falsos positivos con textos muy cortos', () => {
      expect(sugerirPersonaParaUsuario(personas, 'Jo', 'j@test.com')).toBeNull()
    })
  })

  describe('clasificarAsignacionesUsuario', () => {
    const asignaciones = [
      {
        id: 1,
        programa_partes: {
          titulo: 'Lejana',
          programa_semanas: { id: 's3', fecha_inicio: '2026-12-07', fecha_fin: '2026-12-13' },
        },
      },
      {
        id: 2,
        programa_partes: {
          titulo: 'Pasada antigua',
          programa_semanas: { id: 's0', fecha_inicio: '2026-10-05', fecha_fin: '2026-10-11' },
        },
      },
      {
        id: 3,
        programa_partes: {
          titulo: 'Semana actual',
          programa_semanas: { id: 's1', fecha_inicio: '2026-11-16', fecha_fin: '2026-11-22' },
        },
      },
      {
        id: 4,
        programa_partes: {
          titulo: 'Pasada reciente',
          programa_semanas: { id: 's0b', fecha_inicio: '2026-11-09', fecha_fin: '2026-11-15' },
        },
      },
      {
        id: 5,
        programa_partes: {
          titulo: 'Próxima',
          programa_semanas: { id: 's2', fecha_inicio: '2026-11-23', fecha_fin: '2026-11-29' },
        },
      },
    ]

    it('separa próximas (>= hoy) en orden ascendente y pasadas en orden descendente según día de reunión', () => {
      // Con día por defecto (Martes): semana s1 (2026-11-16..22) tuvo su reunión el 2026-11-17 (< 2026-11-19) -> pasa a pasadas
      const { proximas, pasadas } = clasificarAsignacionesUsuario(asignaciones, '2026-11-19')
      expect(proximas.map(a => a.id)).toEqual([5, 1])
      expect(pasadas.map(a => a.id)).toEqual([3, 4, 2])
    })

    it('mantiene la semana actual como próxima cuando la reunión configurada aún no ocurre o fue desplazada', () => {
      const juevesConfig = clasificarAsignacionesUsuario(asignaciones, '2026-11-19', {
        diaReunionEntreSemana: 'Jueves',
      })
      expect(juevesConfig.proximas.map(a => a.id)).toEqual([3, 5, 1])
      expect(juevesConfig.pasadas.map(a => a.id)).toEqual([4, 2])

      const desplazada = clasificarAsignacionesUsuario(asignaciones, '2026-11-19', {
        diaReunionEntreSemana: 'Martes',
        eventos: [
          {
            tipo_evento: 'reunion_desplazada',
            afecta_reunion: 'entre_semana',
            fecha_original: '2026-11-17',
            fecha_efectiva: '2026-11-20',
          },
        ],
      })
      expect(desplazada.proximas.map(a => a.id)).toEqual([3, 5, 1])
    })
  })

  describe('utilidades QoL de asignaciones (proximidad, descartes, recordatorio e .ics)', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('formatea la proximidad en días relativos correctamente', () => {
      expect(formatProximidadDias('2026-11-19', '2026-11-19')).toBe('Hoy')
      expect(formatProximidadDias('2026-11-20', '2026-11-19')).toBe('Mañana')
      expect(formatProximidadDias('2026-11-18', '2026-11-19')).toBe('Ayer')
      expect(formatProximidadDias('2026-11-24', '2026-11-19')).toBe('En 5 días')
      expect(formatProximidadDias('2026-11-14', '2026-11-19')).toBe('Hace 5 días')
    })

    it('persiste y carga asignaciones pasadas descartadas por correo', () => {
      const saved = saveDismissedPastAsignacionIds('User@Recreo.app', ['12', '18', '12'])
      expect(saved).toEqual(['12', '18'])
      expect(loadDismissedPastAsignacionIds('user@recreo.app')).toEqual(['12', '18'])
      expect(loadDismissedPastAsignacionIds('otro@recreo.app')).toEqual([])
    })

    it('construye recordatorio legible y evento VCALENDAR .ics válido', () => {
      const sampleAsig = {
        id: 42,
        rol: 'ayudante',
        programa_partes: {
          seccion: 'Seamos Mejores Maestros',
          titulo: 'Empiece conversaciones',
          duracion_min: 4,
          programa_semanas: { fecha_inicio: '2026-11-23', fecha_fin: '2026-11-29' },
        },
      }

      const texto = buildAsignacionTextoRecordatorio(sampleAsig, '2026-11-24')
      expect(texto).toContain('[Seamos Mejores Maestros] Empiece conversaciones (4 min)')
      expect(texto).toContain('Rol: Ayudante')
      expect(texto).toContain('Fecha de reunión: 2026-11-24')

      const ics = buildAsignacionIcs(sampleAsig, '2026-11-24', { horaReunion: '19:30' })
      expect(ics).toContain('BEGIN:VCALENDAR')
      expect(ics).toContain('BEGIN:VEVENT')
      expect(ics).toContain('DTSTART:20261124T193000')
      expect(ics).toContain('DTEND:20261124T193400')
      expect(ics).toContain('SUMMARY:Empiece conversaciones (Ayudante)')
      expect(ics).toContain('END:VCALENDAR')
    })
  })
})
