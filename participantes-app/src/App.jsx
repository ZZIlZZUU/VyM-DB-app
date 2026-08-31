import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useConfirm } from './hooks/useConfirm'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useTheme } from './hooks/useTheme'
import ConfirmDialog from './components/ConfirmDialog'
import PerfilDrawer from './components/PerfilDrawer'
import CommandPalette from './components/CommandPalette'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Home from './pages/Home'
import VistaSemanal from './pages/VistaSemanal'
import VistaEditable from './pages/VistaEditable'
import VistaSql from './pages/VistaSql'
import Personas from './pages/Personas'
import Registros from './pages/Registros'
import Exportar from './pages/Exportar'
import Estadisticas from './pages/Estadisticas'
import Programa from './pages/Programa'
import Usuarios from './pages/Usuarios'
import HistorialCambios from './pages/HistorialCambios'

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const [view, setView] = useState('home')
  const [selectedSemanaId, setSelectedSemanaId] = useState(null)
  const [user, setUser] = useState(null)
  const [userName, setUserName] = useState('')
  const [rol, setRol] = useState('editor')
  const [rtStatus, setRtStatus] = useState('conectando')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [perfilOpen, setPerfilOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [semanasPendientes, setSemanasPendientes] = useState(0)
  const [openRegistrosCreate, setOpenRegistrosCreate] = useState(false)

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) return saved === 'true'
    return false
  })

  const { confirm, confirmProps } = useConfirm()

  const handleNavigate = useCallback((targetView, params) => {
    if (params?.semanaId) {
      setSelectedSemanaId(params.semanaId)
    }
    setView(targetView)
    setMobileOpen(false)
  }, [])

  useKeyboardShortcuts({
    onOpenPalette: () => setPaletteOpen(true),
    onNavigate: handleNavigate,
    onOpenPerfil: () => setPerfilOpen(true),
  })

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isCollapsed)
  }, [isCollapsed])

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

  const fetchSemanasPendientes = useCallback(async () => {
    try {
      const [{ data: sem }, { data: par }, { data: asi }, { data: his }] = await Promise.all([
        supabase.from('programa_semanas').select('id'),
        supabase.from('programa_partes').select('id, semana_id, tipo_asignacion, requiere_ayudante'),
        supabase.from('programa_asignaciones').select('parte_id, rol, confirmado, participacion_id, clave'),
        supabase.from('participaciones').select('id, clave'),
      ])

      if (!sem || sem.length === 0) {
        setSemanasPendientes(0)
        return
      }

      const partes = par || []
      const asignaciones = asi || []
      const historial = his || []

      const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']
      let pendientes = 0

      for (const s of sem) {
        const partesSemana = partes.filter(
          p => p.semana_id === s.id && !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion)
        )
        const totalPartes = partesSemana.length
        if (totalPartes === 0) continue

        const confirmadas = partesSemana.filter(p => {
          const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
          const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')
          if (!asigP?.clave || !asigP.confirmado) return false

          const pr = asigP.participacion_id ? historial.find(h => h.id === asigP.participacion_id) : null
          const ar = asigA?.participacion_id ? historial.find(h => h.id === asigA.participacion_id) : null
          const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
          const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
          const aNuevo = p.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
          const aRem = p.requiere_ayudante && !asigA?.clave && ar
          const necesitaRec = pCambio || aCambio || aNuevo || aRem

          return !necesitaRec
        }).length

        if (confirmadas < totalPartes) {
          pendientes++
        }
      }

      setSemanasPendientes(pendientes)
    } catch (err) {
      console.error('Error fetching pending weeks:', err)
    }
  }, [])

  useEffect(() => {
    fetchUserData()
    fetchSemanasPendientes()
  }, [fetchUserData, fetchSemanasPendientes])

  // Realtime para sincronizar nombre y rol si cambian en usuarios_autorizados
  useEffect(() => {
    const canal = supabase
      .channel('app-user-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios_autorizados' },
        () => fetchUserData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [fetchUserData])

  // Realtime para actualizar contador de semanas pendientes
  useEffect(() => {
    const canal = supabase
      .channel('asignaciones-badge-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_semanas' }, () =>
        fetchSemanasPendientes()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_partes' }, () =>
        fetchSemanasPendientes()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_asignaciones' }, () =>
        fetchSemanasPendientes()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [fetchSemanasPendientes])

  // Realtime connection status
  useEffect(() => {
    const channel = supabase.channel('__status__').subscribe(status => {
      if (status === 'SUBSCRIBED') setRtStatus('conectado')
      if (status === 'CHANNEL_ERROR') setRtStatus('error')
      if (status === 'TIMED_OUT') setRtStatus('desconectado')
      if (status === 'CLOSED') setRtStatus('desconectado')
    })
    return () => supabase.removeChannel(channel)
  }, [])

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
            onOpenRegistrosCreate={() => {
              setOpenRegistrosCreate(true)
              setView('registros')
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
      case 'editable':
        return <VistaEditable onNavigate={handleNavigate} />
      case 'sql':
        return <VistaSql />
      case 'personas':
        return <Personas />
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
        return <Usuarios currentUser={user} currentRol={rol} />
      case 'exportar':
        return <Exportar />
      case 'estadisticas':
        return <Estadisticas />
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
          theme={theme}
          onToggleTheme={toggleTheme}
          userName={userName}
          user={user}
        />

        {/* Scrollable Page Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div key={view} className="w-full animate-view-fade">
            {renderView()}
          </div>
        </main>
      </div>

      {/* Drawers & Modals */}
      <PerfilDrawer
        open={perfilOpen}
        onClose={() => setPerfilOpen(false)}
        user={user}
        rol={rol}
        onLogout={handleLogout}
        onUserUpdated={fetchUserData}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        rol={rol}
        onNavigate={handleNavigate}
        onOpenPerfil={() => setPerfilOpen(true)}
        onLogout={handleLogout}
      />
    </div>
  )
}