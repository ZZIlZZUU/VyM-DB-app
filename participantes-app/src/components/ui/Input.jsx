import { forwardRef } from 'react'

export const Input = forwardRef(function Input(
  {
    className = '',
    type = 'text',
    error = null,
    icon: Icon,
    iconRight: IconRight,
    size = 'md',
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'h-8 px-2.5 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-10 px-3.5 text-sm',
  }[size] || 'h-9 px-3 text-sm'

  return (
    <div className="relative flex flex-col gap-1 w-full">
      <div className="relative flex items-center w-full">
        {Icon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full rounded-lg border bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all duration-150 outline-none
            ${Icon ? 'pl-9' : ''}
            ${IconRight ? 'pr-9' : ''}
            ${sizeClasses}
            ${
              error
                ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
                : 'border-zinc-200 dark:border-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-1 focus:ring-zinc-400/20 dark:focus:ring-zinc-600/20'
            }
            ${className}`}
          {...props}
        />
        {IconRight && (
          <div className="absolute right-3 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-500">
            <IconRight className="w-4 h-4" />
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-500 dark:text-red-400 font-medium px-0.5">{error}</span>}
    </div>
  )
})

export default Input
