import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
}

const STYLES = {
  success: {
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    barColor:  'bg-emerald-500',
  },
  error: {
    iconColor: 'text-red-600 dark:text-red-400',
    barColor:  'bg-red-500',
  },
  warning: {
    iconColor: 'text-amber-600 dark:text-amber-400',
    barColor:  'bg-amber-500',
  },
  info: {
    iconColor: 'text-blue-600 dark:text-blue-400',
    barColor:  'bg-blue-500',
  },
}

export default function Toast({ toast }) {
  if (!toast) return null

  const Icon = ICONS[toast.type] || Info
  const style = STYLES[toast.type] || STYLES.info

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none animate-slide-up select-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-surface/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl px-4 py-3 min-w-[260px] max-w-[400px]">
        <Icon className={`w-4 h-4 shrink-0 ${style.iconColor}`} />
        <span className="text-xs font-medium text-text1 leading-snug flex-1">
          {toast.msg}
        </span>
      </div>
    </div>
  )
}