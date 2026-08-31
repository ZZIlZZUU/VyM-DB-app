import { useState } from 'react'
import {
  Home,
  CalendarDays,
  LayoutGrid,
  Database,
  Users,
  FileEdit,
  CalendarRange,
  ShieldCheck,
  ArrowUpDown,
  BarChart3,
  History,
  ChevronLeft,
  Search,
  Sparkles,
} from 'lucide-react'
import { Badge } from './ui/Badge'
import { Tooltip } from './ui/Tooltip'

export const NAV_ITEMS = [
  { id: 'home',         icon: Home,          label: 'Inicio',             section: 'Vistas',       shortcut: '0' },
  { id: 'semanal',      icon: CalendarDays,  label: 'Vista semanal',      section: 'Vistas',       shortcut: 'W' },
  { id: 'editable',     icon: LayoutGrid,    label: 'Vista editable',     section: 'Vistas',       shortcut: '1' },
  { id: 'sql',          icon: Database,      label: 'Vista SQL',          section: 'Vistas',       shortcut: '2' },
  { id: 'personas',     icon: Users,         label: 'Personas',           section: 'Gestión',      shortcut: '3' },
  { id: 'registros',    icon: FileEdit,      label: 'Registros',          section: 'Gestión',      shortcut: '4' },
  { id: 'programa',     icon: CalendarRange, label: 'Programa (S-140)',   section: 'Gestión',      shortcut: '5', badgeKey: 'semanasPendientes' },
  { id: 'usuarios',     icon: ShieldCheck,   label: 'Usuarios',          section: 'Gestión',      shortcut: '6', adminOnly: true },
  { id: 'exportar',     icon: ArrowUpDown,   label: 'Exportar / Importar',section: 'Herramientas', shortcut: '7' },
  { id: 'estadisticas', icon: BarChart3,     label: 'Estadísticas',       section: 'Herramientas', shortcut: '8' },
  { id: 'historial',    icon: History,       label: 'Historial Cambios', section: 'Herramientas', shortcut: '9' },
]

export function Sidebar({
  currentView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  rol,
  rtStatus,
  semanasPendientes = 0,
  onOpenPalette,
  mobileOpen,
  onCloseMobile,
}) {
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const sections = ['Vistas', 'Gestión', 'Herramientas']

  // La barra se muestra expandida si está fijada como expandida O si el usuario está haciendo hover sobre ella
  const isExpanded = !isCollapsed || isHoverExpanded

  const handleNavClick = (viewId) => {
    onNavigate(viewId)
    onCloseMobile?.()
  }

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-surface text-text1 select-none">
      {/* Workspace / Brand Header */}
      <div className="h-13 px-3.5 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
        <button
          type="button"
          onClick={isCollapsed ? () => { onToggleCollapse(); setIsHoverExpanded(false); } : undefined}
          className={`flex items-center gap-2.5 min-w-0 overflow-hidden text-left cursor-pointer transition-transform duration-150 active:scale-95 ${
            !isExpanded ? 'justify-center w-full' : ''
          }`}
          title={isCollapsed ? 'Clic para expandir y fijar' : undefined}
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs hover:bg-emerald-500/25 transition-colors">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          {isExpanded && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs text-text1 tracking-tight truncate leading-tight">
                VyM-DB
              </span>
              <span className="text-[10px] text-text3 truncate leading-tight">
                Participantes App
              </span>
            </div>
          )}
        </button>

        {/* Desktop Collapse Toggle (solo si está fijada como expandida) */}
        {!isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex w-6 h-6 items-center justify-center rounded-md text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Colapsar barra lateral"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Search / Command Bar Trigger */}
      <div className="p-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            onOpenPalette()
          }}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text2 bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-zinc-200/50 dark:border-zinc-700/50 transition-all cursor-pointer ${
            !isExpanded ? 'justify-center px-0' : 'justify-between'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-text3 shrink-0" />
            {isExpanded && <span className="truncate">Buscar...</span>}
          </div>
          {isExpanded && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface border border-zinc-200 dark:border-zinc-700 text-text3 shadow-2xs">
              ⌘K
            </kbd>
          )}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-4">
        {sections.map(section => {
          const items = NAV_ITEMS.filter(
            item => item.section === section && (!item.adminOnly || rol === 'admin')
          )
          if (items.length === 0) return null

          return (
            <div key={section} className="space-y-0.5">
              {isExpanded && (
                <div className="px-2.5 py-1 text-[10px] font-medium text-text3 uppercase tracking-wider font-mono">
                  {section}
                </div>
              )}
              {items.map(item => {
                const Icon = item.icon
                const isActive = currentView === item.id
                const pendingCount = item.badgeKey === 'semanasPendientes' ? semanasPendientes : 0

                const navButton = (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      !isExpanded ? 'justify-center px-0 h-9' : 'justify-between h-8'
                    } ${
                      isActive
                        ? 'bg-zinc-200/90 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50 shadow-2xs'
                        : 'text-text2 hover:text-text1 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-text3 group-hover:text-text2'
                        }`}
                      />
                      {isExpanded && <span className="truncate">{item.label}</span>}
                    </div>

                    {isExpanded && pendingCount > 0 && (
                      <Badge variant="warning" size="xs" dot>
                        {pendingCount}
                      </Badge>
                    )}
                  </button>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip
                      key={item.id}
                      content={item.label}
                      shortcut={item.shortcut}
                      side="right"
                    >
                      {navButton}
                    </Tooltip>
                  )
                }

                return navButton
              })}
            </div>
          )
        })}
      </div>

      {/* Footer: Realtime Status & Subtle Info */}
      <div className="p-2.5 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
        <Tooltip
          content={`Estado de sincronización en tiempo real: ${rtStatus}`}
          disabled={isExpanded}
          side="right"
        >
          <div
            className={`flex items-center gap-2 px-2 py-1 text-[11px] text-text3 ${
              !isExpanded ? 'justify-center' : 'justify-between'
            }`}
          >
            {isExpanded && (
              <span className="font-mono text-[10px] text-text3">Sync Realtime</span>
            )}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                {rtStatus === 'conectando' || rtStatus === 'error' ? (
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    rtStatus === 'conectando' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                ) : null}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  rtStatus === 'conectado'
                    ? 'bg-emerald-500'
                    : rtStatus === 'conectando'
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`} />
              </span>
              {isExpanded && (
                <span className="text-[10px] text-text3 capitalize">
                  {rtStatus === 'conectado' ? 'Online' : rtStatus}
                </span>
              )}
            </div>
          </div>
        </Tooltip>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        onMouseEnter={() => isCollapsed && setIsHoverExpanded(true)}
        onMouseLeave={() => isCollapsed && setIsHoverExpanded(false)}
        className={`hidden md:block shrink-0 h-screen sticky top-0 border-r border-zinc-200 dark:border-zinc-800/80 transition-all duration-200 ease-in-out z-40 ${
          isCollapsed
            ? isHoverExpanded
              ? 'w-60 shadow-2xl bg-surface'
              : 'w-15'
            : 'w-60'
        }`}
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl animate-slide-left">
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
