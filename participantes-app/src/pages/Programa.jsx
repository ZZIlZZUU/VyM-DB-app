import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Calendar,
  Music,
  BookOpen,
  Check,
  CheckCheck,
  Trash2,
  Upload,
  FileDown,
  Pencil,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  Clock3,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parsearEPUB } from '../lib/epubParser'
import { sugerirCandidatos, sugerirAyudante } from '../lib/asignacionesSugeridas'
import { generarYDescargarS140, buildDatosDesdeSupabase } from '../lib/generarS140'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonPrograma } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Tooltip } from '../components/ui/Tooltip'

// ── Constantes UI ─────────────────────────────────────────────
const SECCION_LABEL = {
  APERTURA: 'Apertura',
  TB: 'Tesoros de la Biblia',
  SMT: 'Seamos Mejores Maestros',
  VC: 'Nuestra Vida Cristiana',
  CIERRE: 'Cierre',
}

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
  SMT_VACIO: '—',
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
  SMT_VACIO: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60',
}

const PESO_TIPO = {
  T: 2, A: 1, LB: 1, SMT_EST: 1, SMT_EXP: 1, SMT_DSC: 1, SMT_AYU: 1,
  TB: 1, PE: 1, VC: 1, NC: 1, EBC_CON: 1, LEBC: 1, P: 1, ORACION: 0, ORACION_C: 0,
}

// Mapa tipo_asignacion → campo 'tipo' en tabla participaciones
const TIPO_PARTICIPACION = {
  P: 'P',
  ORACION: 'P',
  ORACION_C: 'OC',
  CONCLU: 'P',
  TB: 'TB',
  PE: 'PE',
  LB: 'LB',
  SMT_EST: 'T',
  SMT_EXP: 'T',
  SMT_DSC: 'DSC',
  SMT_AYU: 'A',
  VC: 'VC',
  NC: 'NC',
  EBC_CON: 'EBC',
  LEBC: 'LEBC',
}

// ── Selector de Participante Inteligente ──────────────────────
function PersonaSelector({ tipo, value, onChange, personas, historial, mes, yaAsignados, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [tooltip, setTooltip] = useState(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const hoverTimer = useRef(null)
  const TOOLTIP_W = 260

  const candidatos = sugerirCandidatos(tipo, personas, historial, mes, yaAsignados)

  const seleccionado =
    candidatos.find(p => p.clave === value) || personas.find(p => p.clave === value)

  const filtrados = query.trim()
    ? candidatos.filter(
        p =>
          p.nombre.toLowerCase().includes(query.toLowerCase()) ||
          p.clave.toLowerCase().includes(query.toLowerCase())
      )
    : candidatos

  useEffect(() => {
    if (!open) {
      setTooltip(null)
      return
    }
    const handleOutside = e => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest?.('[data-persona-dropdown]')
      ) {
        setOpen(false)
        setTooltip(null)
      }
    }
    const handleScroll = e => {
      clearTimeout(hoverTimer.current)
      setTooltip(null)
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', () => {
      setOpen(false)
      setTooltip(null)
    })
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', () => {
        setOpen(false)
        setTooltip(null)
      })
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
    }
  }, [open])

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  function handleToggle() {
    if (disabled) return
    if (!open) {
      setQuery('')
      setTooltip(null)
    }
    setOpen(o => !o)
  }

  function handleSelect(clave) {
    onChange(clave || null)
    setOpen(false)
    setQuery('')
    setTooltip(null)
  }

  function handleItemMouseEnter(clave, e) {
    clearTimeout(hoverTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const spaceRight = window.innerWidth - rect.right
    const left = spaceRight >= TOOLTIP_W + 12 ? rect.right + 8 : rect.left - TOOLTIP_W - 8
    hoverTimer.current = setTimeout(() => {
      setTooltip({ clave, top: rect.top, left })
    }, 150)
  }

  function handleItemMouseLeave() {
    clearTimeout(hoverTimer.current)
    setTooltip(null)
  }

  function getIndicador(p) {
    if (p._score < 50) return { icon: AlertTriangle, cls: 'text-red-500' }
    if (p._score < 80) return { icon: Clock, cls: 'text-amber-500' }
    return { icon: Check, cls: 'text-emerald-600 dark:text-emerald-400' }
  }

  function getUltimasParticipaciones(clave) {
    return historial
      .filter(h => h.clave === clave)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 3)
  }

  function getDropdownStyle() {
    if (!triggerRef.current) return {}
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 240
    const dropdownWidth = 240

    const style = {
      position: 'fixed',
      zIndex: 200,
      width: `${Math.max(rect.width, dropdownWidth)}px`,
    }

    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
      style.bottom = `${window.innerHeight - rect.top + 4}px`
    } else {
      style.top = `${rect.bottom + 4}px`
    }

    if (rect.left + dropdownWidth > window.innerWidth - 12) {
      style.right = `${Math.max(12, window.innerWidth - rect.right)}px`
    } else {
      style.left = `${Math.max(12, rect.left)}px`
    }

    return style
  }

  const tooltipPersona = tooltip ? personas.find(p => p.clave === tooltip.clave) : null
  const tooltipParts = tooltip ? getUltimasParticipaciones(tooltip.clave) : []

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all border outline-none select-none ${
          open
            ? 'border-emerald-600 dark:border-emerald-500 bg-surface ring-1 ring-emerald-500/20'
            : 'border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 hover:border-zinc-300 dark:hover:border-zinc-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} text-text1`}
      >
        {seleccionado ? (
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {(() => {
              const Ind = getIndicador(seleccionado).icon
              return <Ind className={`w-3.5 h-3.5 shrink-0 ${getIndicador(seleccionado).cls}`} />
            })()}
            <span className="font-mono text-[11px] text-text3 shrink-0">
              {seleccionado.clave}
            </span>
            <span className="truncate font-medium text-text1">{seleccionado.nombre}</span>
          </div>
        ) : (
          <span className="text-text3 text-xs italic flex-1">— Sin asignar —</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-text3 shrink-0 opacity-70" />
      </button>

      {/* Floating Dropdown */}
      {open && (
        <div
          data-persona-dropdown
          className="fixed z-[200] bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-view-fade"
          style={getDropdownStyle()}
        >
          {/* Búsqueda */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <Input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setOpen(false)
                  setQuery('')
                  setTooltip(null)
                }
                if (e.key === 'Enter' && filtrados.length > 0) handleSelect(filtrados[0].clave)
              }}
              placeholder="Buscar nombre o clave..."
              icon={Search}
              size="sm"
              className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1"
            />
          </div>

          {/* Opciones */}
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-text3 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              — Sin asignar —
            </button>

            {filtrados.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-text3 italic">
                Sin participantes disponibles
              </div>
            ) : (
              filtrados.map(p => {
                const ind = getIndicador(p)
                const IndIcon = ind.icon
                const isSelected = p.clave === value

                return (
                  <button
                    key={p.clave}
                    type="button"
                    onClick={() => handleSelect(p.clave)}
                    onMouseEnter={e => handleItemMouseEnter(p.clave, e)}
                    onMouseLeave={handleItemMouseLeave}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium'
                        : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 text-text1'
                    }`}
                  >
                    <IndIcon className={`w-3.5 h-3.5 shrink-0 ${ind.cls}`} />
                    <span className="font-mono text-text3 text-[11px] shrink-0 w-12">{p.clave}</span>
                    <span className="truncate flex-1">{p.nombre}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip */}
      {tooltip && tooltipPersona && (
        <div
          className="fixed z-[300] w-64 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 text-xs flex flex-col gap-2 pointer-events-none animate-view-fade"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-1.5">
            <span className="font-semibold text-text1 truncate">{tooltipPersona.nombre}</span>
            <span className="font-mono text-[10px] text-text3 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60">
              {tooltipPersona.clave}
            </span>
          </div>

          {tooltipParts.length === 0 ? (
            <span className="text-text3 italic text-[11px]">Sin participaciones recientes</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-text3 uppercase tracking-wider">
                Últimas participaciones:
              </span>
              {tooltipParts.map((pt, idx) => {
                const colorKey =
                  {
                    T: 'SMT_EST',
                    A: 'SMT_AYU',
                    EBC: 'EBC_CON',
                    OC: 'ORACION_C',
                  }[pt.tipo] || pt.tipo

                return (
                  <div
                    key={idx}
                    className="p-1.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between"
                  >
                    <span className="text-[10px] text-text3 font-medium">
                      {pt.mes} {String(pt.fecha || '').slice(0, 4)}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                        TIPO_COLOR[colorKey] || 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {pt.tipo}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Fila de Parte del Programa ────────────────────────────────
function FilaParte({
  parte,
  asignaciones,
  personas,
  historial,
  mes,
  semanaAsignados,
  onAsignar,
  onConfirmar,
  clavePresidente,
  modoLectura,
}) {
  const [flashing, setFlashing] = useState(false)
  const asig = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'principal')
  const asigAyu = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'ayudante')
  const principal = asig[0] || null
  const ayudante = asigAyu[0] || null

  const principalPartRecord = principal?.participacion_id
    ? historial.find(h => h.id === principal.participacion_id)
    : null
  const ayudantePartRecord = ayudante?.participacion_id
    ? historial.find(h => h.id === ayudante.participacion_id)
    : null

  const principalCambiado =
    !!principal?.participacion_id &&
    principalPartRecord &&
    principalPartRecord.clave !== principal?.clave
  const ayudanteCambiado =
    !!ayudante?.participacion_id &&
    ayudantePartRecord &&
    ayudantePartRecord.clave !== ayudante?.clave
  const ayudanteNuevo =
    parte.requiere_ayudante &&
    ayudante?.clave &&
    principal?.participacion_id &&
    !ayudante?.participacion_id
  const ayudanteRemovido = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

  const necesitaReconfirmar =
    principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido

  // Slot vacío — no renderizar asignable
  if (parte.tipo_asignacion === 'SMT_VACIO') {
    return (
      <div
        className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:divide-zinc-800/60 last:border-0 items-center ${
          modoLectura
            ? 'grid-cols-[auto_1fr_1fr]'
            : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
        }`}
      >
        <div className="text-xs font-mono text-text3 w-16" />
        <div>
          <div className="text-xs text-text3 italic">Sin cuarta asignación</div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-text3">
            SMT
          </span>
        </div>
        <div />
        {!modoLectura && <div />}
      </div>
    )
  }

  // CONCLU y ORACION — read-only, siempre refleja al Presidente
  if (parte.tipo_asignacion === 'CONCLU' || parte.tipo_asignacion === 'ORACION') {
    const nombrePresidente = personas.find(p => p.clave === clavePresidente)?.nombre || '—'
    return (
      <div
        className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 items-center ${
          modoLectura
            ? 'grid-cols-[auto_1fr_1fr]'
            : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {parte.hora_inicio || ''}
        </div>
        <div>
          <div className="text-xs font-medium text-text1 leading-snug">{parte.titulo}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                TIPO_COLOR[parte.tipo_asignacion] || 'bg-zinc-100 text-zinc-700'
              }`}
            >
              {parte.tipo_asignacion}
            </span>
          </div>
        </div>

        {modoLectura ? (
          <div className="flex flex-col">
            <span
              className={
                clavePresidente ? 'text-xs font-medium text-text1' : 'text-xs text-text3 italic'
              }
            >
              {clavePresidente ? nombrePresidente : '— Asignar presidente primero'}
            </span>
          </div>
        ) : (
          <div className="px-2.5 py-1.5 text-xs text-text3 italic bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-lg">
            {clavePresidente ? nombrePresidente : '— Presidente asignado —'}
          </div>
        )}
        {!modoLectura && <div />}
      </div>
    )
  }

  return (
    <div
      className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 items-center ${
        modoLectura
          ? 'grid-cols-[auto_1fr_1fr]'
          : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
      }`}
    >
      {/* Hora */}
      <div className="text-xs font-mono text-text3 whitespace-nowrap">
        {parte.hora_inicio || ''}
      </div>

      {/* Título y Tipo */}
      <div className="min-w-0">
        <div className="text-xs font-medium text-text1 leading-snug truncate">{parte.titulo}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
              TIPO_COLOR[parte.tipo_asignacion] || 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {parte.tipo_asignacion}
          </span>
          {parte.duracion_min && (
            <span className="text-[11px] text-text3 font-mono">
              {parte.duracion_min} min
            </span>
          )}
        </div>
      </div>

      {/* Asignaciones: Modo Lectura vs Modo Edición */}
      {modoLectura ? (
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className={`text-xs truncate ${
                principal?.clave ? 'font-medium text-text1' : 'text-text3 italic'
              }`}
            >
              {principal?.clave
                ? personas.find(p => p.clave === principal.clave)?.nombre ?? principal.clave
                : '— Sin asignar'}
            </span>
            {principal?.clave && (
              <Badge
                variant={
                  principal?.confirmado && !necesitaReconfirmar
                    ? 'success'
                    : necesitaReconfirmar
                    ? 'warning'
                    : 'neutral'
                }
                size="xs"
              >
                {principal?.confirmado && !necesitaReconfirmar
                  ? 'Confirmado'
                  : necesitaReconfirmar
                  ? 'Reconfirmar'
                  : 'Pendiente'}
              </Badge>
            )}
          </div>
          {parte.requiere_ayudante && (
            <span className="text-[11px] text-text3 truncate">
              {ayudante?.clave
                ? `↳ ${personas.find(p => p.clave === ayudante.clave)?.nombre ?? ayudante.clave}`
                : principal?.clave
                ? '↳ Sin ayudante'
                : null}
            </span>
          )}
        </div>
      ) : (
        <>
          {/* Selectores de participantes */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <PersonaSelector
              tipo={parte.tipo_asignacion}
              value={principal?.clave}
              onChange={clave => onAsignar(parte.id, clave, 'principal', principal?.id)}
              personas={personas}
              historial={historial}
              mes={mes}
              yaAsignados={semanaAsignados.filter(c => c !== principal?.clave)}
              disabled={false}
            />
            {parte.requiere_ayudante &&
              (() => {
                const tipoAyu =
                  parte.tipo_asignacion === 'SMT_EXP'
                    ? personas.find(p => p.clave === principal?.clave)?.sexo === 'M'
                      ? 'SMT_EXP_M'
                      : 'SMT_EXP_F'
                    : parte.tipo_asignacion
                return (
                  <PersonaSelector
                    tipo={tipoAyu}
                    value={ayudante?.clave}
                    onChange={clave => onAsignar(parte.id, clave, 'ayudante', ayudante?.id)}
                    personas={personas}
                    historial={historial}
                    mes={mes}
                    yaAsignados={[
                      ...semanaAsignados.filter(c => c !== ayudante?.clave),
                      principal?.clave,
                    ].filter(Boolean)}
                    disabled={!principal?.clave}
                  />
                )
              })()}
          </div>

          {/* Botón de Confirmación */}
          <div className="flex items-center justify-end">
            {principal?.clave ? (
              <Button
                variant={
                  necesitaReconfirmar
                    ? 'danger'
                    : principal?.confirmado
                    ? 'accent'
                    : 'outline'
                }
                size="xs"
                loading={flashing}
                onClick={async () => {
                  setFlashing(true)
                  await onConfirmar(parte.id, principal, ayudante)
                  setTimeout(() => setFlashing(false), 500)
                }}
                icon={
                  necesitaReconfirmar
                    ? RotateCcw
                    : principal?.confirmado
                    ? Check
                    : Check
                }
              >
                {necesitaReconfirmar
                  ? 'Reconfirmar'
                  : principal?.confirmado
                  ? 'Confirmado'
                  : 'Confirmar'}
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

// ── Tarjeta de Semana ─────────────────────────────────────────
function TarjetaSemana({
  semana,
  partes,
  asignaciones,
  personas,
  historial,
  onAsignar,
  onConfirmar,
  onConfirmarTodo,
  onEliminarSemana,
  expandida,
  onToggleExpand,
  modoLectura,
}) {
  const mes = semana.mes

  const semanaAsignados = asignaciones
    .filter(a => partes.some(p => p.id === a.parte_id))
    .map(a => a.clave)

  const partePresidente = partes.find(p => p.tipo_asignacion === 'P')
  const asigPresidente = partePresidente
    ? asignaciones.find(a => a.parte_id === partePresidente.id && a.rol === 'principal')
    : null
  const clavePresidente = asigPresidente?.clave || null

  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']
  const partesContables = partes.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
  const totalPartes = partesContables.length

  const hayReconfirmaciones = partesContables.some(p => {
    const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')
    if (!asigP?.clave) return false

    const pr = asigP.participacion_id ? historial.find(h => h.id === asigP.participacion_id) : null
    const ar = asigA?.participacion_id ? historial.find(h => h.id === asigA.participacion_id) : null

    const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
    const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
    const aNuevo =
      p.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
    const aRem = p.requiere_ayudante && !asigA?.clave && ar

    return pCambio || aCambio || aNuevo || aRem
  })

  const confirmadas = partesContables.filter(p => {
    const asigParte = asignaciones.filter(a => a.parte_id === p.id && a.confirmado)
    const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')

    const pr = asigP?.participacion_id ? historial.find(h => h.id === asigP.participacion_id) : null
    const ar = asigA?.participacion_id ? historial.find(h => h.id === asigA.participacion_id) : null
    const pCambio = !!asigP?.participacion_id && pr && pr.clave !== asigP?.clave
    const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
    const aNuevo =
      p.requiere_ayudante && asigA?.clave && asigP?.participacion_id && !asigA?.participacion_id
    const aRem = p.requiere_ayudante && !asigA?.clave && ar
    const necesitaRec = pCambio || aCambio || aNuevo || aRem

    return asigParte.some(a => a.rol === 'principal') && !necesitaRec
  }).length

  const pct = totalPartes > 0 ? Math.round((confirmadas / totalPartes) * 100) : 0
  const secciones = ['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE']

  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all">
      {/* Card Header Accordion */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/60 select-none">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer mr-3"
        >
          {/* Fechas y Lectura */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span className="text-sm font-semibold text-text1">
                {semana.fecha_inicio} — {semana.fecha_fin}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text3 font-mono mt-0.5">
              <BookOpen className="w-3.5 h-3.5 opacity-60" />
              <span>{semana.capitulo_biblico}</span>
            </div>
          </div>

          {/* Canciones y Progreso */}
          <div className="flex items-center gap-4">
            {/* Canciones */}
            <div className="hidden md:flex items-center gap-1">
              {[semana.cancion_apertura, semana.cancion_vc, semana.cancion_cierre]
                .filter(Boolean)
                .map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-text2 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60"
                  >
                    <Music className="w-3 h-3 text-text3" />
                    {c}
                  </span>
                ))}
            </div>

            {/* Progreso */}
            <div className="flex items-center gap-2.5">
              <Badge
                variant={
                  pct === 100
                    ? 'success'
                    : pct >= 50
                    ? 'warning'
                    : 'neutral'
                }
                size="sm"
              >
                {confirmadas}/{totalPartes} confirmadas
              </Badge>
              {expandida ? (
                <ChevronUp className="w-4 h-4 text-text3" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text3" />
              )}
            </div>
          </div>
        </button>

        {/* Acciones Rápidas */}
        {!modoLectura && (
          <Button
            variant="dangerGhost"
            size="iconSm"
            onClick={() => onEliminarSemana(semana.id)}
            aria-label="Eliminar semana"
            title="Eliminar semana"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Contenido Expandido */}
      {expandida && (
        <div className="px-5 py-4 space-y-5 animate-view-fade">
          {secciones.map(sec => {
            const partesSeccion = partes.filter(p => p.seccion === sec)
            if (!partesSeccion.length) return null

            return (
              <div key={sec} className="space-y-2">
                <div className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                  {SECCION_LABEL[sec]}
                </div>
                {partesSeccion.map(parte => (
                  <FilaParte
                    key={parte.id}
                    parte={parte}
                    asignaciones={asignaciones}
                    personas={personas}
                    historial={historial}
                    mes={mes}
                    semanaAsignados={semanaAsignados}
                    onAsignar={onAsignar}
                    onConfirmar={onConfirmar}
                    clavePresidente={clavePresidente}
                    modoLectura={modoLectura}
                  />
                ))}
              </div>
            )
          })}

          {!modoLectura && (
            <div className="flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800/80 gap-3">
              <Button
                variant={hayReconfirmaciones ? 'danger' : pct === 100 ? 'secondary' : 'accent'}
                size="sm"
                icon={hayReconfirmaciones ? RotateCcw : CheckCheck}
                onClick={() => onConfirmarTodo(semana.id, partes, asignaciones)}
              >
                {hayReconfirmaciones
                  ? 'Actualizar confirmaciones pendientes'
                  : pct === 100 && totalPartes > 0
                  ? 'Toda la semana confirmada'
                  : 'Confirmar toda la semana'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente Principal ──────────────────────────────────────
export default function Programa() {
  const [semanas, setSemanas] = useState([])
  const [partes, setPartes] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [personas, setPersonas] = useState([])
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [vistaTab, setVistaTab] = useState('semanas')
  const [congregacion, setCongregacion] = useState('Congregacion del Recreo')
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [modoLectura, setModoLectura] = useState(() => {
    try {
      return localStorage.getItem('programa_modoLectura') === 'true'
    } catch {
      return false
    }
  })
  const { toast, showToast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    try {
      localStorage.setItem('programa_modoLectura', String(modoLectura))
    } catch {}
  }, [modoLectura])

  const handleToggleExpand = semanaId => {
    setExpandedWeeks(prev => ({ ...prev, [semanaId]: !prev[semanaId] }))
  }

  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true)
        setFetchError(null)
      }
      try {
        const [
          { data: sem, error: semErr },
          { data: par, error: parErr },
          { data: asi, error: asiErr },
          { data: per, error: perErr },
          { data: his, error: hisErr },
          { data: cfg, error: cfgErr },
        ] = await Promise.all([
          supabase.from('programa_semanas').select('*').order('fecha_inicio'),
          supabase.from('programa_partes').select('*').order('numero_parte'),
          supabase.from('programa_asignaciones').select('*'),
          supabase.from('personas').select('*').eq('activo', true).order('nombre'),
          supabase.from('participaciones').select('*').order('fecha'),
          supabase.from('configuracion').select('*'),
        ])
        if (semErr) throw semErr
        if (parErr) throw parErr
        if (asiErr) throw asiErr
        if (perErr) throw perErr
        if (hisErr) throw hisErr

        if (cfgErr) {
          console.warn('Error al cargar la configuración:', cfgErr)
        }

        setSemanas(sem || [])
        setPartes(par || [])
        setAsignaciones(asi || [])
        setPersonas(per || [])
        setHistorial(his || [])
        const nombreCfg = cfg?.find(r => r.clave === 'nombre_congregacion')?.valor
        if (nombreCfg) setCongregacion(nombreCfg)
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
      .channel('programa-sync-matrix')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_semanas' }, () =>
        fetchData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_partes' }, () =>
        fetchData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_asignaciones' }, () =>
        fetchData()
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // ── Subir y parsear EPUB ──────────────────────────────────
  async function handleEPUB(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    showToast('Procesando archivo EPUB...')

    try {
      const semanasParsed = await parsearEPUB(file)
      let insertadas = 0

      for (const s of semanasParsed) {
        const { data: semData, error: semError } = await supabase
          .from('programa_semanas')
          .upsert(
            {
              fecha_inicio: s.fecha_inicio,
              fecha_fin: s.fecha_fin,
              capitulo_biblico: s.capitulo_biblico,
              cancion_apertura: s.cancion_apertura,
              cancion_vc: s.cancion_vc,
              cancion_cierre: s.cancion_cierre,
              mes: s.fecha_inicio
                ? new Date(s.fecha_inicio + 'T12:00:00')
                    .toLocaleString('es-MX', { month: 'long' })
                    .replace(/^\w/, c => c.toUpperCase())
                : '',
              anio: s.fecha_inicio
                ? new Date(s.fecha_inicio + 'T12:00:00').getFullYear()
                : new Date().getFullYear(),
              epub_filename: file.name,
            },
            { onConflict: 'fecha_inicio,fecha_fin', ignoreDuplicates: false }
          )
          .select()
          .single()

        if (semError || !semData) continue

        await supabase.from('programa_partes').delete().eq('semana_id', semData.id)

        const partesPayload = s.partes.map((p, i) => ({
          semana_id: semData.id,
          seccion: p.seccion,
          numero_parte: Number.isInteger(p.numero_parte) ? p.numero_parte : i + 1,
          titulo: p.titulo,
          duracion_min: p.duracion_min || null,
          tipo_asignacion: p.tipo,
          requiere_ayudante: p.requiere_ayudante || false,
          hora_inicio: p.hora_inicio || null,
          hora_fin: p.hora_fin || null,
        }))

        const { error: partesError } = await supabase.from('programa_partes').insert(partesPayload)
        if (partesError) {
          console.error('Error insertando partes del EPUB:', partesError)
          toastError('Error al guardar partes del EPUB: ' + partesError.message)
          continue
        }

        insertadas++
      }

      success(`${insertadas} semanas importadas exitosamente`)
      e.target.value = ''
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al procesar el EPUB: ' + err.message)
    }

    setUploading(false)
  }

  async function handleAsignar(parteId, clave, rol, existingId) {
    if (!clave) {
      if (existingId) {
        const asigExistente = asignaciones.find(a => a.id === existingId)
        if (asigExistente?.participacion_id) {
          await supabase.from('participaciones').delete().eq('id', asigExistente.participacion_id)
        }
        await supabase.from('programa_asignaciones').delete().eq('id', existingId)
        await fetchData()
      }
      return
    }

    const payload = { parte_id: parteId, clave, rol, sugerido_por_app: false, confirmado: false }

    if (existingId) {
      await supabase.from('programa_asignaciones').update(payload).eq('id', existingId)
    } else {
      await supabase.from('programa_asignaciones').insert(payload)
    }

    await fetchData()
  }

  // ── Confirmar asignación individual ─────────────────────
  async function handleConfirmar(parteId, principal, ayudante) {
    if (!principal?.clave) return

    const parte = partes.find(p => p.id === parteId)
    if (!parte) return

    if (parte.tipo_asignacion === 'ORACION' || parte.tipo_asignacion === 'CONCLU') return
    if (principal.rol === 'ayudante') return

    const semana = semanas.find(s => s.id === parte.semana_id)
    if (!semana) return

    const persona = personas.find(p => p.clave === principal.clave)
    if (!persona) return

    const tipoParticipacion = TIPO_PARTICIPACION[parte.tipo_asignacion] || 'X'

    const principalPartRecord = principal.participacion_id
      ? historial.find(h => h.id === principal.participacion_id)
      : null
    const ayudantePartRecord = ayudante?.participacion_id
      ? historial.find(h => h.id === ayudante.participacion_id)
      : null

    const principalCambiado =
      !!principal.participacion_id &&
      principalPartRecord &&
      principalPartRecord.clave !== principal.clave
    const ayudanteCambiado =
      !!ayudante?.participacion_id &&
      ayudantePartRecord &&
      ayudantePartRecord.clave !== ayudante?.clave
    const ayudanteNuevo =
      parte.requiere_ayudante &&
      ayudante?.clave &&
      principal.participacion_id &&
      !ayudante?.participacion_id
    const ayudanteRemovido = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

    const esReconfirmacion =
      principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido

    // Reconfirmar
    if (esReconfirmacion) {
      if (principal.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', principal.participacion_id)
      }
      if (ayudante?.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', ayudante.participacion_id)
      }

      const { data: partData } = await supabase
        .from('participaciones')
        .insert({
          clave: persona.clave,
          nombre: persona.nombre,
          lista: persona.lista,
          fecha: semana.fecha_inicio,
          mes: semana.mes,
          tipo: tipoParticipacion,
          peso: PESO_TIPO[tipoParticipacion] || 1,
          observaciones: null,
        })
        .select()
        .single()

      await supabase
        .from('programa_asignaciones')
        .update({
          confirmado: true,
          participacion_id: partData?.id || null,
        })
        .eq('id', principal.id)

      if (ayudante?.clave && ayudante?.id) {
        const personaAyu = personas.find(p => p.clave === ayudante.clave)
        if (personaAyu) {
          const { data: ayuData } = await supabase
            .from('participaciones')
            .insert({
              clave: personaAyu.clave,
              nombre: personaAyu.nombre,
              lista: personaAyu.lista,
              fecha: semana.fecha_inicio,
              mes: semana.mes,
              tipo: 'A',
              peso: 1,
              observaciones: 'Ayudante SMT',
            })
            .select()
            .single()

          await supabase
            .from('programa_asignaciones')
            .update({
              confirmado: true,
              participacion_id: ayuData?.id || null,
            })
            .eq('id', ayudante.id)
        }
      }

      showToast('Asignación reconfirmada ✓')
      await fetchData()
      return
    }

    // Desconfirmar
    if (principal.confirmado) {
      if (principal.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', principal.participacion_id)
      }
      if (ayudante?.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', ayudante.participacion_id)
      }

      await supabase
        .from('programa_asignaciones')
        .update({
          confirmado: false,
          participacion_id: null,
        })
        .eq('id', principal.id)

      if (ayudante?.id) {
        await supabase
          .from('programa_asignaciones')
          .update({
            confirmado: false,
            participacion_id: null,
          })
          .eq('id', ayudante.id)
      }

      showToast('Asignación desconfirmada')
      await fetchData()
      return
    }

    // Confirmar por primera vez
    const { data: partData } = await supabase
      .from('participaciones')
      .insert({
        clave: persona.clave,
        nombre: persona.nombre,
        lista: persona.lista,
        fecha: semana.fecha_inicio,
        mes: semana.mes,
        tipo: tipoParticipacion,
        peso: PESO_TIPO[tipoParticipacion] || 1,
        observaciones: null,
      })
      .select()
      .single()

    await supabase
      .from('programa_asignaciones')
      .update({
        confirmado: true,
        participacion_id: partData?.id || null,
      })
      .eq('id', principal.id)

    if (ayudante?.clave && ayudante?.id) {
      const personaAyu = personas.find(p => p.clave === ayudante.clave)
      if (personaAyu) {
        const { data: ayuData } = await supabase
          .from('participaciones')
          .insert({
            clave: personaAyu.clave,
            nombre: personaAyu.nombre,
            lista: personaAyu.lista,
            fecha: semana.fecha_inicio,
            mes: semana.mes,
            tipo: 'A',
            peso: 1,
            observaciones: 'Ayudante SMT',
          })
          .select()
          .single()

        await supabase
          .from('programa_asignaciones')
          .update({
            confirmado: true,
            participacion_id: ayuData?.id || null,
          })
          .eq('id', ayudante.id)
      }
    }

    showToast('Asignación confirmada ✓')
    await fetchData()
  }

  // ── Confirmar toda la semana ─────────────────────────────
  async function handleConfirmarTodo(semanaId, partesSemana, asignacionesSemana) {
    const semana = semanas.find(s => s.id === semanaId)
    if (!semana) return

    let confirmadas = 0

    for (const parte of partesSemana) {
      if (
        parte.tipo_asignacion === 'ORACION' ||
        parte.tipo_asignacion === 'CONCLU' ||
        parte.tipo_asignacion === 'SMT_VACIO'
      )
        continue

      const asigP = asignacionesSemana.find(a => a.parte_id === parte.id && a.rol === 'principal')
      const asigA = asignacionesSemana.find(a => a.parte_id === parte.id && a.rol === 'ayudante')

      if (!asigP?.clave) continue

      const persona = personas.find(p => p.clave === asigP.clave)
      if (!persona) continue

      const tipoParticipacion = TIPO_PARTICIPACION[parte.tipo_asignacion] || 'X'

      const pr = asigP.participacion_id
        ? historial.find(h => h.id === asigP.participacion_id)
        : null
      const ar = asigA?.participacion_id
        ? historial.find(h => h.id === asigA.participacion_id)
        : null
      const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
      const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
      const aNuevo =
        parte.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
      const aRem = parte.requiere_ayudante && !asigA?.clave && ar

      const esReconfirmacion = pCambio || aCambio || aNuevo || aRem

      if (asigP.confirmado && !esReconfirmacion) continue

      if (esReconfirmacion) {
        if (asigP.participacion_id)
          await supabase.from('participaciones').delete().eq('id', asigP.participacion_id)
        if (asigA?.participacion_id)
          await supabase.from('participaciones').delete().eq('id', asigA.participacion_id)
      }

      const { data: partData } = await supabase
        .from('participaciones')
        .insert({
          clave: persona.clave,
          nombre: persona.nombre,
          lista: persona.lista,
          fecha: semana.fecha_inicio,
          mes: semana.mes,
          tipo: tipoParticipacion,
          peso: PESO_TIPO[tipoParticipacion] || 1,
          observaciones: null,
        })
        .select()
        .single()

      await supabase
        .from('programa_asignaciones')
        .update({
          confirmado: true,
          participacion_id: partData?.id || null,
        })
        .eq('id', asigP.id)

      if (asigA?.clave && asigA?.id) {
        const personaAyu = personas.find(p => p.clave === asigA.clave)
        if (personaAyu) {
          const { data: ayuData } = await supabase
            .from('participaciones')
            .insert({
              clave: personaAyu.clave,
              nombre: personaAyu.nombre,
              lista: personaAyu.lista,
              fecha: semana.fecha_inicio,
              mes: semana.mes,
              tipo: 'A',
              peso: 1,
              observaciones: 'Ayudante SMT',
            })
            .select()
            .single()

          await supabase
            .from('programa_asignaciones')
            .update({
              confirmado: true,
              participacion_id: ayuData?.id || null,
            })
            .eq('id', asigA.id)
        }
      }

      confirmadas++
    }

    success(`${confirmadas} asignaciones confirmadas en la semana`)
    await fetchData()
  }

  // ── Generar documento S-140 ───────────────────────────────
  async function handleGenerarDocx() {
    try {
      showToast('Generando documento S-140...')
      const semanasData = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas)
      await generarYDescargarS140({
        congregacion,
        semanas: semanasData,
      })
      success('S-140 descargado exitosamente')
    } catch (err) {
      console.error(err)
      toastError('Error al generar el S-140: ' + err.message)
    }
  }

  // ── Eliminar semana ──────────────────────────────────────
  async function handleEliminarSemana(semanaId) {
    const ok = await confirm({
      title: '¿Eliminar esta semana?',
      message: 'Se borrarán todas sus partes y asignaciones. Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return
    await supabase.from('programa_semanas').delete().eq('id', semanaId)
    setExpandedWeeks(prev => {
      const next = { ...prev }
      delete next[semanaId]
      return next
    })
    showToast('Semana eliminada')
    await fetchData()
  }

  if (loading) {
    return (
      <div className="py-6">
        <SkeletonPrograma cards={4} />
      </div>
    )
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
      {/* ── HEADER Y ACCIONES PRINCIPALES ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Programa S-140
            </h1>
            <Badge variant="neutral" size="sm">
              {semanas.length} semanas
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Planificación y asignaciones de la Guía de Actividades Vida y Ministerio Cristianos.
          </p>
        </div>

        {/* Toolbar de Acciones */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Segmented View Selector */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
            <button
              type="button"
              onClick={() => setVistaTab('semanas')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                vistaTab === 'semanas'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Por semana
            </button>
            <button
              type="button"
              onClick={() => setVistaTab('resumen')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                vistaTab === 'resumen'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Resumen
            </button>
          </div>

          {/* Toggle Modo Edición / Modo Lectura */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
            <button
              type="button"
              onClick={() => setModoLectura(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                !modoLectura
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Pencil className="w-3 h-3" />
              <span>Edición</span>
            </button>
            <button
              type="button"
              onClick={() => setModoLectura(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                modoLectura
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Lectura</span>
            </button>
          </div>

          {/* Botón Subir EPUB */}
          {!modoLectura && (
            <div>
              <input
                type="file"
                id="epubInput"
                accept=".epub"
                className="hidden"
                onChange={handleEPUB}
              />
              <Button
                variant="outline"
                size="md"
                icon={Upload}
                loading={uploading}
                onClick={() => document.getElementById('epubInput').click()}
              >
                {uploading ? 'Importando...' : 'Subir EPUB'}
              </Button>
            </div>
          )}

          {/* Botón Generar S-140 */}
          <Button
            variant="accent"
            size="md"
            icon={FileDown}
            disabled={!semanas.length}
            onClick={handleGenerarDocx}
          >
            Descargar S-140
          </Button>
        </div>
      </div>

      {/* ── VISTA POR SEMANAS ── */}
      {vistaTab === 'semanas' && (
        <div className="space-y-3">
          {semanas.length === 0 ? (
            <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl py-16 px-6 text-center flex flex-col items-center justify-center min-h-[380px] shadow-2xs">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center mb-4 text-emerald-700 dark:text-emerald-300">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-text1">Sin semanas del programa</h3>
              <p className="text-xs text-text3 max-w-md mt-1.5 mb-6 leading-relaxed">
                Aún no has importado el calendario de reuniones. Sube el archivo EPUB de la Guía de
                Actividades de la Reunión Vida y Ministerio Cristianos (mwb) para comenzar.
              </p>
              <Button
                variant="accent"
                size="md"
                icon={Upload}
                onClick={() => document.getElementById('epubInput').click()}
              >
                Subir archivo EPUB mwb
              </Button>
            </div>
          ) : (
            semanas.map(s => {
              const partesSemana = partes.filter(p => p.semana_id === s.id)
              const asigSemana = asignaciones.filter(a =>
                partesSemana.some(p => p.id === a.parte_id)
              )
              return (
                <TarjetaSemana
                  key={s.id}
                  semana={s}
                  partes={partesSemana}
                  asignaciones={asigSemana}
                  personas={personas}
                  historial={historial}
                  onAsignar={handleAsignar}
                  onConfirmar={handleConfirmar}
                  onConfirmarTodo={handleConfirmarTodo}
                  onEliminarSemana={handleEliminarSemana}
                  expandida={!!expandedWeeks[s.id]}
                  onToggleExpand={() => handleToggleExpand(s.id)}
                  modoLectura={modoLectura}
                />
              )
            })
          )}
        </div>
      )}

      {/* ── VISTA RESUMEN MENSUAL ── */}
      {vistaTab === 'resumen' && (
        <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-max">
              <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider">
                    Semana
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider">
                    Lectura Bíblica
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    ♪ Apertura
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    ♪ Vida Cristiana
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    ♪ Cierre
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    Partes
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    Confirmadas
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {semanas.map(s => {
                  const partesSemana = partes.filter(p => p.semana_id === s.id)
                  const asigConf = asignaciones.filter(
                    a => partesSemana.some(p => p.id === a.parte_id) && a.confirmado
                  )
                  const completada =
                    asigConf.length === partesSemana.length && partesSemana.length > 0

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text1">{s.fecha_inicio}</div>
                        <div className="text-text3 text-[11px] font-mono">{s.fecha_fin}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-text2">{s.capitulo_biblico}</td>
                      <td className="px-3 py-3 font-mono text-center text-text3">
                        {s.cancion_apertura || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-text3">
                        {s.cancion_vc || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-text3">
                        {s.cancion_cierre || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-text2">
                        {partesSemana.length}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={completada ? 'success' : 'neutral'} size="xs">
                          {asigConf.length}/{partesSemana.length}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="dangerGhost"
                          size="iconXs"
                          onClick={() => handleEliminarSemana(s.id)}
                          aria-label="Eliminar semana"
                          title="Eliminar semana"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}