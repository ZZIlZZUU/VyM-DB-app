// Toast.jsx — componente visual para notificaciones
// Uso: <Toast toast={toast} />

const STYLES = {
  success: {
    bar:   'bg-accent',
    icon:  '✓',
    label: 'text-accent',
  },
  error: {
    bar:   'bg-danger',
    icon:  '✕',
    label: 'text-danger',
  },
  warning: {
    bar:   'bg-amber',
    icon:  '⚠',
    label: 'text-amber',
  },
  info: {
    bar:   'bg-blue',
    icon:  'ℹ',
    label: 'text-blue',
  },
}

export default function Toast({ toast }) {
  if (!toast) return null

  const s = STYLES[toast.type] ?? STYLES.info

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none animate-slide-up select-none">
      <div className="pointer-events-auto flex items-center gap-3 bg-surface/95 backdrop-blur-sm border border-border2 shadow-xl rounded-xl px-4 py-3 min-w-[240px] max-w-[380px]">
        {/* barra de color lateral */}
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${s.bar}`} />
        {/* icono */}
        <span className={`text-sm font-bold flex-shrink-0 ${s.label}`}>{s.icon}</span>
        {/* mensaje */}
        <span className="text-xs font-medium text-text1 leading-snug flex-1">{toast.msg}</span>
      </div>
    </div>
  )
}