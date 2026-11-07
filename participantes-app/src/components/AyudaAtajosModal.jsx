import { Command, Compass, Layers, Zap, X } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'

function KbdBadge({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 text-text1 shadow-2xs">
      {children}
    </kbd>
  )
}

function ShortcutRow({ keys, label, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
        onClick
          ? 'cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 group'
          : ''
      }`}
    >
      <span className="text-xs text-text2 group-hover:text-text1 transition-colors">
        {label}
      </span>
      <div className="flex items-center gap-1">
        {keys.map((k, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <KbdBadge>{k}</KbdBadge>
            {idx < keys.length - 1 && <span className="text-[10px] text-text3">+</span>}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AyudaAtajosModal({ isOpen, onClose, onNavigate }) {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const modKey = isMac ? '⌘' : 'Ctrl'

  function handleGo(view) {
    onClose?.()
    onNavigate?.(view)
  }

  const navShortcuts = [
    { keys: ['G', 'I'], label: 'Inicio (Panel general)', view: 'home' },
    { keys: ['G', 'W'], label: 'Vista Semanal', view: 'semanal' },
    { keys: ['G', 'O'], label: 'Programa Semanal', view: 'programa' },
    { keys: ['G', 'E'], label: 'Matriz Anual', view: 'editable' },
    { keys: ['G', 'P'], label: 'Participantes', view: 'personas' },
    { keys: ['G', 'R'], label: 'Historial de Asignaciones', view: 'registros' },
    { keys: ['G', 'T'], label: 'Estadísticas y Balance', view: 'estadisticas' },
    { keys: ['G', 'K'], label: 'Calendario de Eventos', view: 'calendario' },
    { keys: ['G', 'S'], label: 'Explorador de Datos', view: 'sql' },
    { keys: ['G', 'C'], label: 'Configuración', view: 'configuracion' },
    { keys: ['G', 'X'], label: 'Exportar Respaldos', view: 'exportar' },
    { keys: ['G', 'H'], label: 'Historial de Cambios', view: 'historial' },
  ]

  const globalShortcuts = [
    { keys: [modKey, 'K'], label: 'Buscador y paleta de comandos' },
    { keys: [modKey, 'Shift', 'T'], label: 'Alternar tema claro / oscuro' },
    { keys: [modKey, 'Shift', 'E'], label: 'Descargar S-140 de semana actual' },
    { keys: ['?'], label: 'Abrir esta guía de atajos' },
    { keys: ['Esc'], label: 'Cerrar modal, cajón o cancelar búsqueda' },
  ]

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Atajos de Teclado"
      description="Navegación ultrarrápida y comandos globales en VyM-DB."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-text3 font-mono">
            Pulsa <KbdBadge>?</KbdBadge> en cualquier pantalla para ver esta ayuda.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Entendido
          </Button>
        </div>
      }
    >
      <div className="space-y-5 py-1">
        {/* Sección Comandos Globales */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-text3">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Acciones y Comandos Globales</span>
          </div>
          <div className="p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-200/40 dark:divide-zinc-800/40">
            {globalShortcuts.map(s => (
              <ShortcutRow key={s.label} keys={s.keys} label={s.label} />
            ))}
          </div>
        </div>

        {/* Sección Navegación Rápida Secuencial */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-text3">
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Navegación Secuencial (Pulsar G luego tecla)</span>
            </div>
            <span className="text-[10px] text-text3">Clic para ir</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80">
            {navShortcuts.map(s => (
              <ShortcutRow
                key={s.label}
                keys={s.keys}
                label={s.label}
                onClick={() => handleGo(s.view)}
              />
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
