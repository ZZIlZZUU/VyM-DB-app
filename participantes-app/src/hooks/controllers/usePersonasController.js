import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { usePersonasQuery, useParticipacionesQuery } from '../../core/queries/useAppQueries'
import { invalidateAppQueries, QUERY_KEYS } from '../../core/queryClient'
import { useToast } from '../useToast'
import { useConfirm } from '../useConfirm'

const ESTATUS_POR_SEXO_LISTA = {
  'Mat-F': ['Matriculada', 'Matriculada bautizada'],
  'Mat-M': ['Matriculado', 'Matriculado bautizado'],
  'Anc/SM-M': ['Anciano', 'Siervo Ministerial'],
}

export function getEstatusOpts(lista, sexo) {
  return ESTATUS_POR_SEXO_LISTA[`${lista}-${sexo}`] || []
}

export function getNextClave(personas, lista) {
  const prefix = lista === 'Mat' ? 'M' : 'A'
  const nums = personas
    .filter(p => p.clave.startsWith(prefix + '-'))
    .map(p => parseInt(p.clave.split('-')[1] || 0, 10))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

const FORM_EMPTY = { lista: 'Mat', sexo: 'F', nombre: '', estatus: 'Matriculada' }

export function usePersonasController({
  initialPersonaClave,
  initialTab = 'historial',
  onClearInitialPersona,
} = {}) {
  const { toast, showToast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()
  const nombreInputRef = useRef(null)

  const {
    data: personas = [],
    isLoading: loadingP,
    error: errP,
    refetch: refetchP,
  } = usePersonasQuery()

  const {
    data: participaciones = [],
    isLoading: loadingR,
    error: errR,
    refetch: refetchR,
  } = useParticipacionesQuery()

  const loading = loadingP || loadingR
  const fetchError = errP?.message || errR?.message || null

  const [search, setSearch] = useState('')
  const [searchVal, setSearchVal] = useState('')
  const [filterLista, setFilterLista] = useState('')
  const [filterActivo, setFilterActivo] = useState('true')

  const [sortField, setSortField] = useState('nombre')
  const [sortDirection, setSortDirection] = useState('asc')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editClave, setEditClave] = useState(null)
  const [form, setForm] = useState(FORM_EMPTY)
  const [saving, setSaving] = useState(false)

  const [activeSheetTab, setActiveSheetTab] = useState('perfil')
  const [proximas, setProximas] = useState([])
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialFetchedFor, setHistorialFetchedFor] = useState(null)

  // Debounce de 250ms para búsqueda fluida
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchVal])

  const fetchHistorialPersona = useCallback(
    async clave => {
      if (!clave) return
      setLoadingHistorial(true)
      try {
        const hoyStr = new Date().toISOString().slice(0, 10)

        const [asigRes, partRes] = await Promise.all([
          supabase
            .from('programa_asignaciones')
            .select(`
              id, rol, confirmado, clave,
              programa_partes (
                id, titulo, tipo_asignacion, duracion_min, seccion,
                programa_semanas ( id, fecha_inicio, fecha_fin, capitulo_biblico )
              )
            `)
            .eq('clave', clave),
          supabase
            .from('participaciones')
            .select('*')
            .eq('clave', clave)
            .order('fecha', { ascending: false }),
        ])

        if (asigRes.error) throw asigRes.error
        if (partRes.error) throw partRes.error

        const futuras = (asigRes.data || [])
          .filter(a => {
            const fIni = a.programa_partes?.programa_semanas?.fecha_inicio
            return fIni && String(fIni).slice(0, 10) >= hoyStr
          })
          .sort((a, b) => {
            const fa = a.programa_partes?.programa_semanas?.fecha_inicio || ''
            const fb = b.programa_partes?.programa_semanas?.fecha_inicio || ''
            return fa.localeCompare(fb)
          })

        setProximas(futuras)
        setHistorial(partRes.data || [])
        setHistorialFetchedFor(clave)
      } catch (err) {
        console.error('[fetchHistorialPersona]', err)
        toastError('Error al cargar historial: ' + (err?.message || 'Error de conexión'))
      } finally {
        setLoadingHistorial(false)
      }
    },
    [toastError]
  )

  useEffect(() => {
    if (sheetOpen && activeSheetTab === 'perfil') {
      const id = setTimeout(() => {
        nombreInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(id)
    }
  }, [sheetOpen, activeSheetTab])

  const currentYear = useMemo(() => new Date().getFullYear().toString(), [])

  const conteosAnio = useMemo(() => {
    const map = {}
    for (const part of participaciones) {
      if (!part.clave) continue
      if (part.fecha && !part.fecha.startsWith(currentYear)) continue
      map[part.clave] = (map[part.clave] || 0) + 1
    }
    return map
  }, [participaciones, currentYear])

  const handleSort = useCallback(
    field => {
      if (sortField === field) {
        setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDirection(field === 'participaciones' ? 'desc' : 'asc')
      }
    },
    [sortField]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = personas.filter(p => {
      if (
        q &&
        !p.nombre.toLowerCase().includes(q) &&
        !p.clave.toLowerCase().includes(q)
      ) {
        return false
      }
      if (filterLista && p.lista !== filterLista) return false
      if (filterActivo === 'true' && !p.activo) return false
      if (filterActivo === 'false' && p.activo) return false
      return true
    })

    return [...list].sort((a, b) => {
      let comparison = 0

      if (sortField === 'clave') {
        comparison = a.clave.localeCompare(b.clave, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      } else if (sortField === 'nombre') {
        comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      } else if (sortField === 'lista') {
        comparison = a.lista.localeCompare(b.lista)
      } else if (sortField === 'estatus') {
        comparison = (a.estatus || '').localeCompare(b.estatus || '')
      } else if (sortField === 'participaciones') {
        const countA = conteosAnio[a.clave] || 0
        const countB = conteosAnio[b.clave] || 0
        comparison = countA - countB
      } else if (sortField === 'activo') {
        comparison = a.activo === b.activo ? 0 : a.activo ? -1 : 1
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [personas, search, filterLista, filterActivo, sortField, sortDirection, conteosAnio])

  const totalCount = personas.length
  const activeCount = useMemo(() => personas.filter(p => p.activo).length, [personas])
  const inactiveCount = totalCount - activeCount

  const clavePreview = editClave || getNextClave(personas, form.lista)
  const estatusOpts = getEstatusOpts(form.lista, form.sexo)

  const updateFormLista = useCallback(newLista => {
    setForm(f => {
      const newSexo = newLista === 'Anc/SM' ? 'M' : f.sexo
      const opts = getEstatusOpts(newLista, newSexo)
      const newEstatus = opts.includes(f.estatus) ? f.estatus : (opts[0] || '')
      return { ...f, lista: newLista, sexo: newSexo, estatus: newEstatus }
    })
  }, [])

  const updateFormSexo = useCallback(newSexo => {
    setForm(f => {
      const opts = getEstatusOpts(f.lista, newSexo)
      const newEstatus = opts.includes(f.estatus) ? f.estatus : (opts[0] || '')
      return { ...f, sexo: newSexo, estatus: newEstatus }
    })
  }, [])

  const startCreate = useCallback(() => {
    setEditClave(null)
    setForm(FORM_EMPTY)
    setActiveSheetTab('perfil')
    setProximas([])
    setHistorial([])
    setHistorialFetchedFor(null)
    setSheetOpen(true)
  }, [])

  const startEdit = useCallback(
    (p, tab = 'perfil') => {
      setEditClave(p.clave)
      setForm({
        lista: p.lista,
        sexo: p.sexo,
        nombre: p.nombre,
        estatus: p.estatus,
      })
      setActiveSheetTab(tab)
      setProximas([])
      setHistorial([])
      setHistorialFetchedFor(null)
      if (tab === 'historial') {
        fetchHistorialPersona(p.clave)
      }
      setSheetOpen(true)
    },
    [fetchHistorialPersona]
  )

  // Apertura programática desde CommandPalette u otra vista
  useEffect(() => {
    if (!initialPersonaClave || personas.length === 0) return
    const p = personas.find(per => per.clave === initialPersonaClave)
    if (!p) return
    const timer = setTimeout(() => {
      startEdit(p, initialTab || 'historial')
      onClearInitialPersona?.()
    }, 0)
    return () => clearTimeout(timer)
  }, [initialPersonaClave, personas, initialTab, onClearInitialPersona, startEdit])

  const closeSheet = useCallback(() => {
    setSheetOpen(false)
    setEditClave(null)
    setForm(FORM_EMPTY)
    setActiveSheetTab('perfil')
    setProximas([])
    setHistorial([])
    setHistorialFetchedFor(null)
  }, [])

  const handleSave = async e => {
    if (e) e.preventDefault()
    const nombreClean = form.nombre.trim().replace(/\s+/g, ' ')
    if (!nombreClean) {
      toastError('Ingresa el nombre completo del participante')
      return
    }
    if (!form.estatus) {
      toastError('Selecciona el estatus correspondiente')
      return
    }

    const duplicado = personas.find(
      p => p.clave !== editClave && p.nombre.trim().toLowerCase() === nombreClean.toLowerCase()
    )
    if (duplicado) {
      const proceed = await confirm({
        title: 'Posible participante duplicado',
        message: `Ya existe un participante registrado con el nombre "${duplicado.nombre}" (Clave: ${duplicado.clave}). ¿Deseas guardarlo de todas formas con una clave distinta?`,
        danger: false,
      })
      if (!proceed) return
    }

    setSaving(true)

    try {
      if (editClave) {
        const { error: err } = await supabase
          .from('personas')
          .update({
            lista: form.lista,
            nombre: nombreClean,
            sexo: form.sexo,
            estatus: form.estatus,
          })
          .eq('clave', editClave)

        if (err) throw err
        success(`Participante ${editClave} actualizado correctamente`)
      } else {
        const clave = getNextClave(personas, form.lista)
        const { error: err } = await supabase.from('personas').insert({
          clave,
          lista: form.lista,
          nombre: nombreClean,
          sexo: form.sexo,
          estatus: form.estatus,
          activo: true,
        })

        if (err) throw err
        success(`Participante agregado con clave ${clave}`)
      }

      closeSheet()
      invalidateAppQueries([QUERY_KEYS.personas])
    } catch (err) {
      console.error('[handleSave]', err)
      toastError(err?.message || 'Error al guardar en la base de datos')
    } finally {
      setSaving(false)
    }
  }

  const handleDeletePersona = async clave => {
    const persona = personas.find(p => p.clave === clave)
    if (!persona) return

    const ok = await confirm({
      title: `¿Eliminar permanentemente a ${persona.nombre}?`,
      message: `Esta acción no se puede deshacer. Se comprobará que el participante no tenga registros históricos ni asignaciones en el programa.`,
      danger: true,
    })
    if (!ok) return

    setSaving(true)
    try {
      const [{ count: partCount, error: partErr }, { count: asigCount, error: asigErr }] =
        await Promise.all([
          supabase.from('participaciones').select('*', { count: 'exact', head: true }).eq('clave', clave),
          supabase.from('programa_asignaciones').select('*', { count: 'exact', head: true }).eq('clave', clave),
        ])

      if (partErr) throw partErr
      if (asigErr) throw asigErr

      if ((partCount || 0) > 0 || (asigCount || 0) > 0) {
        toastError(
          `No se puede eliminar a ${persona.nombre} porque tiene ${partCount || 0} participaciones y ${asigCount || 0} asignaciones registradas. Para ocultarlo sin perder el historial, puedes deshabilitarlo.`
        )
        setSaving(false)
        return
      }

      const { error: delErr } = await supabase
        .from('personas')
        .delete()
        .eq('clave', clave)

      if (delErr) throw delErr

      success(`Participante ${persona.nombre} (${clave}) eliminado permanentemente`)
      closeSheet()
      invalidateAppQueries([QUERY_KEYS.personas])
    } catch (err) {
      console.error('[handleDeletePersona]', err)
      toastError(err?.message || 'Error al eliminar participante')
    } finally {
      setSaving(false)
    }
  }

  const toggleActivo = async p => {
    const ok = await confirm({
      title: p.activo
        ? `¿Deshabilitar a ${p.nombre}?`
        : `¿Habilitar a ${p.nombre}?`,
      message: p.activo
        ? 'El participante no aparecerá en las sugerencias activas, pero sus registros históricos se conservarán intactos.'
        : 'El participante volverá a estar disponible para asignaciones y registros activos.',
      danger: p.activo,
    })
    if (!ok) return

    try {
      const { error: err } = await supabase
        .from('personas')
        .update({ activo: !p.activo })
        .eq('clave', p.clave)

      if (err) throw err
      showToast(
        p.activo ? 'Participante deshabilitado' : 'Participante habilitado',
        p.activo ? 'warning' : 'success'
      )
      invalidateAppQueries([QUERY_KEYS.personas])
    } catch (err) {
      toastError('Error al cambiar estado: ' + err.message)
    }
  }

  const retryFetch = useCallback(() => {
    refetchP()
    refetchR()
  }, [refetchP, refetchR])

  return {
    toast,
    confirmProps,
    nombreInputRef,
    personas,
    loading,
    fetchError,
    retryFetch,
    searchVal,
    setSearchVal,
    filterLista,
    setFilterLista,
    filterActivo,
    setFilterActivo,
    sortField,
    sortDirection,
    handleSort,
    filtered,
    totalCount,
    activeCount,
    inactiveCount,
    currentYear,
    conteosAnio,
    sheetOpen,
    editClave,
    form,
    setForm,
    updateFormLista,
    updateFormSexo,
    saving,
    activeSheetTab,
    setActiveSheetTab,
    proximas,
    historial,
    loadingHistorial,
    historialFetchedFor,
    fetchHistorialPersona,
    clavePreview,
    estatusOpts,
    startCreate,
    startEdit,
    closeSheet,
    handleSave,
    handleDeletePersona,
    toggleActivo,
  }
}
