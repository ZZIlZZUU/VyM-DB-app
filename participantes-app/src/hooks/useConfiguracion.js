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
  // Parámetros avanzados de horarios y marcas de tiempo
  horarioModoTb: 'estatico',           // 'estatico' | 'dinamico'
  horarioOffsetSmt: 30,                // Minutos desde inicio hasta SMT
  horarioModoSmt: 'dinamico',          // 'estatico' | 'dinamico'
  horarioOffsetCancionVc: 45,          // Minutos desde inicio hasta cántico VC
  horarioOffsetVc: 50,                 // Minutos desde inicio hasta primer discurso VC
  horarioModoVc: 'estatico',           // 'estatico' | 'dinamico'
  margenTransicionMin: 1,              // Margen entre partes (0, 1, 2 min)
  duracionCierreMin: 8,                // Duración de conclusión + cántico + oración final
  horarioPersonalizadoFilas: null,     // Configuración personalizada por fila { [filaId]: { modo, hora } }
}

export function parseConfigRows(rows) {
  if (!Array.isArray(rows)) return { ...CONFIG_DEFAULTS }

  const map = {}
  rows.forEach(r => {
    if (r?.clave) {
      map[r.clave] = r.valor
    }
  })

  let horarioFilas = null
  if (map.horario_personalizado_filas) {
    try {
      horarioFilas = typeof map.horario_personalizado_filas === 'string'
        ? JSON.parse(map.horario_personalizado_filas)
        : map.horario_personalizado_filas
    } catch (e) {
      console.warn('[useConfiguracion] Error parseando horario_personalizado_filas:', e)
    }
  }

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
    horarioModoTb: map.horario_modo_tb?.trim() || CONFIG_DEFAULTS.horarioModoTb,
    horarioOffsetSmt: map.horario_offset_smt != null ? Number(map.horario_offset_smt) : CONFIG_DEFAULTS.horarioOffsetSmt,
    horarioModoSmt: map.horario_modo_smt?.trim() || CONFIG_DEFAULTS.horarioModoSmt,
    horarioOffsetCancionVc: map.horario_offset_cancion_vc != null ? Number(map.horario_offset_cancion_vc) : CONFIG_DEFAULTS.horarioOffsetCancionVc,
    horarioOffsetVc: map.horario_offset_vc != null ? Number(map.horario_offset_vc) : CONFIG_DEFAULTS.horarioOffsetVc,
    horarioModoVc: map.horario_modo_vc?.trim() || CONFIG_DEFAULTS.horarioModoVc,
    margenTransicionMin: map.margen_transicion_min != null ? Number(map.margen_transicion_min) : CONFIG_DEFAULTS.margenTransicionMin,
    duracionCierreMin: map.duracion_cierre_min != null ? Number(map.duracion_cierre_min) : CONFIG_DEFAULTS.duracionCierreMin,
    horarioPersonalizadoFilas: horarioFilas,
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
        { clave: 'horario_modo_tb', valor: String(nuevosValores.horarioModoTb || CONFIG_DEFAULTS.horarioModoTb).trim() },
        { clave: 'horario_offset_smt', valor: String(nuevosValores.horarioOffsetSmt ?? CONFIG_DEFAULTS.horarioOffsetSmt) },
        { clave: 'horario_modo_smt', valor: String(nuevosValores.horarioModoSmt || CONFIG_DEFAULTS.horarioModoSmt).trim() },
        { clave: 'horario_offset_cancion_vc', valor: String(nuevosValores.horarioOffsetCancionVc ?? CONFIG_DEFAULTS.horarioOffsetCancionVc) },
        { clave: 'horario_offset_vc', valor: String(nuevosValores.horarioOffsetVc ?? CONFIG_DEFAULTS.horarioOffsetVc) },
        { clave: 'horario_modo_vc', valor: String(nuevosValores.horarioModoVc || CONFIG_DEFAULTS.horarioModoVc).trim() },
        { clave: 'margen_transicion_min', valor: String(nuevosValores.margenTransicionMin ?? CONFIG_DEFAULTS.margenTransicionMin) },
        { clave: 'duracion_cierre_min', valor: String(nuevosValores.duracionCierreMin ?? CONFIG_DEFAULTS.duracionCierreMin) },
        { clave: 'horario_personalizado_filas', valor: JSON.stringify(nuevosValores.horarioPersonalizadoFilas || {}) },
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
        horarioModoTb: nuevosValores.horarioModoTb || CONFIG_DEFAULTS.horarioModoTb,
        horarioOffsetSmt: nuevosValores.horarioOffsetSmt != null ? Number(nuevosValores.horarioOffsetSmt) : CONFIG_DEFAULTS.horarioOffsetSmt,
        horarioModoSmt: nuevosValores.horarioModoSmt || CONFIG_DEFAULTS.horarioModoSmt,
        horarioOffsetCancionVc: nuevosValores.horarioOffsetCancionVc != null ? Number(nuevosValores.horarioOffsetCancionVc) : CONFIG_DEFAULTS.horarioOffsetCancionVc,
        horarioOffsetVc: nuevosValores.horarioOffsetVc != null ? Number(nuevosValores.horarioOffsetVc) : CONFIG_DEFAULTS.horarioOffsetVc,
        horarioModoVc: nuevosValores.horarioModoVc || CONFIG_DEFAULTS.horarioModoVc,
        margenTransicionMin: nuevosValores.margenTransicionMin != null ? Number(nuevosValores.margenTransicionMin) : CONFIG_DEFAULTS.margenTransicionMin,
        duracionCierreMin: nuevosValores.duracionCierreMin != null ? Number(nuevosValores.duracionCierreMin) : CONFIG_DEFAULTS.duracionCierreMin,
        horarioPersonalizadoFilas: nuevosValores.horarioPersonalizadoFilas || null,
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
