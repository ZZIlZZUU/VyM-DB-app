import { useState, useEffect, useRef, useMemo } from 'react'
import { Drawer } from 'vaul'
import {
  Search,
  Check,
  Clock,
  AlertTriangle,
  Info,
  ChevronDown,
  X,
} from 'lucide-react'
import { sugerirCandidatos } from '../../../lib/asignacionesSugeridas'
import { evaluarConflictosPersona, TIPO_COLOR, TIPO_LABEL } from '../../../lib/conflictosRotacion'
import { useEnvironment } from '../../../hooks/useEnvironment'
import { Input } from '../../../components/ui/Input'

const TOOLTIP_W = 260

/**
 * Selector inteligente de participante con Lazy Scoring y adaptación híbrida Escritorio/Móvil:
 * - Solo ejecuta sugerirCandidatos() para toda la congregación cuando está abierto (open === true).
 * - En Escritorio (>= 768px): despliega menú flotante con navegación por teclado y tooltip lateral.
 * - En Móvil (< 768px): despliega un Bottom Sheet táctil (vaul) con filas de 44px y avisos de rotación visibles.
 */
export default function PersonaSelectorDesktop({
  tipo,
  value,
  onChange,
  personas,
  historial,
  mes,
  fechaSemana,
  yaAsignados,
  disabled,
  placeholder,
}) {
  const { isMobile } = useEnvironment()
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [tooltip, setTooltip] = useState(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const triggerRef = useRef(null)
  const hoverTimer = useRef(null)

  // Lazy Scoring: solo calcular candidatos cuando el menú desplegable está abierto
  const candidatos = useMemo(() => {
    if (!open) return []
    const base = sugerirCandidatos(
      tipo,
      personas,
      historial,
      mes,
      yaAsignados,
      { fechaSemana }
    )
    const conConflictos = base.map(p => {
      const confs = evaluarConflictosPersona(p, tipo, historial, mes, fechaSemana, yaAsignados)
      const conflicto =
        confs.length > 0
          ? {
              severity: confs.some(c => c.severity === 'warning') ? 'warning' : 'info',
              mensaje: confs.map(c => c.mensaje).join(' • '),
              detalles: confs,
            }
          : null
      return { ...p, conflicto }
    })
    return [
      ...conConflictos.filter(p => p.conflicto?.severity !== 'warning'),
      ...conConflictos.filter(p => p.conflicto?.severity === 'warning'),
    ]
  }, [open, tipo, personas, historial, mes, yaAsignados, fechaSemana])

  // Evaluación ligera O(1) para la persona seleccionada cuando el selector está cerrado
  const { seleccionado, conflictoSeleccionado } = useMemo(() => {
    if (!value) return { seleccionado: null, conflictoSeleccionado: null }
    const raw =
      (open ? candidatos.find(p => p.clave === value) : null) ||
      personas.find(p => p.clave === value)
    if (!raw) return { seleccionado: null, conflictoSeleccionado: null }

    const confs =
      raw.conflicto?.detalles ||
      evaluarConflictosPersona(raw, tipo, historial, mes, fechaSemana, yaAsignados)
    const conflicto =
      confs.length > 0
        ? {
            severity: confs.some(c => c.severity === 'warning') ? 'warning' : 'info',
            mensaje: confs.map(c => c.mensaje).join(' • '),
            detalles: confs,
          }
        : null

    return {
      seleccionado: { ...raw, conflicto },
      conflictoSeleccionado: conflicto,
    }
  }, [value, open, candidatos, personas, tipo, historial, mes, fechaSemana, yaAsignados])

  const filtrados = useMemo(() => {
    if (!open) return []
    const q = query.trim().toLowerCase()
    if (!q) return candidatos
    return candidatos.filter(
      p => p.nombre.toLowerCase().includes(q) || p.clave.toLowerCase().includes(q)
    )
  }, [open, query, candidatos])

  // Desplazar automáticamente el elemento resaltado al área visible (solo escritorio)
  useEffect(() => {
    if (!open || isMobile) return
    const rafId = requestAnimationFrame(() => {
      const container = listRef.current
      if (!container) return
      const el = container.querySelector(`[data-index="${highlightedIndex}"]`)
      if (el) {
        const cTop = container.scrollTop
        const cBottom = cTop + container.clientHeight
        const eTop = el.offsetTop
        const eBottom = eTop + el.offsetHeight
        if (eTop < cTop) {
          container.scrollTop = eTop
        } else if (eBottom > cBottom) {
          container.scrollTop = eBottom - container.clientHeight
        }
      }
    })
    return () => cancelAnimationFrame(rafId)
  }, [highlightedIndex, open, isMobile])

  useEffect(() => {
    if (!open || isMobile) return
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
    const handleResize = () => {
      setOpen(false)
      setTooltip(null)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [open, isMobile])

  useEffect(() => {
    if (open && !isMobile) {
      const id = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
      return () => clearTimeout(id)
    }
  }, [open, isMobile])

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  function handleToggle() {
    if (disabled) return
    if (!open) {
      setQuery('')
      setTooltip(null)
      setHighlightedIndex(0)
      if (!isMobile) {
        setDropdownStyle(computeDropdownStyle(triggerRef.current))
      }
      setOpen(true)
    } else {
      setTooltip(null)
      setOpen(false)
    }
  }

  function handleQueryChange(e) {
    const val = e.target.value
    setQuery(val)
    setHighlightedIndex(0)
  }

  function handleSelect(clave) {
    onChange(clave || null)
    setOpen(false)
    setQuery('')
    setTooltip(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setQuery('')
      setTooltip(null)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      clearTimeout(hoverTimer.current)
      setTooltip(null)
      if (filtrados.length === 0) {
        setHighlightedIndex(-1)
        return
      }
      setHighlightedIndex(prev => {
        if (prev === -2 || prev === -1) return 0
        if (prev >= filtrados.length - 1) return -1
        return prev + 1
      })
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      clearTimeout(hoverTimer.current)
      setTooltip(null)
      if (filtrados.length === 0) {
        setHighlightedIndex(-1)
        return
      }
      setHighlightedIndex(prev => {
        if (prev === -2 || prev === -1) return filtrados.length - 1
        if (prev <= 0) return -1
        return prev - 1
      })
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex === -1) {
        handleSelect(null)
      } else if (highlightedIndex >= 0 && highlightedIndex < filtrados.length) {
        handleSelect(filtrados[highlightedIndex].clave)
      } else if (filtrados.length > 0) {
        handleSelect(filtrados[0].clave)
      }
    }
  }

  function handleItemMouseEnter(clave, e) {
    if (isMobile) return
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
    if (typeof p._score === 'number') {
      if (p._score < 50) return { icon: AlertTriangle, cls: 'text-red-500' }
      if (p._score < 80) return { icon: Clock, cls: 'text-amber-500' }
      return { icon: Check, cls: 'text-emerald-600 dark:text-emerald-400' }
    }
    if (p.conflicto?.severity === 'warning') return { icon: AlertTriangle, cls: 'text-amber-500' }
    if (p.conflicto?.severity === 'info') return { icon: Clock, cls: 'text-amber-500' }
    return { icon: Check, cls: 'text-emerald-600 dark:text-emerald-400' }
  }

  function getUltimasParticipaciones(clave) {
    return (historial || [])
      .filter(h => h.clave === clave && !h._virtual)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 3)
  }

  function computeDropdownStyle(triggerEl) {
    if (!triggerEl) return {}
    const rect = triggerEl.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 240
    const dropdownWidth = 260

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

  const tooltipPersona = tooltip
    ? candidatos.find(p => p.clave === tooltip.clave) || personas.find(p => p.clave === tooltip.clave)
    : null
  const tooltipParts = tooltip ? getUltimasParticipaciones(tooltip.clave) : []
  const tooltipConflictos = tooltipPersona
    ? tooltipPersona.conflicto?.detalles ||
      evaluarConflictosPersona(tooltipPersona, tipo, historial, mes, fechaSemana, yaAsignados)
    : []

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
              const ind = getIndicador(seleccionado)
              const Ind = ind.icon
              return <Ind className={`w-3.5 h-3.5 shrink-0 ${ind.cls}`} />
            })()}
            <span className="font-mono text-[11px] text-text3 shrink-0">
              {seleccionado.clave}
            </span>
            <span className="truncate font-medium text-text1">{seleccionado.nombre}</span>
            {conflictoSeleccionado && (
              <span
                className="shrink-0 flex items-center justify-center ml-auto mr-1"
                title={conflictoSeleccionado.mensaje}
              >
                {conflictoSeleccionado.severity === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-blue-500" />
                )}
              </span>
            )}
          </div>
        ) : (
          <span
            className={`${
              placeholder ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-text3 italic'
            } text-xs flex-1 truncate`}
          >
            {placeholder || '— Sin asignar —'}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-text3 shrink-0 opacity-70" />
      </button>

      {/* Warning inline si la persona seleccionada tiene conflicto */}
      {conflictoSeleccionado && (
        <div
          className={`mt-1 flex items-start gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] border animate-fade-in ${
            conflictoSeleccionado.severity === 'warning'
              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25'
              : 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/25'
          }`}
        >
          {conflictoSeleccionado.severity === 'warning' ? (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
          ) : (
            <Info className="w-3.5 h-3.5 shrink-0 text-blue-500 mt-0.5" />
          )}
          <span className="leading-tight">{conflictoSeleccionado.mensaje}</span>
        </div>
      )}

      {/* MÓVIL (< 768px): Bottom Sheet táctil con vaul */}
      {open && isMobile && (
        <Drawer.Root
          open={open}
          onOpenChange={nextOpen => {
            if (!nextOpen) {
              setOpen(false)
              setQuery('')
            }
          }}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-[2px]" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-16 flex max-h-[85dvh] flex-col rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 bg-surface shadow-2xl outline-none">
              <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                <Drawer.Title className="text-sm font-semibold text-text1">
                  Seleccionar · {TIPO_LABEL[tipo] || tipo}
                </Drawer.Title>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar selector"
                  className="p-1.5 rounded-lg text-text2 hover:text-text1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
                <Input
                  value={query}
                  onChange={handleQueryChange}
                  placeholder="Buscar por nombre o clave..."
                  icon={Search}
                  size="md"
                  className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1"
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="w-full min-h-[44px] text-left px-4 py-2.5 text-xs font-medium text-text3 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                >
                  — Sin asignar —
                </button>

                {filtrados.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-text3 italic">
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
                        className={`w-full min-h-[48px] text-left flex flex-col justify-center px-4 py-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                            : 'active:bg-zinc-100 dark:active:bg-zinc-800/70 text-text1'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <IndIcon className={`w-4 h-4 shrink-0 ${ind.cls}`} />
                          <span className="font-mono text-text3 text-xs shrink-0 w-12">
                            {p.clave}
                          </span>
                          <span className="text-sm font-medium truncate flex-1">
                            {p.nombre}
                          </span>
                          <span className="text-[11px] text-text3 shrink-0">
                            {p.estatus}
                          </span>
                        </div>
                        {p.conflicto && (
                          <div
                            className={`mt-1 ml-6 text-[11px] flex items-center gap-1 ${
                              p.conflicto.severity === 'warning'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {p.conflicto.severity === 'warning' ? (
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                            ) : (
                              <Info className="w-3 h-3 shrink-0" />
                            )}
                            <span className="truncate">{p.conflicto.mensaje}</span>
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}

      {/* ESCRITORIO (>= 768px): Floating Dropdown */}
      {open && !isMobile && (
        <div
          data-persona-dropdown
          className="fixed z-[200] bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden animate-view-fade"
          style={dropdownStyle}
        >
          {/* Búsqueda */}
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
            <Input
              ref={inputRef}
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleKeyDown}
              placeholder="Buscar nombre o clave..."
              icon={Search}
              size="sm"
              className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1"
            />
          </div>

          {/* Opciones */}
          <div ref={listRef} className="relative max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              data-index="-1"
              onClick={() => handleSelect(null)}
              onMouseMove={() => setHighlightedIndex(-1)}
              onMouseEnter={() => {
                clearTimeout(hoverTimer.current)
                setTooltip(null)
              }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                highlightedIndex === -1
                  ? 'bg-zinc-100 dark:bg-zinc-800/80 text-text1 font-medium'
                  : 'text-text3 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
              }`}
            >
              — Sin asignar —
            </button>

            {filtrados.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-text3 italic">
                Sin participantes disponibles
              </div>
            ) : (
              filtrados.map((p, idx) => {
                const ind = getIndicador(p)
                const IndIcon = ind.icon
                const isSelected = p.clave === value
                const isHighlighted = highlightedIndex === idx

                return (
                  <button
                    key={p.clave}
                    type="button"
                    data-index={idx}
                    onClick={() => handleSelect(p.clave)}
                    onMouseMove={() => setHighlightedIndex(idx)}
                    onMouseEnter={e => handleItemMouseEnter(p.clave, e)}
                    onMouseLeave={handleItemMouseLeave}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? isHighlighted
                          ? 'bg-emerald-100/90 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 font-medium ring-1 ring-inset ring-emerald-500/30'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-medium'
                        : isHighlighted
                          ? 'bg-zinc-100 dark:bg-zinc-800/80 text-text1'
                          : 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 text-text1'
                    }`}
                  >
                    <IndIcon className={`w-3.5 h-3.5 shrink-0 ${ind.cls}`} />
                    <span className="font-mono text-text3 text-[11px] shrink-0 w-12">{p.clave}</span>
                    <span className="truncate flex-1">{p.nombre}</span>
                    {p.conflicto && (
                      <span
                        className="shrink-0 flex items-center justify-center ml-auto"
                        title={p.conflicto.mensaje}
                      >
                        {p.conflicto.severity === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Floating Hover Tooltip (Solo Escritorio) */}
      {!isMobile && tooltip && tooltipPersona && (
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

          {tooltipConflictos.length > 0 && (
            <div
              className={`p-2 rounded-lg border text-[11px] flex flex-col gap-1 ${
                tooltipConflictos.some(c => c.severity === 'warning')
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-300'
                  : 'bg-blue-500/10 border-blue-500/25 text-blue-800 dark:text-blue-300'
              }`}
            >
              {tooltipConflictos.map((c, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  {c.severity === 'warning' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-tight">{c.mensaje}</span>
                </div>
              ))}
            </div>
          )}

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
