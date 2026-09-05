import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

const THEMES = {
  success: {
    icon: CheckCircle2,
    container:
      'bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-surface/95 dark:to-zinc-900/95 border-emerald-500/30 dark:border-emerald-500/25 shadow-lg shadow-emerald-500/10 dark:shadow-emerald-950/30',
    iconBox:
      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    progressBar: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircle,
    container:
      'bg-gradient-to-r from-red-500/15 via-red-500/5 to-surface/95 dark:to-zinc-900/95 border-red-500/30 dark:border-red-500/25 shadow-lg shadow-red-500/10 dark:shadow-red-950/30',
    iconBox:
      'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25',
    progressBar: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    container:
      'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-surface/95 dark:to-zinc-900/95 border-amber-500/30 dark:border-amber-500/25 shadow-lg shadow-amber-500/10 dark:shadow-amber-950/30',
    iconBox:
      'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    progressBar: 'bg-amber-500',
  },
  info: {
    icon: Info,
    container:
      'bg-gradient-to-r from-blue-500/15 via-blue-500/5 to-surface/95 dark:to-zinc-900/95 border-blue-500/30 dark:border-blue-500/25 shadow-lg shadow-blue-500/10 dark:shadow-blue-950/30',
    iconBox:
      'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25',
    progressBar: 'bg-blue-500',
  },
}

export default function Toast({ toast, onDismiss }) {
  const [dismissedId, setDismissedId] = useState(null)

  useEffect(() => {
    // Reset internal dismissal state when a new toast arrives
    if (toast?.id) {
      setDismissedId(null)
    }
  }, [toast?.id])

  if (!toast || (toast.id && dismissedId === toast.id)) return null

  const type = toast.type || 'info'
  const theme = THEMES[type] || THEMES.info
  const Icon = theme.icon
  const duration = toast.duration || 3000

  const handleClose = () => {
    if (toast.id) {
      setDismissedId(toast.id)
    }
    if (onDismiss) {
      onDismiss()
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none animate-slide-up select-none max-w-sm w-full sm:w-auto">
      <div
        className={`pointer-events-auto relative overflow-hidden flex flex-col backdrop-blur-md border rounded-2xl p-3.5 pr-3 shadow-xl min-w-[280px] max-w-[400px] ${theme.container}`}
      >
        {/* Cuerpo del Toast */}
        <div className="flex items-center gap-3">
          {/* Icon Box con glow semántico */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${theme.iconBox}`}
          >
            <Icon className="w-4 h-4" />
          </div>

          {/* Mensaje */}
          <span className="text-xs font-medium text-text1 leading-snug flex-1 pr-1">
            {toast.msg}
          </span>

          {/* Botón de cerrar */}
          <button
            type="button"
            onClick={handleClose}
            className="text-text3 hover:text-text1 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            aria-label="Cerrar notificación"
            title="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Barra de tiempo inferior (Progress Bar consumible) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/5 dark:bg-white/5 overflow-hidden">
          <div
            key={toast.id || toast.msg}
            className={`h-full ${theme.progressBar} animate-toast-progress`}
            style={{ '--toast-duration': `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  )
}