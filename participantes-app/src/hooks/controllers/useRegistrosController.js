import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { MESES, formatFechaLegible } from '../../lib/fechas'
import { usePersonasQuery, useParticipacionesQuery } from '../../core/queries/useAppQueries'
import { invalidateAppQueries, QUERY_KEYS } from '../../core/queryClient'
import { useToast } from '../useToast'
import { useConfirm } from '../useConfirm'
import { getTiposPermitidos, PESO_MAP } from '../../components/matriz/matrizUtils'

export function getMes(fecha) {
  if (!fecha) return ''
  const mi = parseInt(fecha.split('-')[1] || 0, 10) - 1
  return MESES[mi] || ''
}

const FORM_EMPTY = { clave: '', fecha: '', tipo: '', observaciones: '' }

export function useRegistrosController({ initialOpenCreate = false, onSheetClosed } = {}) {
  const { toast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()

  const {
    data: allPersonas = [],
    isLoading: loadingP,
    error: errP,
    refetch: refetchP,
  } = usePersonasQuery()

  const {
    data: rawParticipaciones = [],
    isLoading: loadingR,
    error: errR,
    refetch: refetchR,
  } = useParticipacionesQuery()

  const personas = useMemo(
    () => allPersonas.filter(p => p.activo),
    [allPersonas]
  )

  const participaciones = useMemo(
    () => [...rawParticipaciones].sort((a, b) => (b.id || 0) - (a.id || 0)),
    [rawParticipaciones]
  )

  const loading = loadingP || loadingR
  const fetchError = errP?.message || errR?.message || null

  const [form, setForm] = useState(FORM_EMPTY)
  const [isSheetOpen, setIsSheetOpen] = useState(initialOpenCreate)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  const [search, setSearchState] = useState('')
  const [filterMes, setFilterMesState] = useState(
    () => localStorage.getItem('registros_filterMes') ?? ''
  )
  const [filterLista, setFilterListaState] = useState(
    () => localStorage.getItem('registros_filterLista') ?? ''
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(
    () => Number(localStorage.getItem('registros_pageSize')) || 50
  )
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [bulkTipo, setBulkTipo] = useState('')

  useEffect(() => {
    if (!initialOpenCreate) return
    const timer = setTimeout(() => {
      setEditId(null)
      setForm(FORM_EMPTY)
      setIsSheetOpen(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [initialOpenCreate])

  const setSearch = useCallback(val => {
    setSearchState(val)
    setPage(1)
    setSeleccionados(new Set())
  }, [])

  const setFilterMes = useCallback(val => {
    setFilterMesState(val)
    try {
      localStorage.setItem('registros_filterMes', val)
    } catch {
      // ignore
    }
    setPage(1)
    setSeleccionados(new Set())
  }, [])

  const setFilterLista = useCallback(val => {
    setFilterListaState(val)
    try {
      localStorage.setItem('registros_filterLista', val)
    } catch {
      // ignore
    }
    setPage(1)
    setSeleccionados(new Set())
  }, [])

  const setPageSize = useCallback(val => {
    const num = Number(val) || 50
    setPageSizeState(num)
    try {
      localStorage.setItem('registros_pageSize', String(num))
    } catch {
      // ignore
    }
    setPage(1)
  }, [])

  const personaSeleccionada = useMemo(
    () => personas.find(p => p.clave === form.clave) || null,
    [personas, form.clave]
  )
  const tiposPermitidos = useMemo(
    () => getTiposPermitidos(personaSeleccionada),
    [personaSeleccionada]
  )

  const handlePersonaChange = useCallback(
    clave => {
      const p = personas.find(x => x.clave === clave)
      const tipos = getTiposPermitidos(p)
      setForm(f => ({
        ...f,
        clave,
        tipo: tipos.includes(f.tipo) ? f.tipo : '',
      }))
    },
    [personas]
  )

  const startCreate = useCallback(() => {
    setEditId(null)
    setForm(FORM_EMPTY)
    setIsSheetOpen(true)
  }, [])

  const startEdit = useCallback(registro => {
    setEditId(registro.id)
    setForm({
      clave: registro.clave || '',
      fecha: registro.fecha || '',
      tipo: registro.tipo || '',
      observaciones: registro.observaciones || '',
    })
    setIsSheetOpen(true)
  }, [])

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false)
    setEditId(null)
    onSheetClosed?.()
  }, [onSheetClosed])

  const handleSave = async () => {
    if (!form.clave || !form.fecha || !form.tipo) {
      toastError('Por favor completa los campos requeridos (participante, fecha y tipo)')
      return
    }

    const yaTieneEnFecha = participaciones.find(
      r => r.clave === form.clave && r.fecha === form.fecha && r.id !== editId
    )
    if (yaTieneEnFecha) {
      const proceed = await confirm({
        title: 'Participación en la misma fecha',
        message: `${personaSeleccionada?.nombre || form.clave} ya tiene una participación registrada el ${formatFechaLegible(form.fecha)} (${yaTieneEnFecha.tipo}). ¿Deseas registrar esta asignación adicional de todas formas?`,
        danger: false,
      })
      if (!proceed) return
    }

    setSaving(true)
    const p = personaSeleccionada
    const mes = getMes(form.fecha)
    const payload = {
      clave: form.clave,
      nombre: p ? p.nombre : form.nombre || '',
      lista: p ? p.lista : 'Mat',
      fecha: form.fecha,
      mes,
      tipo: form.tipo,
      peso: PESO_MAP[form.tipo] ?? 1,
      observaciones: form.observaciones.trim() || null,
    }

    try {
      if (editId) {
        const { error: err } = await supabase
          .from('participaciones')
          .update(payload)
          .eq('id', editId)
        if (err) throw err
        success('Registro actualizado exitosamente')
      } else {
        const { error: err } = await supabase
          .from('participaciones')
          .insert(payload)
        if (err) throw err
        success('Registro guardado exitosamente')
      }
      setForm(FORM_EMPTY)
      setEditId(null)
      setIsSheetOpen(false)
      invalidateAppQueries([QUERY_KEYS.participaciones])
    } catch (err) {
      console.error(err)
      toastError('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async id => {
    const ok = await confirm({
      title: '¿Eliminar este registro?',
      message: 'Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return
    try {
      await supabase
        .from('programa_asignaciones')
        .update({ confirmado: false, participacion_id: null })
        .eq('participacion_id', id)

      const { error: err } = await supabase.from('participaciones').delete().eq('id', id)
      if (err) throw err
      success('Registro eliminado')
      if (editId === id) setEditId(null)
      invalidateAppQueries([QUERY_KEYS.participaciones, QUERY_KEYS.asignaciones])
    } catch (err) {
      console.error(err)
      toastError('Error al eliminar: ' + err.message)
    }
  }

  const handleBulkEliminar = async () => {
    const ids = [...seleccionados]
    if (ids.length === 0) return
    const ok = await confirm({
      title: `¿Eliminar ${ids.length} registro${ids.length !== 1 ? 's' : ''}?`,
      message: 'Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return
    try {
      await supabase
        .from('programa_asignaciones')
        .update({ confirmado: false, participacion_id: null })
        .in('participacion_id', ids)

      const { error: err } = await supabase.from('participaciones').delete().in('id', ids)
      if (err) throw err
      success(
        `${ids.length} registro${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}`
      )
      setSeleccionados(new Set())
      setModoSeleccion(false)
      invalidateAppQueries([QUERY_KEYS.participaciones, QUERY_KEYS.asignaciones])
    } catch (err) {
      console.error(err)
      toastError('Error al eliminar en lote: ' + err.message)
    }
  }

  const handleBulkCambiarTipo = async () => {
    const ids = [...seleccionados]
    if (ids.length === 0 || !bulkTipo) return
    const ok = await confirm({
      title: `¿Cambiar tipo de ${ids.length} registro${ids.length !== 1 ? 's' : ''} a "${bulkTipo}"?`,
      message: 'Los registros donde el tipo no sea válido para la persona serán omitidos.',
    })
    if (!ok) return

    const registrosSeleccionados = participaciones.filter(r => ids.includes(r.id))
    const validos = registrosSeleccionados.filter(r => {
      const persona = personas.find(p => p.clave === r.clave)
      return getTiposPermitidos(persona).includes(bulkTipo)
    })
    const omitidos = ids.length - validos.length

    if (validos.length === 0) {
      toastError('Ningún registro seleccionado admite ese tipo de participación')
      return
    }

    try {
      const peso = PESO_MAP[bulkTipo] ?? 1
      const { error: err } = await supabase
        .from('participaciones')
        .update({ tipo: bulkTipo, peso })
        .in(
          'id',
          validos.map(r => r.id)
        )
      if (err) throw err

      const msg =
        omitidos > 0
          ? `Tipo actualizado en ${validos.length} registros (${omitidos} omitidos por tipo inválido)`
          : `Tipo actualizado en ${validos.length} registros`
      success(msg)
      setSeleccionados(new Set())
      setBulkTipo('')
      setModoSeleccion(false)
      invalidateAppQueries([QUERY_KEYS.participaciones])
    } catch (err) {
      console.error(err)
      toastError('Error al actualizar en lote: ' + err.message)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return participaciones.filter(r => {
      if (
        q &&
        !String(r.nombre || '').toLowerCase().includes(q) &&
        !String(r.clave || '').toLowerCase().includes(q)
      ) {
        return false
      }
      if (filterMes && r.mes !== filterMes) return false
      if (filterLista && r.lista !== filterLista) return false
      return true
    })
  }, [participaciones, search, filterMes, filterLista])

  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / (pageSize || 1)))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginated = useMemo(
    () => filtered.slice(startIndex, endIndex),
    [filtered, startIndex, endIndex]
  )

  const retryFetch = useCallback(() => {
    refetchP()
    refetchR()
  }, [refetchP, refetchR])

  return {
    toast,
    confirmProps,
    personas,
    participaciones,
    loading,
    fetchError,
    retryFetch,
    form,
    setForm,
    isSheetOpen,
    editId,
    saving,
    search,
    setSearch,
    filterMes,
    setFilterMes,
    filterLista,
    setFilterLista,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    modoSeleccion,
    setModoSeleccion,
    seleccionados,
    setSeleccionados,
    bulkTipo,
    setBulkTipo,
    personaSeleccionada,
    tiposPermitidos,
    handlePersonaChange,
    startCreate,
    startEdit,
    closeSheet,
    handleSave,
    handleDelete,
    handleBulkEliminar,
    handleBulkCambiarTipo,
    filtered,
    paginated,
    totalRecords,
    totalPages,
    startIndex,
    endIndex,
  }
}
