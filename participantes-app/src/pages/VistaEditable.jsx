import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search,
  Flame,
  Calendar,
  Trash2,
  ArrowRight,
  Plus,
  X,
  RotateCcw,
  Sparkles,
  Info,
  AlertTriangle,
  LayoutGrid,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFechaLegible, getImpactoEventoSemana, MESES } from '../lib/fechas'
import { useToast } from '../hooks/useToast'
import { useEventosReunion } from '../hooks/useEventosReunion'
import { useConfiguracion } from '../hooks/useConfiguracion'
import Toast from '../components/Toast'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Dialog } from '../components/ui/Dialog'
import { Tooltip } from '../components/ui/Tooltip'
import { EmptyState } from '../components/ui/EmptyState'

// ─── Constantes ───────────────────────────────────────────────
const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MES_CODE = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

const TIPOS_MAT_F = ['T', 'A']
const TIPOS_MAT_M = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'LEBC', 'ORACION_C']
const TIPOS_SM = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'P', 'TB', 'PE', 'EBC', 'LEBC', 'ORACION_C']
const TIPOS_ANC = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'P', 'TB', 'PE', 'EBC', 'VC', 'NC', 'LEBC', 'ORACION_C']

// Tipos para la barra de asignaciones interactivas
const TIPOS_BARRA_MAT = ['T', 'A', 'LB', 'SMT_DSC', 'LEBC', 'ORACION_C', 'X']
const TIPOS_BARRA_ANC = ['P', 'TB', 'PE', 'EBC', 'LEBC', 'VC', 'NC', 'ORACION_C', 'SMT_DSC', 'LB', 'T', 'A', 'X']

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
  ORACION_C: 'Oración',
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
  ORACION_C: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/70 dark:text-zinc-300 dark:border-zinc-700/60',
}

/**
 * Determina el estilo de fondo suave y adaptativo de cada celda mensual.
 * En navegación normal: contorno blanco/plateado tipo aluminio sin relleno verde.
 * En mapa de calor: degradado esmeralda suave proporcional a la carga mensual.
 */
function getCellVisualClass({ recsCount, isCellTarget, isColHovered, isRowHovered, heatMap }) {
  // 1. Objetivo directo del cursor (celda seleccionada / intersección)
  if (isCellTarget) {
    if (heatMap) {
      // Modo Mapa de calor: resalte con brillo interior esmeralda
      return 'bg-emerald-500/20 dark:bg-emerald-500/25 shadow-[inset_0_0_0_1.5px_rgba(16,185,129,0.45)] dark:shadow-[inset_0_0_0_1.5px_rgba(16,185,129,0.5)] z-10'
    }
    // Modo normal de navegación: contorno blanco/plateado como aluminio, sin relleno verde
    return 'bg-zinc-100/35 dark:bg-white/[0.04] shadow-[inset_0_0_0_1.5px_rgba(148,163,184,0.85)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.85)] z-10'
  }

  // 2. Modo Mapa de Calor: degradado suave por volumen mensual de participaciones
  if (heatMap && recsCount > 0) {
    let heatTone = 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.11]'
    if (recsCount === 2) {
      heatTone = 'bg-emerald-500/[0.18] dark:bg-emerald-500/[0.22]'
    } else if (recsCount >= 3) {
      heatTone = 'bg-emerald-500/[0.30] dark:bg-emerald-500/[0.35]'
    }

    if (isColHovered || isRowHovered) {
      return `${heatTone} brightness-105 contrast-105`
    }
    return heatTone
  }

  // 3. Guías del cursor (columna o fila resaltadas con transición suave)
  if (isColHovered) {
    return heatMap
      ? 'bg-emerald-500/[0.05] dark:bg-emerald-500/[0.07]'
      : 'bg-zinc-100/50 dark:bg-zinc-800/35'
  }
  if (isRowHovered) {
    return 'bg-zinc-100/60 dark:bg-zinc-800/40'
  }

  return 'hover:bg-zinc-100/40 dark:hover:bg-zinc-800/20'
}

/**
 * Estilo visual del contador total de participaciones de cada fila.
 */
function getTotalBadgeStyle(total, maxTotal, heatMap) {
  if (!total) return 'text-zinc-400 dark:text-zinc-600'
  if (!heatMap || !maxTotal) {
    return 'bg-zinc-100 dark:bg-zinc-800 text-text1 border border-zinc-200/60 dark:border-zinc-700/60 shadow-2xs'
  }

  const ratio = total / maxTotal
  if (ratio <= 0.35) {
    return 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-300/40 dark:border-emerald-700/40 font-semibold'
  }
  if (ratio <= 0.7) {
    return 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border border-emerald-400/50 dark:border-emerald-600/50 font-bold'
  }
  return 'bg-emerald-500/35 text-emerald-950 dark:text-white border border-emerald-500/60 dark:border-emerald-500/60 font-bold shadow-2xs'
}

function getTiposPermitidos(persona) {
  if (!persona) return []
  if (persona.lista === 'Mat') return persona.sexo === 'F' ? TIPOS_MAT_F : TIPOS_MAT_M
  return persona.estatus === 'Anciano' ? TIPOS_ANC : TIPOS_SM
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

function toYyyyMmDd(fecha) {
  if (fecha == null || fecha === '') return ''
  const m = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

function assignmentDayOfMonth(fecha) {
  const ymd = toYyyyMmDd(fecha)
  if (!ymd) return ''
  return String(parseInt(ymd.slice(8, 10), 10))
}

// ─── Componente Badge de Tipo de Asignación ───────────────────
function TypeBadge({ tipo, onClick, title, className = '' }) {
  if (!tipo) {
    return (
      <span
        onClick={onClick}
        title={title || 'Click para ver/editar'}
        className="inline-flex items-center justify-center w-6 h-4 text-zinc-300 dark:text-zinc-700 text-[10px] cursor-pointer hover:text-text3 transition-colors"
      >
        ·
      </span>
    )
  }
  const style = BADGE_STYLES[tipo] || 'bg-zinc-100 dark:bg-zinc-800 text-text2 border-zinc-200 dark:border-zinc-700'

  return (
    <span
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center min-w-5 h-4 px-1 rounded text-[10px] font-semibold font-mono border select-none cursor-pointer transition-all duration-100 hover:scale-105 active:scale-95 ${style} ${className}`}
    >
      {tipo}
    </span>
  )
}

// ─── Selector de Chips de Tipo ────────────────────────────────
function TipoChips({ tipos, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {tipos.map(t => {
        const style = BADGE_STYLES[t] || 'bg-zinc-100 dark:bg-zinc-800 text-text2'
        const isSelected = selected === t

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

// ─── Modal Matriculados ───────────────────────────────────────
function MatCellModal({ open, onClose, persona, mesIdx, registros, onNavigate }) {
  if (!persona) return null

  const mes = MESES[mesIdx]
  const recs = registros
    .filter(r => r.clave === persona.clave && r.mes === mes)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  function handleIrAPrograma() {
    onClose()
    onNavigate?.('programa')
  }

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={`${persona.nombre} — ${mes}`}
      description="Historial de participaciones registradas en este mes."
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="accent"
            size="sm"
            iconRight={ArrowRight}
            onClick={handleIrAPrograma}
          >
            Ver en Programa
          </Button>
        </>
      }
    >
      <div className="space-y-3 py-1">
        {recs.length === 0 ? (
          <div className="text-center py-6 text-xs text-text3">
            Sin participación registrada en este mes.
          </div>
        ) : (
          recs.map(r => (
            <div
              key={r.id}
              className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <TypeBadge tipo={r.tipo} />
                <span className="text-xs font-medium text-text1">
                  {TIPO_LABEL[r.tipo] || r.tipo}
                </span>
              </div>
              {r.fecha && (
                <span className="text-xs text-text3 bg-surface dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                  {formatFechaLegible(r.fecha)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </Dialog>
  )
}

// ─── Modal Ancianos/SM ────────────────────────────────────────
function AncCellModal({ open, onClose, persona, mesIdx, registros, onAdd, onDelete, eventos, config }) {
  const tipos = getTiposPermitidos(persona)
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevaObs, setNuevaObs] = useState('')
  const [saving, setSaving] = useState(false)

  const recsDelMes = registros
    .filter(r => r.clave === persona?.clave && r.mes === MESES[mesIdx])
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  const impactoFecha = useMemo(() => {
    if (!nuevaFecha || !eventos?.length) return null
    return getImpactoEventoSemana(
      { fecha_inicio: nuevaFecha, fecha_fin: nuevaFecha },
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
  }, [nuevaFecha, eventos, config])

  useEffect(() => {
    if (!open) return
    const year = new Date().getFullYear()
    setNuevoTipo('')
    setNuevaFecha(`${year}-${MES_CODE[mesIdx]}-01`)
    setNuevaObs('')
  }, [open, mesIdx])

  async function handleAdd() {
    if (!nuevoTipo) return
    if (impactoFecha?.cancelaEntreSemana) {
      const ok = window.confirm(
        `Atención: En la fecha seleccionada (${nuevaFecha}) se celebra "${impactoFecha.tituloEvento}" y no hay reunión ordinaria entre semana. ¿Deseas agregar esta participación de todos modos?`
      )
      if (!ok) return
    }
    setSaving(true)
    await onAdd({ persona, mesIdx, tipo: nuevoTipo, fecha: nuevaFecha, obs: nuevaObs })
    setNuevoTipo('')
    setNuevaObs('')
    setSaving(false)
  }

  if (!persona) return null

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={`${persona.nombre} — ${MESES[mesIdx]}`}
      description="Consulta y administra asignaciones directas para este mes."
      size="md"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4 py-1">
        {/* Asignaciones existentes */}
        <div>
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block mb-2">
            Asignaciones actuales ({recsDelMes.length})
          </span>
          <div className="space-y-1.5 max-h-44 overflow-y-auto">
            {recsDelMes.length === 0 ? (
              <div className="p-3 text-center text-xs text-text3 rounded-lg bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                Sin asignaciones registradas en {MESES[mesIdx]}.
              </div>
            ) : (
              recsDelMes.map(r => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[11px] text-text3 font-medium shrink-0">
                      {formatFechaLegible(r.fecha) || `Día ${assignmentDayOfMonth(r.fecha) || '—'}`}
                    </span>
                    <TypeBadge tipo={r.tipo} />
                    <span className="font-medium text-text1 truncate">
                      {TIPO_LABEL[r.tipo] || r.tipo}
                    </span>
                    {r.observaciones && (
                      <span className="text-text3 italic truncate hidden sm:inline">
                        — {r.observaciones}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="iconXs"
                    onClick={async () => {
                      setSaving(true)
                      await onDelete(r.id)
                      setSaving(false)
                    }}
                    aria-label="Eliminar asignación"
                    className="text-text3 hover:text-red-500 dark:hover:text-red-400 shrink-0 ml-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Formulario para nueva asignación */}
        <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Agregar nueva asignación
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text2 mb-1">
                Fecha
              </label>
              <Input
                type="date"
                value={nuevaFecha}
                onChange={e => setNuevaFecha(e.target.value)}
                size="sm"
              />
              {impactoFecha?.cancelaEntreSemana && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>En esta fecha se celebra: {impactoFecha.tituloEvento} (sin reunión ordinaria).</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-text2 mb-1">
                Observaciones
              </label>
              <Input
                type="text"
                value={nuevaObs}
                onChange={e => setNuevaObs(e.target.value)}
                placeholder="Opcional..."
                size="sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text2 mb-1">
              Tipo de asignación *
            </label>
            <TipoChips tipos={tipos} selected={nuevoTipo} onSelect={setNuevoTipo} />
          </div>

          <div className="pt-1 flex justify-end">
            <Button
              variant="accent"
              size="sm"
              icon={Plus}
              loading={saving}
              disabled={!nuevoTipo}
              onClick={handleAdd}
            >
              Agregar al mes
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  )
}

// ─── Componente Principal ─────────────────────────────────────
export default function VistaEditable({ onNavigate }) {
  const { config } = useConfiguracion()
  const { eventos } = useEventosReunion()
  const { toast, success, error: toastError } = useToast()
  const [tab, setTab] = useState('mat')
  const [personas, setPersonas] = useState([])
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [heatMap, setHeatMap] = useState(false)

  // Filtros Matriculados
  const [searchMat, setSearchMat] = useState('')
  const [sexoFil, setSexoFil] = useState('')

  // Filtros Ancianos
  const [searchAnc, setSearchAnc] = useState('')
  const [ancEstatusFil, setAncEstatusFil] = useState('')

  // Filtro rápido de actividad ('todos' | 'sin_participacion')
  const [filtroActividad, setFiltroActividad] = useState('todos')

  // Tipos desactivados (filtro interactivo de tipos de asignación)
  const [tiposDesactivados, setTiposDesactivados] = useState(() => new Set())

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

  // Crosshair state & Mes actual
  const [hoveredCol, setHoveredCol] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const currentMonthIdx = useMemo(() => new Date().getMonth(), [])

  // Modales
  const [matModal, setMatModal] = useState({ open: false, persona: null, mesIdx: 0 })
  const [ancModal, setAncModal] = useState({ open: false, persona: null, mesIdx: 0 })

  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true)
        setFetchError(null)
      }
      try {
        const [{ data: ps, error: psErr }, { data: rs, error: rsErr }] = await Promise.all([
          supabase.from('personas').select('*').eq('activo', true).order('nombre'),
          supabase.from('participaciones').select('*').order('fecha'),
        ])
        if (psErr) throw psErr
        if (rsErr) throw rsErr
        setPersonas(ps || [])
        setRegistros(rs || [])
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
      .channel('participaciones-matrix-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, () =>
        fetchData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, () =>
        fetchData()
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // Registros activos considerando tipos desactivados
  const registrosFiltrados = useMemo(() => {
    if (tiposDesactivados.size === 0) return registros
    return registros.filter(r => !tiposDesactivados.has(r.tipo))
  }, [registros, tiposDesactivados])

  // Cálculo para mapa de calor
  const maxRegistros = useMemo(() => {
    const conteos = personas.map(p => registrosFiltrados.filter(r => r.clave === p.clave).length)
    return Math.max(...conteos, 1)
  }, [personas, registrosFiltrados])

  async function handleDelete(id) {
    try {
      const { error: err } = await supabase.from('participaciones').delete().eq('id', id)
      if (err) throw err
      success('Participación eliminada')
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al eliminar: ' + (err.message || 'Error de red'))
    }
  }

  async function handleAncAdd({ persona, mesIdx, tipo, fecha, obs }) {
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
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al agregar: ' + (err.message || 'Error de red'))
    }
  }

  // Filtrado de participantes
  const matPersonas = personas.filter(p => {
    if (p.lista !== 'Mat') return false
    if (
      searchMat &&
      !p.nombre.toLowerCase().includes(searchMat.toLowerCase()) &&
      !p.clave.toLowerCase().includes(searchMat.toLowerCase())
    ) {
      return false
    }
    if (sexoFil && p.sexo !== sexoFil) return false
    if (filtroActividad === 'sin_participacion') {
      const count = registrosFiltrados.filter(r => r.clave === p.clave).length
      if (count > 0) return false
    }
    return true
  })

  const ancPersonas = personas.filter(p => {
    if (p.lista !== 'Anc/SM') return false
    if (
      searchAnc &&
      !p.nombre.toLowerCase().includes(searchAnc.toLowerCase()) &&
      !p.clave.toLowerCase().includes(searchAnc.toLowerCase())
    ) {
      return false
    }
    if (ancEstatusFil && p.estatus !== ancEstatusFil) return false
    if (filtroActividad === 'sin_participacion') {
      const count = registrosFiltrados.filter(r => r.clave === p.clave).length
      if (count > 0) return false
    }
    return true
  })

  const countSinPartMat = useMemo(() => {
    return personas.filter(p => p.lista === 'Mat' && registrosFiltrados.filter(r => r.clave === p.clave).length === 0).length
  }, [personas, registrosFiltrados])

  const countSinPartAnc = useMemo(() => {
    return personas.filter(p => p.lista === 'Anc/SM' && registrosFiltrados.filter(r => r.clave === p.clave).length === 0).length
  }, [personas, registrosFiltrados])

  const hasActiveFilters = Boolean(
    (tab === 'mat' ? searchMat : searchAnc) ||
    (tab === 'mat' ? sexoFil : ancEstatusFil) ||
    filtroActividad !== 'todos' ||
    tiposDesactivados.size > 0
  )

  const handleResetFilters = () => {
    setSearchMat('')
    setSearchAnc('')
    setSexoFil('')
    setAncEstatusFil('')
    setFiltroActividad('todos')
    setTiposDesactivados(new Set())
  }

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
      {/* ── HEADER Y TABS DE LA PÁGINA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Matriz Anual
            </h1>
            <Badge variant="neutral" size="sm">
              {personas.length} activos
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Cuadrícula interactiva anual de participaciones por mes con mapa de rotación.
          </p>
        </div>

        {/* Pestañas de Lista */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
          <button
            type="button"
            onClick={() => setTab('mat')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              tab === 'mat'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Matriculados ({matPersonas.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('anc')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              tab === 'anc'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Ancianos y SM ({ancPersonas.length})
          </button>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y FILTROS ── */}
      <div className="space-y-2.5 p-3 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              value={tab === 'mat' ? searchMat : searchAnc}
              onChange={e => (tab === 'mat' ? setSearchMat(e.target.value) : setSearchAnc(e.target.value))}
              placeholder={`Buscar en ${tab === 'mat' ? 'Matriculados' : 'Ancianos'}...`}
              icon={Search}
              size="sm"
              className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            {(tab === 'mat' ? searchMat : searchAnc) && (
              <button
                type="button"
                onClick={() => (tab === 'mat' ? setSearchMat('') : setSearchAnc(''))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Barra de tipos de asignaciones interactiva */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1 hidden sm:inline select-none">
              Tipos:
            </span>
            {(tab === 'mat' ? TIPOS_BARRA_MAT : TIPOS_BARRA_ANC).map(t => {
              const isDeactivated = tiposDesactivados.has(t)
              const label = TIPO_LABEL[t] || t
              const style = BADGE_STYLES[t] || 'bg-zinc-100 dark:bg-zinc-800 text-text2'
              const tooltipContent = isDeactivated
                ? `${label} (${t}) — Desactivado (clic para activar)`
                : `${label} (${t}) — Activo (clic para desactivar)`

              return (
                <Tooltip key={t} content={tooltipContent} side="bottom">
                  <button
                    type="button"
                    onClick={() => toggleTipo(t)}
                    aria-label={tooltipContent}
                    className={`inline-flex items-center justify-center min-w-5 h-4.5 px-1.5 rounded text-[10px] font-semibold font-mono border select-none cursor-pointer transition-all duration-150 ${
                      isDeactivated
                        ? 'opacity-25 grayscale line-through border-dashed border-zinc-400 dark:border-zinc-600 bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 hover:opacity-60'
                        : `${style} hover:scale-105 active:scale-95 shadow-2xs`
                    }`}
                  >
                    {t}
                  </button>
                </Tooltip>
              )
            })}
          </div>
        </div>

        {/* Chips de filtro rápido e integración de Mapa de calor */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
              Filtro rápido:
            </span>
            <button
              type="button"
              onClick={() => {
                setFiltroActividad('todos')
                if (tab === 'mat') {
                  setSexoFil('')
                } else {
                  setAncEstatusFil('')
                }
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                filtroActividad === 'todos' && (tab === 'mat' ? !sexoFil : !ancEstatusFil)
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-700 dark:border-zinc-300 shadow-2xs'
                  : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltroActividad(f => f === 'sin_participacion' ? 'todos' : 'sin_participacion')}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                filtroActividad === 'sin_participacion'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-semibold shadow-2xs'
                  : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
              }`}
            >
              <span>Sin participaciones</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80">
                {tab === 'mat' ? countSinPartMat : countSinPartAnc}
              </span>
            </button>

            {tab === 'mat' ? (
              <>
                <button
                  type="button"
                  onClick={() => setSexoFil(s => s === 'M' ? '' : 'M')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    sexoFil === 'M'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Varones
                </button>
                <button
                  type="button"
                  onClick={() => setSexoFil(s => s === 'F' ? '' : 'F')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    sexoFil === 'F'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Mujeres
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAncEstatusFil(e => e === 'Anciano' ? '' : 'Anciano')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    ancEstatusFil === 'Anciano'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Ancianos
                </button>
                <button
                  type="button"
                  onClick={() => setAncEstatusFil(e => e === 'Siervo Ministerial' ? '' : 'Siervo Ministerial')}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    ancEstatusFil === 'Siervo Ministerial'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Siervos Ministeriales
                </button>
              </>
            )}

            {/* Separador */}
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

            {/* Toggle Mapa de calor integrado con escala visual suave */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHeatMap(h => !h)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                  heatMap
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold shadow-2xs'
                    : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                }`}
                title="Alternar resaltado suave de intensidad por cantidad de participaciones"
              >
                <Flame className={`w-3.5 h-3.5 ${heatMap ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-500/20' : 'text-text3'}`} />
                <span>Mapa de calor</span>
              </button>

              {heatMap && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-text3 pl-0.5 animate-in fade-in duration-200 select-none">
                  <span className="text-[10px] font-mono text-zinc-400">1</span>
                  <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
                    <Tooltip content="1 asignación en el mes" side="bottom">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/15 dark:bg-emerald-500/20 cursor-help" />
                    </Tooltip>
                    <Tooltip content="2 asignaciones en el mes" side="bottom">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/35 dark:bg-emerald-500/40 cursor-help" />
                    </Tooltip>
                    <Tooltip content="3 o más asignaciones en el mes" side="bottom">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/65 dark:bg-emerald-500/70 cursor-help" />
                    </Tooltip>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">3+</span>
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-xs text-text3 hover:text-text1 flex items-center gap-1 cursor-pointer transition-colors"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CUADRÍCULA SPREADSHEET / MATRIX ── */}
      <div className="relative isolate rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-surface overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[calc(100vh-210px)]">
          <table
            className="w-full text-left text-xs border-collapse min-w-full table-fixed"
            onMouseLeave={() => {
              setHoveredCol(null)
              setHoveredRow(null)
            }}
          >
            <thead className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
              <tr>
                <th className={`sticky left-0 top-0 z-40 w-64 min-w-[220px] px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-wider bg-surface border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_14px_-2px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out ${
                  hoveredRow ? 'text-text1 font-bold' : ''
                }`}>
                  Participante
                </th>
                {MES_ABBR.map((m, idx) => {
                  const isCurrent = idx === currentMonthIdx
                  const isHovered = hoveredCol === idx

                  return (
                    <th
                      key={m}
                      className={`px-1.5 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ease-out border-r border-zinc-200/60 dark:border-zinc-800/60 ${
                        isHovered
                          ? heatMap
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-bold border-b-2 border-b-emerald-600 dark:border-b-emerald-400 shadow-[inset_0_-2px_0_0_rgba(16,185,129,0.8)]'
                            : 'bg-zinc-200/60 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-bold border-b-2 border-b-zinc-400 dark:border-b-zinc-200 shadow-[inset_0_-2px_0_0_rgba(255,255,255,0.4)]'
                          : isCurrent
                            ? 'text-emerald-700 dark:text-emerald-300 font-bold border-b-2 border-b-emerald-500/60'
                            : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{m}</span>
                        {isCurrent && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20"
                            title="Mes en curso"
                          />
                        )}
                      </div>
                    </th>
                  )
                })}
                <th className="w-16 min-w-14 px-2 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider bg-zinc-50/95 dark:bg-zinc-900/95 border-l border-zinc-200/80 dark:border-zinc-800/80">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {(tab === 'mat' ? matPersonas : ancPersonas).length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 px-4">
                    <EmptyState
                      icon={LayoutGrid}
                      title="Sin participantes para mostrar"
                      description="No se encontraron participantes activos con los filtros seleccionados."
                      action={
                        hasActiveFilters
                          ? {
                              label: 'Limpiar filtros',
                              onClick: handleResetFilters,
                              icon: RotateCcw,
                            }
                          : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                (tab === 'mat' ? matPersonas : ancPersonas).map(p => {
                  const total = registrosFiltrados.filter(r => r.clave === p.clave).length
                  const isFemenino = p.sexo === 'F'
                  const isRowHovered = hoveredRow === p.clave

                  return (
                    <tr
                      key={p.clave}
                      onMouseEnter={() => setHoveredRow(p.clave)}
                      className="transition-all duration-200 ease-out group"
                    >
                      {/* Columna Participante (Sticky Left) */}
                      <td
                        className={`sticky left-0 z-20 px-3.5 py-2 border-r border-zinc-200 dark:border-zinc-800 bg-surface shadow-[4px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_14px_-2px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out ${
                          isRowHovered ? 'bg-zinc-100/90 dark:bg-zinc-800/90' : 'bg-surface'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                              isFemenino
                                ? 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40'
                                : 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
                            }`}
                          >
                            {initials(p.nombre)}
                          </div>
                          <div className="min-w-0 flex flex-col">
                            <span className="font-medium text-text1 text-xs truncate">
                              {p.nombre}
                            </span>
                            <span className="font-mono text-[10px] text-text3 truncate">
                              {p.clave} · {p.estatus}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Columnas de los 12 Meses */}
                      {MESES.map((mes, mi) => {
                        const recs = registrosFiltrados
                          .filter(r => r.clave === p.clave && r.mes === mes)
                          .sort((a, b) => a.fecha.localeCompare(b.fecha))

                        const isColHovered = hoveredCol === mi
                        const isCellTarget = isColHovered && isRowHovered
                        const visualClass = getCellVisualClass({
                          recsCount: recs.length,
                          isCellTarget,
                          isColHovered,
                          isRowHovered,
                          heatMap,
                        })

                        return (
                          <td
                            key={mes}
                            onMouseEnter={() => {
                              setHoveredCol(mi)
                              setHoveredRow(p.clave)
                            }}
                            onClick={() =>
                              tab === 'mat'
                                ? setMatModal({ open: true, persona: p, mesIdx: mi })
                                : setAncModal({ open: true, persona: p, mesIdx: mi })
                            }
                            className={`relative px-1 py-1.5 text-center cursor-pointer transition-all duration-200 ease-out border-r border-zinc-100/80 dark:border-zinc-800/50 min-h-[48px] h-12 ${visualClass}`}
                          >
                            {recs.length === 0 ? (
                              <span className="inline-block w-1 h-1 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60 select-none transition-opacity duration-200" />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1">
                                {recs.map(r => (
                                  <div
                                    key={r.id}
                                    className="inline-flex items-center gap-1 leading-none transition-transform duration-150 hover:scale-105"
                                  >
                                    <span className="font-mono text-[10px] text-text3 select-none">
                                      {assignmentDayOfMonth(r.fecha)}
                                    </span>
                                    <TypeBadge
                                      tipo={r.tipo}
                                      title={`${r.tipo}: ${TIPO_LABEL[r.tipo] || ''} (${r.fecha || mes})`}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}

                      {/* Columna Total */}
                      <td
                        className={`px-2 py-2 text-center border-l border-zinc-200/80 dark:border-zinc-800/80 transition-all duration-200 ease-out ${
                          isRowHovered
                            ? 'bg-zinc-100/80 dark:bg-zinc-800/60'
                            : 'bg-zinc-50/40 dark:bg-zinc-900/20'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-mono transition-all duration-200 ease-out ${getTotalBadgeStyle(
                            total,
                            maxRegistros,
                            heatMap
                          )}`}
                        >
                          {total || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODALES DE CELDA ── */}
      <MatCellModal
        open={matModal.open}
        onClose={() => setMatModal(m => ({ ...m, open: false }))}
        persona={matModal.persona}
        mesIdx={matModal.mesIdx}
        registros={registros}
        onNavigate={onNavigate}
      />

      <AncCellModal
        open={ancModal.open}
        onClose={() => setAncModal(m => ({ ...m, open: false }))}
        persona={ancModal.persona}
        mesIdx={ancModal.mesIdx}
        registros={registros}
        onAdd={handleAncAdd}
        onDelete={handleDelete}
        eventos={eventos}
        config={config}
      />

      <Toast toast={toast} />
    </div>
  )
}