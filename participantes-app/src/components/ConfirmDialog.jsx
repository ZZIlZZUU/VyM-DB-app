import { useEffect, useRef } from 'react'
import { AlertCircle, HelpCircle } from 'lucide-react'
import { Button } from './ui/Button'

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        confirmRef.current?.focus()
      }, 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [open, onConfirm, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in select-none"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-full sm:max-w-md animate-slide-up sm:animate-scale-in overflow-hidden">
        {/* Content */}
        <div className="p-5 flex gap-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              danger
                ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            {danger ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text1 leading-tight">{title}</h3>
            {message && (
              <p className="text-xs text-text2 mt-1.5 leading-relaxed">{message}</p>
            )}
          </div>
        </div>

        {/* Buttons Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
          >
            <kbd className="hidden sm:inline-block font-mono text-[9px] bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.2 mr-1">
              ESC
            </kbd>
            Cancelar
          </Button>

          <Button
            ref={confirmRef}
            variant={danger ? 'danger' : 'default'}
            size="sm"
            onClick={onConfirm}
          >
            Confirmar
            <kbd className="hidden sm:inline-flex font-mono text-[9px] bg-white/20 border border-white/30 rounded px-1 py-0.2 ml-1">
              ↵
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  )
}