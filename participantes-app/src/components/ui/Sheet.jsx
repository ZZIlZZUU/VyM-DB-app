import { useEffect } from 'react'
import { Drawer } from 'vaul'
import { X } from 'lucide-react'
import { Button } from './Button'
import { useEnvironment } from '../../hooks/useEnvironment'

const WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function Sheet({
  isOpen,
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
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
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60 shrink-0">
              <div className="flex flex-col gap-0.5 pr-4">
                {title ? (
                  <Drawer.Title className="text-base font-semibold text-text1 tracking-tight">
                    {title}
                  </Drawer.Title>
                ) : (
                  <Drawer.Title className="sr-only">Panel</Drawer.Title>
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
                aria-label="Cerrar panel"
                className="text-text2 hover:text-text1 shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content / Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
                {footer}
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

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
