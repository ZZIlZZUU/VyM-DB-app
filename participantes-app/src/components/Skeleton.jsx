// Skeleton.jsx — placeholders animados para estados de carga

// Bloque genérico con pulso
export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`bg-border rounded animate-pulse ${className}`} />
  )
}

// Fila tipo lista (Personas / Registros)
export function SkeletonRow({ cols = 3 }) {
  const widths = ['w-24', 'w-32', 'w-20', 'w-28', 'w-16']
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border border-transparent rounded-lg">
      <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className="flex-1 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock
            key={i}
            className={`h-3 ${widths[i % widths.length]}`}
          />
        ))}
      </div>
      <SkeletonBlock className="w-16 h-6 rounded-md" />
    </div>
  )
}

// Lista de N filas skeleton
export function SkeletonList({ rows = 6, cols = 3 }) {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </div>
  )
}

// Tarjeta skeleton para Programa
export function SkeletonCard() {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="flex-1 flex flex-col gap-2">
          <SkeletonBlock className="h-3.5 w-48" />
          <SkeletonBlock className="h-2.5 w-32" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[0,1,2].map(i => <SkeletonBlock key={i} className="h-5 w-10 rounded" />)}
          </div>
          <div className="flex flex-col gap-1 min-w-[72px]">
            <div className="flex justify-between">
              <SkeletonBlock className="h-2.5 w-8" />
              <SkeletonBlock className="h-2.5 w-8" />
            </div>
            <SkeletonBlock className="h-2 w-full rounded-full" />
          </div>
          <SkeletonBlock className="h-4 w-4 rounded" />
        </div>
      </div>
    </div>
  )
}

// Pantalla de carga para Programa (varias tarjetas)
export function SkeletonPrograma({ cards = 4 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}