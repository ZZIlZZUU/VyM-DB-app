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

  function extraerMetaVisitante(descripcion) {
    if (!descripcion) return { nombre_visitante: '', oracion_visitante: true }
    const match = descripcion.match(/\[VISITANTE:\s*([^\]|]+)(?:\|\s*ORACION:\s*(true|false))?\]/)
    if (match) {
      return {
        nombre_visitante: match[1]?.trim() || '',
        oracion_visitante: match[2] ? match[2] === 'true' : true,
      }
    }
    return { nombre_visitante: '', oracion_visitante: true }
  }

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

      const procesados = (data || []).map(row => {
        const meta = extraerMetaVisitante(row.descripcion)
        return {
          ...row,
          nombre_visitante: row.nombre_visitante || meta.nombre_visitante || '',
          oracion_visitante: row.oracion_visitante != null ? row.oracion_visitante : meta.oracion_visitante,
        }
      })

      setEventos(procesados)
      localStorage.setItem('app_eventos_cache', JSON.stringify(procesados))
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
      const nombreVisitante = evento.nombre_visitante?.trim() || ''
      const oracionVisitante = evento.oracion_visitante !== false

      // Enriquecer descripción con metadatos para redundancia y fallback seguro
      let descFinal = evento.descripcion?.trim() || ''
      if (nombreVisitante) {
        descFinal = descFinal.replace(/\[VISITANTE:[^\]]+\]/, '').trim()
        const tag = `[VISITANTE: ${nombreVisitante} | ORACION: ${oracionVisitante}]`
        descFinal = descFinal ? `${descFinal} ${tag}` : tag
      } else {
        descFinal = descFinal.replace(/\[VISITANTE:[^\]]+\]/, '').trim()
      }

      const payloadConColumnas = {
        semana_id: evento.semana_id || null,
        tipo_evento: evento.tipo_evento,
        titulo_evento: evento.titulo_evento?.trim(),
        fecha_original: evento.fecha_original || null,
        fecha_efectiva: evento.fecha_efectiva || null,
        hora_efectiva: evento.hora_efectiva || null,
        afecta_reunion: evento.afecta_reunion || 'entre_semana',
        descripcion: descFinal || null,
        nombre_visitante: nombreVisitante || null,
        oracion_visitante: oracionVisitante,
      }

      const payloadSinColumnas = {
        semana_id: evento.semana_id || null,
        tipo_evento: evento.tipo_evento,
        titulo_evento: evento.titulo_evento?.trim(),
        fecha_original: evento.fecha_original || null,
        fecha_efectiva: evento.fecha_efectiva || null,
        hora_efectiva: evento.hora_efectiva || null,
        afecta_reunion: evento.afecta_reunion || 'entre_semana',
        descripcion: descFinal || null,
      }

      let res
      const intentarGuardar = async (payload) => {
        if (evento.id) {
          return await supabase
            .from('eventos_reunion')
            .update(payload)
            .eq('id', evento.id)
            .select()
            .single()
        } else {
          return await supabase
            .from('eventos_reunion')
            .insert([payload])
            .select()
            .single()
        }
      }

      // Intentar primero con las nuevas columnas
      res = await intentarGuardar(payloadConColumnas)

      // Si falla por columna no encontrada en BD (migración no ejecutada aún), reintentar sin columnas
      if (res.error && res.error.message?.includes('column') && res.error.message?.includes('visitante')) {
        console.warn('[useEventosReunion] Columnas nuevas no encontradas en DB, usando fallback en descripcion')
        res = await intentarGuardar(payloadSinColumnas)
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
