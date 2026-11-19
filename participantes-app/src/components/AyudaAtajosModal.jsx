import { useEffect, useState } from 'react'
import { Compass, Zap } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import {
  formatBindingLabel,
  getBindingKeysArray,
  loadKeybinds,
  parseSequenceBinding,
} from '../lib/keybinds'

function KbdBadge({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-mono font-medium rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700/80 text-text1 shadow-2xs">
      {children}
    </kbd>
  )
}

function ShortcutRow({ keys, separator = '+', label, onClick }) {
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
            {idx < keys.length - 1 && (
              <span className="text-[10px] text-text3">{separator}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function AyudaAtajosModal({ isOpen, onClose, onNavigate }) {
  const [keybinds, setKeybinds] = useState(() => loadKeybinds())

  useEffect(() => {
    const sync = () => setKeybinds(loadKeybinds())
    window.addEventListener('preferences-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('preferences-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  function handleGo(view) {
    onClose?.()
    onNavigate?.(view)
  }

  const navMeta = [
    { keyId: 'nav_home', label: 'Inicio (Panel general)', view: 'home' },
    { keyId: 'nav_semanal', label: 'Vista Semanal', view: 'semanal' },
    { keyId: 'nav_programa', label: 'Programa Semanal', view: 'programa' },
    { keyId: 'nav_editable', label: 'Matriz Anual', view: 'editable' },
    { keyId: 'nav_personas', label: 'Participantes', view: 'personas' },
    { keyId: 'nav_registros', label: 'Historial de Asignaciones', view: 'registros' },
    { keyId: 'nav_estadisticas', label: 'Estadísticas y Balance', view: 'estadisticas' },
    { keyId: 'nav_calendario', label: 'Calendario de Eventos', view: 'calendario' },
    { keyId: 'nav_configuracion', label: 'Configuración', view: 'configuracion' },
    { keyId: 'nav_exportar', label: 'Exportar Respaldos', view: 'exportar' },
    { keyId: 'nav_historial', label: 'Historial de Cambios', view: 'historial' },
  ]

  const navShortcuts = navMeta.map((item) => {
    const binding = keybinds[item.keyId]
    const isSeq = Boolean(parseSequenceBinding(binding))
    return {
      ...item,
      keys: getBindingKeysArray(binding),
      separator: isSeq ? '→' : '+',
    }
  })

  const globalShortcuts = [
    { keys: getBindingKeysArray(keybinds.openPalette), label: 'Buscador y paleta de comandos' },
    { keys: getBindingKeysArray(keybinds.newAssignment), label: 'Registrar nueva participación' },
    { keys: getBindingKeysArray(keybinds.openPerfil), label: 'Abrir Mi Perfil y Preferencias' },
    { keys: getBindingKeysArray(keybinds.toggleTheme), label: 'Alternar tema claro / oscuro' },
    { keys: getBindingKeysArray(keybinds.exportS140), label: 'Descargar S-140 de semana actual' },
    { keys: getBindingKeysArray(keybinds.openHelp), label: 'Abrir esta guía de atajos' },
    { keys: ['Esc'], label: 'Cerrar modal, cajón o cancelar búsqueda' },
  ]

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Atajos de Teclado"
      description="Navegación ultrarrápida y comandos globales configurados en VyM-DB."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-text3 font-mono">
            Pulsa <KbdBadge>{formatBindingLabel(keybinds.openHelp) || '?'}</KbdBadge> para ver esta ayuda (personalizable en Perfil).
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
              <span>Navegación Rápida</span>
            </div>
            <span className="text-[10px] text-text3">Clic para ir</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80">
            {navShortcuts.map(s => (
              <ShortcutRow
                key={s.label}
                keys={s.keys}
                separator={s.separator}
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
