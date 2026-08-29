import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Dialog } from '../components/ui/Dialog'
import { Tooltip } from '../components/ui/Tooltip'

// ─── Constantes ───────────────────────────────────────────────
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MES_CODE = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

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

// Intensidad elegante del mapa de calor
function heatColor(count, max) {
  if (!count || !max) return ''
  const ratio = count / max
  if (ratio <= 0) return ''
  if (ratio <= 0.25) return 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.05]'
  if (ratio <= 0.5) return 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.09]'
  if (ratio <= 0.75) return 'bg-emerald-500/[0.13] dark:bg-emerald-500/[0.14]'
  return 'bg-emerald-500/[0.20] dark:bg-emerald-500/[0.22]'
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
                <span className="font-mono text-xs text-text3 bg-surface dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60">
                  {r.fecha}
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
function AncCellModal({ open, onClose, persona, mesIdx, registros, onAdd, onDelete }) {
  const tipos = getTiposPermitidos(persona)
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevaObs, setNuevaObs] = useState('')
  const [saving, setSaving] = useState(false)

  const recsDelMes = registros
    .filter(r => r.clave === persona?.clave && r.mes === MESES[mesIdx])
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  useEffect(() => {
    if (!open) return
    setNuevoTipo('')
    setNuevaFecha(`2026-${MES_CODE[mesIdx]}-01`)
    setNuevaObs('')
  }, [open, mesIdx])

  async function handleAdd() {
    if (!nuevoTipo) return
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
                    <span className="font-mono text-[11px] text-text3 w-8 text-right shrink-0">
                      Día {assignmentDayOfMonth(r.fecha) || '—'}
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
  const [estatusFil, setEstatusFil] = useState('')

  // Filtros Ancianos
  const [searchAnc, setSearchAnc] = useState('')
  const [ancEstatusFil, setAncEstatusFil] = useState('')

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

  // Cálculo para mapa de calor
  const maxRegistros = (() => {
    const conteos = personas.map(p => registros.filter(r => r.clave === p.clave).length)
    return Math.max(...conteos, 1)
  })()

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
    if (estatusFil && p.estatus !== estatusFil) return false
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
    return true
  })

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
              Vista editable
            </h1>
            <Badge variant="neutral" size="sm">
              {personas.length} activos
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Matriz interactiva anual de participaciones por mes.
          </p>
        </div>

        {/* Pestañas de Lista y Switch Mapa de Calor */}
        <div className="flex items-center gap-3">
          {/* Segmented Tab Control */}
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

          {/* Toggle Mapa de Calor */}
          <button
            type="button"
            onClick={() => setHeatMap(h => !h)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none ${
              heatMap
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                : 'bg-surface/80 dark:bg-zinc-900/40 text-text3 border-zinc-200/80 dark:border-zinc-800/80 hover:text-text1'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${heatMap ? 'text-emerald-600 dark:text-emerald-400' : 'text-text3'}`} />
            <span className="hidden md:inline">Mapa de calor</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y FILTROS ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px]">
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
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros específicos por pestaña */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {tab === 'mat' ? (
            <>
              <div className="w-32 shrink-0">
                <Select
                  value={sexoFil}
                  onChange={e => setSexoFil(e.target.value)}
                  size="sm"
                >
                  <option value="">Todos los sexos</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </Select>
              </div>
              <div className="w-44 shrink-0">
                <Select
                  value={estatusFil}
                  onChange={e => setEstatusFil(e.target.value)}
                  size="sm"
                >
                  <option value="">Todos los estatus</option>
                  <option>Matriculado</option>
                  <option>Matriculada</option>
                  <option>Matriculado bautizado</option>
                  <option>Matriculada bautizada</option>
                </Select>
              </div>
            </>
          ) : (
            <div className="w-48 shrink-0">
              <Select
                value={ancEstatusFil}
                onChange={e => setAncEstatusFil(e.target.value)}
                size="sm"
              >
                <option value="">Todos los estatus</option>
                <option>Anciano</option>
                <option>Siervo Ministerial</option>
              </Select>
            </div>
          )}

          {/* Leyenda rápida */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-zinc-200 dark:border-zinc-800 text-xs">
            {(tab === 'mat' ? ['T', 'A', 'X'] : ['P', 'TB', 'PE', 'EBC', 'VC', 'NC', 'X']).map(t => (
              <Tooltip key={t} content={TIPO_LABEL[t]} side="bottom">
                <TypeBadge tipo={t} />
              </Tooltip>
            ))}
          </div>
        </div>
      </div>

      {/* ── CUADRÍCULA SPREADSHEET / MATRIX ── */}
      <div className="relative isolate rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-surface overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[calc(100vh-210px)]">
          <table className="w-full text-left text-xs border-collapse min-w-full table-fixed">
            <thead className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
              <tr>
                <th className="sticky left-0 top-0 z-40 w-64 min-w-[220px] px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-wider bg-zinc-50/95 dark:bg-zinc-900/95 border-r border-zinc-200/80 dark:border-zinc-800/80 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                  Participante
                </th>
                {MES_ABBR.map(m => (
                  <th
                    key={m}
                    className="px-1.5 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider"
                  >
                    {m}
                  </th>
                ))}
                <th className="w-16 min-w-14 px-2 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider bg-zinc-50/95 dark:bg-zinc-900/95 border-l border-zinc-200/80 dark:border-zinc-800/80">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {(tab === 'mat' ? matPersonas : ancPersonas).length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-xs text-text3">
                    No se encontraron participantes activos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                (tab === 'mat' ? matPersonas : ancPersonas).map(p => {
                  const total = registros.filter(r => r.clave === p.clave).length
                  const heatBg = heatMap ? heatColor(total, maxRegistros) : ''
                  const isFemenino = p.sexo === 'F'

                  return (
                    <tr
                      key={p.clave}
                      className={`hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors duration-100 ${heatBg}`}
                    >
                      {/* Columna Participante (Sticky Left) */}
                      <td
                        className={`sticky left-0 z-20 px-3.5 py-2 border-r border-zinc-200/80 dark:border-zinc-800/80 bg-surface shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] ${heatBg}`}
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
                        const recs = registros
                          .filter(r => r.clave === p.clave && r.mes === mes)
                          .sort((a, b) => a.fecha.localeCompare(b.fecha))

                        return (
                          <td
                            key={mes}
                            onClick={() =>
                              tab === 'mat'
                                ? setMatModal({ open: true, persona: p, mesIdx: mi })
                                : setAncModal({ open: true, persona: p, mesIdx: mi })
                            }
                            className="px-1 py-1.5 text-center cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40 transition-colors"
                          >
                            {recs.length === 0 ? (
                              <span className="text-zinc-300 dark:text-zinc-700 text-xs font-mono select-none">
                                ·
                              </span>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1">
                                {recs.map(r => (
                                  <div
                                    key={r.id}
                                    className="inline-flex items-center gap-1 leading-none"
                                  >
                                    <span className="font-mono text-[10px] text-text3">
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
                      <td className="px-2 py-2 text-center border-l border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/20">
                        <span
                          className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-mono font-semibold ${
                            total > 0
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-text1 border border-zinc-200/60 dark:border-zinc-700/60'
                              : 'text-text3'
                          }`}
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
      />

      <Toast toast={toast} />
    </div>
  )
}