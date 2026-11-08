import {
  Users,
  Pencil,
  Power,
  PowerOff,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { SkeletonList } from '../../../components/Skeleton'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'

function getInitials(nombre) {
  if (!nombre) return '??'
  const parts = nombre.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nombre.slice(0, 2).toUpperCase()
}

export function PersonasMobile({
  loading,
  filtered,
  totalCount,
  searchVal,
  setSearchVal,
  currentYear,
  conteosAnio,
  startEdit,
  toggleActivo,
}) {
  if (loading) {
    return (
      <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
        <SkeletonList rows={6} cols={3} />
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl py-10 px-4">
        <EmptyState
          icon={Users}
          title="Sin participantes coincidentes"
          description={
            searchVal
              ? `No se encontraron resultados para "${searchVal}".`
              : 'No hay participantes en esta vista.'
          }
          action={
            searchVal ? (
              <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setSearchVal('')}>
                Limpiar búsqueda
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
        <span>
          Mostrando <strong className="text-text2">{filtered.length}</strong> de {totalCount}
        </span>
        <span className="font-mono">Toca para ver perfil o historial</span>
      </div>

      <div className="space-y-2">
        {filtered.map(p => {
          const countAnio = conteosAnio.get(p.clave) || 0
          return (
            <div
              key={p.clave}
              onClick={() => startEdit(p, 'perfil')}
              className={`bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs transition-colors active:bg-zinc-50 dark:active:bg-zinc-900/60 cursor-pointer ${
                !p.activo ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2.5">
                {/* Avatar + Nombre + Metadatos */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-text2 flex items-center justify-center text-xs font-semibold shrink-0 border border-zinc-300/60 dark:border-zinc-700/60">
                    {getInitials(p.nombre)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-text1 truncate">
                        {p.nombre}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          p.activo
                            ? 'bg-emerald-500'
                            : 'bg-zinc-400 dark:bg-zinc-600'
                        }`}
                        title={p.activo ? 'Activo' : 'Inactivo'}
                      />
                    </div>
                    <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                      <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800/90 text-text2 border border-zinc-200/60 dark:border-zinc-700/60">
                        {p.clave}
                      </span>
                      <Badge variant={p.lista === 'Mat' ? 'info' : 'warning'} size="xs">
                        {p.estatus}
                      </Badge>
                      <span className="text-[10px] font-mono text-text3">
                        · {countAnio} en {currentYear}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones táctiles rápidas */}
                <div
                  className="flex items-center gap-1 shrink-0"
                  onClick={e => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => startEdit(p, 'historial')}
                    aria-label="Ver historial"
                    title="Ver historial"
                    className="min-w-[36px] min-h-[36px]"
                  >
                    <Clock className="w-4 h-4 text-text2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => startEdit(p, 'perfil')}
                    aria-label="Editar perfil"
                    title="Editar perfil"
                    className="min-w-[36px] min-h-[36px]"
                  >
                    <Pencil className="w-4 h-4 text-text2" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => toggleActivo(p)}
                    aria-label={p.activo ? 'Desactivar' : 'Activar'}
                    title={p.activo ? 'Desactivar' : 'Activar'}
                    className={`min-w-[36px] min-h-[36px] ${
                      p.activo
                        ? 'text-text3 hover:text-amber-600'
                        : 'text-emerald-600 hover:text-emerald-700'
                    }`}
                  >
                    {p.activo ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PersonasMobile
