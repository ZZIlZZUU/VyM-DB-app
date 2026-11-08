import { useEffect } from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useEnvironment } from '../../hooks/useEnvironment'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Dialog({
  isOpen,
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  className = '',
}) {
  const visible = Boolean(isOpen ?? open)
  const { isMobile } = useEnvironment()

  useEffect(() => {
    if (isMobile) return undefined
    function handleKeyDown(e) {
      if (e.key === 'Escape' && visible) {
        onClose?.()
      }
    }
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [visible, onClose, isMobile])

  if (!visible) return null

  if (isMobile) {
    return (
      <Drawer.Root
        open={visible}
        onOpenChange={nextOpen => {
          if (!nextOpen) onClose?.()
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 backdrop-blur-[2px]" />
          <Drawer.Content
            className={`fixed inset-x-0 bottom-0 z-50 mt-16 flex max-h-[88dvh] flex-col rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 bg-surface shadow-2xl outline-none ${className}`}
          >
            {/* Drag Handle Pill */}
            <div className="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />

            {/* Header */}
            {(title || description) ? (
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                <div className="flex flex-col gap-0.5 pr-4">
                  {title ? (
                    <Drawer.Title className="text-base font-semibold text-text1 tracking-tight">
                      {title}
                    </Drawer.Title>
                  ) : (
                    <Drawer.Title className="sr-only">Modal</Drawer.Title>
                  )}
                  {description && (
                    <Drawer.Description className="text-xs text-text2 font-normal">
                      {description}
                    </Drawer.Description>
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
            ) : (
              <Drawer.Title className="sr-only">Modal</Drawer.Title>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-text1">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
                {footer}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

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
