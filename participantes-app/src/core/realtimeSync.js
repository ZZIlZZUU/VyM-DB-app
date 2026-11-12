import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient, QUERY_KEYS } from './queryClient'

const TABLE_TO_QUERY_KEYS = {
  personas: [QUERY_KEYS.personas],
  participaciones: [QUERY_KEYS.participaciones],
  programa_semanas: [QUERY_KEYS.programaBundle, QUERY_KEYS.programaSemanas],
  programa_partes: [QUERY_KEYS.programaBundle, QUERY_KEYS.programaPartes],
  programa_asignaciones: [QUERY_KEYS.programaBundle, QUERY_KEYS.programaAsignaciones],
  configuracion: [QUERY_KEYS.configuracion],
  eventos_reunion: [QUERY_KEYS.eventosReunion],
  usuarios_autorizados: [QUERY_KEYS.userProfile, QUERY_KEYS.usuarios],
  historial_cambios: [['historial_cambios']],
}

export function notifyTableChanged(table, payload = null) {
  const keys = TABLE_TO_QUERY_KEYS[table] || []
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key })
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('vym-realtime-change', {
        detail: { table, payload },
      })
    )
  }
}

/**
 * Suscriptor único multiplexado de Supabase Realtime para toda la aplicación.
 * Evita abrir múltiples WebSockets duplicados por vista o por hook.
 */
export function useRealtimeCacheSync({ onStatusChange, onUserTableChange } = {}) {
  useEffect(() => {
    const channel = supabase
      .channel('vym-global-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        payload => {
          const table = payload?.table
          if (!table) return
          notifyTableChanged(table, payload)
          if (table === 'usuarios_autorizados') {
            onUserTableChange?.()
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') onStatusChange?.('conectado')
        if (status === 'CHANNEL_ERROR') onStatusChange?.('error')
        if (status === 'TIMED_OUT') onStatusChange?.('desconectado')
        if (status === 'CLOSED') onStatusChange?.('desconectado')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onStatusChange, onUserTableChange])
}
