import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
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
import { sugerirCandidatos, normalizarTipo, getCargaMensualTipo } from '../../../lib/asignacionesSugeridas'
import { evaluarConflictosPersona, TIPO_COLOR, TIPO_LABEL } from '../../../lib/conflictosRotacion'
import { useEnvironment } from '../../../hooks/useEnvironment'
import { Input } from '../../../components/ui/Input'

const TOOLTIP_W = 260

const TIPO_CORTO = {
  P: 'Presidente',
  TB: 'Tesoros',
  PE: 'Perlas',
  LB: 'Lectura',
  T: 'Estudiante',
  A: 'Ayudante',
  DSC: 'Discurso',
  VC: 'Vida Cristiana',
  NC: 'Necesidades',
  EBC: 'Conductor EBC',
  LEBC: 'Lector EBC',
  OC: 'Oración',
}

function getInitials(nombre) {
  if (!nombre) return '??'
  const parts = nombre.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nombre.slice(0, 2).toUpperCase()
}

function getResumenRotacion(p, historial, fechaSemana) {
  const previos = (historial || [])
    .filter(h => h.clave === p.clave && !h._virtual && h.fecha)
    .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)))

  const ultima = previos[0]
  let subtitulo = 'Sin participaciones previas'
  let semanas = 99

  if (ultima) {
    const refStr = fechaSemana ? String(fechaSemana).slice(0, 10) : new Date().toISOString().slice(0, 10)
    const dRef = new Date(refStr + 'T12:00:00')
    const dUlt = new Date(String(ultima.fecha).slice(0, 10) + 'T12:00:00')
    const diffDias = Math.round((dRef - dUlt) / 86400000)
    semanas = Math.max(0, Math.round(diffDias / 7))
    const tiempoTxt =
      semanas === 0 ? 'esta semana' : semanas === 1 ? 'hace 1 sem' : `hace ${semanas} sem`
    const tipoTxt = TIPO_CORTO[ultima.tipo] || TIPO_LABEL[ultima.tipo] || ultima.tipo || 'Parte'
    subtitulo = `${tiempoTxt} · última: ${tipoTxt}`
  }

  if (p.conflicto?.severity === 'warning' || (typeof p._score === 'number' && p._score < 50) || semanas <= 1) {
    return {
      subtitulo,
      badge: 'Muy reciente',
      badgeCls: 'text-amber-700 dark:text-amber-300',
      barCls: 'w-1/4 bg-amber-600 dark:bg-amber-500',
      estado: 'muy_reciente',
    }
  }
  if (p.conflicto?.severity === 'info' || (typeof p._score === 'number' && p._score < 80) || semanas <= 4) {
    return {
      subtitulo,
      badge: 'Reciente',
      badgeCls: 'text-text2',
      barCls: 'w-7/12 bg-amber-500/75',
      estado: 'reciente',
    }
  }
  return {
    subtitulo,
    badge: 'Listo',
    badgeCls: 'text-accent',
    barCls: 'w-full bg-accent',
    estado: 'listo',
  }
}

function getCargaMesBadge(persona, historial, mes) {
  if (!persona || !mes) return null
  const regs = (historial || []).filter(
    h => h.clave === persona.clave && h.mes === mes && normalizarTipo(h.tipo) !== 'OC'
  )
  const carga = regs.reduce((acc, h) => acc + getCargaMensualTipo(h.tipo), 0)
  if (persona.lista === 'Anc/SM') {
    const saturado = carga >= 3
    return {
      text: `${regs.length}/3 mes`,
      cls: saturado
        ? 'bg-amber-bg text-amber border-amber/30'
        : regs.length > 0
          ? 'bg-surface-alt text-text2 border-border'
          : 'bg-accent-muted-bg/60 text-accent border-accent-muted-border/60',
    }
  }
  return {
    text: regs.length === 0 ? 'Libre mes' : `${regs.length} este mes`,
    cls:
      carga >= 1
        ? 'bg-amber-bg text-amber border-amber/30'
        : 'bg-accent-muted-bg/60 text-accent border-accent-muted-border/60',
  }
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
      if (e.target?.closest?.('[data-persona-dropdown]')) return
      if (!triggerRef.current) {
        setOpen(false)
        return
      }
      const rect = triggerRef.current.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false)
        return
      }
      setDropdownStyle(computeDropdownStyle(triggerRef.current))
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

  const handleItemMouseEnter = useCallback(
    e => {
      if (isMobile) return
      const clave = e.currentTarget?.dataset?.clave
      if (!clave) return
      clearTimeout(hoverTimer.current)
      const rect = e.currentTarget.getBoundingClientRect()
      const spaceRight = window.innerWidth - rect.right
      const left = spaceRight >= TOOLTIP_W + 12 ? rect.right + 8 : rect.left - TOOLTIP_W - 8
      hoverTimer.current = setTimeout(() => {
        setTooltip({ clave, top: rect.top, left })
      }, 150)
    },
    [isMobile]
  )

  const handleItemMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setTooltip(null)
  }, [])

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
            ? 'border-accent bg-surface ring-1 ring-accent/20'
            : conflictoSeleccionado?.severity === 'warning'
              ? 'border-amber-400/70 dark:border-amber-600/60 bg-surface hover:border-amber-500'
              : 'border-border2 bg-surface hover:border-text3/50'
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

              <div className="p-3 border-b border-border bg-surface-alt/50 shrink-0">
                <div className="relative">
                  <Input
                    value={query}
                    onChange={handleQueryChange}
                    placeholder="Buscar por nombre o clave..."
                    icon={Search}
                    size="md"
                    className="pr-8 border-border bg-surface text-text1"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Limpiar búsqueda"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-text3 hover:text-text1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
                  filtrados.map((p, idx) => {
                    const isSelected = p.clave === value
                    const resumen = getResumenRotacion(p, historial, fechaSemana)
                    const cargaMes = getCargaMesBadge(p, historial, mes)
                    const esSugerida = idx === 0 && !p.conflicto && resumen.estado === 'listo'

                    return (
                      <button
                        key={p.clave}
                        type="button"
                        onClick={() => handleSelect(p.clave)}
                        className={`w-full min-h-[54px] text-left flex flex-col justify-center px-4 py-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent-muted-bg text-text1'
                            : 'active:bg-surface-alt text-text1'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <div className="w-8 h-8 rounded-full bg-surface-alt text-text2 border border-border flex items-center justify-center text-[11px] font-semibold shrink-0">
                            {getInitials(p.nombre)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium truncate">{p.nombre}</span>
                              {esSugerida && (
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-accent-muted-bg text-accent border border-accent-muted-border shrink-0">
                                  Sugerida
                                </span>
                              )}
                              {cargaMes && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono border shrink-0 ${cargaMes.cls}`}>
                                  {cargaMes.text}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-text3 truncate">
                              {p.clave} · {resumen.subtitulo}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[11px] font-medium ${resumen.badgeCls}`}>
                              {resumen.estado === 'listo' ? '✓ ' : '◷ '}
                              {resumen.badge}
                            </span>
                            <div className="w-12 h-1 rounded-full bg-surface-alt overflow-hidden">
                              <div className={`h-full rounded-full ${resumen.barCls}`} />
                            </div>
                          </div>
                        </div>
                        {p.conflicto && (
                          <div
                            className={`mt-1.5 ml-10 text-[11px] flex items-center gap-1 ${
                              p.conflicto.severity === 'warning'
                                ? 'text-amber-700 dark:text-amber-400'
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
          className="fixed z-[200] bg-surface border border-border rounded-xl shadow-xl overflow-hidden animate-view-fade min-w-[320px]"
          style={dropdownStyle}
        >
          {/* Contexto & Búsqueda */}
          <div className="p-2.5 border-b border-border bg-surface-alt/50 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-text3 px-0.5">
              <span className="font-semibold text-text1">
                Elegir persona · {TIPO_LABEL[tipo] || tipo}
              </span>
              <span className="font-mono text-[10px]">/ buscar</span>
            </div>
            <div className="relative">
              <Input
                ref={inputRef}
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                placeholder="Buscar por nombre o clave..."
                icon={Search}
                size="sm"
                className="pr-7 border-border bg-surface text-text1"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setHighlightedIndex(0)
                    inputRef.current?.focus()
                  }}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-text3 hover:text-text1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Opciones */}
          <div ref={listRef} className="relative max-h-64 overflow-y-auto py-1 divide-y divide-border/40">
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
                  ? 'bg-surface-alt text-text1 font-medium'
                  : 'text-text3 hover:bg-surface-alt/60'
              }`}
            >
              — Sin asignar —
            </button>

            {filtrados.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-text3 italic">
                Sin participantes disponibles
              </div>
            ) : (
              filtrados.map((p, idx) => {
                const isSelected = p.clave === value
                const isHighlighted = highlightedIndex === idx
                const resumen = getResumenRotacion(p, historial, fechaSemana)
                const cargaMes = getCargaMesBadge(p, historial, mes)
                const esSugerida = idx === 0 && !p.conflicto && resumen.estado === 'listo'

                return (
                  <button
                    key={p.clave}
                    type="button"
                    data-index={idx}
                    data-clave={p.clave}
                    onClick={() => handleSelect(p.clave)}
                    onMouseMove={() => setHighlightedIndex(idx)}
                    onMouseEnter={handleItemMouseEnter}
                    onMouseLeave={handleItemMouseLeave}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-accent-muted-bg text-text1 font-medium ring-1 ring-inset ring-accent-muted-border'
                        : isHighlighted
                          ? 'bg-surface-alt/80 text-text1'
                          : 'hover:bg-surface-alt/50 text-text1'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-surface-alt border border-border text-[10px] font-semibold text-text2 flex items-center justify-center shrink-0">
                      {getInitials(p.nombre)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-text1">{p.nombre}</span>
                        {esSugerida && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-accent-muted-bg text-accent border border-accent-muted-border shrink-0">
                            Sugerida
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-text3 truncate mt-0.5">
                        <span className="truncate">{resumen.subtitulo}</span>
                        {cargaMes && (
                          <span className={`px-1.5 py-0 rounded-full text-[9px] font-mono border shrink-0 ${cargaMes.cls}`}>
                            {cargaMes.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[10px] font-medium ${resumen.badgeCls}`}>
                        {resumen.estado === 'listo' ? '✓ ' : '◷ '}
                        {resumen.badge}
                      </span>
                      <div className="w-10 h-1 rounded-full bg-surface-alt overflow-hidden">
                        <div className={`h-full rounded-full ${resumen.barCls}`} />
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Pie de ayuda de teclado */}
          <div className="px-3 py-1.5 border-t border-border bg-surface-alt/40 flex items-center justify-between text-[10px] text-text3">
            <span>↑↓ navegar · Enter asignar · Esc cerrar</span>
            <span className="hidden sm:inline">Ordenado por idoneidad</span>
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
