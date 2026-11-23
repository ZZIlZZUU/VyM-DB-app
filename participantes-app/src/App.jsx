import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { queryClient } from './core/queryClient'
import { limpiarDatosSensiblesLogout, registrarEventoSeguridad } from './lib/seguridad'
import { useRealtimeCacheSync } from './core/realtimeSync'
import { useSemanasPendientesCount } from './core/queries/useAppQueries'
import { useEventosReunion } from './hooks/useEventosReunion'
import { useConfiguracion } from './hooks/useConfiguracion'
import { useConfirm } from './hooks/useConfirm'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useIdleLogout } from './hooks/useIdleLogout'
import { useTheme } from './hooks/useTheme'
import { useToast } from './hooks/useToast'
import Toast from './components/Toast'
import ConfirmDialog from './components/ConfirmDialog'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import BottomNavBar from './environments/mobile/shell/BottomNavBar'
import { SkeletonList } from './components/Skeleton'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { EmptyState } from './components/ui/EmptyState'
import { Dialog } from './components/ui/Dialog'
import { Button } from './components/ui/Button'
import { ShieldAlert, Clock } from 'lucide-react'

// Lazy-loaded pages (Code-Splitting por vista)
const Home              = lazy(() => import('./pages/Home'))
const VistaSemanal      = lazy(() => import('./pages/VistaSemanal'))
const VistaEditable     = lazy(() => import('./pages/VistaEditable'))
const Personas          = lazy(() => import('./pages/Personas'))
const Registros         = lazy(() => import('./pages/Registros'))
const Exportar          = lazy(() => import('./pages/Exportar'))
const Estadisticas      = lazy(() => import('./pages/Estadisticas'))
const Programa          = lazy(() => import('./pages/Programa'))
const Usuarios          = lazy(() => import('./pages/Usuarios'))
const Configuracion     = lazy(() => import('./pages/Configuracion'))
const HistorialCambios  = lazy(() => import('./pages/HistorialCambios'))
const CalendarioEventos = lazy(() =>
  import('./components/CalendarioEventos').then(m => ({ default: m.CalendarioEventos }))
)

// Lazy-loaded global overlays
const PerfilDrawer     = lazy(() => import('./components/PerfilDrawer'))
const CommandPalette   = lazy(() => import('./components/CommandPalette'))
const AyudaAtajosModal = lazy(() =>
  import('./components/AyudaAtajosModal').then(m => ({ default: m.AyudaAtajosModal }))
)

const VALID_VIEWS = [
  'home',
  'semanal',
  'calendario',
  'editable',
  'personas',
  'registros',
  'programa',
  'usuarios',
  'configuracion',
  'exportar',
  'estadisticas',
  'historial',
]

function resolveViewFromPath(pathname = window.location.pathname) {
  try {
    const p = pathname.replace(/^\//, '').split('/')[0]
    if (p === 'sql') return 'personas'
    if (VALID_VIEWS.includes(p)) return p
    const pref = localStorage.getItem('pref_vista_default')
    if (pref === 'sql') return 'personas'
    if (!p) return pref || 'home'
    return 'home'
  } catch {
    return 'home'
  }
}

export default function App() {
  const themeState = useTheme()
  const { toggle: toggleTheme, themeMeta, avatarColor } = themeState
  const { toast, showToast, success, error: toastError } = useToast()
  const [view, setView] = useState(() => resolveViewFromPath())
  const [selectedSemanaId, setSelectedSemanaId] = useState(null)
  const [selectedPersonaClave, setSelectedPersonaClave] = useState(null)
  const [selectedPersonaTab, setSelectedPersonaTab] = useState('historial')
  const [user, setUser] = useState(null)
  const [userName, setUserName] = useState('')
  const [userAvatarUrl, setUserAvatarUrl] = useState(null)
  const [rol, setRol] = useState('editor')
  const [rtStatus, setRtStatus] = useState('conectando')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [perfilTab, setPerfilTab] = useState('perfil')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [openRegistrosCreate, setOpenRegistrosCreate] = useState(false)

  const handleOpenPerfil = useCallback((tab = 'perfil') => {
    setPerfilTab(typeof tab === 'string' ? tab : 'perfil')
    setPerfilOpen(true)
  }, [])

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) return saved === 'true'
    return false
  })

  const { confirm, confirmProps } = useConfirm()
  const [configuracionInitialTab, setConfiguracionInitialTab] = useState(null)
  const [historialUserFilter, setHistorialUserFilter] = useState('ALL')

  // Caché global de eventos, configuración y conteo reactivo de semanas pendientes
  const { config } = useConfiguracion()
  const { eventos } = useEventosReunion()
  const semanasPendientes = useSemanasPendientesCount(eventos)

  const handleOpenNuevaAsignacion = useCallback(() => {
    setOpenRegistrosCreate(true)
    setMobileOpen(false)
    setView(() => {
      if (window.location.pathname !== '/registros') {
        window.history.pushState({ view: 'registros', params: null }, '', '/registros')
      }
      return 'registros'
    })
  }, [])

  const handleNavigate = useCallback((targetView, params) => {
    if (params?.semanaId) {
      setSelectedSemanaId(params.semanaId)
    }
    if (params?.personaClave) {
      setSelectedPersonaClave(params.personaClave)
      setSelectedPersonaTab(params.personaTab || 'historial')
    }
    if (params?.tab) {
      setConfiguracionInitialTab(params.tab)
    }
    if (params?.filterUserEmail !== undefined) {
      setHistorialUserFilter(params.filterUserEmail || 'ALL')
    } else if (targetView === 'historial') {
      setHistorialUserFilter('ALL')
    }

    setView(prevView => {
      const nextUrl = targetView && targetView !== 'home' ? `/${targetView}` : '/'
      if (window.location.pathname !== nextUrl) {
        window.history.pushState({ view: targetView, params: params || null }, '', nextUrl)
      }
      return targetView || prevView
    })
    setMobileOpen(false)
  }, [])

  // Sincronización con botón/gesto "Atrás" y "Adelante" del navegador (PC y Móvil)
  useEffect(() => {
    function handlePopState(event) {
      const targetView = event.state?.view || resolveViewFromPath(window.location.pathname)
      setView(targetView)
      setMobileOpen(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleExportCurrentWeekS140 = useCallback(async () => {
    try {
      showToast('Generando S-140 de la semana actual...')
      const { exportarS140SemanaActual } = await import('./lib/generarS140')
      await exportarS140SemanaActual()
      success('S-140 de la semana actual descargado')
    } catch (err) {
      console.error('[App] Error al exportar S-140:', err)
      toastError(err?.message || 'Error al exportar S-140')
    }
  }, [showToast, success, toastError])

  useKeyboardShortcuts({
    onOpenPalette: () => setPaletteOpen(true),
    onNavigate: handleNavigate,
    onOpenPerfil: handleOpenPerfil,
    onToggleTheme: toggleTheme,
    onExportS140: handleExportCurrentWeekS140,
    onOpenShortcutsHelp: () => setShortcutsModalOpen(true),
    onOpenNuevaAsignacion: handleOpenNuevaAsignacion,
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed)
  }, [isCollapsed])

  // Reactive listener for preference changes (e.g. date format)
  const [, setPrefVersion] = useState(0)
  useEffect(() => {
    function onPrefUpdate() {
      setPrefVersion(v => v + 1)
    }
    window.addEventListener('preferences-updated', onPrefUpdate)
    window.addEventListener('storage', onPrefUpdate)
    return () => {
      window.removeEventListener('preferences-updated', onPrefUpdate)
      window.removeEventListener('storage', onPrefUpdate)
    }
  }, [])

  // ESC key handler for modals/drawers
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (paletteOpen) {
          setPaletteOpen(false)
          return
        }
        if (mobileOpen) {
          setMobileOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mobileOpen, paletteOpen])

  const resolveUserAvatar = (currentUser, ua) => {
    const meta = currentUser?.user_metadata
    if (meta && 'avatar_url' in meta) {
      return meta.avatar_url || null
    }
    return ua?.avatar_url || null
  }

  const fetchUserData = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)
    if (currentUser?.email) {
      const { data: ua } = await supabase
        .from('usuarios_autorizados')
        .select('*')
        .eq('email', currentUser.email)
        .single()
      setRol(ua?.rol ?? 'editor')
      setUserName(ua?.nombre ?? '')
      setUserAvatarUrl(resolveUserAvatar(currentUser, ua))
    } else {
      setUserAvatarUrl(resolveUserAvatar(currentUser, null))
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function initUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (ignore) return
      setUser(currentUser)
      if (currentUser?.email) {
        const { data: ua } = await supabase
          .from('usuarios_autorizados')
          .select('*')
          .eq('email', currentUser.email)
          .single()
        if (ignore) return
        setRol(ua?.rol ?? 'editor')
        setUserName(ua?.nombre ?? '')
        setUserAvatarUrl(resolveUserAvatar(currentUser, ua))
      } else {
        setUserAvatarUrl(resolveUserAvatar(currentUser, null))
      }
    }
    initUser()
    return () => {
      ignore = true
    }
  }, [])

  // Único suscriptor Realtime multiplexado para toda la app
  useRealtimeCacheSync({
    onStatusChange: setRtStatus,
    onUserTableChange: fetchUserData,
  })

  const handleLogout = useCallback(
    async (options = {}) => {
      if (!options?.skipConfirm) {
        const ok = await confirm({
          title: '¿Cerrar sesión?',
          message: 'Tendrás que volver a iniciar sesión para acceder a tu cuenta.',
        })
        if (!ok) return
      }
      setMobileOpen(false)
      if (options?.reason === 'idle') {
        await registrarEventoSeguridad(supabase, { tipo: 'IDLE_LOGOUT' })
      }
      await limpiarDatosSensiblesLogout(queryClient)
      await supabase.auth.signOut()
    },
    [confirm]
  )

  const {
    warningOpen: idleWarningOpen,
    secondsLeft: idleSecondsLeft,
    staySignedIn: staySignedInFromIdle,
  } = useIdleLogout({
    enabled: Boolean(user),
    onIdleLogout: () => handleLogout({ skipConfirm: true, reason: 'idle' }),
  })

  function renderView() {
    switch (view) {
      case 'home':
        return (
          <Home
            onNavigate={handleNavigate}
            rol={rol}
            userName={userName}
            user={user}
            onOpenRegistrosCreate={() => {
              setOpenRegistrosCreate(true)
              handleNavigate('registros')
            }}
          />
        )
      case 'semanal':
        return (
          <VistaSemanal
            onNavigate={handleNavigate}
            initialSemanaId={selectedSemanaId}
          />
        )
      case 'calendario':
        return <CalendarioEventos standalone readOnly />
      case 'editable':
        return <VistaEditable onNavigate={handleNavigate} />
      case 'personas':
        return (
          <Personas
            initialPersonaClave={selectedPersonaClave}
            initialTab={selectedPersonaTab}
            onClearInitialPersona={() => {
              setSelectedPersonaClave(null)
              setSelectedPersonaTab('historial')
            }}
          />
        )
      case 'registros':
        return (
          <Registros
            initialOpenCreate={openRegistrosCreate}
            onSheetClosed={() => setOpenRegistrosCreate(false)}
          />
        )
      case 'programa':
        return <Programa />
      case 'usuarios':
        if (rol !== 'admin') {
          return (
            <div className="py-20 px-4">
              <EmptyState
                icon={ShieldAlert}
                title="Acceso restringido"
                description="El módulo de gestión de usuarios y accesos está reservado exclusivamente para cuentas con rol de Administrador."
                action={
                  <button
                    type="button"
                    onClick={() => handleNavigate('home')}
                    className="px-4 py-2 bg-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-text1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Volver al Inicio
                  </button>
                }
              />
            </div>
          )
        }
        return <Usuarios currentUser={user} currentRol={rol} />
      case 'configuracion':
        if (rol !== 'admin') {
          return (
            <div className="py-20 px-4">
              <EmptyState
                icon={ShieldAlert}
                title="Acceso restringido"
                description="El módulo de configuración de la congregación y parámetros del sistema está reservado exclusivamente para cuentas con rol de Administrador."
                action={
                  <button
                    type="button"
                    onClick={() => handleNavigate('home')}
                    className="px-4 py-2 bg-surface hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-text1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Volver al Inicio
                  </button>
                }
              />
            </div>
          )
        }
        return <Configuracion onNavigate={handleNavigate} initialTab={configuracionInitialTab} />
      case 'exportar':
        return <Exportar />
      case 'estadisticas':
        return <Estadisticas onNavigate={handleNavigate} />
      case 'historial':
        return (
          <HistorialCambios
            key={historialUserFilter}
            currentUser={user}
            initialUserEmail={historialUserFilter}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text1">
      <ConfirmDialog {...confirmProps} />
      <Dialog
        isOpen={idleWarningOpen}
        onClose={staySignedInFromIdle}
        title="¿Sigues ahí?"
        description="Por tu seguridad, esta sesión se cerrará automáticamente tras el periodo de inactividad configurado."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleLogout({ skipConfirm: true, reason: 'idle' })}
            >
              Cerrar sesión ahora
            </Button>
            <Button type="button" variant="accent" size="sm" onClick={staySignedInFromIdle}>
              Seguir conectado
            </Button>
          </div>
        }
      >
        <div className="p-3.5 rounded-xl bg-amber-bg border border-amber/25 flex items-center gap-3 text-xs text-text1">
          <Clock className="w-5 h-5 text-amber shrink-0" />
          <span>
            Tu sesión se cerrará en{' '}
            <strong className="font-mono text-sm">{idleSecondsLeft}s</strong> si no confirmas tu
            presencia.
          </span>
        </div>
      </Dialog>

      {/* Modern Collapsible Sidebar */}
      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(c => !c)}
        rol={rol}
        user={user}
        userName={userName}
        nombreCongregacion={config?.nombreCongregacion}
        rtStatus={rtStatus}
        semanasPendientes={semanasPendientes}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenPerfil={handleOpenPerfil}
        onLogout={handleLogout}
        themeMeta={themeMeta}
        avatarColor={avatarColor}
        avatarUrl={userAvatarUrl}
        onToggleTheme={toggleTheme}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Modern Top Header */}
        <Header
          currentView={view}
          onNavigate={handleNavigate}
          onOpenMobileNav={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenPerfil={() => handleOpenPerfil('perfil')}
          onOpenShortcutsHelp={() => setShortcutsModalOpen(true)}
          avatarColor={avatarColor}
          avatarUrl={userAvatarUrl}
          userName={userName}
          user={user}
          isCollapsed={isCollapsed}
        />

        {/* Scrollable Page Container */}
        <main id="app-main" className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6">
          <div key={view} className="w-full animate-view-fade">
            <ErrorBoundary title="Error al cargar la sección">
              <Suspense fallback={<SkeletonList rows={6} cols={4} />}>
                {renderView()}
              </Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Barra de Navegación Inferior Nativa (Solo Móvil < 768px) */}
      <BottomNavBar
        currentView={view}
        onNavigate={handleNavigate}
        onOpenNuevaAsignacion={handleOpenNuevaAsignacion}
        semanasPendientes={semanasPendientes}
        mobileOpen={mobileOpen}
        onOpenMobileNav={() => setMobileOpen(v => !v)}
      />

      {/* Drawers & Modals (Lazy-loaded on demand) */}
      <Suspense fallback={null}>
        {perfilOpen && (
          <PerfilDrawer
            key={perfilTab}
            open={perfilOpen}
            onClose={() => setPerfilOpen(false)}
            initialTab={perfilTab}
            user={user}
            rol={rol}
            avatarUrl={userAvatarUrl}
            config={config}
            eventos={eventos}
            onLogout={handleLogout}
            onUserUpdated={fetchUserData}
            themeState={themeState}
            isCollapsed={isCollapsed}
            onSetSidebarCollapsed={setIsCollapsed}
            onNavigate={handleNavigate}
            onOpenShortcutsHelp={() => {
              setPerfilOpen(false)
              setShortcutsModalOpen(true)
            }}
          />
        )}

        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            rol={rol}
            onNavigate={handleNavigate}
            onOpenPerfil={handleOpenPerfil}
            onLogout={handleLogout}
            themeMeta={themeMeta}
            onToggleTheme={toggleTheme}
            onExportS140={handleExportCurrentWeekS140}
          />
        )}

        {shortcutsModalOpen && (
          <AyudaAtajosModal
            isOpen={shortcutsModalOpen}
            onClose={() => setShortcutsModalOpen(false)}
            onNavigate={handleNavigate}
          />
        )}
      </Suspense>

      <Toast toast={toast} />
    </div>
  )
}
