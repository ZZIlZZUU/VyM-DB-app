import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
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

  const sizeClass = SIZES[size] || SIZES.md

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        className={`relative z-10 w-full ${sizeClass} bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl shadow-black/25 overflow-hidden animate-scale-in flex flex-col max-h-[90vh] ${className}`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
            <div className="flex flex-col gap-0.5 pr-4">
              {title && (
                <h3 className="text-base font-semibold text-text1 tracking-tight">
                  {title}
                </h3>
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
              aria-label="Cerrar modal"
              className="text-text2 hover:text-text1 shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-text1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dialog
