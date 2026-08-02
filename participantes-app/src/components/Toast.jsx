// Toast.jsx — componente visual para notificaciones
// Uso: <Toast toast={toast} />
// toast viene del hook useToast: { msg, type } | null

const STYLES = {
  success: {
    bar:  'bg-accent',
    icon: '✓',
    label: 'text-accent',
  },
  error: {
    bar:  'bg-danger',
    icon: '✕',
    label: 'text-danger',
  },
  warning: {
    bar:  'bg-amber',
    icon: '⚠',
    label: 'text-amber',
  },
  info: {
    bar:  'bg-blue',
    icon: 'ℹ',
    label: 'text-blue',
  },
}

export default function Toast({ toast }) {
  if (!toast) return null

  const s = STYLES[toast.type] ?? STYLES.info

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
      <div className="flex items-center gap-3 bg-surface border border-border rounded-lg shadow-lg px-4 py-3 min-w-[220px] max-w-[360px]">
        {/* barra de color lateral */}
        <div className={`w-1 self-stretch rounded-full ${s.bar}`} />
        {/* icono */}
        <span className={`text-sm font-bold ${s.label}`}>{s.icon}</span>
        {/* mensaje */}
        <span className="text-sm text-text1 leading-snug">{toast.msg}</span>
      </div>
    </div>
  )
}