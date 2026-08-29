import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  UserX,
  Pencil,
  Power,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonList } from '../components/Skeleton'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Sheet } from '../components/ui/Sheet'
import { Tooltip } from '../components/ui/Tooltip'

const ESTATUS_POR_SEXO_LISTA = {
  'Mat-F': ['Matriculada', 'Matriculada bautizada'],
  'Mat-M': ['Matriculado', 'Matriculado bautizado'],
  'Anc/SM-M': ['Anciano', 'Siervo Ministerial'],
}

function getEstatusOpts(lista, sexo) {
  return ESTATUS_POR_SEXO_LISTA[`${lista}-${sexo}`] || []
}

function getNextClave(personas, lista) {
  const prefix = lista === 'Mat' ? 'M' : 'A'
  const nums = personas
    .filter(p => p.clave.startsWith(prefix + '-'))
    .map(p => parseInt(p.clave.split('-')[1] || 0, 10))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
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

const FORM_EMPTY = { lista: 'Mat', sexo: 'F', nombre: '', estatus: '' }

export default function Personas() {
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [search, setSearch] = useState('')
  const [searchVal, setSearchVal] = useState('')
  const [filterLista, setFilterLista] = useState('')
  const [filterActivo, setFilterActivo] = useState('true')

  // Drawer lateral (Sheet) y formulario
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editClave, setEditClave] = useState(null)
  const [form, setForm] = useState(FORM_EMPTY)
  const [saving, setSaving] = useState(false)

  const { toast, showToast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()
  const nombreInputRef = useRef(null)

  // Debounce de 250ms para búsqueda fluida
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchVal)
    }, 250)
    return () => clearTimeout(timer)
  }, [searchVal])

  const fetchPersonas = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true)
        setFetchError(null)
      }
      try {
        const { data, error: err } = await supabase
          .from('personas')
          .select('*')
          .order('nombre')
        if (err) throw err
        setPersonas(data || [])
      } catch (err) {
        console.error('[fetchPersonas]', err)
        if (isInitial) {
          setFetchError(err?.message || 'Error al conectar con la base de datos')
        } else {
          toastError(
            'Error al sincronizar personas: ' + (err?.message || 'Error de conexión')
          )
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
    fetchPersonas(true)
  }, [fetchPersonas])

  // Sincronización en tiempo real
  useEffect(() => {
    const canal = supabase
      .channel('personas-mgmt-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personas' },
        () => fetchPersonas()
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchPersonas])

  // Ajustar estatus por defecto al cambiar lista o sexo en el formulario
  useEffect(() => {
    const opts = getEstatusOpts(form.lista, form.sexo)
    if (opts.length && !opts.includes(form.estatus)) {
      setForm(f => ({ ...f, estatus: opts[0] }))
    }
  }, [form.lista, form.sexo])

  // Enfocar el input de nombre al abrir el drawer
  useEffect(() => {
    if (sheetOpen) {
      setTimeout(() => {
        nombreInputRef.current?.focus()
      }, 100)
    }
  }, [sheetOpen])

  // Filtrado reactivo de personas
  const filtered = personas.filter(p => {
    if (
      search &&
      !p.nombre.toLowerCase().includes(search.toLowerCase()) &&
      !p.clave.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (filterLista && p.lista !== filterLista) return false
    if (filterActivo === 'true' && !p.activo) return false
    if (filterActivo === 'false' && p.activo) return false
    return true
  })

  // Métricas rápidas
  const totalCount = personas.length
  const activeCount = personas.filter(p => p.activo).length
  const inactiveCount = totalCount - activeCount

  // Clave estimada para previsualización
  const clavePreview = editClave || getNextClave(personas, form.lista)
  const estatusOpts = getEstatusOpts(form.lista, form.sexo)

  function startCreate() {
    setEditClave(null)
    setForm(FORM_EMPTY)
    setSheetOpen(true)
  }

  function startEdit(p) {
    setEditClave(p.clave)
    setForm({
      lista: p.lista,
      sexo: p.sexo,
      nombre: p.nombre,
      estatus: p.estatus,
    })
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditClave(null)
    setForm(FORM_EMPTY)
  }

  async function handleSave(e) {
    if (e) e.preventDefault()
    const nombreClean = form.nombre.trim()
    if (!nombreClean) {
      toastError('Ingresa el nombre completo del participante')
      return
    }
    if (!form.estatus) {
      toastError('Selecciona el estatus correspondiente')
      return
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
      fetchPersonas()
    } catch (err) {
      console.error('[handleSave]', err)
      toastError(err?.message || 'Error al guardar en la base de datos')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActivo(p) {
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
      fetchPersonas()
    } catch (err) {
      toastError('Error al cambiar estado: ' + err.message)
    }
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
          <PowerOff className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text1">Error de conexión</h3>
          <p className="text-xs text-text3 font-mono mt-1">{fetchError}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={() => fetchPersonas(true)}
        >
          Reintentar conexión
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER Y MÉTRICAS DE LA PÁGINA ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Personas
            </h1>
            <Badge variant="neutral" size="sm">
              {totalCount} registrados
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Directorio y administración de participantes activos e historial de registro.
          </p>
        </div>

        {/* Métricas rápidas & Botón Crear */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 text-xs">
            <span className="flex items-center gap-1.5 text-text2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
              <strong className="text-text1">{activeCount}</strong> activos
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="flex items-center gap-1.5 text-text2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <strong className="text-text1">{inactiveCount}</strong> inactivos
            </span>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={UserPlus}
            onClick={startCreate}
          >
            Nuevo participante
          </Button>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        {/* Buscador en vivo */}
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Buscar por nombre o clave (ej. M-010)..."
            icon={Search}
            size="sm"
            className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-600"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => setSearchVal('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros segmentados */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Filtro: Lista */}
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

          {/* Filtro: Estado Activo/Inactivo */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs shrink-0">
            {[
              { id: 'true', label: 'Activos' },
              { id: 'false', label: 'Inactivos' },
              { id: '', label: 'Todos' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterActivo(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  filterActivo === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── TABLA DE DATOS LINEAR / NOTION ── */}
      <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 font-medium select-none">
                <th className="py-3 px-4 w-24 font-mono uppercase text-[10px] tracking-wider">
                  Clave
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider min-w-[200px]">
                  Participante
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider hidden sm:table-cell">
                  Lista
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider hidden md:table-cell">
                  Estatus
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-center w-28">
                  Estado
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-right w-24">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4">
                    <SkeletonList rows={8} cols={4} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 px-4 text-center">
                    <div className="flex flex-col items-center justify-center max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-text3">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-text1">
                          Sin participantes coincidentes
                        </h4>
                        <p className="text-xs text-text3 mt-0.5">
                          {searchVal
                            ? `No se encontraron resultados para "${searchVal}"`
                            : 'No hay participantes registrados con los filtros seleccionados.'}
                        </p>
                      </div>
                      {searchVal && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setSearchVal('')}
                        >
                          Limpiar búsqueda
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const isFemenino = p.sexo === 'F'
                  const isMat = p.lista === 'Mat'

                  return (
                    <tr
                      key={p.clave}
                      onClick={() => startEdit(p)}
                      className={`group hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors duration-150 ${
                        !p.activo ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Clave */}
                      <td className="py-3 px-4 font-mono font-medium text-text2">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px]">
                          {p.clave}
                        </span>
                      </td>

                      {/* Participante (Avatar + Nombre) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border ${
                              isFemenino
                                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                            }`}
                          >
                            {initials(p.nombre)}
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <span className="font-medium text-text1 text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {p.nombre}
                            </span>
                            <span className="text-[10px] text-text3 md:hidden">
                              {p.estatus} · {isMat ? 'Matriculados' : 'Anc/SM'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Lista */}
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <Badge
                          variant={isMat ? 'info' : 'warning'}
                          size="xs"
                        >
                          {isMat ? 'Matriculados' : 'Ancianos / SM'}
                        </Badge>
                      </td>

                      {/* Estatus */}
                      <td className="py-3 px-4 text-text2 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1">
                          {p.estatus}
                        </span>
                      </td>

                      {/* Estado Activo/Inactivo */}
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={p.activo ? 'success' : 'neutral'}
                          size="xs"
                          dot
                          pulse={p.activo}
                        >
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className="inline-flex items-center gap-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <Tooltip content="Editar detalles" side="left">
                            <Button
                              variant="ghost"
                              size="iconXs"
                              onClick={() => startEdit(p)}
                              aria-label="Editar participante"
                              className="text-text3 hover:text-text1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>

                          <Tooltip
                            content={
                              p.activo ? 'Deshabilitar participante' : 'Habilitar participante'
                            }
                            side="left"
                          >
                            <Button
                              variant="ghost"
                              size="iconXs"
                              onClick={() => toggleActivo(p)}
                              aria-label={
                                p.activo ? 'Deshabilitar' : 'Habilitar'
                              }
                              className={
                                p.activo
                                  ? 'text-text3 hover:text-red-600 dark:hover:text-red-400'
                                  : 'text-text3 hover:text-emerald-600 dark:hover:text-emerald-400'
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer con conteo total de filas filtradas */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-[11px] text-text3 font-mono select-none">
            <span>
              Mostrando {filtered.length} de {totalCount} participantes
            </span>
            <span>VyM-DB Records</span>
          </div>
        )}
      </div>

      {/* ── SLIDE-OVER SHEET LATERAL (DRAWER) ── */}
      <Sheet
        isOpen={sheetOpen}
        onClose={closeSheet}
        title={editClave ? `Editar: ${editClave}` : 'Nuevo Participante'}
        description={
          editClave
            ? 'Modifica los datos del participante y guarda los cambios.'
            : 'Completa la información básica para registrar al participante en el sistema.'
        }
        width="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={closeSheet}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="accent"
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              {editClave ? 'Guardar cambios' : 'Registrar participante'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Clave sugerida / Asignada */}
          <div className="p-3.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                {editClave ? 'Clave asignada' : 'Clave generada automática'}
              </span>
              <span className="font-mono text-sm font-semibold text-text1 mt-0.5">
                {clavePreview}
              </span>
            </div>
            <Badge variant={form.lista === 'Mat' ? 'info' : 'warning'} size="xs">
              {form.lista === 'Mat' ? 'Matriculados' : 'Ancianos / SM'}
            </Badge>
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Nombre completo *
            </label>
            <Input
              ref={nombreInputRef}
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Ana María Flores"
              required
              size="md"
            />
            <p className="text-[11px] text-text3 mt-1">
              Nombre visible que aparecerá en el programa semanal y registros de participaciones.
            </p>
          </div>

          {/* Lista & Sexo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text2 mb-1.5">
                Lista *
              </label>
              <Select
                value={form.lista}
                disabled={Boolean(editClave)}
                onChange={e => {
                  const newLista = e.target.value
                  const newSexo = newLista === 'Anc/SM' ? 'M' : form.sexo
                  setForm(f => ({ ...f, lista: newLista, sexo: newSexo }))
                }}
                size="md"
              >
                <option value="Mat">Matriculados</option>
                <option value="Anc/SM">Ancianos / SM</option>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text2 mb-1.5">
                Sexo *
              </label>
              <Select
                value={form.sexo}
                disabled={form.lista === 'Anc/SM'}
                onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))}
                size="md"
              >
                <option value="F">F — Femenino</option>
                <option value="M">M — Masculino</option>
              </Select>
            </div>
          </div>

          {/* Estatus */}
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Estatus de asignación *
            </label>
            <Select
              value={form.estatus}
              onChange={e => setForm(f => ({ ...f, estatus: e.target.value }))}
              size="md"
            >
              {estatusOpts.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-text3 mt-1">
              Determina los tipos de partes bíblicas y roles en los que puede participar.
            </p>
          </div>
        </form>
      </Sheet>

      {/* Notificaciones y Diálogos */}
      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}