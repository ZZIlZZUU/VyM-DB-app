import { useEffect, useRef, useState } from 'react'

export default function CommandPalette({ open, onClose, NAV, rol, onNavigate, onOpenPerfil, onLogout }) {
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef                = useRef(null)

  // Comandos disponibles
  const navCommands = NAV
    .filter(n => !n.adminOnly || rol === 'admin')
    .map(n => ({
      label: n.label,
      icon: n.icon,
      group: 'Navegar',
      action: () => onNavigate(n.id),
    }))

  const actionCommands = [
    { label: 'Mi perfil',    icon: '👤', group: 'Acciones', action: onOpenPerfil },
    { label: 'Cerrar sesión', icon: '⏻', group: 'Acciones', action: onLogout },
  ]

  const all = [...navCommands, ...actionCommands]

  const filtered = query.trim()
    ? all.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : all

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  useEffect(() => {
    setSelected(0)
  }, [query])

  function execute(cmd) {
    cmd.action()
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[selected]) {
        execute(filtered[selected])
      }
    }
  }

  if (!open) return null

  // Agrupar para renderizado
  const groups = [...new Set(filtered.map(c => c.group))]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-text3 text-sm">⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comando o vista..."
            className="flex-1 text-sm bg-transparent outline-none text-text1 placeholder:text-text3"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 border border-border2 rounded text-[10px] font-mono text-text3 select-none">
            esc
          </kbd>
        </div>

        {/* Lista */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-text3">
              No se encontraron comandos
            </div>
          ) : (
            groups.map(group => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-4 py-1 text-[10px] font-mono text-text3 uppercase tracking-widest">
                  {group}
                </div>
                {filtered
                  .filter(c => c.group === group)
                  .map((cmd) => {
                    const globalIdx = filtered.indexOf(cmd)
                    const isSelected = globalIdx === selected
                    return (
                      <button
                        key={cmd.label}
                        type="button"
                        onClick={() => execute(cmd)}
                        onMouseEnter={() => setSelected(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-accent-bg text-accent font-medium'
                            : 'text-text1 hover:bg-bg'
                        }`}
                      >
                        <span className="w-5 text-center text-xs flex-shrink-0">{cmd.icon}</span>
                        <span className="flex-1 truncate">{cmd.label}</span>
                        {isSelected && (
                          <span className="text-xs text-accent font-mono opacity-80">↵</span>
                        )}
                      </button>
                    )
                  })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-text3 font-mono select-none bg-bg/50">
          <span><kbd className="border border-border2 rounded px-1 bg-surface">↑↓</kbd> Mover</span>
          <span><kbd className="border border-border2 rounded px-1 bg-surface">↵</kbd> Ejecutar</span>
          <span><kbd className="border border-border2 rounded px-1 bg-surface">esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  )
}
