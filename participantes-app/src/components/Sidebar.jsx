import { useState, useRef, useEffect } from 'react'
import {
  Home,
  Calendar,
  CalendarDays,
  LayoutGrid,
  Users,
  FileEdit,
  CalendarRange,
  ShieldCheck,
  Settings,
  ArrowUpDown,
  BarChart3,
  History,
  ChevronLeft,
  Search,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Sun,
  Moon,
} from 'lucide-react'
import { Badge } from './ui/Badge'
import { Tooltip } from './ui/Tooltip'

// eslint-disable-next-line react-refresh/only-export-components
export const NAV_ITEMS = [
  // ── REUNIÓN Y PROGRAMA ──
  {
    id: 'home',
    icon: Home,
    label: 'Inicio',
    section: 'Reunión y Programa',
    shortcut: '0',
    keywords: ['inicio', 'dashboard', 'resumen', 'alertas', 'panel'],
  },
  {
    id: 'programa',
    icon: CalendarRange,
    label: 'Programa Semanal',
    section: 'Reunión y Programa',
    shortcut: '5',
    keywords: ['programa', 's140', 's-140', 'epub', 'asignaciones', 'semanas', 'partes'],
    badgeKey: 'semanasPendientes',
  },
  {
    id: 'semanal',
    icon: CalendarDays,
    label: 'Vista Semanal',
    section: 'Reunión y Programa',
    shortcut: 'W',
    keywords: ['vista semanal', 'semana', 'cronograma', 'partes', 'reunion'],
  },
  {
    id: 'calendario',
    icon: Calendar,
    label: 'Calendario de Eventos',
    section: 'Reunión y Programa',
    shortcut: 'K',
    keywords: ['calendario', 'eventos', 'asambleas', 'visitas', 'fechas', 'superintendente'],
  },

  // ── PARTICIPANTES ──
  {
    id: 'editable',
    icon: LayoutGrid,
    label: 'Matriz Anual',
    section: 'Participantes',
    shortcut: '1',
    keywords: ['matriz anual', 'matriz', 'cuadricula', 'editable', '12 meses', 'mapa de calor', 'rotacion'],
  },
  {
    id: 'personas',
    icon: Users,
    label: 'Participantes',
    section: 'Participantes',
    shortcut: '3',
    keywords: ['participantes', 'personas', 'hermanos', 'directorio', 'fichas', 'claves', 'mat', 'anc', 'sm'],
  },
  {
    id: 'registros',
    icon: FileEdit,
    label: 'Historial Asignaciones',
    section: 'Participantes',
    shortcut: '4',
    keywords: ['historial asignaciones', 'registros', 'participaciones', 'historial', 'intervenciones'],
  },

  // ── GESTIÓN Y SISTEMA ──
  {
    id: 'estadisticas',
    icon: BarChart3,
    label: 'Estadísticas',
    section: 'Gestión y Sistema',
    shortcut: '8',
    keywords: ['estadisticas', 'metricas', 'graficos', 'balance', 'reportes', 'analisis'],
  },
  {
    id: 'exportar',
    icon: ArrowUpDown,
    label: 'Exportar e Importar',
    section: 'Gestión y Sistema',
    shortcut: '7',
    keywords: ['exportar', 'importar', 'respaldo', 'csv', 'json', 'descargar', 'backup'],
  },
  {
    id: 'historial',
    icon: History,
    label: 'Auditoría de Cambios',
    section: 'Gestión y Sistema',
    shortcut: '9',
    keywords: ['auditoria de cambios', 'historial cambios', 'auditoria', 'logs', 'trazabilidad', 'cambios'],
  },
  {
    id: 'usuarios',
    icon: ShieldCheck,
    label: 'Usuarios y Accesos',
    section: 'Gestión y Sistema',
    shortcut: '6',
    keywords: ['usuarios y accesos', 'usuarios', 'accesos', 'permisos', 'roles', 'lista blanca', 'admin'],
    adminOnly: true,
  },
  {
    id: 'configuracion',
    icon: Settings,
    label: 'Configuración',
    section: 'Gestión y Sistema',
    shortcut: 'C',
    keywords: ['configuracion', 'ajustes', 'preferencias', 'congregacion', 'horarios', 'dias'],
    adminOnly: true,
  },
]

export function Sidebar({
  currentView,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  rol,
  user,
  userName,
  theme,
  onToggleTheme,
  onOpenPerfil,
  rtStatus,
  semanasPendientes = 0,
  onOpenPalette,
  mobileOpen,
  onCloseMobile,
}) {
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const hoverTimeoutRef = useRef(null)
  const sections = ['Reunión y Programa', 'Participantes', 'Gestión y Sistema']

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  // En móvil o fijada como expandida o en hover-peek
  const isExpanded = mobileOpen || !isCollapsed || isHoverExpanded

  const handleMouseEnter = () => {
    if (!isCollapsed) return
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverExpanded(true)
    }, 70)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    if (!isCollapsed) return
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHoverExpanded(false)
    }, 100)
  }

  const handleNavClick = (viewId) => {
    onNavigate(viewId)
    onCloseMobile?.()
  }

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-surface text-text1 select-none overflow-hidden">
      {/* Workspace / Brand Header */}
      <div className="h-13 px-2 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
        <button
          type="button"
          onClick={isCollapsed ? () => { onToggleCollapse(); setIsHoverExpanded(false); } : undefined}
          className="flex items-center px-1.5 h-9 rounded-lg min-w-0 text-left cursor-pointer transition-colors hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 w-full"
          title={isCollapsed ? 'Clic para expandir y fijar' : undefined}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs hover:bg-emerald-500/25 transition-colors">
            <Sparkles className="w-4 h-4" />
          </div>
          <div
            className={`flex flex-col min-w-0 ml-2 transition-all duration-200 ease-out ${
              isExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
            }`}
          >
            <span className="font-semibold text-xs text-text1 tracking-tight truncate leading-tight whitespace-nowrap">
              VyM-DB
            </span>
            <span className="text-[10px] text-text3 truncate leading-tight whitespace-nowrap">
              Participantes App
            </span>
          </div>
        </button>

        {/* Desktop Collapse Toggle (solo visible en header si está fijada como expandida) */}
        {!isCollapsed && !mobileOpen && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-md text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ml-1"
            title="Colapsar barra lateral"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Search / Command Bar Trigger */}
      <div className="px-2 py-1.5 shrink-0">
        <Tooltip
          content="Buscar o comandos"
          shortcut="⌘K"
          side="right"
          disabled={isExpanded}
          wrapperClassName="w-full flex items-center"
        >
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full h-9 flex items-center px-1.5 rounded-lg text-xs text-text2 bg-zinc-100/70 hover:bg-zinc-200/70 dark:bg-zinc-800/60 dark:hover:bg-zinc-700/60 border border-zinc-200/50 dark:border-zinc-700/50 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Search className="w-3.5 h-3.5 text-text3" />
            </div>
            <div
              className={`flex items-center justify-between flex-1 min-w-0 ml-1.5 pr-1 transition-all duration-200 ease-out ${
                isExpanded
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
              }`}
            >
              <span className="truncate whitespace-nowrap text-text2 text-xs">Buscar...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface border border-zinc-200 dark:border-zinc-700 text-text3 shadow-2xs whitespace-nowrap">
                ⌘K
              </kbd>
            </div>
          </button>
        </Tooltip>
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
              <div
                className={`overflow-hidden transition-all duration-200 ease-out ${
                  isExpanded ? 'max-h-6 opacity-100 py-1' : 'max-h-0 opacity-0 py-0'
                }`}
              >
                <div className="px-2.5 text-[10px] font-medium text-text3 uppercase tracking-wider font-mono whitespace-nowrap">
                  {section}
                </div>
              </div>

              {items.map(item => {
                const Icon = item.icon
                const isActive = currentView === item.id
                const pendingCount = item.badgeKey === 'semanasPendientes' ? semanasPendientes : 0

                const navButton = (
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`group relative w-full h-9 flex items-center px-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-zinc-200/90 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50 shadow-2xs font-semibold'
                        : 'text-text2 hover:text-text1 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.75 rounded-r-full bg-emerald-600 dark:bg-emerald-400" />
                    )}
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-text3 group-hover:text-text2'
                        }`}
                      />
                    </div>
                    <div
                      className={`flex items-center justify-between flex-1 min-w-0 ml-1.5 pr-1 transition-all duration-200 ease-out ${
                        isExpanded
                          ? 'opacity-100 translate-x-0'
                          : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
                      }`}
                    >
                      <span className="truncate whitespace-nowrap text-xs font-medium">
                        {item.label}
                      </span>
                      {pendingCount > 0 && (
                        <Badge variant="warning" size="xs" dot>
                          {pendingCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                )

                return (
                  <Tooltip
                    key={item.id}
                    content={item.label}
                    shortcut={item.shortcut}
                    side="right"
                    disabled={isExpanded}
                    wrapperClassName="w-full flex items-center"
                  >
                    {navButton}
                  </Tooltip>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* User Profile Card / Trigger */}
      <div className="p-2 border-t border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
        <Tooltip
          content={`Mi perfil (${userName || 'Usuario'})`}
          side="right"
          disabled={isExpanded}
          wrapperClassName="w-full flex items-center"
        >
          <button
            type="button"
            onClick={onOpenPerfil}
            className="w-full h-10 flex items-center px-1.5 rounded-lg text-left transition-colors cursor-pointer group hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 group-hover:border-emerald-500/40 text-xs font-semibold flex items-center justify-center shrink-0 shadow-2xs">
              {userName ? userName.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div
              className={`flex items-center justify-between flex-1 min-w-0 ml-2.5 pr-1 transition-all duration-200 ease-out ${
                isExpanded
                  ? 'opacity-100 translate-x-0'
                  : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-xs text-text1 truncate leading-tight whitespace-nowrap">
                  {userName || user?.email?.split('@')[0] || 'Usuario'}
                </span>
                <span className="text-[10px] text-text3 truncate leading-tight whitespace-nowrap">
                  {user?.email || (rol === 'admin' ? 'Administrador' : 'Publicador')}
                </span>
              </div>
              {rol === 'admin' && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 uppercase">
                  Admin
                </span>
              )}
            </div>
          </button>
        </Tooltip>
      </div>

      {/* Footer: Realtime Status, Theme & Collapse/Expand Toggle */}
      <div className="p-2 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30 shrink-0">
        {isExpanded ? (
          /* Expanded Footer: Horizontal layout */
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center px-1.5 h-8 min-w-0 text-[11px] text-text3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
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
              </div>
              <div className="flex items-center justify-between flex-1 min-w-0 ml-1.5 pr-1">
                <span className="font-mono text-[10px] text-text3 truncate whitespace-nowrap">
                  Sync Realtime
                </span>
                <span className="text-[10px] text-text3 capitalize whitespace-nowrap ml-1">
                  {rtStatus === 'conectado' ? 'Online' : rtStatus}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Tooltip content={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} side="top">
                <button
                  type="button"
                  onClick={onToggleTheme}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text2 hover:text-text1 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Cambiar tema"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-600" />
                  )}
                </button>
              </Tooltip>

              {!mobileOpen && (
                <Tooltip content="Colapsar barra lateral" side="top">
                  <button
                    type="button"
                    onClick={() => {
                      onToggleCollapse()
                      setIsHoverExpanded(false)
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    aria-label="Colapsar barra lateral"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        ) : (
          /* Collapsed Footer: Clean Vertical Column */
          <div className="flex flex-col items-center gap-1.5">
            <Tooltip content={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'} side="right" wrapperClassName="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-text2 hover:text-text1 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-600" />
                )}
              </button>
            </Tooltip>

            <Tooltip
              content={`Estado de sincronización en tiempo real: ${rtStatus}`}
              side="right"
              wrapperClassName="w-full flex items-center justify-center"
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0 cursor-default">
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
              </div>
            </Tooltip>

            {!mobileOpen && (
              <Tooltip content="Fijar barra lateral" side="right" wrapperClassName="w-full flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse()
                    setIsHoverExpanded(false)
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  aria-label="Fijar barra lateral"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:block shrink-0 h-screen relative transition-[width] duration-200 ease-out ${
          isCollapsed ? 'w-15' : 'w-60'
        }`}
      >
        <aside
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`h-screen border-r border-zinc-200 dark:border-zinc-800/80 bg-surface transition-[width,box-shadow] duration-200 ease-out z-40 flex flex-col ${
            isCollapsed
              ? isHoverExpanded
                ? 'w-60 shadow-2xl absolute top-0 left-0'
                : 'w-15 absolute top-0 left-0'
              : 'w-full relative'
          }`}
        >
          {renderNavContent()}
        </aside>
      </div>

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
