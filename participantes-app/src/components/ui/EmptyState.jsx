import { Inbox } from 'lucide-react'

/**
 * Componente unificado de Estado Vacío (Empty State) para tablas, listas y paneles.
 * Reemplaza emojis y layouts ad-hoc con diseño visual homogéneo y soporte de iconos Lucide.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title = 'Sin resultados',
  description,
  action,
  secondaryAction,
  className = '',
  compact = false,
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center mx-auto select-none ${
        compact ? 'py-6 px-3 max-w-xs' : 'py-12 sm:py-16 px-4 max-w-sm'
      } ${className}`}
    >
      <div
        className={`rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 flex items-center justify-center text-text3 transition-transform duration-200 ${
          compact ? 'w-10 h-10 mb-2.5' : 'w-13 h-13 mb-3.5 shadow-2xs'
        }`}
      >
        <Icon className={compact ? 'w-5 h-5 text-text3' : 'w-6 h-6 text-text2 dark:text-text3'} />
      </div>

      <h4 className={`font-semibold text-text1 tracking-tight ${compact ? 'text-xs' : 'text-sm'}`}>
        {title}
      </h4>

      {description && (
        <p className={`text-text3 leading-relaxed mt-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={`flex items-center gap-2 flex-wrap justify-center ${compact ? 'mt-3' : 'mt-4'}`}>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}

export default EmptyState
