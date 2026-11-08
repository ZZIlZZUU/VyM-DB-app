import {
  Search,
  Trash2,
  Edit2,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatFechaLegible } from '../../../lib/fechas'
import { BADGE_STYLES, initials } from '../../../components/matriz/matrizUtils'
import { SkeletonList } from '../../../components/Skeleton'
import { Button } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Select'
import { EmptyState } from '../../../components/ui/EmptyState'

export default function RegistrosDesktop({
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
  pageSize,
  setPageSize,
  totalRecords,
  totalPages,
  startIndex,
  endIndex,
}) {
  const hasFilters = Boolean(search || filterMes || filterLista)

  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-max">
          <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
            <tr>
              {modoSeleccion && (
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && seleccionados.size === filtered.length}
                    ref={el => {
                      if (el) {
                        el.indeterminate =
                          seleccionados.size > 0 && seleccionados.size < filtered.length
                      }
                    }}
                    onChange={e => {
                      if (e.target.checked) {
                        setSeleccionados(new Set(filtered.map(r => r.id)))
                      } else {
                        setSeleccionados(new Set())
                      }
                    }}
                    className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer rounded"
                  />
                </th>
              )}
              <th className="py-3 px-4 w-20 font-mono uppercase text-[10px] tracking-wider">
                ID
              </th>
              <th className="py-3 px-4 w-32 font-mono uppercase text-[10px] tracking-wider">
                Fecha
              </th>
              <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider min-w-[200px]">
                Participante
              </th>
              <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-center w-28">
                Tipo
              </th>
              <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-center w-20">
                Peso
              </th>
              <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider">
                Observaciones
              </th>
              <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-right w-24">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={modoSeleccion ? 8 : 7} className="py-8 px-4">
                  <SkeletonList rows={8} cols={4} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={modoSeleccion ? 8 : 7} className="py-8 px-4">
                  <EmptyState
                    icon={hasFilters ? Search : FileText}
                    title="Sin asignaciones coincidentes"
                    description={
                      hasFilters
                        ? 'No se encontraron registros de participaciones con los filtros seleccionados.'
                        : 'Aún no hay registros de participaciones en este periodo.'
                    }
                    action={
                      hasFilters ? (
                        <Button
                          variant="secondary"
                          size="xs"
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
                </td>
              </tr>
            ) : (
              paginated.map(r => {
                const persona = personas.find(p => p.clave === r.clave)
                const isFemenino = persona?.sexo === 'F'
                const isSelected = seleccionados.has(r.id)

                return (
                  <tr
                    key={r.id}
                    onClick={() => {
                      if (modoSeleccion) {
                        setSeleccionados(prev => {
                          const next = new Set(prev)
                          if (next.has(r.id)) {
                            next.delete(r.id)
                          } else {
                            next.add(r.id)
                          }
                          return next
                        })
                      } else {
                        startEdit(r)
                      }
                    }}
                    className={`group hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    {modoSeleccion && (
                      <td
                        className="py-3 px-3 text-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSeleccionados(prev => {
                              const next = new Set(prev)
                              if (next.has(r.id)) {
                                next.delete(r.id)
                              } else {
                                next.add(r.id)
                              }
                              return next
                            })
                          }}
                          className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer rounded"
                        />
                      </td>
                    )}

                    {/* ID */}
                    <td className="py-3 px-4 font-mono text-text3 text-[11px]">
                      #{r.id}
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span className="font-medium text-text1 block">
                        {formatFechaLegible(r.fecha)}
                      </span>
                      <span className="text-[10px] text-text3 font-mono">{r.fecha} · {r.mes}</span>
                    </td>

                    {/* Participante */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                            isFemenino
                              ? 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40'
                              : 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
                          }`}
                        >
                          {initials(r.nombre)}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <span className="font-medium text-text1 text-xs truncate">
                            {r.nombre}
                          </span>
                          <span className="font-mono text-[10px] text-text3">
                            {r.clave} · {r.lista}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-6 h-5 px-2 rounded text-xs font-semibold font-mono border ${
                          BADGE_STYLES[r.tipo] || 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {r.tipo}
                      </span>
                    </td>

                    {/* Peso */}
                    <td className="py-3 px-4 text-center font-mono text-xs text-text3">
                      {r.peso || 1}
                    </td>

                    {/* Observaciones */}
                    <td className="py-3 px-4 text-text2 text-xs truncate max-w-xs">
                      {r.observaciones || '—'}
                    </td>

                    {/* Acciones */}
                    <td
                      className="py-3 px-4 text-right"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="iconXs"
                          onClick={() => startEdit(r)}
                          aria-label="Editar registro"
                          title="Editar registro"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-text3" />
                        </Button>
                        <Button
                          variant="dangerGhost"
                          size="iconXs"
                          onClick={() => handleDelete(r.id)}
                          aria-label="Eliminar registro"
                          title="Eliminar registro"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-text3 hover:text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {filtered.length > 0 && (
        <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="font-mono text-text3 px-1">
              Página <strong className="text-text1">{page}</strong> de {totalPages}
            </span>
            <Button
              variant="outline"
              size="xs"
              iconRight={ChevronRight}
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-32">
              <Select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                size="sm"
              >
                {[25, 50, 100, 250].map(n => (
                  <option key={n} value={n}>
                    {n} por pág.
                  </option>
                ))}
              </Select>
            </div>
            <span className="font-mono text-text3">
              {startIndex + 1}–{endIndex} de {totalRecords}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
