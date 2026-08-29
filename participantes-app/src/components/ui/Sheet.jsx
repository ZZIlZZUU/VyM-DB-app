import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

const WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Sheet({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
  className = '',
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const widthClass = WIDTH_CLASSES[width] || WIDTH_CLASSES.md

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className={`relative z-10 flex flex-col w-full ${widthClass} h-full bg-surface border-l border-zinc-200 dark:border-zinc-800/80 shadow-2xl shadow-black/20 animate-slide-left ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
          <div className="flex flex-col gap-0.5 pr-4">
            {title && (
              <h2 className="text-base font-semibold text-text1 tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-text2 font-normal">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onClose}
            aria-label="Cerrar panel"
            className="text-text2 hover:text-text1 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content / Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Sheet
