import { Menu, Search, Sun, Moon, Sparkles, ChevronRight, User } from 'lucide-react'
import { Button } from './ui/Button'
import { Tooltip } from './ui/Tooltip'
import { NAV_ITEMS } from './Sidebar'

export function Header({
  currentView,
  onNavigate,
  onOpenMobileNav,
  onOpenPalette,
  onOpenPerfil,
  theme,
  onToggleTheme,
  userName,
  user,
}) {
  const currentNav = NAV_ITEMS.find(item => item.id === currentView)

  return (
    <header className="sticky top-0 z-30 h-13 px-4 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-surface/80 backdrop-blur-md transition-colors select-none">
      {/* Left: Mobile Trigger & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-text2 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
        <Tooltip content="Buscar o comandos" shortcut="Ctrl+K" side="bottom">
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text2 bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-zinc-200/60 dark:border-zinc-700/60 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-text3" />
            <span className="text-text3">Buscar...</span>
            <kbd className="px-1 py-0.2 text-[10px] font-mono rounded bg-surface border border-zinc-200 dark:border-zinc-700 text-text3 shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </Tooltip>

        {/* Theme Toggle Button */}
        <Tooltip content={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} side="bottom">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label="Cambiar tema"
            className="text-text2 hover:text-text1"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-600" />
            )}
          </Button>
        </Tooltip>

        {/* User Profile Avatar Trigger */}
        <Tooltip content="Mi perfil" side="bottom">
          <button
            type="button"
            onClick={onOpenPerfil}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 hover:border-emerald-500/40 text-xs font-semibold transition-all cursor-pointer"
            aria-label="Mi Perfil"
          >
            {userName ? userName.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
          </button>
        </Tooltip>
      </div>
    </header>
  )
}

export default Header
