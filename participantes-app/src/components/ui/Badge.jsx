const VARIANTS = {
  neutral:
    'bg-surface-alt text-text2 border-border',
  success:
    'bg-accent-muted-bg text-accent border-accent-muted-border',
  warning:
    'bg-amber-bg text-amber border-amber/25',
  danger:
    'bg-danger-bg text-danger border-danger/25',
  info:
    'bg-blue-bg text-blue border-blue/25',
  purple:
    'bg-purple-bg text-purple border-purple/25',
  teal:
    'bg-teal-bg text-teal border-teal/25',
}

const DOT_COLORS = {
  neutral: 'bg-text3',
  success: 'bg-accent',
  warning: 'bg-amber',
  danger:  'bg-danger',
  info:    'bg-blue',
  purple:  'bg-purple',
  teal:    'bg-teal',
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
