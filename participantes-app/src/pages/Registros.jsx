import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RotateCcw,
  Layers,
  Calendar,
  User,
  Tag,
  FileText,
  Filter,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFechaLegible } from '../lib/fechas'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Sheet } from '../components/ui/Sheet'
import { Tooltip } from '../components/ui/Tooltip'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPOS_MAT_F = ['T', 'A']
const TIPOS_MAT_M = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'LEBC', 'ORACION_C']
const TIPOS_SM = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'P', 'TB', 'PE', 'EBC', 'LEBC', 'ORACION_C']
const TIPOS_ANC = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'P', 'TB', 'PE', 'EBC', 'VC', 'NC', 'LEBC', 'ORACION_C']

const TIPO_LABEL = {
  T: 'Titular',
  A: 'Asistente',
  X: 'Participación',
  LB: 'Lectura Bíblica',
  P: 'Presidente',
  TB: 'Tesoros',
  PE: 'Perlas',
  SMT_DSC: 'Discurso',
  EBC: 'Est. Bíblico',
  LEBC: 'Lector EBC',
  VC: 'Vida Cristiana',
  NC: 'Nec. Congr.',
  ORACION_C: 'Oración conclusión',
}

const PESO_MAP = {
  T: 2, A: 1, X: 1, LB: 1, SMT_DSC: 1, P: 1, TB: 1, PE: 1, EBC: 1, LEBC: 1, VC: 1, NC: 1, ORACION_C: 0,
}

const BADGE_STYLES = {
  T: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  A: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  X: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  LB: 'bg-cyan-50 text-cyan-800 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
  SMT_DSC: 'bg-yellow-50 text-yellow-800 border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/40',
  P: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  TB: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  PE: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  EBC: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  LEBC: 'bg-pink-50 text-pink-800 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/40',
  VC: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  NC: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  ORACION_C: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60',
}

function getTipos(persona) {
  if (!persona) return []
  if (persona.lista === 'Mat') return persona.sexo === 'F' ? TIPOS_MAT_F : TIPOS_MAT_M
  return persona.estatus === 'Anciano' ? TIPOS_ANC : TIPOS_SM
}

function getMes(fecha) {
  if (!fecha) return ''
  const mi = parseInt(fecha.split('-')[1] || 0) - 1
  return MESES[mi] || ''
}

function initials(nombre) {
  return (nombre || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Selector de Chips de Tipo ────────────────────────────────
function TipoChips({ tipos, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {tipos.map(t => {
        const isSelected = selected === t
        const style = BADGE_STYLES[t] || 'bg-zinc-100 dark:bg-zinc-800 text-text2'

        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(isSelected ? '' : t)}
            className={`px-2 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
              isSelected
                ? `${style} ring-1 ring-emerald-500/40 font-bold shadow-2xs`
                : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-text3 border-zinc-200/80 dark:border-zinc-800 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {t} <span className="font-sans font-normal text-[11px] opacity-80">{TIPO_LABEL[t]}</span>
          </button>
        )
      })}
    </div>
  )
}

const FORM_EMPTY = { clave: '', fecha: '', tipo: '', observaciones: '' }

// ── Componente Principal ──────────────────────────────────────
export default function Registros({ initialOpenCreate = false, onSheetClosed } = {}) {
  const [personas, setPersonas] = useState([])
  const [participaciones, setParticipaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [form, setForm] = useState(FORM_EMPTY)
  const [isSheetOpen, setIsSheetOpen] = useState(initialOpenCreate)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const { toast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()

  const [search, setSearch] = useState('')
  const [filterMes, setFilterMes] = useState(
    () => localStorage.getItem('registros_filterMes') ?? ''
  )
  const [filterLista, setFilterLista] = useState(
    () => localStorage.getItem('registros_filterLista') ?? ''
  )
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(
    () => Number(localStorage.getItem('registros_pageSize')) || 50
  )
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [bulkTipo, setBulkTipo] = useState('')

  useEffect(() => {
    if (initialOpenCreate) {
      setEditId(null)
      setForm(FORM_EMPTY)
      setIsSheetOpen(true)
    }
  }, [initialOpenCreate])

  useEffect(() => {
    localStorage.setItem('registros_filterMes', filterMes)
  }, [filterMes])
  useEffect(() => {
    localStorage.setItem('registros_filterLista', filterLista)
  }, [filterLista])
  useEffect(() => {
    localStorage.setItem('registros_pageSize', String(pageSize))
  }, [pageSize])
  useEffect(() => {
    setPage(1)
  }, [search, filterMes, filterLista, pageSize])
  useEffect(() => {
    setSeleccionados(new Set())
  }, [search, filterMes, filterLista])

  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true)
        setFetchError(null)
      }
      try {
        const [{ data: ps, error: psErr }, { data: rs, error: rsErr }] = await Promise.all([
          supabase.from('personas').select('*').eq('activo', true).order('nombre'),
          supabase.from('participaciones').select('*').order('id', { ascending: false }),
        ])
        if (psErr) throw psErr
        if (rsErr) throw rsErr
        setPersonas(ps || [])
        setParticipaciones(rs || [])
      } catch (err) {
        console.error('[fetchData]', err)
        if (isInitial) {
          setFetchError(err?.message || 'Error al conectar con la base de datos')
        } else {
          toastError('Error al sincronizar datos: ' + (err?.message || 'Error de conexión'))
        }
      } finally {
        if (isInitial) {
          setLoading(false)
        }
      }
    },
    [toastError]
  )

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  useEffect(() => {
    const canal = supabase
      .channel('registros-sync-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, () =>
        fetchData()
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  const personaSeleccionada = personas.find(p => p.clave === form.clave)
  const tiposPermitidos = getTipos(personaSeleccionada)

  function handlePersonaChange(clave) {
    const p = personas.find(x => x.clave === clave)
    const tipos = getTipos(p)
    setForm(f => ({
      ...f,
      clave,
      tipo: tipos.includes(f.tipo) ? f.tipo : '',
    }))
  }

  function startCreate() {
    setEditId(null)
    setForm(FORM_EMPTY)
    setIsSheetOpen(true)
  }

  function startEdit(registro) {
    setEditId(registro.id)
    setForm({
      clave: registro.clave || '',
      fecha: registro.fecha || '',
      tipo: registro.tipo || '',
      observaciones: registro.observaciones || '',
    })
    setIsSheetOpen(true)
  }

  async function handleSave() {
    if (!form.clave || !form.fecha || !form.tipo) {
      toastError('Por favor completa los campos requeridos (participante, fecha y tipo)')
      return
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
      peso: PESO_MAP[form.tipo] || 1,
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
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title: '¿Eliminar este registro?',
      message: 'Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return
    try {
      const { error: err } = await supabase.from('participaciones').delete().eq('id', id)
      if (err) throw err
      success('Registro eliminado')
      if (editId === id) setEditId(null)
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al eliminar: ' + err.message)
    }
  }

  async function handleBulkEliminar() {
    const ids = [...seleccionados]
    if (ids.length === 0) return
    const ok = await confirm({
      title: `¿Eliminar ${ids.length} registro${ids.length !== 1 ? 's' : ''}?`,
      message: 'Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return
    try {
      const { error: err } = await supabase.from('participaciones').delete().in('id', ids)
      if (err) throw err
      success(
        `${ids.length} registro${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}`
      )
      setSeleccionados(new Set())
      setModoSeleccion(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al eliminar en lote: ' + err.message)
    }
  }

  async function handleBulkCambiarTipo() {
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
      return getTipos(persona).includes(bulkTipo)
    })
    const omitidos = ids.length - validos.length

    if (validos.length === 0) {
      toastError('Ningún registro seleccionado admite ese tipo de participación')
      return
    }

    try {
      const peso = PESO_MAP[bulkTipo] || 1
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
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al actualizar en lote: ' + err.message)
    }
  }

  // Filtrado
  const filtered = participaciones.filter(r => {
    if (
      search &&
      !r.nombre.toLowerCase().includes(search.toLowerCase()) &&
      !r.clave.toLowerCase().includes(search.toLowerCase())
    )
      return false
    if (filterMes && r.mes !== filterMes) return false
    if (filterLista && r.lista !== filterLista) return false
    return true
  })

  // Paginación
  const totalRecords = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalRecords / (pageSize || 1)))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalRecords)
  const paginated = filtered.slice(startIndex, endIndex)

  const previewMes = getMes(form.fecha)

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <h3 className="text-base font-semibold text-text1">Error de carga</h3>
        <p className="text-xs text-text3 font-mono">{fetchError}</p>
        <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => fetchData(true)}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER Y ACCIONES PRINCIPALES ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Registros
            </h1>
            <Badge variant="neutral" size="sm">
              {participaciones.length} participaciones
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Historial de participaciones, asignaciones manuales y control de actividad.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={modoSeleccion ? 'accent' : 'secondary'}
            size="md"
            icon={modoSeleccion ? CheckSquare : Square}
            onClick={() => {
              setModoSeleccion(v => !v)
              setSeleccionados(new Set())
              setBulkTipo('')
              setEditId(null)
            }}
          >
            {modoSeleccion ? 'Finalizar selección' : 'Selección en lote'}
          </Button>

          <Button
            variant="accent"
            size="md"
            icon={Plus}
            onClick={startCreate}
          >
            Nuevo registro
          </Button>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por participante o clave..."
            icon={Search}
            size="sm"
            className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros segmentados */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Segmented Lista */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs shrink-0">
            {[
              { id: '', label: 'Todas las listas' },
              { id: 'Mat', label: 'Matriculados' },
              { id: 'Anc/SM', label: 'Ancianos / SM' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterLista(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  filterLista === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selector de Mes */}
          <div className="w-40 shrink-0">
            <Select
              value={filterMes}
              onChange={e => setFilterMes(e.target.value)}
              size="sm"
            >
              <option value="">Todos los meses</option>
              {MESES.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          {(filterMes || filterLista) && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => {
                setFilterMes('')
                setFilterLista('')
              }}
              title="Limpiar filtros"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── BARRA FLOTANTE DE BULK ACTIONS ── */}
      {modoSeleccion && seleccionados.size > 0 && (
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-view-fade">
          <span className="font-semibold text-emerald-900 dark:text-emerald-100">
            {seleccionados.size} registro{seleccionados.size !== 1 ? 's' : ''} seleccionado
            {seleccionados.size !== 1 ? 's' : ''}
          </span>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="w-48">
              <Select
                value={bulkTipo}
                onChange={e => setBulkTipo(e.target.value)}
                size="sm"
              >
                <option value="">— Cambiar tipo en lote —</option>
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k} · {v}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={!bulkTipo}
              onClick={handleBulkCambiarTipo}
            >
              Aplicar tipo
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={handleBulkEliminar}
            >
              Eliminar ({seleccionados.size})
            </Button>
          </div>
        </div>
      )}

      {/* ── TABLA DE REGISTROS DE ANCHO COMPLETO ── */}
      <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
              <tr>
                {modoSeleccion && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && seleccionados.size === filtered.length}
                      ref={el => {
                        if (el)
                          el.indeterminate =
                            seleccionados.size > 0 && seleccionados.size < filtered.length
                      }}
                      onChange={e => {
                        if (e.target.checked)
                          setSeleccionados(new Set(filtered.map(r => r.id)))
                        else setSeleccionados(new Set())
                      }}
                      className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer rounded"
                    />
                  </th>
                )}
                <th className="py-3 px-4 w-20 font-mono uppercase text-[10px] tracking-wider">
                  ID
                </th>
                <th className="py-3 px-4 w-32 font-mono uppercase text-[10px] tracking-wider">
                  Fecha
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider min-w-[200px]">
                  Participante
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-center w-28">
                  Tipo
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-center w-20">
                  Peso
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider">
                  Observaciones
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-right w-24">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={modoSeleccion ? 8 : 7} className="py-8 px-4">
                    <SkeletonList rows={8} cols={4} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={modoSeleccion ? 8 : 7} className="py-16 text-center text-xs text-text3">
                    No se encontraron registros de participaciones con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginated.map(r => {
                  const persona = personas.find(p => p.clave === r.clave)
                  const isFemenino = persona?.sexo === 'F'
                  const isSelected = seleccionados.has(r.id)

                  return (
                    <tr
                      key={r.id}
                      onClick={() => {
                        if (modoSeleccion) {
                          setSeleccionados(prev => {
                            const next = new Set(prev)
                            next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                            return next
                          })
                        } else {
                          startEdit(r)
                        }
                      }}
                      className={`group hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      {modoSeleccion && (
                        <td
                          className="py-3 px-3 text-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSeleccionados(prev => {
                                const next = new Set(prev)
                                next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                                return next
                              })
                            }}
                            className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer rounded"
                          />
                        </td>
                      )}

                      {/* ID */}
                      <td className="py-3 px-4 font-mono text-text3 text-[11px]">
                        #{r.id}
                      </td>

                      {/* Fecha */}
                      <td className="py-3 px-4 text-xs whitespace-nowrap">
                        <span className="font-medium text-text1 block">
                          {formatFechaLegible(r.fecha)}
                        </span>
                        <span className="text-[10px] text-text3 font-mono">{r.fecha} · {r.mes}</span>
                      </td>

                      {/* Participante */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                              isFemenino
                                ? 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40'
                                : 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
                            }`}
                          >
                            {initials(r.nombre)}
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <span className="font-medium text-text1 text-xs truncate">
                              {r.nombre}
                            </span>
                            <span className="font-mono text-[10px] text-text3">
                              {r.clave} · {r.lista}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center min-w-6 h-5 px-2 rounded text-xs font-semibold font-mono border ${
                            BADGE_STYLES[r.tipo] || 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {r.tipo}
                        </span>
                      </td>

                      {/* Peso */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-text3">
                        {r.peso || 1}
                      </td>

                      {/* Observaciones */}
                      <td className="py-3 px-4 text-text2 text-xs truncate max-w-xs">
                        {r.observaciones || '—'}
                      </td>

                      {/* Acciones */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="iconXs"
                            onClick={() => startEdit(r)}
                            aria-label="Editar registro"
                            title="Editar registro"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-text3" />
                          </Button>
                          <Button
                            variant="dangerGhost"
                            size="iconXs"
                            onClick={() => handleDelete(r.id)}
                            aria-label="Eliminar registro"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-text3 hover:text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                icon={ChevronLeft}
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span className="font-mono text-text3 px-1">
                Página <strong className="text-text1">{safePage}</strong> de {totalPages}
              </span>
              <Button
                variant="outline"
                size="xs"
                iconRight={ChevronRight}
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32">
                <Select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  size="sm"
                >
                  {[25, 50, 100, 250].map(n => (
                    <option key={n} value={n}>
                      {n} por pág.
                    </option>
                  ))}
                </Select>
              </div>
              <span className="font-mono text-text3">
                {startIndex + 1}–{endIndex} de {totalRecords}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── SLIDE-OVER SHEET: AGREGAR / EDITAR REGISTRO ── */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false)
          setEditId(null)
          onSheetClosed?.()
        }}
        title={editId ? `Editar registro #${editId}` : 'Nuevo registro de participación'}
        description={
          editId
            ? 'Modifica los datos de la participación registrada.'
            : 'Agrega una asignación directa al historial anual.'
        }
        width="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {editId ? (
              <Button
                variant="dangerGhost"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  handleDelete(editId)
                  setIsSheetOpen(false)
                }}
              >
                Eliminar
              </Button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSheetOpen(false)
                  setEditId(null)
                }}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                variant="accent"
                size="sm"
                loading={saving}
                onClick={handleSave}
                disabled={!form.clave || !form.fecha || !form.tipo}
              >
                {editId ? 'Actualizar cambios' : 'Guardar registro'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {/* Persona */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Participante *
            </label>
            <Select
              value={form.clave}
              onChange={e => handlePersonaChange(e.target.value)}
              size="md"
            >
              <option value="">— Seleccionar participante —</option>
              {['Mat', 'Anc/SM'].map(lista => (
                <optgroup
                  key={lista}
                  label={lista === 'Mat' ? 'Matriculados' : 'Ancianos y Siervos Ministeriales'}
                >
                  {personas
                    .filter(p => p.lista === lista)
                    .map(p => (
                      <option key={p.clave} value={p.clave}>
                        {p.clave} — {p.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </div>

          {/* Info Participante */}
          {personaSeleccionada && (
            <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="xs">
                  {personaSeleccionada.lista}
                </Badge>
                <span className="font-medium text-text1">
                  {personaSeleccionada.estatus}
                </span>
              </div>
              <span className="font-mono text-text3">
                Sexo: {personaSeleccionada.sexo === 'F' ? 'Femenino' : 'Masculino'}
              </span>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Fecha de participación *
            </label>
            <Input
              type="date"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              size="md"
            />
            {form.fecha && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                {formatFechaLegible(form.fecha)}
              </span>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Tipo de participación *
            </label>
            {tiposPermitidos.length > 0 ? (
              <TipoChips
                tipos={tiposPermitidos}
                selected={form.tipo}
                onSelect={t => setForm(f => ({ ...f, tipo: t }))}
              />
            ) : (
              <div className="p-3 text-center text-xs text-text3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                Selecciona un participante primero para ver los roles permitidos.
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Observaciones <span className="text-text3 text-[11px]">(opcional)</span>
            </label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              placeholder="Ej: Cubrió turno, parte especial..."
              className="w-full px-3 py-2 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
            />
          </div>

          {/* Previsualización */}
          {form.clave && form.fecha && form.tipo && (
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Resumen de la asignación
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">CLAVE</span>
                  <strong className="font-mono text-text1">{form.clave}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">FECHA</span>
                  <strong className="font-mono text-text1">{form.fecha}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">TIPO</span>
                  <strong className="font-mono text-text1">{form.tipo}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">PESO</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    {PESO_MAP[form.tipo] || 1}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </Sheet>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}