import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { CalendarioEventos } from './CalendarioEventos'

// Mock supabase and hooks
vi.mock('../lib/supabase', () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: () => ({}),
    from: () => ({
      select: () => ({ order: () => Promise.resolve({ data: [] }) }),
    }),
  },
}))

vi.mock('../hooks/useConfiguracion', () => ({
  useConfiguracion: () => ({
    config: {
      diaReunionEntreSemana: 'Martes',
      diaReunionFinSemana: 'Sábado',
      horaReunionEntreSemana: '19:30',
      horaReunionFinSemana: '18:00',
    },
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

describe('CalendarioEventos component rendering', () => {
  it('renderiza sin errores en modo standalone', () => {
    const html = renderToString(<CalendarioEventos standalone readOnly />)
    expect(html).toContain('Calendario de la Congregación')
  })

  it('renderiza sin errores cuando se monta dentro de Configuracion', () => {
    const html = renderToString(
      <CalendarioEventos
        eventos={[]}
        semanas={[]}
        diaReunionEntreSemana="Martes"
        diaReunionFinSemana="Sábado"
        config={{}}
        rol="admin"
      />
    )
    expect(html).toContain('Nuevo evento')
  })

  it('renderiza con eventos existentes', () => {
    const eventosMock = [
      {
        id: '1',
        tipo_evento: 'asamblea_regional',
        titulo_evento: 'Asamblea Regional 2026',
        fecha_original: '2026-10-16',
        fecha_efectiva: '2026-10-16',
      },
    ]
    const html = renderToString(
      <CalendarioEventos
        eventos={eventosMock}
        semanas={[]}
        diaReunionEntreSemana="Martes"
        diaReunionFinSemana="Sábado"
        config={{}}
        rol="admin"
      />
    )
    expect(html).toContain('Asamblea Regional 2026')
  })
})
