import { memo } from 'react'
import { Calendar, RotateCcw } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  MES_ABBR,
  BADGE_STYLES,
  initials,
} from '../../../components/matriz/matrizUtils'

const MESES_INICIAL = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const MobilePersonaCard = memo(function MobilePersonaCard({
  persona,
  currentMonthIdx,
  heatMap,
  getCeldaRegistros,
  getTotalPersona,
  openCellModal,
}) {
  const totalPersona = getTotalPersona(persona.clave)

  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs space-y-2.5">
      {/* Encabezado de la tarjeta */}
      <button
        type="button"
        onClick={() => openCellModal(persona, currentMonthIdx)}
        className="w-full flex items-center justify-between gap-2.5 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-text2 flex items-center justify-center text-[11px] font-semibold shrink-0 border border-zinc-300/60 dark:border-zinc-700/60">
            {initials(persona.nombre)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-text1 truncate leading-tight">
              {persona.nombre}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-mono text-text3 bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.2 rounded border border-zinc-200/60 dark:border-zinc-700/60">
                {persona.clave}
              </span>
              <span className="text-[11px] text-text2 truncate">
                {persona.estatus}
              </span>
            </div>
          </div>
        </div>

        {/* Total anual */}
        <div className="flex flex-col items-end shrink-0">
          <span
            className={`inline-flex items-center justify-center min-w-7 h-6 px-2 rounded-full text-xs font-mono font-bold ${
              totalPersona === 0
                ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-600'
                : totalPersona >= 8
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-text1 border border-zinc-200/80 dark:border-zinc-700'
            }`}
          >
            {totalPersona}
          </span>
          <span className="text-[9px] font-mono text-text3 mt-0.5">
            anual
          </span>
        </div>
      </button>

      {/* Mini-Barra Anual de 12 Píldoras (E F M A M J J A S O N D) sin scroll horizontal */}
      <div className="grid grid-cols-12 gap-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
        {MES_ABBR.map((m, i) => {
          const regs = getCeldaRegistros(persona.clave, i)
          const count = regs.length
          const isCurrent = i === currentMonthIdx
          const firstTipo = regs[0]?.tipo
          const badgeStyle = firstTipo
            ? BADGE_STYLES[firstTipo] || 'bg-zinc-200 dark:bg-zinc-700 text-text1'
            : ''

          let pillClass =
            'bg-zinc-100/70 dark:bg-zinc-900/60 text-zinc-400 dark:text-zinc-600 border-zinc-200/60 dark:border-zinc-800/70'

          if (count > 0) {
            if (heatMap) {
              pillClass =
                count === 1
                  ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : count === 2
                    ? 'bg-emerald-500/35 dark:bg-emerald-500/40 text-emerald-800 dark:text-emerald-200 border-emerald-500/50'
                    : 'bg-emerald-500/65 dark:bg-emerald-500/70 text-white border-emerald-600'
            } else {
              pillClass = badgeStyle
            }
          }

          return (
            <button
              key={m}
              type="button"
              onClick={() => openCellModal(persona, i)}
              aria-label={`${persona.nombre} - ${MES_ABBR[i]} (${count} asignaciones)`}
              className={`flex flex-col items-center justify-center py-1.5 rounded-md border transition-transform active:scale-95 cursor-pointer select-none ${pillClass} ${
                isCurrent ? 'ring-1 ring-accent ring-offset-1 ring-offset-surface' : ''
              }`}
            >
              <span
                className={`text-[9px] font-mono leading-none ${
                  isCurrent ? 'font-bold underline decoration-accent' : 'opacity-75'
                }`}
              >
                {MESES_INICIAL[i]}
              </span>
              <span className="text-[10px] font-mono font-bold leading-tight mt-1">
                {count > 0 ? (count > 1 ? count : firstTipo) : '·'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

export function MatrizMobile({
  activePersonas,
  currentMonthIdx,
  heatMap,
  hasActiveFilters,
  handleResetFilters,
  getCeldaRegistros,
  getTotalPersona,
  openCellModal,
}) {
  if (activePersonas.length === 0) {
    return (
      <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl py-12 px-4">
        <EmptyState
          icon={Calendar}
          title="Sin participantes coincidentes"
          description={
            hasActiveFilters
              ? 'No se encontraron participantes con los filtros aplicados.'
              : 'No hay participantes en esta categoría.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" icon={RotateCcw} onClick={handleResetFilters}>
                Restablecer filtros
              </Button>
            ) : null
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-1 text-[11px] text-text3">
        <span>Toca cualquier mes (E–D) para ver o editar asignaciones</span>
        <span className="font-mono">{activePersonas.length} personas</span>
      </div>
      <div className="space-y-2.5">
        {activePersonas.map(p => (
          <MobilePersonaCard
            key={p.clave}
            persona={p}
            currentMonthIdx={currentMonthIdx}
            heatMap={heatMap}
            getCeldaRegistros={getCeldaRegistros}
            getTotalPersona={getTotalPersona}
            openCellModal={openCellModal}
          />
        ))}
      </div>
    </div>
  )
}

export default MatrizMobile
