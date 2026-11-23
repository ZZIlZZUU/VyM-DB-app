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
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Palette,
  ClipboardList,
  Shield,
  LogOut,
  Contrast,
  ChevronUp,
} from 'lucide-react'
import { Badge } from './ui/Badge'
import { Tooltip } from './ui/Tooltip'
import { prefetchView } from '../core/prefetch'
import { getAvatarColorClasses } from '../lib/themes'
import {
  formatBindingLabel,
  loadKeybinds,
  normalizeKeyToken,
  parseSequenceBinding,
} from '../lib/keybinds'

function isTypingTarget() {
  const active = document.activeElement
  if (!active) return false
  const tag = active.tagName?.toLowerCase()
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    active.isContentEditable
  )
}

function getNavShortcutLabel(keybinds, itemId) {
  const binding = keybinds?.[`nav_${itemId}`]
  if (!binding) return ''
  const seq = parseSequenceBinding(binding)
  if (seq) return `${seq.leader}+${seq.key}`
  return formatBindingLabel(binding)
}

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
  nombreCongregacion,
  themeMeta,
  avatarColor = 'accent',
  avatarUrl = null,
  onToggleTheme,
  onOpenPerfil,
  onLogout,
  rtStatus,
  semanasPendientes = 0,
  onOpenPalette,
  mobileOpen,
  onCloseMobile,
}) {
  const [isHoverExpanded, setIsHoverExpanded] = useState(false)
  const [isGHeld, setIsGHeld] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [keybinds, setKeybinds] = useState(() => loadKeybinds())
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null)
  const hoverTimeoutRef = useRef(null)
  const profileMenuRef = useRef(null)
  const sections = ['Reunión y Programa', 'Participantes', 'Gestión y Sistema']

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
  const paletteShortcutLabel = formatBindingLabel(keybinds.openPalette) || '⌘K'

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!popoverOpen) return undefined
    function handleOutsideClick(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setPopoverOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [popoverOpen])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.defaultPrevented || e.repeat) return
      if (document.body?.dataset?.recordingKeybind === 'true') return
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (isTypingTarget()) return
      if (normalizeKeyToken(e.key) === 'G') {
        setIsGHeld(true)
      }
    }

    function handleKeyUp(e) {
      if (normalizeKeyToken(e.key) === 'G') {
        setIsGHeld(false)
      }
    }

    function resetHeld() {
      setIsGHeld(false)
    }

    function handleVisibilityChange() {
      if (document.hidden) setIsGHeld(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', resetHeld)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', resetHeld)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
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
    setPopoverOpen(false)
    onNavigate(viewId)
    onCloseMobile?.()
  }

  const handleOpenProfileSection = (sectionId) => {
    setPopoverOpen(false)
    onOpenPerfil?.(sectionId)
    onCloseMobile?.()
  }

  const avatarClasses = getAvatarColorClasses(avatarColor)
  const displayUserName = userName || user?.email?.split('@')[0] || 'Usuario'
  const userInitials = userName
    ? userName.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : null

  const renderNavContent = () => (
    <div className="flex flex-col h-full bg-surface text-text1 select-none">
      {/* Workspace / Brand Header */}
      <div className="h-13 px-2 flex items-center justify-between border-b border-border shrink-0">
        <button
          type="button"
          onClick={isCollapsed ? () => { onToggleCollapse(); setIsHoverExpanded(false); } : undefined}
          className="flex items-center px-1.5 h-9 rounded-lg min-w-0 text-left cursor-pointer transition-colors hover:bg-surface-alt/60 w-full"
          title={isCollapsed ? 'Clic para expandir y fijar' : undefined}
        >
          <div className="w-8 h-8 rounded-lg bg-accent-muted-bg text-accent border border-accent-muted-border flex items-center justify-center font-display font-semibold text-xs shrink-0 shadow-2xs">
            VyM
          </div>
          <div
            className={`flex flex-col min-w-0 ml-2 transition-all duration-200 ease-out ${
              isExpanded
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-2 pointer-events-none w-0 overflow-hidden'
            }`}
          >
            <span className="font-semibold text-xs text-text1 tracking-tight truncate leading-tight whitespace-nowrap">
              {nombreCongregacion || 'VyM-DB'}
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
            className="hidden md:flex w-7 h-7 items-center justify-center rounded-md text-text3 hover:text-text1 hover:bg-surface-alt transition-colors cursor-pointer shrink-0 ml-1"
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
          shortcut={paletteShortcutLabel}
          side="right"
          disabled={isExpanded}
          wrapperClassName="w-full flex items-center"
        >
          <button
            type="button"
            onClick={onOpenPalette}
            onMouseEnter={() => prefetchView('palette')}
            onFocus={() => prefetchView('palette')}
            className="w-full h-9 flex items-center px-1.5 rounded-lg text-xs text-text2 bg-surface-alt/70 hover:bg-surface-alt border border-border transition-all cursor-pointer"
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
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface border border-border text-text3 shadow-2xs whitespace-nowrap">
                {paletteShortcutLabel}
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
                const shortcutLabel = getNavShortcutLabel(keybinds, item.id)

                const navButton = (
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    onMouseEnter={() => prefetchView(item.id)}
                    onFocus={() => prefetchView(item.id)}
                    className={`group relative w-full h-9 flex items-center px-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-accent-muted-bg text-text1 shadow-2xs font-semibold'
                        : 'text-text2 hover:text-text1 hover:bg-surface-alt/60'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.75 rounded-r-full bg-accent" />
                    )}
                    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive
                            ? 'text-accent'
                            : 'text-text3 group-hover:text-text2'
                        }`}
                      />
                      {!isExpanded && isGHeld && shortcutLabel && (
                        <span className="absolute -bottom-1 -right-1 px-1 py-0.5 text-[9px] leading-none font-mono font-semibold rounded-full bg-accent text-accent-fg shadow-sm border border-surface pointer-events-none">
                          {shortcutLabel}
                        </span>
                      )}
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
                      <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                        {pendingCount > 0 && (
                          <Badge variant="warning" size="xs" dot>
                            {pendingCount}
                          </Badge>
                        )}
                        {shortcutLabel && (
                          <kbd
                            className={`px-1.5 py-0.5 text-[10px] font-mono font-medium leading-none rounded-full border shadow-2xs whitespace-nowrap transition-all duration-150 ${
                              isGHeld
                                ? 'opacity-100 scale-100 bg-accent-muted-bg border-accent-muted-border text-accent'
                                : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 bg-surface border-border text-text3'
                            }`}
                          >
                            {shortcutLabel}
                          </kbd>
                        )}
                      </div>
                    </div>
                  </button>
                )

                return (
                  <Tooltip
                    key={item.id}
                    content={item.label}
                    shortcut={shortcutLabel || item.shortcut}
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

      {/* User Profile Card / Quick Popover Trigger */}
      <div ref={profileMenuRef} className="relative p-2 border-t border-border shrink-0">
        {popoverOpen && (
          <div
            role="menu"
            aria-label="Menú rápido de usuario"
            className={`absolute z-50 bg-surface border border-border2 rounded-xl shadow-2xl p-1.5 animate-scale-in ${
              isExpanded
                ? 'bottom-full left-2 right-2 mb-2'
                : 'left-full bottom-2 ml-2 w-60'
            }`}
          >
            <div className="px-2.5 py-2 border-b border-border mb-1">
              <div className="text-xs font-semibold text-text1 truncate">
                {displayUserName}
              </div>
              {user?.email && (
                <div className="text-[10px] font-mono text-text3 truncate">
                  {user.email}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-accent-muted-bg text-accent border border-accent-muted-border uppercase">
                  {rol === 'admin' ? 'Admin' : 'Editor'}
                </span>
                {themeMeta?.fullLabel && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-surface-alt text-text2 border border-border">
                    {themeMeta.fullLabel}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleOpenProfileSection('perfil')}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-text3" />
                Mi Perfil
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleOpenProfileSection('apariencia')}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-accent" />
                Apariencia y Temas
              </span>
              <span className="text-[10px] font-mono text-accent">6 estilos</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleOpenProfileSection('asignaciones')}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-text3" />
                Mis Asignaciones
              </span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => handleOpenProfileSection('seguridad')}
              className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-text3" />
                Seguridad y Acceso
              </span>
            </button>

            {onToggleTheme && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleTheme()
                    setPopoverOpen(false)
                  }}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Contrast className="w-3.5 h-3.5 text-text3" />
                    {themeMeta?.mode === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                  </span>
                </button>
              </>
            )}

            {onLogout && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPopoverOpen(false)
                    onCloseMobile?.()
                    onLogout()
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-danger hover:bg-danger-bg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        )}

        <Tooltip
          content={`Mi perfil (${displayUserName})`}
          side="right"
          disabled={isExpanded || popoverOpen}
          wrapperClassName="w-full flex items-center"
        >
          <button
            type="button"
            onClick={() => setPopoverOpen(prev => !prev)}
            onMouseEnter={() => prefetchView('perfil')}
            onFocus={() => prefetchView('perfil')}
            aria-expanded={popoverOpen}
            aria-haspopup="menu"
            className={`w-full h-10 flex items-center px-1.5 rounded-lg text-left transition-colors cursor-pointer group ${
              popoverOpen ? 'bg-surface-alt' : 'hover:bg-surface-alt/70'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg border text-xs font-semibold flex items-center justify-center shrink-0 shadow-2xs overflow-hidden ${avatarClasses}`}>
              {showAvatarPhoto ? (
                <img
                  src={avatarUrl}
                  alt={displayUserName}
                  onError={() => setFailedAvatarUrl(avatarUrl)}
                  className="w-full h-full object-cover"
                />
              ) : (
                userInitials || <User className="w-4 h-4" />
              )}
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
                  {displayUserName}
                </span>
                <span className="text-[10px] text-text3 truncate leading-tight whitespace-nowrap">
                  {user?.email || (rol === 'admin' ? 'Administrador' : 'Publicador')}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {rol === 'admin' && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-medium rounded bg-accent-muted-bg text-accent border border-accent-muted-border uppercase">
                    Admin
                  </span>
                )}
                <ChevronUp
                  className={`w-3.5 h-3.5 text-text3 transition-transform duration-150 ${
                    popoverOpen ? 'rotate-180 text-text1' : ''
                  }`}
                />
              </div>
            </div>
          </button>
        </Tooltip>
      </div>

      {/* Footer: Realtime Status & Collapse/Expand Toggle (sin toggle de tema redundante) */}
      <div className="p-2 border-t border-border bg-surface-alt/40 shrink-0">
        {isExpanded ? (
          /* Expanded Footer: Horizontal layout */
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center px-1.5 h-8 min-w-0 text-[11px] text-text3">
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                <span className="relative flex h-2 w-2">
                  {rtStatus === 'conectando' || rtStatus === 'error' ? (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      rtStatus === 'conectando' ? 'bg-amber' : 'bg-danger'
                    }`} />
                  ) : null}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    rtStatus === 'conectado'
                      ? 'bg-accent'
                      : rtStatus === 'conectando'
                      ? 'bg-amber'
                      : 'bg-danger'
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

            {!mobileOpen && (
              <Tooltip content="Colapsar barra lateral" side="top">
                <button
                  type="button"
                  onClick={() => {
                    onToggleCollapse()
                    setIsHoverExpanded(false)
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-surface-alt transition-colors cursor-pointer shrink-0"
                  aria-label="Colapsar barra lateral"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </Tooltip>
            )}
          </div>
        ) : (
          /* Collapsed Footer: Clean Vertical Column */
          <div className="flex flex-col items-center gap-1.5">
            <Tooltip
              content={`Estado de sincronización en tiempo real: ${rtStatus}`}
              side="right"
              wrapperClassName="w-full flex items-center justify-center"
            >
              <div className="w-8 h-8 flex items-center justify-center shrink-0 cursor-default">
                <span className="relative flex h-2 w-2">
                  {rtStatus === 'conectando' || rtStatus === 'error' ? (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      rtStatus === 'conectando' ? 'bg-amber' : 'bg-danger'
                    }`} />
                  ) : null}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    rtStatus === 'conectado'
                      ? 'bg-accent'
                      : rtStatus === 'conectando'
                      ? 'bg-amber'
                      : 'bg-danger'
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
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
          data-app-sidebar="true"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`h-screen border-r border-border bg-surface transition-[width,box-shadow] duration-200 ease-out z-40 flex flex-col ${
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
          <div
            data-app-sidebar="true"
            className="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl animate-slide-left"
          >
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
