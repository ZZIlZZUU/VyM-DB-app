import { memo, useState, useCallback, useRef } from 'react'
import { LayoutGrid, RotateCcw } from 'lucide-react'
import { MESES } from '../../../lib/fechas'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  MES_ABBR,
  TIPO_LABEL,
  initials,
  assignmentDayOfMonth,
} from '../../../components/matriz/matrizUtils'
import { TypeBadge } from '../../../components/matriz/MatrizModals'

/**
 * Determina el estilo de fondo suave y adaptativo de cada celda mensual.
 * En navegación normal: contorno blanco/plateado tipo aluminio sin relleno verde.
 * En mapa de calor: degradado esmeralda suave proporcional a la carga mensual.
 */
function getCellVisualClass({ recsCount, isCellTarget, isColHovered, isRowHovered, heatMap }) {
  if (isCellTarget) {
    if (heatMap) {
      return 'bg-emerald-500/20 dark:bg-emerald-500/25 shadow-[inset_0_0_0_1.5px_rgba(16,185,129,0.45)] dark:shadow-[inset_0_0_0_1.5px_rgba(16,185,129,0.5)] z-10'
    }
    return 'bg-zinc-100/35 dark:bg-white/[0.04] shadow-[inset_0_0_0_1.5px_rgba(148,163,184,0.85)] dark:shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.85)] z-10'
  }

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

/**
 * Fila individual memoizada para alcanzar 60fps en movimiento de cursor y teclado.
 */
const MatrixRow = memo(function MatrixRow({
  persona,
  rowIdx,
  total,
  maxRegistros,
  heatMap,
  isRowHovered,
  hoveredCol,
  focusedCol,
  getCeldaRegistros,
  onHoverCell,
  onClickCell,
}) {
  const isFemenino = persona.sexo === 'F'

  return (
    <tr
      onMouseEnter={() => onHoverCell(persona.clave, null)}
      className="transition-all duration-150 ease-out group"
    >
      {/* Columna Participante (Sticky Left) */}
      <td
        className={`sticky left-0 z-20 px-3.5 py-2 border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_14px_-2px_rgba(0,0,0,0.45)] transition-colors duration-150 ease-out ${
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
            {initials(persona.nombre)}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="font-medium text-text1 text-xs truncate">{persona.nombre}</span>
            <span className="font-mono text-[10px] text-text3 truncate">
              {persona.clave} · {persona.estatus}
            </span>
          </div>
        </div>
      </td>

      {/* Columnas de los 12 Meses */}
      {MESES.map((mes, mi) => {
        const recs = getCeldaRegistros(persona.clave, mes)
        const isColHovered = hoveredCol === mi
        const isKeyboardFocused = focusedCol === mi
        const isCellTarget = (isColHovered && isRowHovered) || isKeyboardFocused
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
            data-matrix-cell={`${rowIdx}-${mi}`}
            onMouseEnter={() => onHoverCell(persona.clave, mi)}
            onClick={() => onClickCell(persona, rowIdx, mi)}
            className={`relative px-1 py-1.5 text-center cursor-pointer transition-colors duration-150 ease-out border-r border-zinc-100/80 dark:border-zinc-800/50 min-h-[48px] h-12 ${visualClass}`}
          >
            {recs.length === 0 ? (
              <span className="inline-block w-1 h-1 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60 select-none" />
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
        className={`px-2 py-2 text-center border-l border-zinc-200/80 dark:border-zinc-800/80 transition-colors duration-150 ease-out ${
          isRowHovered
            ? 'bg-zinc-100/80 dark:bg-zinc-800/60'
            : 'bg-zinc-50/40 dark:bg-zinc-900/20'
        }`}
      >
        <span
          className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-mono transition-colors duration-150 ease-out ${getTotalBadgeStyle(
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

export default function MatrizDesktop({
  activePersonas,
  currentMonthIdx,
  heatMap,
  maxRegistros,
  hasActiveFilters,
  handleResetFilters,
  getCeldaRegistros,
  getTotalPersona,
  openCellModal,
}) {
  const [hoveredCol, setHoveredCol] = useState(null)
  const [hoveredRow, setHoveredRow] = useState(null)
  const [focusedCell, setFocusedCell] = useState(null) // { rowIdx, colIdx }
  const containerRef = useRef(null)

  const handleHoverCell = useCallback((clave, colIdx) => {
    setHoveredRow(clave)
    if (colIdx !== null) {
      setHoveredCol(colIdx)
    }
  }, [])

  const handleClickCell = useCallback(
    (persona, rowIdx, colIdx) => {
      setFocusedCell({ rowIdx, colIdx })
      openCellModal(persona, colIdx)
    },
    [openCellModal]
  )

  const handleKeyDown = useCallback(
    e => {
      if (activePersonas.length === 0) return

      if (e.key === 'Escape') {
        if (focusedCell) {
          e.preventDefault()
          setFocusedCell(null)
          setHoveredCol(null)
          setHoveredRow(null)
        }
        return
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()

        const currRow = focusedCell ? focusedCell.rowIdx : 0
        const currCol = focusedCell ? focusedCell.colIdx : currentMonthIdx

        if (e.key === 'Enter' || e.key === ' ') {
          const persona = activePersonas[currRow]
          if (persona) {
            openCellModal(persona, currCol)
          }
          return
        }

        let nextRow = currRow
        let nextCol = currCol

        if (e.key === 'ArrowUp') nextRow = Math.max(0, currRow - 1)
        if (e.key === 'ArrowDown') nextRow = Math.min(activePersonas.length - 1, currRow + 1)
        if (e.key === 'ArrowLeft') nextCol = Math.max(0, currCol - 1)
        if (e.key === 'ArrowRight') nextCol = Math.min(MESES.length - 1, currCol + 1)

        setFocusedCell({ rowIdx: nextRow, colIdx: nextCol })
        const nextPersona = activePersonas[nextRow]
        if (nextPersona) {
          setHoveredRow(nextPersona.clave)
          setHoveredCol(nextCol)
        }

        const cellEl = containerRef.current?.querySelector(
          `[data-matrix-cell="${nextRow}-${nextCol}"]`
        )
        cellEl?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      }
    },
    [activePersonas, currentMonthIdx, focusedCell, openCellModal]
  )

  const activeColHighlight = focusedCell ? focusedCell.colIdx : hoveredCol

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Cuadrícula anual de participaciones (usa las flechas del teclado para navegar y Enter para abrir)"
      className="relative isolate rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-surface overflow-hidden shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
    >
      <div className="overflow-x-auto max-h-[calc(100vh-210px)]">
        <table
          className="w-full text-left text-xs border-collapse min-w-full table-fixed"
          onMouseLeave={() => {
            if (!focusedCell) {
              setHoveredCol(null)
              setHoveredRow(null)
            }
          }}
        >
          <thead className="sticky top-0 z-30 bg-zinc-50/95 dark:bg-zinc-900/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
            <tr>
              <th
                className={`sticky left-0 top-0 z-40 w-64 min-w-[220px] px-3.5 py-2.5 font-mono text-[10px] uppercase tracking-wider bg-surface border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_14px_-2px_rgba(0,0,0,0.45)] transition-colors duration-150 ease-out ${
                  hoveredRow ? 'text-text1 font-bold' : ''
                }`}
              >
                Participante
              </th>
              {MES_ABBR.map((m, idx) => {
                const isCurrent = idx === currentMonthIdx
                const isHovered = activeColHighlight === idx

                return (
                  <th
                    key={m}
                    className={`px-1.5 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider transition-colors duration-150 ease-out border-r border-zinc-200/60 dark:border-zinc-800/60 ${
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
            {activePersonas.length === 0 ? (
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
              activePersonas.map((p, rowIdx) => {
                const isRowFocused = focusedCell?.rowIdx === rowIdx
                const isRowHovered = hoveredRow === p.clave || isRowFocused
                const focusedCol = isRowFocused ? focusedCell.colIdx : null

                return (
                  <MatrixRow
                    key={p.clave}
                    persona={p}
                    rowIdx={rowIdx}
                    total={getTotalPersona(p.clave)}
                    maxRegistros={maxRegistros}
                    heatMap={heatMap}
                    isRowHovered={isRowHovered}
                    hoveredCol={activeColHighlight}
                    focusedCol={focusedCol}
                    getCeldaRegistros={getCeldaRegistros}
                    onHoverCell={handleHoverCell}
                    onClickCell={handleClickCell}
                  />
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
