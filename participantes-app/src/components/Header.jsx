import { useEffect, useState } from 'react'
import { Menu, Search, ChevronRight, User, Keyboard, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { Tooltip } from './ui/Tooltip'
import { NAV_ITEMS } from './Sidebar'
import { getAvatarColorClasses } from '../lib/themes'
import { formatBindingLabel, loadKeybinds } from '../lib/keybinds'

function getFechaHoyCorta() {
  try {
    const str = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    return str.charAt(0).toUpperCase() + str.slice(1)
  } catch {
    return ''
  }
}

export function Header({
  currentView,
  onNavigate,
  onOpenMobileNav,
  onOpenPalette,
  onOpenPerfil,
  onOpenShortcutsHelp,
  onOpenNuevaAsignacion,
  avatarColor = 'accent',
  avatarUrl = null,
  userName,
  user,
  isCollapsed = false,
}) {
  const currentNav = NAV_ITEMS.find(item => item.id === currentView)
  const [keybinds, setKeybinds] = useState(() => loadKeybinds())
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null)

  useEffect(() => {
    const sync = () => setKeybinds(loadKeybinds())
    window.addEventListener('preferences-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('preferences-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const showAvatarPhoto = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl)
  const paletteLabel = formatBindingLabel(keybinds.openPalette) || '⌘K'
  const newAsigLabel = formatBindingLabel(keybinds.newAssignment) || 'N'
  const helpLabel = formatBindingLabel(keybinds.openHelp) || '?'
  const perfilLabel = formatBindingLabel(keybinds.openPerfil)

  return (
    <header
      data-app-header="true"
      className="sticky top-0 z-30 h-13 px-4 flex items-center justify-between border-b border-border bg-surface/85 backdrop-blur-md transition-colors select-none"
    >
      {/* Left: Mobile Trigger & Breadcrumb / Contextual Greeting */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-text2 hover:text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-text3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`transition-colors cursor-pointer shrink-0 font-medium ${
              currentView === 'home' ? 'text-text1' : 'hover:text-text1'
            }`}
          >
            Inicio
          </button>

          {currentView === 'home' && (
            <span className="hidden lg:inline-flex items-center gap-1.5 text-text3 font-normal truncate">
              <span className="text-border2">·</span>
              <span>{getFechaHoyCorta()}</span>
            </span>
          )}

          {currentView !== 'home' && currentNav?.section && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0 text-text3/60" />
              <span className="hidden sm:inline shrink-0 text-text3 font-normal">
                {currentNav.section}
              </span>
            </>
          )}

          {currentView !== 'home' && currentNav?.label && (
            <>
              <ChevronRight className="w-3 h-3 shrink-0 text-text3/60" />
              <span className="text-text1 font-medium truncate max-w-[140px] sm:max-w-none">
                {currentNav.label}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Search Shortcut */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden flex items-center ${
            !isCollapsed
              ? 'opacity-100 max-w-[200px] scale-100'
              : 'opacity-0 max-w-0 scale-95 pointer-events-none'
          }`}
          aria-hidden={isCollapsed}
        >
          <Tooltip content="Buscar o comandos" shortcut={paletteLabel} side="bottom" disabled={isCollapsed}>
            <button
              type="button"
              onClick={!isCollapsed ? onOpenPalette : undefined}
              tabIndex={isCollapsed ? -1 : 0}
              disabled={isCollapsed}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text2 bg-surface-alt/70 hover:bg-surface-alt border border-border transition-colors cursor-pointer whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5 text-text3 shrink-0" />
              <span className="text-text3">Buscar...</span>
              <kbd className="px-1 py-0.2 text-[10px] font-mono rounded bg-surface border border-border text-text3 shadow-2xs">
                {paletteLabel}
              </kbd>
            </button>
          </Tooltip>
        </div>

        {/* Nueva Asignación Quick CTA */}
        {onOpenNuevaAsignacion && (
          <Tooltip content="Registrar nueva participación" shortcut={newAsigLabel} side="bottom">
            <button
              type="button"
              onClick={onOpenNuevaAsignacion}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent-hover text-accent-fg shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Nueva asignación</span>
              <kbd className="hidden lg:inline-block px-1 py-0.2 text-[10px] font-mono rounded bg-accent-fg/15 text-accent-fg/90">
                {newAsigLabel}
              </kbd>
            </button>
          </Tooltip>
        )}

        {/* Keyboard Shortcuts Help */}
        <Tooltip content="Atajos de teclado" shortcut={helpLabel} side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenShortcutsHelp}
            aria-label="Atajos de teclado"
            className="hidden sm:inline-flex text-text2 hover:text-text1"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </Tooltip>

        {/* User Profile Avatar Trigger (Solo en móvil) */}
        <div className="flex md:hidden">
          <Tooltip content="Mi perfil y temas" shortcut={perfilLabel || undefined} side="bottom">
            <button
              type="button"
              onClick={() => onOpenPerfil?.('perfil')}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border text-xs font-semibold transition-all cursor-pointer overflow-hidden ${getAvatarColorClasses(avatarColor)}`}
              aria-label="Mi Perfil y Configuración"
            >
              {showAvatarPhoto ? (
                <img
                  src={avatarUrl}
                  alt={userName || user?.email || 'Avatar'}
                  onError={() => setFailedAvatarUrl(avatarUrl)}
                  className="w-full h-full object-cover"
                />
              ) : userName ? (
                userName.slice(0, 2).toUpperCase()
              ) : user?.email ? (
                user.email.slice(0, 2).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </header>
  )
}

export default Header
