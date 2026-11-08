import {
  Home,
  FileSpreadsheet,
  TableProperties,
  Users,
  MoreHorizontal,
} from 'lucide-react'

const PRIMARY_VIEWS = new Set(['home', 'programa', 'editable', 'personas'])

export function BottomNavBar({
  currentView,
  onNavigate,
  semanasPendientes = 0,
  mobileOpen = false,
  onOpenMobileNav,
}) {
  const isMoreActive = mobileOpen || (currentView && !PRIMARY_VIEWS.has(currentView))

  const tabs = [
    {
      id: 'home',
      label: 'Inicio',
      icon: Home,
      active: currentView === 'home' && !mobileOpen,
      onClick: () => onNavigate('home'),
    },
    {
      id: 'programa',
      label: 'Programa',
      icon: FileSpreadsheet,
      badge: semanasPendientes > 0 ? semanasPendientes : null,
      active: currentView === 'programa' && !mobileOpen,
      onClick: () => onNavigate('programa'),
    },
    {
      id: 'editable',
      label: 'Matriz',
      icon: TableProperties,
      active: currentView === 'editable' && !mobileOpen,
      onClick: () => onNavigate('editable'),
    },
    {
      id: 'personas',
      label: 'Personas',
      icon: Users,
      active: currentView === 'personas' && !mobileOpen,
      onClick: () => onNavigate('personas'),
    },
    {
      id: 'more',
      label: 'Más',
      icon: MoreHorizontal,
      active: isMoreActive,
      onClick: () => onOpenMobileNav?.(),
    },
  ]

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-5 h-15 px-1">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-xl transition-colors cursor-pointer select-none ${
                tab.active
                  ? 'text-accent font-semibold'
                  : 'text-text2 hover:text-text1 active:scale-95'
              }`}
            >
              {tab.active && (
                <span className="absolute top-0 inset-x-5 h-0.5 rounded-b-full bg-accent" />
              )}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    tab.active ? 'scale-105 stroke-[2.25]' : 'stroke-[1.75]'
                  }`}
                />
                {tab.badge != null && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-tight">
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavBar
