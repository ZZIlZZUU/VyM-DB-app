import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

export const Select = forwardRef(function Select(
  {
    className = '',
    children,
    error = null,
    size = 'md',
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'h-8 pl-2.5 pr-8 text-xs',
    md: 'h-9 pl-3 pr-8 text-sm',
    lg: 'h-10 pl-3.5 pr-9 text-sm',
  }[size] || 'h-9 pl-3 pr-8 text-sm'

  return (
    <div className="relative flex flex-col gap-1 w-full">
      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          className={`w-full appearance-none rounded-lg border bg-white dark:bg-zinc-900/90 text-text1 transition-all duration-150 outline-none cursor-pointer
            ${sizeClasses}
            ${
              error
                ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
                : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400/20 dark:focus:ring-zinc-600/20'
            }
            ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-2.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <span className="text-xs text-red-500 dark:text-red-400 font-medium px-0.5">{error}</span>}
    </div>
  )
})

export default Select
