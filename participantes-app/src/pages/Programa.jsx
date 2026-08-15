import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { parsearEPUB } from '../lib/epubParser'
import { sugerirCandidatos, sugerirAyudante } from '../lib/asignacionesSugeridas'
import { generarYDescargarS140, buildDatosDesdeSupabase } from '../lib/generarS140'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonPrograma } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

// ── Constantes UI ─────────────────────────────────────────────
const SECCION_LABEL = {
  APERTURA: 'Apertura',
  TB:       'Tesoros de la Biblia',
  SMT:      'Seamos Mejores Maestros',
  VC:       'Nuestra Vida Cristiana',
  CIERRE:   'Cierre',
}

const TIPO_LABEL = {
  P:'Presidente', 
  ORACION:'Oración apertura', 
  ORACION_C:'Oración cierre',
  CONCLU:'Palabras de conclusión',
  TB:'Tesoros de la Biblia', 
  PE:'Perlas escondidas', 
  LB:'Lectura de la Biblia',
  SMT_EST:'Estudiante', 
  SMT_EXP:'Explique sus creencias',
  SMT_DSC:'Discurso', 
  SMT_AYU:'Ayudante',
  VC:'Vida Cristiana', 
  NC:'Nec. de la congregación',
  EBC_CON:'Conductor EBC', 
  LEBC: 'Lector EBC', 
  SMT_VACIO:'—',
}

const TIPO_COLOR = {
  P:'bg-purple-bg text-purple', 
  ORACION:'bg-blue-bg text-blue', 
  ORACION_C:'bg-blue-bg text-blue',
  CONCLU:'bg-bg text-text2',
  TB:'bg-teal-bg text-teal', 
  PE:'bg-rose-bg text-rose', 
  LB:'bg-amber-bg text-amber',
  SMT_EST:'bg-accent-bg text-accent', 
  SMT_EXP:'bg-accent-bg text-accent',
  SMT_DSC:'bg-amber-bg text-amber', 
  SMT_AYU:'bg-blue-bg text-blue',
  VC:'bg-green-100 text-green-800', 
  NC:'bg-red-100 text-red-800',
  EBC_CON:'bg-orange-100 text-orange-700', 
  LEBC: 'bg-maroon/15 text-maroon',
  SMT_VACIO:'bg-bg text-text3',
}

const PESO_TIPO = { T:2, A:1, LB:1, SMT_EST:1, SMT_EXP:1, SMT_DSC:1, SMT_AYU:1, TB:1, PE:1, VC:1, NC:1, EBC_CON:1, LEBC:1, P:1, ORACION:0, ORACION_C:0 }

// Mapa tipo_asignacion → campo 'tipo' en tabla participaciones
const TIPO_PARTICIPACION = {
  P:'P', 
  ORACION:'P',
  ORACION_C:'OC', 
  CONCLU:'P',
  TB:'TB', 
  PE:'PE', 
  LB:'LB', 
  SMT_EST:'T', 
  SMT_EXP:'T',
  SMT_DSC:'DSC', 
  SMT_AYU:'A',
  VC:'VC', 
  NC:'NC', 
  EBC_CON:'EBC', 
  LEBC: 'LEBC',
}

function PersonaSelector({ tipo, value, onChange, personas, historial, mes, yaAsignados, disabled }) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const [tooltip, setTooltip] = useState(null) // { clave, top, left }
  const inputRef      = useRef(null)
  const containerRef  = useRef(null)
  const triggerRef    = useRef(null)
  const hoverTimer    = useRef(null)
  const TOOLTIP_W     = 256

  const candidatos = sugerirCandidatos(tipo, personas, historial, mes, yaAsignados)

  const seleccionado = candidatos.find(p => p.clave === value)
    || personas.find(p => p.clave === value)

  const filtrados = query.trim()
    ? candidatos.filter(p =>
        p.nombre.toLowerCase().includes(query.toLowerCase()) ||
        p.clave.toLowerCase().includes(query.toLowerCase())
      )
    : candidatos

  // Cerrar al hacer click fuera, y ocultar tooltip al hacer scroll
  useEffect(() => {
    if (!open) {
      setTooltip(null)
      return
    }
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) &&
          !e.target.closest?.('[data-persona-dropdown]')) {
        setOpen(false)
        setTooltip(null)
      }
    }
    const handleScroll = (e) => {
      clearTimeout(hoverTimer.current)
      setTooltip(null)
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', () => { setOpen(false); setTooltip(null) })
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', () => { setOpen(false); setTooltip(null) })
    }
  }, [open])

  // Enfocar input al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)
    }
  }, [open])

  // Limpiar timer al desmontar
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
    const left = spaceRight >= TOOLTIP_W + 12
      ? rect.right + 8
      : rect.left - TOOLTIP_W - 8
    hoverTimer.current = setTimeout(() => {
      setTooltip({ clave, top: rect.top, left })
    }, 150)
  }

  function handleItemMouseLeave() {
    clearTimeout(hoverTimer.current)
    setTooltip(null)
  }

  function getIndicador(p) {
    if (p._score < 50) return { icon: '⚠', cls: 'text-danger' }
    if (p._score < 80) return { icon: '↻', cls: 'text-amber' }
    return { icon: '✓', cls: 'text-accent' }
  }

  function getUltimasParticipaciones(clave) {
    return historial
      .filter(h => h.clave === clave)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 3)
  }

  // Dropdown: abre hacia abajo o arriba según espacio disponible
  function getDropdownStyle() {
    if (!triggerRef.current) return {}
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const dropdownHeight = 230
    const dropdownWidth = 224

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

  // Tooltip: persona y participaciones para la clave activa
  const tooltipPersona = tooltip ? personas.find(p => p.clave === tooltip.clave) : null
  const tooltipParts   = tooltip ? getUltimasParticipaciones(tooltip.clave) : []

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center gap-1.5 px-2 py-1 border rounded-lg text-xs text-left transition-colors
          ${open ? 'border-accent bg-surface' : 'border-border2 bg-surface hover:border-accent/60'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          text-text1`}
      >
        {seleccionado ? (
          <>
            <span className={`flex-shrink-0 ${getIndicador(seleccionado).cls}`}>
              {getIndicador(seleccionado).icon}
            </span>
            <span className="font-mono text-text3 flex-shrink-0">{seleccionado.clave}</span>
            <span className="truncate flex-1">{seleccionado.nombre}</span>
          </>
        ) : (
          <span className="text-text3 flex-1">— Sin asignar —</span>
        )}
        <span className="text-text3 flex-shrink-0 ml-auto">▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          data-persona-dropdown
          className="fixed z-[200] bg-surface border border-border2 rounded-xl shadow-xl overflow-hidden"
          style={getDropdownStyle()}
        >
          {/* Búsqueda */}
          <div className="px-2 pt-2 pb-1 border-b border-border">
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setQuery(''); setTooltip(null) }
                if (e.key === 'Enter' && filtrados.length > 0) handleSelect(filtrados[0].clave)
              }}
              placeholder="Buscar nombre o clave…"
              className="w-full px-2 py-1 text-xs bg-bg border border-border2 rounded-lg outline-none focus:border-accent text-text1 placeholder:text-text3"
            />
          </div>

          {/* Opciones */}
          <div className="max-h-48 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-text3 hover:bg-bg"
            >
              — Sin asignar —
            </button>

            {filtrados.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text3 italic">Sin resultados</div>
            ) : (
              filtrados.map(p => {
                const ind = getIndicador(p)
                const isSelected = p.clave === value
                return (
                  <button
                    key={p.clave}
                    type="button"
                    onClick={() => handleSelect(p.clave)}
                    onMouseEnter={e => handleItemMouseEnter(p.clave, e)}
                    onMouseLeave={handleItemMouseLeave}
                    className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs
                      ${isSelected ? 'bg-accent-bg' : 'hover:bg-bg'}`}
                  >
                    <span className={`flex-shrink-0 w-3 ${ind.cls}`}>{ind.icon}</span>
                    <span className="font-mono text-text3 flex-shrink-0 w-12">{p.clave}</span>
                    <span className="truncate text-text1">{p.nombre}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Tooltip — position:fixed con coordenadas reales, fuera del flujo DOM del dropdown */}
      {tooltip && tooltipPersona && (
        <div
          className="fixed z-[300] w-64 bg-surface border border-border2 rounded-xl shadow-xl p-3 text-xs flex flex-col gap-2 pointer-events-none"
          style={{ top: tooltip.top, left: tooltip.left }}
        >
          <div className="font-semibold text-text1 border-b border-border pb-1">
            {tooltipPersona.nombre}{' '}
            <span className="font-mono text-text3">({tooltipPersona.clave})</span>
          </div>
          {tooltipParts.length === 0 ? (
            <span className="text-text3 italic">Sin participaciones recientes</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {tooltipParts.map((pt, idx) => {
                const colorKey = {
                  'T': 'SMT_EST', 'A': 'SMT_AYU',
                  'EBC': 'EBC_CON', 'OC': 'ORACION_C'
                }[pt.tipo] || pt.tipo
                return (
                  <div key={idx} className="flex flex-col gap-0.5 bg-bg/50 p-1.5 rounded-lg border border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-text3 font-medium">
                        {pt.mes} {String(pt.fecha || '').slice(0, 4)}
                      </span>
                      <span className={`text-[10px] font-mono font-medium px-1 rounded ${TIPO_COLOR[colorKey] || 'bg-bg text-text2'}`}>
                        {pt.tipo}
                      </span>
                    </div>
                    {pt.observaciones && (
                      <span className="text-[10px] text-text2 italic truncate">{pt.observaciones}</span>
                    )}
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

function FilaParte({ parte, asignaciones, personas, historial, mes, semanaAsignados, onAsignar, onConfirmar, clavePresidente }) {
  const [flashing, setFlashing] = useState(false)
  const asig = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'principal')
  const asigAyu = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'ayudante')
  const principal = asig[0] || null
  const ayudante  = asigAyu[0] || null

  const principalPartRecord = principal?.participacion_id ? historial.find(h => h.id === principal.participacion_id) : null
  const ayudantePartRecord  = ayudante?.participacion_id ? historial.find(h => h.id === ayudante.participacion_id) : null

  const principalCambiado = !!principal?.participacion_id && principalPartRecord && principalPartRecord.clave !== principal?.clave
  const ayudanteCambiado  = !!ayudante?.participacion_id && ayudantePartRecord && ayudantePartRecord.clave !== ayudante?.clave
  const ayudanteNuevo     = parte.requiere_ayudante && ayudante?.clave && principal?.participacion_id && !ayudante?.participacion_id
  const ayudanteRemovido  = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

  const necesitaReconfirmar = principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido

    // Slot vacío — no renderizar nada asignable
  if (parte.tipo_asignacion === 'SMT_VACIO') {
    return (
      <div className="grid gap-2 py-2 border-b border-border last:border-0 items-start grid-cols-[auto_1fr_180px_120px]">
        <div className="text-xs font-mono text-text3 w-20 pt-1 shrink-0" />
        <div>
          <div className="text-sm text-text3 italic">Sin cuarta asignación</div>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg text-text3">SMT</span>
        </div>
        <div />
        <div />
      </div>
    )
  }

    // CONCLU y ORACION — read-only, siempre refleja al Presidente (visual only, no se guarda en BD)
  if (parte.tipo_asignacion === 'CONCLU' || parte.tipo_asignacion === 'ORACION') {
    const nombrePresidente = personas.find(p => p.clave === clavePresidente)?.nombre || '—'
    return (
      <div className="grid gap-2 py-2 border-b border-border last:border-0 items-start grid-cols-[auto_1fr_180px_120px]">
        <div className="text-xs font-mono text-text3 w-20 pt-1 shrink-0 whitespace-nowrap">
          {parte.hora_inicio || ''}
        </div>
        <div>
          <div className="text-sm text-text1 leading-tight">{parte.titulo}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${TIPO_COLOR[parte.tipo_asignacion] || 'bg-bg text-text2'}`}>
              {parte.tipo_asignacion}
            </span>
          </div>
        </div>
        <div className="px-2 py-1 text-xs text-text2 italic bg-bg border border-border2 rounded-lg">
          {clavePresidente ? nombrePresidente : '— Asignar presidente primero —'}
        </div>
        <div />
      </div>
    )
  }

  return (
    <div className="grid gap-2 py-2 border-b border-border last:border-0 items-start grid-cols-[auto_1fr_180px_120px]">
      {/* Hora */}
      <div className="text-xs font-mono text-text3 w-20 pt-1 shrink-0 whitespace-nowrap">
        {parte.hora_inicio || ''}
      </div>

      {/* Título y tipo */}
      <div>
        <div className="text-sm text-text1 leading-tight">{parte.titulo}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${TIPO_COLOR[parte.tipo_asignacion] || 'bg-bg text-text2'}`}>
            {parte.tipo_asignacion}
          </span>
          {parte.duracion_min && (
            <span className="text-xs text-text3">{parte.duracion_min} min</span>
          )}
        </div>
      </div>

      {/* Selector principal + ayudante */}
      {parte.seccion !== 'APERTURA' && parte.seccion !== 'CIERRE' && (
        <div className="flex flex-col gap-1">
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
          {parte.requiere_ayudante && (() => {
            // Para SMT_EXP: el ayudante debe ser del mismo sexo que el principal
            const tipoAyu = parte.tipo_asignacion === 'SMT_EXP'
              ? (personas.find(p => p.clave === principal?.clave)?.sexo === 'M' ? 'SMT_EXP_M' : 'SMT_EXP_F')
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
      )}

      {parte.seccion === 'APERTURA' || parte.seccion === 'CIERRE' ? (
        <PersonaSelector
          tipo={parte.tipo_asignacion}
          value={principal?.clave}
          onChange={clave => onAsignar(parte.id, clave, 'principal', principal?.id)}
          personas={personas}
          historial={historial}
          mes={mes}
          yaAsignados={semanaAsignados.filter(c => c !== principal?.clave)}
        />
      ) : null}

      {/* Estado confirmado */}
      <div className="flex items-center justify-end">
        {principal?.clave && (
          <button
            onClick={async () => {
              setFlashing(true)
              await onConfirmar(parte.id, principal, ayudante)
              setTimeout(() => setFlashing(false), 600)
            }}
            disabled={flashing}
            className={`text-xs px-2 py-1 rounded-lg border transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed ${
              flashing
                ? 'bg-accent text-white border-accent'
                : necesitaReconfirmar
                ? 'bg-amber/15 text-amber border-amber/40 hover:bg-amber hover:text-white'
                : principal?.confirmado
                ? 'bg-accent-bg text-accent border-accent/30 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                : 'bg-bg text-text3 border-border2 hover:border-accent hover:text-accent'
            }`}
            title={
              necesitaReconfirmar
                ? 'Se cambiaron participantes en esta asignación. Haz clic para reconfirmar.'
                : principal?.confirmado
                ? 'Asignación confirmada. Haz clic para desconfirmar.'
                : 'Haz clic para confirmar esta asignación.'
            }
          >
            {flashing
              ? '✓'
              : necesitaReconfirmar
              ? '↻ Reconfirmar'
              : principal?.confirmado
              ? '✓ Confirmado'
              : 'Confirmar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta de semana ─────────────────────────────────────────
function TarjetaSemana({ semana, partes, asignaciones, personas, historial, onAsignar, onConfirmar, onConfirmarTodo }) {
  const [expandida, setExpandida] = useState(false)
  const mes = semana.mes

  // Claves ya asignadas en esta semana (para evitar dobles)
  const semanaAsignados = asignaciones
    .filter(a => partes.some(p => p.id === a.parte_id))
    .map(a => a.clave)

  // Clave del presidente de esta semana
  const partePresidente = partes.find(p => p.tipo_asignacion === 'P')
  const asigPresidente  = partePresidente
    ? asignaciones.find(a => a.parte_id === partePresidente.id && a.rol === 'principal')
    : null
  const clavePresidente = asigPresidente?.clave || null

  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']
  const partesContables  = partes.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
  const totalPartes      = partesContables.length

  // Detección de reconfirmaciones pendientes en la semana
  const hayReconfirmaciones = partesContables.some(p => {
    const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')
    if (!asigP?.clave) return false

    const pr = asigP.participacion_id ? historial.find(h => h.id === asigP.participacion_id) : null
    const ar = asigA?.participacion_id ? historial.find(h => h.id === asigA.participacion_id) : null

    const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
    const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
    const aNuevo  = p.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
    const aRem    = p.requiere_ayudante && !asigA?.clave && ar

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
    const aNuevo  = p.requiere_ayudante && asigA?.clave && asigP?.participacion_id && !asigA?.participacion_id
    const aRem    = p.requiere_ayudante && !asigA?.clave && ar
    const necesitaRec = pCambio || aCambio || aNuevo || aRem

    return asigParte.some(a => a.rol === 'principal') && !necesitaRec
  }).length

  const pct = totalPartes > 0 ? Math.round((confirmadas / totalPartes) * 100) : 0

  // Agrupar por sección
  const secciones = ['APERTURA','TB','SMT','VC','CIERRE']

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpandida(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg/50 text-left"
      >
        <div className="flex-1">
          <div className="text-sm font-medium text-text1">{semana.fecha_inicio} — {semana.fecha_fin}</div>
          <div className="text-xs text-text3 font-mono mt-0.5">{semana.capitulo_biblico}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Canciones */}
          <div className="flex gap-1">
            {[semana.cancion_apertura, semana.cancion_vc, semana.cancion_cierre].map((c, i) => c ? (
              <span key={i} className="font-mono text-xs bg-bg text-text3 px-1.5 py-0.5 rounded">♪{c}</span>
            ) : null)}
          </div>
          {/* Progreso */}
          <div className="flex flex-col items-end gap-1 min-w-[72px]">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-mono text-text3">{confirmadas}/{totalPartes}</span>
              <span className={`text-xs font-mono font-medium ${pct === 100 ? 'text-accent' : pct >= 50 ? 'text-amber' : 'text-text3'}`}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${pct === 100 ? 'bg-accent' : pct >= 50 ? 'bg-amber' : 'bg-danger'}`}
                style={{width:`${pct}%`}}
              />
            </div>
          </div>
          <span className={`text-text3 text-sm transition-transform duration-300 inline-block ${expandida ? 'rotate-180' : 'rotate-0'}`}>▼</span>
        </div>
      </button>

      {/* Contenido expandido */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expandida ? '3000px' : '0px',
          opacity:   expandida ? 1 : 0,
        }}
      >
        <div className="border-t border-border px-5 py-3">
          {secciones.map(sec => {
            const partesSeccion = partes.filter(p => p.seccion === sec)
            if (!partesSeccion.length) return null
            return (
              <div key={sec} className="mb-4 last:mb-0">
                <div className="text-xs font-mono font-medium text-text3 uppercase tracking-wider mb-2 pb-1 border-b border-border">
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
                  />
                ))}
              </div>
            )
          })}

          <div className="flex justify-end mt-4 pt-3 border-t border-border gap-2">
            <button
              onClick={() => onConfirmarTodo(semana.id, partes, asignaciones)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                hayReconfirmaciones
                  ? 'bg-amber text-white hover:bg-amber-600 shadow-sm'
                  : pct === 100 && totalPartes > 0
                  ? 'bg-accent-bg text-accent border border-accent/30 hover:bg-accent/20'
                  : 'bg-accent text-white hover:bg-green-800'
              }`}
            >
              {hayReconfirmaciones
                ? '↻ Actualizar confirmación →'
                : pct === 100 && totalPartes > 0
                ? '✓ Todo confirmado'
                : 'Confirmar todo →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Programa() {
  const [semanas, setSemanas]           = useState([])
  const [partes, setPartes]             = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [personas, setPersonas]         = useState([])
  const [historial, setHistorial]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [vistaTab, setVistaTab]         = useState('semanas')
  const [congregacion, setCongregacion] = useState('Congregacion del Recreo')
  const { toast, showToast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
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
        console.warn('Error al cargar la configuración de la congregación:', cfgErr)
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
      setFetchError(err?.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const canal = supabase.channel('programa-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_semanas' },     () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_partes' },      () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_asignaciones' },() => fetchData())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // ── Subir y parsear EPUB ──────────────────────────────────
  async function handleEPUB(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    showToast('Procesando EPUB...')

    try {
      const semanasParsed = await parsearEPUB(file)
      let insertadas = 0

      for (const s of semanasParsed) {
        const { data: semData, error: semError } = await supabase
          .from('programa_semanas')
          .upsert({
            fecha_inicio:     s.fecha_inicio,
            fecha_fin:        s.fecha_fin,
            capitulo_biblico: s.capitulo_biblico,
            cancion_apertura: s.cancion_apertura,
            cancion_vc:       s.cancion_vc,
            cancion_cierre:   s.cancion_cierre,
            mes:              s.fecha_inicio ? new Date(s.fecha_inicio + 'T12:00:00').toLocaleString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()) : '',
            anio:             s.fecha_inicio ? new Date(s.fecha_inicio + 'T12:00:00').getFullYear() : new Date().getFullYear(),
            epub_filename:    file.name,
          }, { onConflict: 'fecha_inicio,fecha_fin', ignoreDuplicates: false })
          .select()
          .single()

        if (semError || !semData) continue

        await supabase.from('programa_partes').delete().eq('semana_id', semData.id)

        const partesPayload = s.partes.map((p, i) => ({
          semana_id:         semData.id,
          seccion:           p.seccion,
          numero_parte:      Number.isInteger(p.numero_parte) ? p.numero_parte : i + 1,
          titulo:            p.titulo,
          duracion_min:      p.duracion_min || null,
          tipo_asignacion:   p.tipo,
          requiere_ayudante: p.requiere_ayudante || false,
          hora_inicio:       p.hora_inicio || null,
          hora_fin:          p.hora_fin    || null,
        }))

        const { error: partesError } = await supabase.from('programa_partes').insert(partesPayload)
        if (partesError) {
          console.error('Error insertando partes del EPUB:', partesError)
          toastError('Error al guardar partes del EPUB: ' + partesError.message)
          continue
        }

        insertadas++
      }

      success(`${insertadas} semanas importadas del EPUB`)
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

    // Detección de cambios con respecto al historial guardado
    const principalPartRecord = principal.participacion_id ? historial.find(h => h.id === principal.participacion_id) : null
    const ayudantePartRecord  = ayudante?.participacion_id ? historial.find(h => h.id === ayudante.participacion_id) : null

    const principalCambiado = !!principal.participacion_id && principalPartRecord && principalPartRecord.clave !== principal.clave
    const ayudanteCambiado  = !!ayudante?.participacion_id && ayudantePartRecord && ayudantePartRecord.clave !== ayudante?.clave
    const ayudanteNuevo     = parte.requiere_ayudante && ayudante?.clave && principal.participacion_id && !ayudante?.participacion_id
    const ayudanteRemovido  = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

    const esReconfirmacion = principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido

    // 1. CASO: RECONFIRMAR (Participante cambió en asignación previamente confirmada)
    if (esReconfirmacion) {
      if (principal.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', principal.participacion_id)
      }
      if (ayudante?.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', ayudante.participacion_id)
      }

      // Insertar nuevo registro de principal
      const { data: partData } = await supabase.from('participaciones').insert({
        clave:         persona.clave,
        nombre:        persona.nombre,
        lista:         persona.lista,
        fecha:         semana.fecha_inicio,
        mes:           semana.mes,
        tipo:          tipoParticipacion,
        peso:          PESO_TIPO[tipoParticipacion] || 1,
        observaciones: null,
      }).select().single()

      await supabase.from('programa_asignaciones').update({
        confirmado: true,
        participacion_id: partData?.id || null,
      }).eq('id', principal.id)

      // Insertar nuevo registro de ayudante si aplica
      if (ayudante?.clave && ayudante?.id) {
        const personaAyu = personas.find(p => p.clave === ayudante.clave)
        if (personaAyu) {
          const { data: ayuData } = await supabase.from('participaciones').insert({
            clave:         personaAyu.clave,
            nombre:        personaAyu.nombre,
            lista:         personaAyu.lista,
            fecha:         semana.fecha_inicio,
            mes:           semana.mes,
            tipo:          'A',
            peso:          1,
            observaciones: 'Ayudante SMT',
          }).select().single()

          await supabase.from('programa_asignaciones').update({
            confirmado: true,
            participacion_id: ayuData?.id || null,
          }).eq('id', ayudante.id)
        }
      }

      showToast('Asignación reconfirmada ✓')
      await fetchData()
      return
    }

    // 2. CASO: DESCONFIRMAR (Estaba confirmado sin cambios y se presiona nuevamente)
    if (principal.confirmado) {
      if (principal.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', principal.participacion_id)
      }
      if (ayudante?.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', ayudante.participacion_id)
      }

      await supabase.from('programa_asignaciones').update({
        confirmado: false,
        participacion_id: null,
      }).eq('id', principal.id)

      if (ayudante?.id) {
        await supabase.from('programa_asignaciones').update({
          confirmado: false,
          participacion_id: null,
        }).eq('id', ayudante.id)
      }

      showToast('Asignación desconfirmada')
      await fetchData()
      return
    }

    // 3. CASO: CONFIRMAR POR PRIMERA VEZ
    const { data: partData } = await supabase.from('participaciones').insert({
      clave:         persona.clave,
      nombre:        persona.nombre,
      lista:         persona.lista,
      fecha:         semana.fecha_inicio,
      mes:           semana.mes,
      tipo:          tipoParticipacion,
      peso:          PESO_TIPO[tipoParticipacion] || 1,
      observaciones: null,
    }).select().single()

    await supabase.from('programa_asignaciones').update({
      confirmado: true,
      participacion_id: partData?.id || null,
    }).eq('id', principal.id)

    if (ayudante?.clave && ayudante?.id) {
      const personaAyu = personas.find(p => p.clave === ayudante.clave)
      if (personaAyu) {
        const { data: ayuData } = await supabase.from('participaciones').insert({
          clave:         personaAyu.clave,
          nombre:        personaAyu.nombre,
          lista:         personaAyu.lista,
          fecha:         semana.fecha_inicio,
          mes:           semana.mes,
          tipo:          'A',
          peso:          1,
          observaciones: 'Ayudante SMT',
        }).select().single()

        await supabase.from('programa_asignaciones').update({
          confirmado: true,
          participacion_id: ayuData?.id || null,
        }).eq('id', ayudante.id)
      }
    }

    showToast('Asignación confirmada ✓')
    await fetchData()
  }

  // ── Confirmar toda la semana ─────────────────────────────
  async function handleConfirmarTodo(semanaId, partesS, asignacionesS) {
    const partesSemana = partesS.filter(p => p.semana_id === semanaId && !['SMT_VACIO', 'ORACION', 'CONCLU'].includes(p.tipo_asignacion))

    let procesadas = 0
    for (const parte of partesSemana) {
      const principal = asignacionesS.find(a => a.parte_id === parte.id && a.rol === 'principal')
      if (!principal?.clave) continue

      const ayudante = asignacionesS.find(a => a.parte_id === parte.id && a.rol === 'ayudante')

      const principalPartRecord = principal.participacion_id ? historial.find(h => h.id === principal.participacion_id) : null
      const ayudantePartRecord  = ayudante?.participacion_id ? historial.find(h => h.id === ayudante.participacion_id) : null

      const pCambiado = !!principal.participacion_id && principalPartRecord && principalPartRecord.clave !== principal.clave
      const aCambiado = !!ayudante?.participacion_id && ayudantePartRecord && ayudantePartRecord.clave !== ayudante?.clave
      const aNuevo    = parte.requiere_ayudante && ayudante?.clave && principal.participacion_id && !ayudante?.participacion_id
      const aRem      = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

      const necesitaReconfirmar = pCambiado || aCambiado || aNuevo || aRem
      const sinConfirmar = !principal.confirmado

      if (sinConfirmar || necesitaReconfirmar) {
        await handleConfirmar(parte.id, principal, ayudante)
        procesadas++
      }
    }

    if (procesadas > 0) {
      success('Semana actualizada y confirmada ✓')
    } else {
      showToast('La semana ya está completamente confirmada y al día')
    }
  }

  // ── Generar S-140.docx ──────────────────────────────────
  async function handleGenerarDocx() {
    if (!semanas.length) { showToast('No hay semanas cargadas'); return }
    showToast('Generando S-140...')

    try {
      const semanasConDatos = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas)
      await generarYDescargarS140({
        congregacion,
        semanas: semanasConDatos,
      })
      success('S-140 descargado ✓')
    } catch (err) {
      console.error(err)
      toastError('Error al generar el S-140: ' + err.message)
    }
  }

  // ── Eliminar semana ──────────────────────────────────────
  async function handleEliminarSemana(semanaId) {
    const ok = await confirm({
      title:   '¿Eliminar esta semana?',
      message: 'Se borrarán todas sus partes y asignaciones. Esta acción no se puede deshacer.',
      danger:  true,
    })
    if (!ok) return
    await supabase.from('programa_semanas').delete().eq('id', semanaId)
    showToast('Semana eliminada')
    await fetchData()
  }

  if (loading) return (
    <div className="p-6">
      <SkeletonPrograma cards={4} />
    </div>
  )

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 bg-surface border border-border rounded-xl p-5">
      <p className="text-sm text-danger font-medium">Error al cargar los datos</p>
      <p className="text-xs text-text3 font-mono">{fetchError}</p>
      <button
        onClick={fetchData}
        className="px-4 py-1.5 text-xs font-medium border border-border2 rounded-lg hover:bg-bg text-text1"
      >
        Reintentar
      </button>
    </div>
  )

  return (
    <div>
      {/* Controles superiores */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex border-b border-border flex-1">
          {[['semanas','Por semana'],['resumen','Resumen']].map(([id, label]) => (
            <button key={id} onClick={() => setVistaTab(id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-none
                ${vistaTab === id ? 'text-accent border-accent font-medium' : 'text-text3 border-transparent hover:text-text2'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            id="epubInput"
            accept=".epub"
            className="hidden"
            onChange={handleEPUB}
          />
          <button
            onClick={() => document.getElementById('epubInput').click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {uploading ? 'Procesando...' : '↑ Subir EPUB mwb'}
          </button>
          <button
            onClick={handleGenerarDocx}
            disabled={!semanas.length}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50"
          >
            ↓ Generar S-140
          </button>
        </div>
      </div>

      {/* Vista por semanas */}
      {vistaTab === 'semanas' && (
        <div className="flex flex-col gap-3">
          {semanas.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl py-12 px-6 text-center flex flex-col items-center justify-center min-h-[340px] animate-fade-in shadow-sm">
              <div className="w-20 h-20 rounded-full bg-accent/5 flex items-center justify-center border border-accent/15 mb-4 group hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-10 h-10 text-accent stroke-current fill-accent/10"
                  viewBox="0 0 24 24"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M12 14v4" />
                  <path d="M10 16h4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-text1">Sin semanas del programa</h3>
              <p className="text-xs text-text3 max-w-sm mt-1.5 mb-5 leading-relaxed">
                Aún no has importado el calendario de reuniones. Sube el archivo EPUB de la Guía de Actividades de la Reunión Vida y Ministerio Cristianos (mwb) para comenzar.
              </p>
              <button
                onClick={() => document.getElementById('epubInput').click()}
                className="px-4.5 py-2 text-xs font-semibold bg-accent hover:bg-green-800 text-white rounded-lg transition-colors flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
              >
                <span>📤</span> Subir archivo EPUB mwb
              </button>
            </div>
          ) : (
            semanas.map(s => {
              const partesSemana = partes.filter(p => p.semana_id === s.id)
              const asigSemana   = asignaciones.filter(a => partesSemana.some(p => p.id === a.parte_id))
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
                />
              )
            })
          )}
        </div>
      )}

      {/* Vista resumen */}
      {vistaTab === 'resumen' && (
        <div className="bg-surface border border-border rounded-xl overflow-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr>
                {['SEMANA','CAPÍTULO','♪ AP','♪ VC','♪ CI','PARTES','CONFIRMADAS',''].map(h => (
                  <th key={h} className="bg-bg px-3 py-2 text-left text-xs font-mono font-medium text-text3 tracking-wider border-b border-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanas.map(s => {
                const partesSemana = partes.filter(p => p.semana_id === s.id)
                const asigConf     = asignaciones.filter(a => partesSemana.some(p => p.id === a.parte_id) && a.confirmado)
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                    <td className="px-3 py-2 text-sm text-text1 whitespace-nowrap">{s.fecha_inicio}<br/><span className="text-xs text-text3">{s.fecha_fin}</span></td>
                    <td className="px-3 py-2 text-xs text-text2 font-mono">{s.capitulo_biblico}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text3">{s.cancion_apertura || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text3">{s.cancion_vc || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text3">{s.cancion_cierre || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text2 text-center">{partesSemana.length}</td>
                    <td className="px-3 py-2 text-xs font-mono text-center">
                      <span className={asigConf.length === partesSemana.length && partesSemana.length > 0 ? 'text-accent font-medium' : 'text-text3'}>
                        {asigConf.length}/{partesSemana.length}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleEliminarSemana(s.id)}
                        className="text-xs text-text3 hover:text-danger px-1">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}