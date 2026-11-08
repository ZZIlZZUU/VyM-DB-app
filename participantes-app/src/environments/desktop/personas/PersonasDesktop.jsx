import {
  Search,
  Users,
  Pencil,
  Power,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { initials } from '../../../components/matriz/matrizUtils'
import { SkeletonList } from '../../../components/Skeleton'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Tooltip } from '../../../components/ui/Tooltip'
import { EmptyState } from '../../../components/ui/EmptyState'

function SortHeader({
  field,
  label,
  currentField,
  currentDir,
  onSort,
  className = '',
  align = 'left',
}) {
  const isActive = currentField === field

  return (
    <th
      onClick={() => onSort(field)}
      className={`py-3 px-4 font-mono uppercase text-[10px] tracking-wider cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors select-none group ${className}`}
    >
      <div
        className={`flex items-center gap-1.5 ${
          align === 'right'
            ? 'justify-end'
            : align === 'center'
              ? 'justify-center'
              : 'justify-start'
        }`}
      >
        <span
          className={`transition-colors ${
            isActive
              ? 'text-text1 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 group-hover:text-text2'
          }`}
        >
          {label}
        </span>
        <span
          className={`transition-colors shrink-0 ${
            isActive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-zinc-400/50 group-hover:text-zinc-400 dark:text-zinc-600 dark:group-hover:text-zinc-400'
          }`}
        >
          {isActive ? (
            currentDir === 'asc' ? (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
          )}
        </span>
      </div>
    </th>
  )
}

export default function PersonasDesktop({
  loading,
  filtered,
  totalCount,
  searchVal,
  setSearchVal,
  sortField,
  sortDirection,
  handleSort,
  currentYear,
  conteosAnio,
  startEdit,
  toggleActivo,
}) {
  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 font-medium select-none">
              <SortHeader
                field="clave"
                label="Clave"
                currentField={sortField}
                currentDir={sortDirection}
                onSort={handleSort}
                className="w-24"
              />
              <SortHeader
                field="nombre"
                label="Participante"
                currentField={sortField}
                currentDir={sortDirection}
                onSort={handleSort}
                className="min-w-[200px]"
              />
              <SortHeader
                field="lista"
                label="Lista"
                currentField={sortField}
                currentDir={sortDirection}
                onSort={handleSort}
                className="hidden sm:table-cell"
              />
              <SortHeader
                field="estatus"
                label="Estatus"
                currentField={sortField}
                currentDir={sortDirection}
                onSort={handleSort}
                className="hidden md:table-cell"
              />
              <SortHeader
                field="participaciones"
                label={`Part. ${currentYear}`}
                currentField={sortField}
                currentDir={sortDirection}
                onSort={handleSort}
                align="center"
                className="hidden lg:table-cell w-28 text-center"
              />
              <SortHeader
                field="activo"
                label="Estado"
                currentField={sortField}
                currentDir={sortDirection}
                onSort={handleSort}
                align="center"
                className="w-28 text-center"
              />
              <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-right w-24">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4">
                  <SkeletonList rows={8} cols={5} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 px-4">
                  <EmptyState
                    icon={searchVal ? Search : Users}
                    title="Sin participantes coincidentes"
                    description={
                      searchVal
                        ? `No se encontraron resultados para "${searchVal}".`
                        : 'No hay participantes registrados con los filtros seleccionados.'
                    }
                    action={
                      searchVal ? (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setSearchVal('')}
                        >
                          Limpiar búsqueda
                        </Button>
                      ) : null
                    }
                  />
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const isFemenino = p.sexo === 'F'
                const isMat = p.lista === 'Mat'
                const partAnioCount = conteosAnio[p.clave] || 0

                return (
                  <tr
                    key={p.clave}
                    onClick={() => startEdit(p)}
                    className={`group hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors duration-150 ${
                      !p.activo ? 'opacity-55' : ''
                    }`}
                  >
                    {/* Clave */}
                    <td className="py-3 px-4 font-mono font-medium text-text2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px]">
                        {p.clave}
                      </span>
                    </td>

                    {/* Participante (Avatar + Nombre) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border ${
                            isFemenino
                              ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                          }`}
                        >
                          {initials(p.nombre)}
                        </div>
                        <div className="min-w-0 flex flex-col">
                          <span className="font-medium text-text1 text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {p.nombre}
                          </span>
                          <span className="text-[10px] text-text3 md:hidden">
                            {p.estatus} · {isMat ? 'Matriculados' : 'Anc/SM'} · {partAnioCount} part.
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Lista */}
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <Badge
                        variant={isMat ? 'info' : 'warning'}
                        size="xs"
                      >
                        {isMat ? 'Matriculados' : 'Ancianos / SM'}
                      </Badge>
                    </td>

                    {/* Estatus */}
                    <td className="py-3 px-4 text-text2 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1">
                        {p.estatus}
                      </span>
                    </td>

                    {/* Participaciones en el año */}
                    <td className="py-3 px-4 text-center hidden lg:table-cell">
                      {partAnioCount > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                          {partAnioCount} part.
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono text-zinc-400 dark:text-zinc-600">
                          0 part.
                        </span>
                      )}
                    </td>

                    {/* Estado Activo/Inactivo */}
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={p.activo ? 'success' : 'neutral'}
                        size="xs"
                        dot
                        pulse={p.activo}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right">
                      <div
                        className="inline-flex items-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <Tooltip content="Editar detalles" side="left">
                          <Button
                            variant="ghost"
                            size="iconXs"
                            onClick={() => startEdit(p)}
                            aria-label="Editar participante"
                            className="text-text3 hover:text-text1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>

                        <Tooltip
                          content={
                            p.activo ? 'Deshabilitar participante' : 'Habilitar participante'
                          }
                          side="left"
                        >
                          <Button
                            variant="ghost"
                            size="iconXs"
                            onClick={() => toggleActivo(p)}
                            aria-label={p.activo ? 'Deshabilitar' : 'Habilitar'}
                            className={
                              p.activo
                                ? 'text-text3 hover:text-red-600 dark:hover:text-red-400'
                                : 'text-text3 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con conteo total de filas filtradas */}
      {!loading && filtered.length > 0 && (
        <div className="px-4 py-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between text-[11px] text-text3 font-mono select-none">
          <span>
            Mostrando {filtered.length} de {totalCount} participantes
          </span>
          <span>VyM-DB Records</span>
        </div>
      )}
    </div>
  )
}
