import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './lib/supabase'
import { useConfirm } from './hooks/useConfirm'
import ConfirmDialog from './components/ConfirmDialog'
import Breadcrumb from './components/Breadcrumb'
import PerfilDrawer from './components/PerfilDrawer'
import VistaEditable  from './pages/VistaEditable'
import VistaSql       from './pages/VistaSql'
import Personas       from './pages/Personas'
import Registros      from './pages/Registros'
import Exportar       from './pages/Exportar'
import Estadisticas   from './pages/Estadisticas'
import Programa       from './pages/Programa'
import Usuarios       from './pages/Usuarios'
import HistorialCambios from './pages/HistorialCambios'

const NAV = [
  { id: 'editable',     icon: '⊞', label: 'Vista editable',     section: 'Vistas' },
  { id: 'sql',          icon: '≡', label: 'Vista SQL',           section: 'Vistas' },
  { id: 'personas',     icon: '👤', label: 'Personas',            section: 'Gestión' },
  { id: 'registros',    icon: '✎', label: 'Registros',           section: 'Gestión' },
  { id: 'programa',     icon: '📋', label: 'Programa (S-140)',    section: 'Gestión' },
  { id: 'usuarios',     icon: '🔑', label: 'Usuarios',           section: 'Gestión', adminOnly: true },
  { id: 'exportar',     icon: '↑', label: 'Exportar / Importar', section: 'Herramientas' },
  { id: 'estadisticas', icon: '◈', label: 'Estadísticas',        section: 'Herramientas' },
  { id: 'historial',    icon: '📜', label: 'Historial Cambios',  section: 'Herramientas' },
]

const TOPBAR_SUB = {
  editable:     'Tabla cruzada participante × mes',
  sql:          'Formato relacional — participantes y participaciones',
  personas:     'Agregar, modificar o deshabilitar participantes',
  registros:    'Agregar, modificar o eliminar participaciones',
  exportar:     'CSV · SQL · JSON — compatible con Supabase / PostgreSQL',
  estadisticas: 'Resumen de participaciones por tipo y mes',
  programa:     'Importar EPUB mwb · Asignar roles · Generar S-140',
  usuarios:     'Gestión de acceso a la aplicación',
  historial:    'Registro de auditoría de cambios en la base de datos',
}

const RT_CONFIG = {
  conectado:    { color: 'bg-accent',  pulse: false, label: 'Conectado :)' },
  conectando:   { color: 'bg-amber',   pulse: true,  label: 'Conectando…' },
  desconectado: { color: 'bg-danger',  pulse: false, label: 'Sin conexión' },
  error:        { color: 'bg-danger',  pulse: true,  label: 'Error RT' },
}

function getInitials(nombre, email) {
  const str = typeof nombre === 'string' ? nombre.trim() : ''
  if (str) {
    return str.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }
  return (email || 'U').slice(0, 2).toUpperCase()
}

export default function App() {
  const [view, setView]                   = useState('editable')
  const [user, setUser]                   = useState(null)
  const [userName, setUserName]           = useState('')
  const [rol, setRol]                     = useState('editor')
  const [rtStatus, setRtStatus]           = useState('conectando')
  const [stats, setStats]                 = useState({ personas: 0, registros: 0, mesActual: 0, mes: '' })
  const [mobileOpen, setMobileOpen]       = useState(false)
  const [perfilOpen, setPerfilOpen]       = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [anioEnCurso, setAnioEnCurso]     = useState('2026')
  const [semanasPendientes, setSemanasPendientes] = useState(0)
  const mainScrollRef                     = useRef(null)
  const lastScrollY                       = useRef(0)

  const [open, setOpen]         = useState(() => {
    const saved = localStorage.getItem('sidebarOpen')
    if (saved !== null) return saved === 'true'
    return window.innerWidth >= 768
  })
  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    localStorage.setItem('sidebarOpen', open)
  }, [open])

  // ESC cierra el drawer móvil si está abierto
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mobileOpen])

  // Resize limpia el drawer si la ventana pasa a desktop (>= 768px)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) {
        setMobileOpen(false)
        setHeaderVisible(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-hide header en scroll (solo en móvil < 768px)
  useEffect(() => {
    const el = mainScrollRef.current
    if (!el) return

    function handleScroll() {
      if (window.innerWidth >= 768) {
        setHeaderVisible(true)
        return
      }

      const currentScrollY = el.scrollTop
      const diff = currentScrollY - lastScrollY.current

      if (currentScrollY <= 15) {
        setHeaderVisible(true)
        lastScrollY.current = currentScrollY
        return
      }

      if (Math.abs(diff) > 8) {
        if (diff > 0) {
          setHeaderVisible(false)
        } else {
          setHeaderVisible(true)
        }
        lastScrollY.current = currentScrollY
      }
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchUserData = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
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

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('configuracion')
        .select('clave, valor')
      if (data) {
        const anio = data.find(c => c.clave === 'anio_en_curso')?.valor
        if (anio) setAnioEnCurso(anio)
      }
    } catch (err) {
      console.error('Error fetching config:', err)
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
        const partesSemana = partes.filter(p => p.semana_id === s.id && !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
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
          const aNuevo  = p.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
          const aRem    = p.requiere_ayudante && !asigA?.clave && ar
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
    fetchStats()
    fetchConfig()
    fetchSemanasPendientes()
  }, [fetchUserData, fetchConfig, fetchSemanasPendientes])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_semanas' },     () => fetchSemanasPendientes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_partes' },      () => fetchSemanasPendientes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_asignaciones' },() => fetchSemanasPendientes())
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [fetchSemanasPendientes])

  useEffect(() => {
    const channel = supabase.channel('__status__')
      .subscribe((status) => {
        if (status === 'SUBSCRIBED')    setRtStatus('conectado')
        if (status === 'CHANNEL_ERROR') setRtStatus('error')
        if (status === 'TIMED_OUT')     setRtStatus('desconectado')
        if (status === 'CLOSED')        setRtStatus('desconectado')
      })
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchStats() {
    const mes = new Date().toLocaleString('es-MX', { month: 'long' })
    const mesCapital = mes.charAt(0).toUpperCase() + mes.slice(1)
    const [{ count: personas }, { count: registros }, { count: mesActual }] = await Promise.all([
      supabase.from('personas').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('participaciones').select('*', { count: 'exact', head: true }),
      supabase.from('participaciones').select('*', { count: 'exact', head: true }).eq('mes', mesCapital),
    ])
    setStats({ personas: personas || 0, registros: registros || 0, mesActual: mesActual || 0, mes: mesCapital })
  }

  async function handleLogout() {
    const ok = await confirm({
      title:   '¿Cerrar sesión?',
      message: 'Tendrás que volver a iniciar sesión para acceder.',
    })
    if (!ok) return
    setMobileOpen(false)
    await supabase.auth.signOut()
  }

  const sections = [...new Set(NAV.map(n => n.section))]

  function renderView() {
    switch (view) {
      case 'editable':     return <VistaEditable />
      case 'sql':          return <VistaSql />
      case 'personas':     return <Personas />
      case 'registros':    return <Registros />
      case 'programa':     return <Programa />
      case 'usuarios':     return <Usuarios currentUser={user} currentRol={rol} />
      case 'exportar':     return <Exportar />
      case 'estadisticas': return <Estadisticas />
      case 'historial':    return <HistorialCambios />
      default: return null
    }
  }

  const rtCfg = RT_CONFIG[rtStatus] || RT_CONFIG.conectando

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <ConfirmDialog {...confirmProps} />

      {/* Backdrop overlay para móvil */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden animate-fade-in"
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 h-full bg-surface border-r border-border flex flex-col transition-all duration-300 ease-in-out overflow-hidden shadow-2xl md:shadow-none
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:sticky md:top-0 md:h-screen md:flex-shrink-0
          ${open ? 'w-64 md:w-56' : 'w-64 md:w-14'}
        `}
      >

        {/* Header */}
        <div className={`border-b border-border flex items-center ${open ? 'px-5 py-4 gap-0 justify-between' : 'px-4 py-4 justify-between md:px-0 md:justify-center'}`}>
          <div className={`${open ? 'block' : 'block md:hidden'}`}>
            <div className="font-mono text-xs text-text3 tracking-widest uppercase mb-1">Base de datos</div>
            <div className="text-sm font-medium text-text1 leading-tight">Participantes<br />{anioEnCurso}</div>
            <div className="font-mono text-xs text-accent mt-1">AÑO EN CURSO</div>
          </div>
          <div className="flex items-center gap-1">
            {/* Botón cerrar en móvil */}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded text-text3 hover:text-text1 hover:bg-bg"
              title="Cerrar menú"
            >
              ✕
            </button>
            {/* Botón colapsar en desktop */}
            <button
              onClick={() => setOpen(o => !o)}
              title={open ? 'Colapsar sidebar' : 'Expandir sidebar'}
              className="hidden md:flex w-7 h-7 items-center justify-center rounded text-text3 hover:text-text1 hover:bg-bg flex-shrink-0"
            >
              {open ? '←' : '→'}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {sections.map(section => (
            <div key={section}>
              <div className={`font-mono text-xs text-text3 tracking-widest uppercase px-5 pt-3 pb-1 ${open ? 'block' : 'block md:hidden'}`}>
                {section}
              </div>
              {!open && <div className="hidden md:block pt-3" />}
              {NAV.filter(item => !item.adminOnly || rol === 'admin').filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setView(item.id)
                    setMobileOpen(false)
                  }}
                  title={!open ? item.label : undefined}
                  className={`w-full flex items-center py-2.5 md:py-2 text-left text-xs border-l-2 relative
                    ${open ? 'px-5 gap-2.5' : 'px-5 gap-2.5 md:px-0 md:gap-0 md:justify-center'}
                    ${view === item.id
                      ? 'text-accent border-accent bg-accent-bg font-medium'
                      : 'text-text2 border-transparent hover:bg-bg hover:text-text1'}`}
                >
                  <span className="w-4 text-center flex-shrink-0 text-sm md:text-xs">{item.icon}</span>
                  <span className={`truncate flex-1 ${open ? 'block' : 'block md:hidden'}`}>{item.label}</span>
                  {item.id === 'programa' && semanasPendientes > 0 && (
                    open ? (
                      <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                        {semanasPendientes}
                      </span>
                    ) : (
                      <>
                        <span className="md:hidden bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                          {semanasPendientes}
                        </span>
                        <span className="hidden md:block w-2 h-2 bg-danger rounded-full absolute top-1.5 right-1.5 animate-pulse" />
                      </>
                    )
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Stats — visible siempre en móvil o si está expandido en desktop */}
        {(open || mobileOpen) && (
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <div className="font-mono text-xs text-text3 tracking-widest uppercase mb-2">Resumen</div>
            {[
              { label: 'Personas activas', val: stats.personas },
              { label: 'Registros total',  val: stats.registros },
              { label: stats.mes || 'Este mes', val: stats.mesActual, accent: true },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center py-0.5">
                <span className="text-xs text-text2">{s.label}</span>
                <span className={`font-mono text-xs font-medium ${s.accent ? 'text-accent' : 'text-text1'}`}>
                  {s.val}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className={`border-t border-border flex-shrink-0 ${open || mobileOpen ? 'px-4 py-3' : 'px-0 py-3 flex flex-col items-center gap-2'}`}>
          {open || mobileOpen ? (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setPerfilOpen(true)}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left p-1 rounded-lg hover:bg-bg transition-colors group"
                title="Abrir mi perfil"
              >
                <div className="w-8 h-8 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-xs border border-accent/20 flex-shrink-0">
                  {getInitials(userName, user?.email)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-text1 truncate group-hover:text-accent">
                    {(typeof userName === 'string' && userName.trim()) || user?.email?.split('@')[0] || 'Usuario'}
                  </div>
                  <div className="text-[10px] text-text3 font-mono truncate">{user?.email}</div>
                </div>
              </button>

              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg text-text3 hover:text-danger hover:bg-bg transition-colors flex-shrink-0"
              >
                ⏻
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPerfilOpen(true)}
              title={`Perfil: ${userName || user?.email}`}
              className="w-8 h-8 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-xs border border-accent/20 hover:border-accent transition-colors"
            >
              {getInitials(userName, user?.email)}
            </button>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* TOPBAR */}
        <div
          className={`bg-surface border-b border-border px-4 md:px-6 py-3 fixed md:static top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 transition-transform duration-300 ease-in-out ${
            headerVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Botón menú hamburguesa (sólo móvil) */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-border text-text2 hover:text-text1 hover:bg-bg flex-shrink-0 text-base"
              title="Abrir menú"
              aria-label="Abrir menú de navegación"
            >
              ☰
            </button>
            <div className="min-w-0">
              <div className="text-sm font-medium text-text1 truncate">{NAV.find(n => n.id === view)?.label}</div>
              <div className="text-xs text-text3 font-mono mt-0.5 truncate hidden sm:block">{TOPBAR_SUB[view]}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 select-none flex-shrink-0" title={`Estado Realtime: ${rtCfg.label}`}>
            <span className={`w-2 h-2 rounded-full ${rtCfg.color} ${rtCfg.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] text-text3 hidden sm:inline">{rtCfg.label}</span>
          </div>
        </div>

        {/* Content area */}
        <div ref={mainScrollRef} className="flex-1 overflow-auto p-4 pt-16 md:p-6">
          <Breadcrumb view={view} NAV={NAV} onNavigate={setView} />
          <div key={view} className="animate-view-fade">
            {renderView()}
          </div>
        </div>
      </main>

      <PerfilDrawer
        open={perfilOpen}
        onClose={() => setPerfilOpen(false)}
        user={user}
        rol={rol}
        onLogout={handleLogout}
        onUserUpdated={fetchStats}
      />
    </div>
  )
}