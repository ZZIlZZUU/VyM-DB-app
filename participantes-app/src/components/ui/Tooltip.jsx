import { useState, useEffect } from 'react'

export function Tooltip({
  children,
  content,
  shortcut,
  side = 'right',
  disabled = false,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (disabled) {
      setIsVisible(false)
    }
  }, [disabled])

  if (disabled || !content) return children

  const positionClasses = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side] || 'left-full top-1/2 -translate-y-1/2 ml-2'

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => !disabled && setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => !disabled && setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && !disabled && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap px-2 py-1 text-[11px] font-medium rounded-md bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 shadow-md border border-zinc-700/40 dark:border-zinc-300/40 flex items-center gap-1.5 animate-fade-in ${positionClasses} ${className}`}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="px-1 py-0.2 text-[9px] font-mono rounded bg-zinc-800 text-zinc-300 dark:bg-zinc-200 dark:text-zinc-700 border border-zinc-700 dark:border-zinc-300">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  )
}

export default Tooltip
