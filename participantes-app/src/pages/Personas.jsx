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
  Clock,
  Calendar,
  History,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFechaLegible, formatFechaConDia } from '../lib/fechas'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonList, SkeletonBlock } from '../components/Skeleton'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Sheet } from '../components/ui/Sheet'
import { Tooltip } from '../components/ui/Tooltip'

const TIPO_LABEL = {
  P: 'Presidente',
  ORACION: 'Oración apertura',
  ORACION_C: 'Oración cierre',
  CONCLU: 'Palabras de conclusión',
  TB: 'Tesoros de la Biblia',
  PE: 'Perlas escondidas',
  LB: 'Lectura de la Biblia',
  SMT_EST: 'Estudiante',
  SMT_EXP: 'Explique sus creencias',
  SMT_DSC: 'Discurso',
  SMT_AYU: 'Ayudante',
  VC: 'Vida Cristiana',
  NC: 'Nec. de la congregación',
  EBC_CON: 'Conductor EBC',
  LEBC: 'Lector EBC',
  T: 'Titular',
  A: 'Ayudante',
  X: 'Participación',
  EBC: 'Estudio Bíblico',
}

const TIPO_COLOR = {
  P: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  ORACION: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  ORACION_C: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  CONCLU: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60',
  TB: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  PE: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  LB: 'bg-cyan-50 text-cyan-800 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
  SMT_EST: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  SMT_EXP: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  SMT_DSC: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  SMT_AYU: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  VC: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  NC: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  EBC_CON: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  LEBC: 'bg-pink-50 text-pink-800 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/40',
  T: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  A: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  X: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  EBC: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
}

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

export default function Personas({
  initialPersonaClave,
  initialTab = 'historial',
  onClearInitialPersona,
}) {
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

  // Pestañas del Sheet & Timeline Historial
  const [activeSheetTab, setActiveSheetTab] = useState('perfil')
  const [proximas, setProximas] = useState([])
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [historialFetchedFor, setHistorialFetchedFor] = useState(null)

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

  const fetchHistorialPersona = useCallback(
    async (clave) => {
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
    if (sheetOpen && activeSheetTab === 'perfil') {
      setTimeout(() => {
        nombreInputRef.current?.focus()
      }, 100)
    }
  }, [sheetOpen, activeSheetTab])

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
    setActiveSheetTab('perfil')
    setProximas([])
    setHistorial([])
    setHistorialFetchedFor(null)
    setSheetOpen(true)
  }

  function startEdit(p, tab = 'perfil') {
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
  }

  // Apertura programática desde CommandPalette u otra vista
  useEffect(() => {
    if (initialPersonaClave && personas.length > 0) {
      const p = personas.find(per => per.clave === initialPersonaClave)
      if (p) {
        startEdit(p, initialTab || 'historial')
        onClearInitialPersona?.()
      }
    }
  }, [initialPersonaClave, personas, initialTab, onClearInitialPersona])

  function closeSheet() {
    setSheetOpen(false)
    setEditClave(null)
    setForm(FORM_EMPTY)
    setActiveSheetTab('perfil')
    setProximas([])
    setHistorial([])
    setHistorialFetchedFor(null)
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
        title={
          editClave
            ? activeSheetTab === 'historial'
              ? `${form.nombre || editClave}`
              : `Editar: ${editClave}`
            : 'Nuevo Participante'
        }
        description={
          editClave
            ? activeSheetTab === 'historial'
              ? 'Línea de tiempo de participaciones pasadas y próximas asignaciones.'
              : 'Modifica los datos del participante y guarda los cambios.'
            : 'Completa la información básica para registrar al participante en el sistema.'
        }
        width="md"
        footer={
          activeSheetTab === 'historial' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={closeSheet}
            >
              Cerrar
            </Button>
          ) : (
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
          )
        }
      >
        {/* Pestañas de navegación del Sheet (solo visible al editar persona existente) */}
        {editClave && (
          <div className="flex border-b border-zinc-200/80 dark:border-zinc-800 -mx-5 -mt-5 mb-5 px-5 bg-zinc-50/70 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={() => setActiveSheetTab('perfil')}
              className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeSheetTab === 'perfil'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text3 hover:text-text1'
              }`}
            >
              Perfil
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSheetTab('historial')
                if (historialFetchedFor !== editClave) {
                  fetchHistorialPersona(editClave)
                }
              }}
              className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSheetTab === 'historial'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text3 hover:text-text1'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Historial</span>
              {historialFetchedFor === editClave && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-mono text-text2">
                  {historial.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── PESTAÑA PERFIL ── */}
        {activeSheetTab === 'perfil' && (
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
        )}

        {/* ── PESTAÑA HISTORIAL (TIMELINE) ── */}
        {activeSheetTab === 'historial' && (
          <div className="space-y-6">
            {loadingHistorial ? (
              <div className="space-y-4 py-2">
                <SkeletonBlock className="h-4 w-40 rounded-md" />
                <SkeletonBlock className="h-20 rounded-xl" />
                <SkeletonBlock className="h-4 w-48 rounded-md mt-4" />
                <SkeletonBlock className="h-12 rounded-lg" />
                <SkeletonBlock className="h-12 rounded-lg" />
                <SkeletonBlock className="h-12 rounded-lg" />
              </div>
            ) : (
              <>
                {/* Bloque 1 — Próximas asignaciones (solo si existen) */}
                {proximas.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-xs font-mono font-semibold text-text1 uppercase tracking-wider">
                        Próximas Asignaciones ({proximas.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {proximas.map(asig => {
                        const parte = asig.programa_partes
                        const sem = parte?.programa_semanas
                        const tipo = parte?.tipo_asignacion || 'T'
                        const tipoColor =
                          TIPO_COLOR[tipo] ||
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200'
                        const tipoLabel = TIPO_LABEL[tipo] || tipo

                        return (
                          <div
                            key={asig.id}
                            className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col gap-1.5 text-xs shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-text1">
                                {sem?.fecha_inicio
                                  ? formatFechaConDia(sem.fecha_inicio)
                                  : 'Semana programada'}
                              </span>
                              <Badge variant={asig.confirmado ? 'success' : 'warning'} size="xs" dot>
                                {asig.confirmado ? 'Confirmada' : 'Pendiente'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0 ${tipoColor}`}>
                                {tipo}
                              </span>
                              <span className="font-medium text-text1 truncate">
                                {parte?.titulo || tipoLabel}
                              </span>
                              {asig.rol === 'ayudante' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 font-mono shrink-0">
                                  Ayudante
                                </span>
                              )}
                              {parte?.seccion === 'maestros' && (
                                <span className="text-[10px] text-text3 font-mono shrink-0 hidden sm:inline">
                                  · Escuela
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Bloque 2 — Historial de participaciones */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xs font-mono font-semibold text-text1 uppercase tracking-wider">
                        Historial de Participaciones
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-text3">
                      {historial.length} {historial.length === 1 ? 'participación registrada' : 'participaciones registradas'}
                    </span>
                  </div>

                  {historial.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col items-center justify-center space-y-2">
                      <History className="w-7 h-7 text-text3/60" />
                      <p className="text-xs text-text3 font-medium">
                        Sin participaciones registradas aún
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl overflow-hidden bg-surface">
                      {historial.map(p => {
                        const tipo = p.tipo || 'T'
                        const tipoColor =
                          TIPO_COLOR[tipo] ||
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200'
                        const tipoLabel = TIPO_LABEL[tipo] || tipo

                        return (
                          <div
                            key={p.id}
                            className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-xs text-text2 font-medium shrink-0">
                                {formatFechaLegible(p.fecha)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0 ${tipoColor}`}>
                                {tipo}
                              </span>
                              <span className="text-xs text-text1 truncate">
                                {tipoLabel}
                              </span>
                            </div>

                            {p.observaciones && (
                              <span className="text-[11px] text-text3 italic truncate max-w-[150px] text-right shrink-0">
                                {p.observaciones}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>

      {/* Notificaciones y Diálogos */}
      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}