import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import Configuracion from './Configuracion'
import { CalendarioEventos } from '../components/CalendarioEventos'

// Mock supabase and hooks
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => ({}),
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: [] }),
        eq: () => ({ single: () => Promise.resolve({ data: null }) }),
      }),
    }),
  },
}))

vi.mock('../hooks/useConfiguracion', () => ({
  useConfiguracion: () => ({
    config: {
      nombreCongregacion: 'Congregación Central',
      diaReunionEntreSemana: 'Martes',
      horaReunionEntreSemana: '19:30',
      diaReunionFinSemana: 'Sábado',
      horaReunionFinSemana: '18:00',
    },
    loading: false,
    saving: false,
    guardarConfiguracion: vi.fn(),
  }),
}))

vi.mock('../hooks/useEventosReunion', () => ({
  useEventosReunion: () => ({
    eventos: [],
    loading: false,
    saving: false,
    guardarEvento: vi.fn(),
    eliminarEvento: vi.fn(),
  }),
}))

describe('Configuracion tab eventos', () => {
  it('renderiza Configuracion', () => {
    const html = renderToString(<Configuracion onNavigate={() => {}} />)
    expect(html).toContain('Ajustes de la Congregación')
  })

  it('renderiza la pestaña eventos con eventos reales de la BD sin crashear', () => {
    const eventosReales = [
      {
        id: '2d3742ed-2fee-4c18-9c0c-466e006b4f67',
        semana_id: 'f3c258ad-6df6-453d-b884-0f9095990abb',
        tipo_evento: 'asamblea_regional',
        titulo_evento: 'Asamblea Regional',
        fecha_original: '2026-11-02',
        fecha_efectiva: '2026-10-17',
        hora_efectiva: null,
        afecta_reunion: 'fin_semana',
        descripcion: '[VISITANTE: Alejandro Guanaco Giordani | ORACION: true]',
        creado_por: null,
        creado_en: '2026-10-17T01:33:59.313812+00:00',
        nombre_visitante: 'Alejandro Guanaco Giordani',
        oracion_visitante: true,
      },
      {
        id: 'd9626e16-bf37-4b16-83ce-fcc8fd047cd7',
        semana_id: 'f3c258ad-6df6-453d-b884-0f9095990abb',
        tipo_evento: 'visita_sucursal',
        titulo_evento: 'Visita de Representante de Sucursal',
        fecha_original: '2026-11-02',
        fecha_efectiva: '2026-10-20',
        hora_efectiva: null,
        afecta_reunion: 'entre_semana',
        descripcion: '[VISITANTE: Alejandro Guanaco Giordani | ORACION: true]',
        creado_por: null,
        creado_en: '2026-10-17T01:40:16.191155+00:00',
        nombre_visitante: 'Alejandro Guanaco Giordani',
        oracion_visitante: true,
      },
    ]

    const html = renderToString(
      <CalendarioEventos
        eventos={eventosReales}
        semanas={[]}
        diaReunionEntreSemana="Martes"
        diaReunionFinSemana="Sábado"
        config={{
          nombreCongregacion: 'Congregacion del Recreo',
          diaReunionEntreSemana: 'Martes',
          horaReunionEntreSemana: '19:00',
          diaReunionFinSemana: 'Sábado',
          horaReunionFinSemana: '18:00',
          nombreSuperintendenteCircuito: 'Alejandro Guanaco Giordani',
        }}
        rol="admin"
      />
    )
    expect(html).toContain('Asamblea Regional')
    expect(html).toContain('Visita de Representante de Sucursal')
  })
})
