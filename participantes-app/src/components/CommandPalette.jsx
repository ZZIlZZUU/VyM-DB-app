import { useEffect, useRef, useState } from 'react'
import { Search, User, LogOut, CornerDownLeft, ArrowDown, ArrowUp } from 'lucide-react'
import { NAV_ITEMS } from './Sidebar'

export default function CommandPalette({
  open,
  onClose,
  rol,
  onNavigate,
  onOpenPerfil,
  onLogout,
}) {
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef                = useRef(null)

  // Comandos de navegación
  const navCommands = NAV_ITEMS
    .filter(n => !n.adminOnly || rol === 'admin')
    .map(n => ({
      label: n.label,
      icon: n.icon,
      group: 'Navegación',
      action: () => onNavigate(n.id),
      shortcut: n.shortcut,
    }))

  const actionCommands = [
    { label: 'Mi perfil y cuenta', icon: User, group: 'Acciones', action: onOpenPerfil },
    { label: 'Cerrar sesión', icon: LogOut, group: 'Acciones', action: onLogout },
  ]

  const all = [...navCommands, ...actionCommands]

  const filtered = query.trim()
    ? all.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : all

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 30)
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

  const groups = [...new Set(filtered.map(c => c.group))]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs" />

      {/* Palette Panel */}
      <div
        className="relative w-full max-w-lg bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <Search className="w-4 h-4 text-text3 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comando, vista o acción..."
            className="flex-1 text-sm bg-transparent outline-none text-text1 placeholder:text-text3"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-mono text-text3 select-none">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto py-2 px-1.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-text3">
              No se encontraron resultados para &ldquo;{query}&rdquo;
            </div>
          ) : (
            groups.map(group => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-2.5 py-1 text-[10px] font-mono text-text3 uppercase tracking-wider">
                  {group}
                </div>
                {filtered
                  .filter(c => c.group === group)
                  .map((cmd) => {
                    const globalIdx = filtered.indexOf(cmd)
                    const isSelected = globalIdx === selected
                    const Icon = cmd.icon

                    return (
                      <button
                        key={cmd.label}
                        type="button"
                        onClick={() => execute(cmd)}
                        onMouseEnter={() => setSelected(globalIdx)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800/90 text-text1 font-medium'
                            : 'text-text2 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {Icon && (
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isSelected
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-text3'
                            }`}
                          />
                        )}
                        <span className="flex-1 truncate text-left">{cmd.label}</span>
                        {cmd.shortcut && (
                          <span className="text-[10px] font-mono text-text3 bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                            {cmd.shortcut}
                          </span>
                        )}
                        {isSelected && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-text3 shrink-0 ml-1" />
                        )}
                      </button>
                    )
                  })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 px-4 py-2 flex items-center gap-4 text-[11px] text-text3 font-mono select-none bg-zinc-50/50 dark:bg-zinc-900/30">
          <span className="flex items-center gap-1">
            <kbd className="border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.2 bg-surface text-[10px]">
              ↑↓
            </kbd>
            Navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.2 bg-surface text-[10px]">
              ↵
            </kbd>
            Seleccionar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border border-zinc-200 dark:border-zinc-700 rounded px-1 py-0.2 bg-surface text-[10px]">
              ESC
            </kbd>
            Cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
