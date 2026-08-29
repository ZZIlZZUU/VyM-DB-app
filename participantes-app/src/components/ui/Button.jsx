import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  default:
    'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-2xs border border-transparent',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200/80 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60',
  outline:
    'bg-transparent text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700/80',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100',
  accent:
    'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-900/80 dark:hover:bg-emerald-800 dark:text-emerald-100 dark:border dark:border-emerald-700/60 shadow-2xs',
  danger:
    'bg-red-600 text-white hover:bg-red-700 dark:bg-red-900/80 dark:hover:bg-red-800 dark:text-red-100 dark:border dark:border-red-700/60 shadow-2xs',
  dangerGhost:
    'bg-transparent text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30',
}

const SIZES = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-md font-medium',
  sm: 'h-8 px-2.5 text-xs gap-1.5 rounded-md font-medium',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-lg font-medium',
  lg: 'h-10 px-4 text-sm gap-2 rounded-lg font-medium',
  icon: 'h-8 w-8 p-0 rounded-md flex items-center justify-center',
  iconSm: 'h-7 w-7 p-0 rounded-md flex items-center justify-center',
  iconXs: 'h-6 w-6 p-0 rounded flex items-center justify-center',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'default',
    size = 'md',
    className = '',
    loading = false,
    disabled = false,
    type = 'button',
    icon: Icon,
    iconRight: IconRight,
    ...props
  },
  ref
) {
  const variantClass = VARIANTS[variant] || VARIANTS.default
  const sizeClass = SIZES[size] || SIZES.md

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap select-none transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      ) : null}
      {children}
      {!loading && IconRight ? <IconRight className="w-3.5 h-3.5 shrink-0" /> : null}
    </button>
  )
})

export default Button
