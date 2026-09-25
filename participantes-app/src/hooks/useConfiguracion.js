import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const CONFIG_DEFAULTS = {
  nombreCongregacion: 'Congregacion del Recreo',
  diaReunionEntreSemana: 'Martes',
  horaReunionEntreSemana: '19:30',
  diaReunionFinSemana: 'Sábado',
  horaReunionFinSemana: '18:00',
  anioEnCurso: new Date().getFullYear().toString(),
  circuito: '',
  salaAuxiliarHabilitada: false,
  direccionSalon: '',
}

export function parseConfigRows(rows) {
  if (!Array.isArray(rows)) return { ...CONFIG_DEFAULTS }

  const map = {}
  rows.forEach(r => {
    if (r?.clave) {
      map[r.clave] = r.valor
    }
  })

  return {
    nombreCongregacion: map.nombre_congregacion?.trim() || CONFIG_DEFAULTS.nombreCongregacion,
    diaReunionEntreSemana: map.dia_reunion_entre_semana?.trim() || CONFIG_DEFAULTS.diaReunionEntreSemana,
    horaReunionEntreSemana: map.hora_reunion_entre_semana?.trim() || CONFIG_DEFAULTS.horaReunionEntreSemana,
    diaReunionFinSemana: map.dia_reunion_fin_semana?.trim() || CONFIG_DEFAULTS.diaReunionFinSemana,
    horaReunionFinSemana: map.hora_reunion_fin_semana?.trim() || CONFIG_DEFAULTS.horaReunionFinSemana,
    anioEnCurso: map.anio_en_curso?.trim() || CONFIG_DEFAULTS.anioEnCurso,
    circuito: map.circuito?.trim() || '',
    salaAuxiliarHabilitada: map.sala_auxiliar_habilitada === 'true',
    direccionSalon: map.direccion_salon?.trim() || '',
  }
}

export function useConfiguracion() {
  const [config, setConfig] = useState(() => {
    const cached = localStorage.getItem('app_config_cache')
    if (cached) {
      try {
        return { ...CONFIG_DEFAULTS, ...JSON.parse(cached) }
      } catch {
        return { ...CONFIG_DEFAULTS }
      }
    }
    return { ...CONFIG_DEFAULTS }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchConfig = useCallback(async () => {
    try {
      setError(null)
      const { data, error: err } = await supabase.from('configuracion').select('*')
      if (err) throw err

      const parsed = parseConfigRows(data || [])
      setConfig(parsed)
      localStorage.setItem('app_config_cache', JSON.stringify(parsed))
    } catch (err) {
      console.warn('[useConfiguracion] Error al obtener configuracion:', err)
      setError(err?.message || 'Error al sincronizar configuración')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()

    // Suscripción Realtime para propagar cambios instantáneamente a todas las pestañas
    const canal = supabase
      .channel('configuracion-global-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'configuracion' },
        () => fetchConfig()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [fetchConfig])

  const guardarConfiguracion = useCallback(async (nuevosValores) => {
    setSaving(true)
    setError(null)
    try {
      const rowsToUpsert = [
        { clave: 'nombre_congregacion', valor: String(nuevosValores.nombreCongregacion || '').trim() },
        { clave: 'dia_reunion_entre_semana', valor: String(nuevosValores.diaReunionEntreSemana || 'Martes').trim() },
        { clave: 'hora_reunion_entre_semana', valor: String(nuevosValores.horaReunionEntreSemana || '19:30').trim() },
        { clave: 'dia_reunion_fin_semana', valor: String(nuevosValores.diaReunionFinSemana || 'Sábado').trim() },
        { clave: 'hora_reunion_fin_semana', valor: String(nuevosValores.horaReunionFinSemana || '18:00').trim() },
        { clave: 'anio_en_curso', valor: String(nuevosValores.anioEnCurso || new Date().getFullYear()).trim() },
        { clave: 'circuito', valor: String(nuevosValores.circuito || '').trim() },
        { clave: 'sala_auxiliar_habilitada', valor: nuevosValores.salaAuxiliarHabilitada ? 'true' : 'false' },
        { clave: 'direccion_salon', valor: String(nuevosValores.direccionSalon || '').trim() },
        { clave: 'configuracion_inicial_completada', valor: 'true' },
      ]

      const { error: upsertErr } = await supabase
        .from('configuracion')
        .upsert(rowsToUpsert, { onConflict: 'clave' })

      if (upsertErr) throw upsertErr

      const updated = {
        nombreCongregacion: nuevosValores.nombreCongregacion?.trim() || CONFIG_DEFAULTS.nombreCongregacion,
        diaReunionEntreSemana: nuevosValores.diaReunionEntreSemana || CONFIG_DEFAULTS.diaReunionEntreSemana,
        horaReunionEntreSemana: nuevosValores.horaReunionEntreSemana || CONFIG_DEFAULTS.horaReunionEntreSemana,
        diaReunionFinSemana: nuevosValores.diaReunionFinSemana || CONFIG_DEFAULTS.diaReunionFinSemana,
        horaReunionFinSemana: nuevosValores.horaReunionFinSemana || CONFIG_DEFAULTS.horaReunionFinSemana,
        anioEnCurso: nuevosValores.anioEnCurso || CONFIG_DEFAULTS.anioEnCurso,
        circuito: nuevosValores.circuito?.trim() || '',
        salaAuxiliarHabilitada: !!nuevosValores.salaAuxiliarHabilitada,
        direccionSalon: nuevosValores.direccionSalon?.trim() || '',
      }

      setConfig(updated)
      localStorage.setItem('app_config_cache', JSON.stringify(updated))
      localStorage.setItem('onboarding_step1', 'true')
      window.dispatchEvent(new CustomEvent('configuracion-actualizada', { detail: updated }))
      return { ok: true, data: updated }
    } catch (err) {
      console.error('[useConfiguracion] Error guardando:', err)
      setError(err?.message || 'Error al guardar configuración')
      return { ok: false, error: err }
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    config,
    loading,
    saving,
    error,
    recargar: fetchConfig,
    guardarConfiguracion,
  }
}
