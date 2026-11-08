import { useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { MESES } from '../../lib/fechas'
import { usePersonasQuery, useParticipacionesQuery } from '../../core/queries/useAppQueries'
import { invalidateAppQueries, QUERY_KEYS } from '../../core/queryClient'
import { useConfiguracion } from '../useConfiguracion'
import { useEventosReunion } from '../useEventosReunion'
import { useToast } from '../useToast'
import { buildMatrizIndex, PESO_MAP, EMPTY_RECS } from '../../components/matriz/matrizUtils'

/**
 * Controlador Headless de la Matriz Anual (compartido por Escritorio y Móvil).
 * Usa la caché global de TanStack Query y un índice O(1) Map(clave -> mes -> registros[]).
 */
export function useMatrizController() {
  const { config } = useConfiguracion()
  const { eventos } = useEventosReunion()
  const { toast, success, error: toastError } = useToast()

  const {
    data: allPersonas = [],
    isLoading: loadingP,
    error: errP,
    refetch: refetchP,
  } = usePersonasQuery()

  const {
    data: rawRegistros = [],
    isLoading: loadingR,
    error: errR,
    refetch: refetchR,
  } = useParticipacionesQuery()

  const personas = useMemo(
    () => allPersonas.filter(p => p.activo),
    [allPersonas]
  )

  const registros = useMemo(
    () => [...rawRegistros].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || ''))),
    [rawRegistros]
  )

  const loading = loadingP || loadingR
  const fetchError = errP?.message || errR?.message || null

  const [tab, setTab] = useState('mat')
  const [heatMap, setHeatMap] = useState(false)

  // Filtros Matriculados
  const [searchMat, setSearchMat] = useState('')
  const [sexoFil, setSexoFil] = useState('')

  // Filtros Ancianos
  const [searchAnc, setSearchAnc] = useState('')
  const [ancEstatusFil, setAncEstatusFil] = useState('')

  // Filtro rápido de actividad ('todos' | 'sin_participacion')
  const [filtroActividad, setFiltroActividad] = useState('todos')

  // Tipos desactivados
  const [tiposDesactivados, setTiposDesactivados] = useState(() => new Set())

  // Modales
  const [matModal, setMatModal] = useState({ open: false, persona: null, mesIdx: 0 })
  const [ancModal, setAncModal] = useState({ open: false, persona: null, mesIdx: 0 })

  const currentMonthIdx = useMemo(() => new Date().getMonth(), [])

  const toggleTipo = useCallback((tipo) => {
    setTiposDesactivados(prev => {
      const next = new Set(prev)
      if (next.has(tipo)) {
        next.delete(tipo)
      } else {
        next.add(tipo)
      }
      return next
    })
  }, [])

  // Registros activos considerando tipos desactivados
  const registrosFiltrados = useMemo(() => {
    if (tiposDesactivados.size === 0) return registros
    return registros.filter(r => !tiposDesactivados.has(r.tipo))
  }, [registros, tiposDesactivados])

  // Índice O(1) precalculado: Map(clave -> Map(mes -> registros[])) y Map(clave -> total)
  const { byClaveMes: matrizIndex, totalByClave: totalesPorClave } = useMemo(
    () => buildMatrizIndex(registrosFiltrados),
    [registrosFiltrados]
  )

  const getCeldaRegistros = useCallback(
    (clave, mes) => matrizIndex.get(clave)?.get(mes) || EMPTY_RECS,
    [matrizIndex]
  )

  const getTotalPersona = useCallback(
    clave => totalesPorClave.get(clave) || 0,
    [totalesPorClave]
  )

  // Cálculo O(N) para mapa de calor usando totalesPorClave precalculado
  const maxRegistros = useMemo(() => {
    let max = 1
    for (const p of personas) {
      const count = totalesPorClave.get(p.clave) || 0
      if (count > max) max = count
    }
    return max
  }, [personas, totalesPorClave])

  // Filtrado de participantes usando el índice O(1)
  const matPersonas = useMemo(() => {
    const q = searchMat.trim().toLowerCase()
    return personas.filter(p => {
      if (p.lista !== 'Mat') return false
      if (q && !p.nombre.toLowerCase().includes(q) && !p.clave.toLowerCase().includes(q)) {
        return false
      }
      if (sexoFil && p.sexo !== sexoFil) return false
      if (filtroActividad === 'sin_participacion' && (totalesPorClave.get(p.clave) || 0) > 0) {
        return false
      }
      return true
    })
  }, [personas, searchMat, sexoFil, filtroActividad, totalesPorClave])

  const ancPersonas = useMemo(() => {
    const q = searchAnc.trim().toLowerCase()
    return personas.filter(p => {
      if (p.lista !== 'Anc/SM') return false
      if (q && !p.nombre.toLowerCase().includes(q) && !p.clave.toLowerCase().includes(q)) {
        return false
      }
      if (ancEstatusFil && p.estatus !== ancEstatusFil) return false
      if (filtroActividad === 'sin_participacion' && (totalesPorClave.get(p.clave) || 0) > 0) {
        return false
      }
      return true
    })
  }, [personas, searchAnc, ancEstatusFil, filtroActividad, totalesPorClave])

  const countSinPartMat = useMemo(
    () => personas.filter(p => p.lista === 'Mat' && (totalesPorClave.get(p.clave) || 0) === 0).length,
    [personas, totalesPorClave]
  )

  const countSinPartAnc = useMemo(
    () => personas.filter(p => p.lista === 'Anc/SM' && (totalesPorClave.get(p.clave) || 0) === 0).length,
    [personas, totalesPorClave]
  )

  const hasActiveFilters = Boolean(
    (tab === 'mat' ? searchMat : searchAnc) ||
      (tab === 'mat' ? sexoFil : ancEstatusFil) ||
      filtroActividad !== 'todos' ||
      tiposDesactivados.size > 0
  )

  const handleResetFilters = useCallback(() => {
    setSearchMat('')
    setSearchAnc('')
    setSexoFil('')
    setAncEstatusFil('')
    setFiltroActividad('todos')
    setTiposDesactivados(new Set())
  }, [])

  const openCellModal = useCallback(
    (persona, mesIdx) => {
      if (!persona) return
      if (persona.lista === 'Mat' || tab === 'mat') {
        setMatModal({ open: true, persona, mesIdx })
      } else {
        setAncModal({ open: true, persona, mesIdx })
      }
    },
    [tab]
  )

  const handleDelete = useCallback(
    async id => {
      try {
        const { error: err } = await supabase.from('participaciones').delete().eq('id', id)
        if (err) throw err
        success('Participación eliminada')
        invalidateAppQueries([QUERY_KEYS.participaciones])
      } catch (err) {
        console.error(err)
        toastError('Error al eliminar: ' + (err.message || 'Error de red'))
      }
    },
    [success, toastError]
  )

  const handleAncAdd = useCallback(
    async ({ persona, mesIdx, tipo, fecha, obs }) => {
      try {
        const { error: err } = await supabase.from('participaciones').insert({
          clave: persona.clave,
          nombre: persona.nombre,
          lista: persona.lista,
          fecha,
          mes: MESES[mesIdx],
          tipo,
          peso: PESO_MAP[tipo] || 1,
          observaciones: obs || null,
        })
        if (err) throw err
        success('Participación registrada')
        invalidateAppQueries([QUERY_KEYS.participaciones])
      } catch (err) {
        console.error(err)
        toastError('Error al agregar: ' + (err.message || 'Error de red'))
      }
    },
    [success, toastError]
  )

  const retryFetch = useCallback(() => {
    refetchP()
    refetchR()
  }, [refetchP, refetchR])

  return {
    config,
    eventos,
    toast,
    personas,
    registros,
    registrosFiltrados,
    loading,
    fetchError,
    retryFetch,
    tab,
    setTab,
    heatMap,
    setHeatMap,
    searchMat,
    setSearchMat,
    sexoFil,
    setSexoFil,
    searchAnc,
    setSearchAnc,
    ancEstatusFil,
    setAncEstatusFil,
    filtroActividad,
    setFiltroActividad,
    tiposDesactivados,
    toggleTipo,
    currentMonthIdx,
    matPersonas,
    ancPersonas,
    activePersonas: tab === 'mat' ? matPersonas : ancPersonas,
    countSinPartMat,
    countSinPartAnc,
    hasActiveFilters,
    handleResetFilters,
    maxRegistros,
    getCeldaRegistros,
    getTotalPersona,
    matModal,
    setMatModal,
    ancModal,
    setAncModal,
    openCellModal,
    handleDelete,
    handleAncAdd,
  }
}
