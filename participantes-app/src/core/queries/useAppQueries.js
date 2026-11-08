import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getImpactoEventoSemana } from '../../lib/fechas'
import { parseConfigRows, CONFIG_DEFAULTS } from '../../hooks/useConfiguracion'
import { QUERY_KEYS } from '../queryClient'

export async function fetchPersonasList() {
  const { data, error } = await supabase.from('personas').select('*').order('nombre')
  if (error) throw error
  return data || []
}

export async function fetchParticipacionesList() {
  const { data, error } = await supabase
    .from('participaciones')
    .select('*')
    .order('id', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchSemanasList() {
  const { data, error } = await supabase
    .from('programa_semanas')
    .select('*')
    .order('fecha_inicio')
  if (error) throw error
  return data || []
}

export async function fetchPartesList() {
  const { data, error } = await supabase
    .from('programa_partes')
    .select('*')
    .order('numero_parte')
  if (error) throw error
  return data || []
}

export async function fetchAsignacionesList() {
  const { data, error } = await supabase.from('programa_asignaciones').select('*')
  if (error) throw error
  return data || []
}

export async function fetchProgramaBundle() {
  const [semanas, partes, asignaciones] = await Promise.all([
    fetchSemanasList(),
    fetchPartesList(),
    fetchAsignacionesList(),
  ])

  return {
    semanas,
    partes,
    asignaciones,
  }
}

export async function fetchConfiguracionObj() {
  const { data, error } = await supabase.from('configuracion').select('clave, valor')
  if (error) throw error
  const parsed = parseConfigRows(data || [])
  try {
    localStorage.setItem('app_config_cache', JSON.stringify(parsed))
  } catch {
    // ignore storage quota errors
  }
  return parsed
}

export function usePersonasQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.personas,
    queryFn: fetchPersonasList,
    ...options,
  })
}

export function useParticipacionesQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.participaciones,
    queryFn: fetchParticipacionesList,
    ...options,
  })
}

export function useSemanasQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.programaSemanas,
    queryFn: fetchSemanasList,
    ...options,
  })
}
export const useProgramaSemanasQuery = useSemanasQuery

export function usePartesQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.programaPartes,
    queryFn: fetchPartesList,
    ...options,
  })
}
export const useProgramaPartesQuery = usePartesQuery

export function useAsignacionesQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.programaAsignaciones,
    queryFn: fetchAsignacionesList,
    ...options,
  })
}
export const useProgramaAsignacionesQuery = useAsignacionesQuery

export function useProgramaBundleQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.programaBundle,
    queryFn: fetchProgramaBundle,
    ...options,
  })
}

export function useConfiguracionQuery(options = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.configuracion,
    queryFn: fetchConfiguracionObj,
    initialData: () => {
      try {
        const cached = localStorage.getItem('app_config_cache')
        return cached ? { ...CONFIG_DEFAULTS, ...JSON.parse(cached) } : undefined
      } catch {
        return undefined
      }
    },
    ...options,
  })
}

/**
 * Calcula reactivamente el número de semanas pendientes reutilizando la caché de TanStack Query,
 * evitando descargar 6 tablas duplicadas en App.jsx.
 */
export function useSemanasPendientesCount(eventos = []) {
  const { data: sem = [] } = useSemanasQuery()
  const { data: partes = [] } = usePartesQuery()
  const { data: asignaciones = [] } = useAsignacionesQuery()
  const { data: participaciones = [] } = useParticipacionesQuery()
  const { data: config = CONFIG_DEFAULTS } = useConfiguracionQuery()

  return useMemo(() => {
    if (sem.length === 0) return 0

    const diaEntre = config?.diaReunionEntreSemana || 'Martes'
    const diaFin = config?.diaReunionFinSemana || 'Sábado'

    // Índice O(1) de participaciones por id para evitar .find() lineal repetido
    const historialById = new Map()
    for (const h of participaciones) {
      if (h?.id != null) historialById.set(h.id, h)
    }

    const TIPOS_SOLO_VISUAL = new Set(['SMT_VACIO', 'ORACION', 'CONCLU'])
    let pendientes = 0

    for (const s of sem) {
      const impacto = getImpactoEventoSemana(s, eventos, diaEntre, diaFin)
      if (impacto.cancelaEntreSemana) continue

      const partesSemana = partes.filter(
        p => p.semana_id === s.id && !TIPOS_SOLO_VISUAL.has(p.tipo_asignacion)
      )
      const totalPartes = partesSemana.length
      if (totalPartes === 0) continue

      const confirmadas = partesSemana.filter(p => {
        const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
        const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')
        if (!asigP?.clave || !asigP.confirmado) return false

        const pr = asigP.participacion_id ? historialById.get(asigP.participacion_id) : null
        const ar = asigA?.participacion_id ? historialById.get(asigA.participacion_id) : null
        const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
        const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
        const aNuevo = p.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
        const aRem = p.requiere_ayudante && !asigA?.clave && ar
        const necesitaRec = pCambio || aCambio || aNuevo || aRem

        return !necesitaRec
      }).length

      if (confirmadas < totalPartes) {
        pendientes++
      }
    }

    return pendientes
  }, [sem, partes, asignaciones, participaciones, config, eventos])
}
