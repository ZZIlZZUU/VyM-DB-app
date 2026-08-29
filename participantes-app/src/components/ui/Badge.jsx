const VARIANTS = {
  neutral:
    'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-900/60 dark:text-zinc-300 dark:border-zinc-800',
  success:
    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  warning:
    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  danger:
    'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  info:
    'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  purple:
    'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  teal:
    'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
}

const DOT_COLORS = {
  neutral: 'bg-zinc-400 dark:bg-zinc-500',
  success: 'bg-emerald-600 dark:bg-emerald-400',
  warning: 'bg-amber-600 dark:bg-amber-400',
  danger:  'bg-red-600 dark:bg-red-400',
  info:    'bg-blue-600 dark:bg-blue-400',
  purple:  'bg-purple-600 dark:bg-purple-400',
  teal:    'bg-teal-600 dark:bg-teal-400',
}

export function Badge({
  children,
  variant = 'neutral',
  dot = false,
  pulse = false,
  className = '',
  size = 'sm',
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.neutral
  const dotClass = DOT_COLORS[variant] || DOT_COLORS.neutral
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shrink-0 tracking-tight select-none ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`} />
        </span>
      )}
      {children}
    </span>
  )
}

export default Badge
