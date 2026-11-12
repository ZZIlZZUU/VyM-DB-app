import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { supabase } from './lib/supabase'
import { useRealtimeCacheSync } from './core/realtimeSync'
import { useSemanasPendientesCount } from './core/queries/useAppQueries'
import { useEventosReunion } from './hooks/useEventosReunion'
import { useConfirm } from './hooks/useConfirm'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
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
import { ShieldAlert } from 'lucide-react'

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
  const { theme, toggle: toggleTheme } = useTheme()
  const { toast, showToast, success, error: toastError } = useToast()
  const [view, setView] = useState(() => resolveViewFromPath())
  const [selectedSemanaId, setSelectedSemanaId] = useState(null)
  const [selectedPersonaClave, setSelectedPersonaClave] = useState(null)
  const [selectedPersonaTab, setSelectedPersonaTab] = useState('historial')
  const [user, setUser] = useState(null)
  const [userName, setUserName] = useState('')
  const [rol, setRol] = useState('editor')
  const [rtStatus, setRtStatus] = useState('conectando')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)
  const [openRegistrosCreate, setOpenRegistrosCreate] = useState(false)

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) return saved === 'true'
    return false
  })

  const { confirm, confirmProps } = useConfirm()
  const [configuracionInitialTab, setConfiguracionInitialTab] = useState(null)

  // Caché global de eventos y conteo reactivo de semanas pendientes (0 queries redundantes)
  const { eventos } = useEventosReunion()
  const semanasPendientes = useSemanasPendientesCount(eventos)

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
    onOpenPerfil: () => setPerfilOpen(true),
    onToggleTheme: toggleTheme,
    onExportS140: handleExportCurrentWeekS140,
    onOpenShortcutsHelp: () => setShortcutsModalOpen(true),
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

  const fetchUserData = useCallback(async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    setUser(currentUser)
    if (currentUser?.email) {
      const { data: ua } = await supabase
        .from('usuarios_autorizados')
        .select('rol, nombre')
        .eq('email', currentUser.email)
        .single()
      setRol(ua?.rol ?? 'editor')
      setUserName(ua?.nombre ?? '')
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
          .select('rol, nombre')
          .eq('email', currentUser.email)
          .single()
        if (ignore) return
        setRol(ua?.rol ?? 'editor')
        setUserName(ua?.nombre ?? '')
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

  async function handleLogout() {
    const ok = await confirm({
      title: '¿Cerrar sesión?',
      message: 'Tendrás que volver a iniciar sesión para acceder a tu cuenta.',
    })
    if (!ok) return
    setMobileOpen(false)
    await supabase.auth.signOut()
  }

  function renderView() {
    switch (view) {
      case 'home':
        return (
          <Home
            onNavigate={handleNavigate}
            rol={rol}
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
        return <HistorialCambios />
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text1">
      <ConfirmDialog {...confirmProps} />

      {/* Modern Collapsible Sidebar */}
      <Sidebar
        currentView={view}
        onNavigate={handleNavigate}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(c => !c)}
        rol={rol}
        user={user}
        userName={userName}
        rtStatus={rtStatus}
        semanasPendientes={semanasPendientes}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenPerfil={() => setPerfilOpen(true)}
        theme={theme}
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
          onOpenPerfil={() => setPerfilOpen(true)}
          onOpenShortcutsHelp={() => setShortcutsModalOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}
          userName={userName}
          user={user}
          isCollapsed={isCollapsed}
        />

        {/* Scrollable Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 md:pb-6">
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
        semanasPendientes={semanasPendientes}
        mobileOpen={mobileOpen}
        onOpenMobileNav={() => setMobileOpen(v => !v)}
      />

      {/* Drawers & Modals (Lazy-loaded on demand) */}
      <Suspense fallback={null}>
        {perfilOpen && (
          <PerfilDrawer
            open={perfilOpen}
            onClose={() => setPerfilOpen(false)}
            user={user}
            rol={rol}
            onLogout={handleLogout}
            onUserUpdated={fetchUserData}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        )}

        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            rol={rol}
            onNavigate={handleNavigate}
            onOpenPerfil={() => setPerfilOpen(true)}
            onLogout={handleLogout}
            theme={theme}
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
