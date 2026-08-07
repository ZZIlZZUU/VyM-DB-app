import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useConfirm } from './hooks/useConfirm'
import ConfirmDialog from './components/ConfirmDialog'
import Breadcrumb from './components/Breadcrumb'
import VistaEditable  from './pages/VistaEditable'
import VistaSql       from './pages/VistaSql'
import Personas       from './pages/Personas'
import Registros      from './pages/Registros'
import Exportar       from './pages/Exportar'
import Estadisticas   from './pages/Estadisticas'
import Programa       from './pages/Programa'
import Usuarios       from './pages/Usuarios'

const NAV = [
  { id: 'editable',     icon: '⊞', label: 'Vista editable',     section: 'Vistas' },
  { id: 'sql',          icon: '≡', label: 'Vista SQL',           section: 'Vistas' },
  { id: 'personas',     icon: '👤', label: 'Personas',            section: 'Gestión' },
  { id: 'registros',    icon: '✎', label: 'Registros',           section: 'Gestión' },
  { id: 'programa',     icon: '📋', label: 'Programa (S-140)',    section: 'Gestión' },
  { id: 'usuarios',     icon: '🔑', label: 'Usuarios',           section: 'Gestión' },
  { id: 'exportar',     icon: '↑', label: 'Exportar / Importar', section: 'Herramientas' },
  { id: 'estadisticas', icon: '◈', label: 'Estadísticas',        section: 'Herramientas' },
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
}

const RT_CONFIG = {
  conectado:    { color: 'bg-accent',  pulse: false, label: 'Conectado :)' },
  conectando:   { color: 'bg-amber',   pulse: true,  label: 'Conectando…' },
  desconectado: { color: 'bg-danger',  pulse: false, label: 'Sin conexión' },
  error:        { color: 'bg-danger',  pulse: true,  label: 'Error RT' },
}

export default function App() {
  const [view, setView]         = useState('editable')
  const [user, setUser]         = useState(null)
  const [rtStatus, setRtStatus] = useState('conectando')
  const [stats, setStats]       = useState({ personas: 0, registros: 0, mesActual: 0, mes: '' })
  const [open, setOpen]         = useState(() => {
    const saved = localStorage.getItem('sidebarOpen')
    if (saved !== null) return saved === 'true'
    return window.innerWidth >= 768
  })
  const { confirm, confirmProps } = useConfirm()

  useEffect(() => {
    localStorage.setItem('sidebarOpen', open)
  }, [open])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchStats()
  }, [])

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
      case 'usuarios':     return <Usuarios />
      case 'exportar':     return <Exportar />
      case 'estadisticas': return <Estadisticas />
      default: return null
    }
  }

  const rtCfg = RT_CONFIG[rtStatus] || RT_CONFIG.conectando

  return (
    <div className="flex min-h-screen">
      <ConfirmDialog {...confirmProps} />

      {/* SIDEBAR */}
      <aside className={`${open ? 'w-56' : 'w-14'} bg-surface border-r border-border flex flex-col sticky top-0 h-screen flex-shrink-0 transition-all duration-300 ease-in-out overflow-hidden`}>

        {/* Header */}
        <div className={`border-b border-border flex items-center ${open ? 'px-5 py-4 gap-0 justify-between' : 'px-0 py-4 justify-center'}`}>
          {open && (
            <div>
              <div className="font-mono text-xs text-text3 tracking-widest uppercase mb-1">Base de datos</div>
              <div className="text-sm font-medium text-text1 leading-tight">Participantes<br />2026</div>
              <div className="font-mono text-xs text-accent mt-1">AÑO EN CURSO</div>
            </div>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            title={open ? 'Colapsar sidebar' : 'Expandir sidebar'}
            className="w-7 h-7 flex items-center justify-center rounded text-text3 hover:text-text1 hover:bg-bg flex-shrink-0"
          >
            {open ? '←' : '→'}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {sections.map(section => (
            <div key={section}>
              {open && (
                <div className="font-mono text-xs text-text3 tracking-widest uppercase px-5 pt-3 pb-1">
                  {section}
                </div>
              )}
              {!open && <div className="pt-3" />}
              {NAV.filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  title={!open ? item.label : undefined}
                  className={`w-full flex items-center gap-2 py-2 text-left text-xs border-l-2
                    ${open ? 'px-5' : 'px-0 justify-center'}
                    ${view === item.id
                      ? 'text-accent border-accent bg-accent-bg font-medium'
                      : 'text-text2 border-transparent hover:bg-bg hover:text-text1'}`}
                >
                  <span className="w-4 text-center flex-shrink-0">{item.icon}</span>
                  {open && item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Stats — solo visible expandido */}
        {open && (
          <div className="px-5 py-4 border-t border-border">
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
        <div className={`border-t border-border ${open ? 'px-5 py-3' : 'px-0 py-3 flex flex-col items-center gap-2'}`}>
          {open ? (
            <>
              <div className="text-xs text-text3 truncate mb-1">{user?.email}</div>
              <button onClick={handleLogout} className="text-xs text-text3 hover:text-danger">
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="text-sm text-text3 hover:text-danger"
            >
              ⏻
            </button>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="bg-surface border-b border-border px-6 py-3 sticky top-0 z-10 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-text1">{NAV.find(n => n.id === view)?.label}</div>
            <div className="text-xs text-text3 font-mono mt-0.5">{TOPBAR_SUB[view]}</div>
          </div>
          <div className="flex items-center gap-1.5 select-none" title={`Estado Realtime: ${rtCfg.label}`}>
            <span className={`w-2 h-2 rounded-full ${rtCfg.color} ${rtCfg.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] text-text3">{rtCfg.label}</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <Breadcrumb view={view} NAV={NAV} onNavigate={setView} />
          <div key={view} className="animate-view-fade">
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  )
}