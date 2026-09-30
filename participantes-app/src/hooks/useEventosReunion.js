import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useEventosReunion() {
  const [eventos, setEventos] = useState(() => {
    try {
      const cached = localStorage.getItem('app_eventos_cache')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchEventos = useCallback(async () => {
    try {
      setError(null)
      const { data, error: err } = await supabase
        .from('eventos_reunion')
        .select('*')
        .order('fecha_original', { ascending: true })

      if (err) {
        // Si la tabla no ha sido creada aún en Supabase, manejar con gracia
        console.warn('[useEventosReunion] Tabla no encontrada o error:', err.message)
        return
      }

      setEventos(data || [])
      localStorage.setItem('app_eventos_cache', JSON.stringify(data || []))
    } catch (err) {
      console.warn('[useEventosReunion] Excepción al obtener eventos:', err)
      setError(err?.message || 'Error al obtener eventos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEventos()

    const canal = supabase
      .channel('eventos-reunion-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventos_reunion' },
        () => fetchEventos()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [fetchEventos])

  const guardarEvento = useCallback(async (evento) => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        semana_id: evento.semana_id || null,
        tipo_evento: evento.tipo_evento,
        titulo_evento: evento.titulo_evento?.trim(),
        fecha_original: evento.fecha_original || null,
        fecha_efectiva: evento.fecha_efectiva || null,
        hora_efectiva: evento.hora_efectiva || null,
        afecta_reunion: evento.afecta_reunion || 'entre_semana',
        descripcion: evento.descripcion?.trim() || null,
      }

      let res
      if (evento.id) {
        res = await supabase
          .from('eventos_reunion')
          .update(payload)
          .eq('id', evento.id)
          .select()
          .single()
      } else {
        res = await supabase
          .from('eventos_reunion')
          .insert([payload])
          .select()
          .single()
      }

      if (res.error) throw res.error

      await fetchEventos()
      return { ok: true, data: res.data }
    } catch (err) {
      console.error('[useEventosReunion] Error guardando evento:', err)
      setError(err?.message || 'Error al guardar evento')
      return { ok: false, error: err }
    } finally {
      setSaving(false)
    }
  }, [fetchEventos])

  const eliminarEvento = useCallback(async (id) => {
    setSaving(true)
    setError(null)
    try {
      const { error: delErr } = await supabase
        .from('eventos_reunion')
        .delete()
        .eq('id', id)

      if (delErr) throw delErr

      await fetchEventos()
      return { ok: true }
    } catch (err) {
      console.error('[useEventosReunion] Error eliminando evento:', err)
      setError(err?.message || 'Error al eliminar evento')
      return { ok: false, error: err }
    } finally {
      setSaving(false)
    }
  }, [fetchEventos])

  return {
    eventos,
    loading,
    saving,
    error,
    recargar: fetchEventos,
    guardarEvento,
    eliminarEvento,
  }
}
