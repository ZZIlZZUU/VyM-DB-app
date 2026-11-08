import {
  FileEdit,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'
import { formatFechaLegible } from '../../../lib/fechas'
import { TIPO_LABEL } from '../../../components/matriz/matrizUtils'
import { TypeBadge } from '../../../components/matriz/MatrizModals'
import { SkeletonList } from '../../../components/Skeleton'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'

export function RegistrosMobile({
  loading,
  personas,
  filtered,
  paginated,
  search,
  setSearch,
  filterMes,
  setFilterMes,
  filterLista,
  setFilterLista,
  modoSeleccion,
  seleccionados,
  setSeleccionados,
  startEdit,
  handleDelete,
  page,
  setPage,
  totalRecords,
  totalPages,
  startIndex,
  endIndex,
}) {
  if (loading) {
    return (
      <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <SkeletonList rows={6} cols={3} />
      </div>
    )
  }

  if (filtered.length === 0) {
    const hasFilters = Boolean(search || filterMes || filterLista)
    return (
      <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl py-10 px-4">
        <EmptyState
          icon={FileEdit}
          title="No se encontraron registros"
          description={
            hasFilters
              ? 'No hay participaciones que coincidan con los filtros activos.'
              : 'Aún no hay participaciones registradas.'
          }
          action={
            hasFilters ? (
              <Button
                variant="outline"
                size="sm"
                icon={RotateCcw}
                onClick={() => {
                  setSearch('')
                  setFilterMes('')
                  setFilterLista('')
                }}
              >
                Limpiar filtros
              </Button>
            ) : null
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 text-[11px] text-text3">
        <span>
          Mostrando <strong className="text-text2">{startIndex}</strong>–
          <strong className="text-text2">{endIndex}</strong> de {totalRecords}
        </span>
        <span className="font-mono">Toca para editar</span>
      </div>

      <div className="space-y-2">
        {paginated.map(r => {
          const per = personas.find(p => p.clave === r.clave)
          const isSelected = seleccionados.has(r.id)

          return (
            <div
              key={r.id}
              onClick={() => {
                if (modoSeleccion) {
                  setSeleccionados(prev => {
                    const next = new Set(prev)
                    if (next.has(r.id)) next.delete(r.id)
                    else next.add(r.id)
                    return next
                  })
                } else {
                  startEdit(r)
                }
              }}
              className={`bg-surface border rounded-xl p-3 shadow-2xs transition-colors cursor-pointer ${
                isSelected
                  ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 active:bg-zinc-50 dark:active:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  {modoSeleccion && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        e.stopPropagation()
                        setSeleccionados(prev => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(r.id)
                          else next.delete(r.id)
                          return next
                        })
                      }}
                      onClick={e => e.stopPropagation()}
                      className="mt-1 rounded border-zinc-300 dark:border-zinc-700 text-accent focus:ring-accent cursor-pointer shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-text1 truncate">
                        {per?.nombre || r.clave}
                      </span>
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800/90 text-text2 border border-zinc-200/60 dark:border-zinc-700/60">
                        {r.clave}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 mt-1.5">
                      <TypeBadge tipo={r.tipo} />
                      <span className="text-xs text-text2">
                        {TIPO_LABEL[r.tipo] || r.tipo}
                      </span>
                      <span className="text-[11px] font-mono text-text3">
                        · {formatFechaLegible(r.fecha)}
                      </span>
                    </div>

                    {r.observaciones && (
                      <p className="text-[11px] text-text3 italic mt-1 line-clamp-1">
                        “{r.observaciones}”
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones táctiles */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => startEdit(r)}
                    aria-label="Editar registro"
                    className="min-w-[36px] min-h-[36px]"
                  >
                    <Pencil className="w-4 h-4 text-text2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => handleDelete(r.id)}
                    aria-label="Eliminar registro"
                    className="min-w-[36px] min-h-[36px] text-text3 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Paginación Móvil */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2.5 bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl text-xs">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Anterior
          </Button>
          <span className="font-mono text-text2">
            Pág. <strong className="text-text1">{page}</strong> / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Siguiente
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}

export default RegistrosMobile
