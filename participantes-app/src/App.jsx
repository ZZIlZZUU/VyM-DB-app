import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import VistaEditable  from './pages/VistaEditable'
import VistaSql       from './pages/VistaSql'
import Personas       from './pages/Personas'
import Registros      from './pages/Registros'
import Exportar       from './pages/Exportar'
import Estadisticas   from './pages/Estadisticas'
import Programa       from './pages/Programa'

const NAV = [
  { id: 'editable',     icon: '⊞', label: 'Vista editable',     section: 'Vistas' },
  { id: 'sql',          icon: '≡', label: 'Vista SQL',           section: 'Vistas' },
  { id: 'personas',     icon: '👤', label: 'Personas',            section: 'Gestión' },
  { id: 'registros',    icon: '✎', label: 'Registros',           section: 'Gestión' },
  { id: 'programa',     icon: '📋', label: 'Programa (S-140)',    section: 'Gestión' },
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
}

export default function App() {
  const [view, setView]   = useState('editable')
  const [user, setUser]   = useState(null)
  const [stats, setStats] = useState({ personas: 0, registros: 0, mesActual: 0, mes: '' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    fetchStats()
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
      case 'exportar':     return <Exportar />
      case 'estadisticas': return <Estadisticas />
      default: return null
    }
  }

  return (
    <div className="flex min-h-screen">

      {/* SIDEBAR */}
      <aside className="w-56 bg-surface border-r border-border flex flex-col sticky top-0 h-screen overflow-y-autoflex-shrink-0">
        <div className="px-5 py-4 border-b border-border">
          <div className="font-mono text-xs text-text3 tracking-widest uppercase mb-1">Base de datos</div>
          <div className="text-sm font-medium text-text1 leading-tight">Participantes<br />2026</div>
          <div className="font-mono text-xs text-accent mt-1">AÑO EN CURSO</div>
        </div>

        <nav className="flex-1 py-2">
          {sections.map(section => (
            <div key={section}>
              <div className="font-mono text-xs text-text3 tracking-widest uppercase px-5 pt-3 pb-1">
                {section}
              </div>
              {NAV.filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`w-full flex items-center gap-2 px-5 py-2 text-left text-xs border-l-2
                    ${view === item.id
                      ? 'text-accent border-accent bg-accent-bg font-medium'
                      : 'text-text2 border-transparent hover:bg-bg hover:text-text1'}`}
                >
                  <span className="w-4 text-center">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

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

        <div className="px-5 py-3 border-t border-border">
          <div className="text-xs text-text3 truncate mb-1">{user?.email}</div>
          <button onClick={handleLogout} className="text-xs text-text3 hover:text-danger">
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="bg-surface border-b border-border px-6 py-3 sticky top-0 z-10">
          <div className="text-sm font-medium text-text1">{NAV.find(n => n.id === view)?.label}</div>
          <div className="text-xs text-text3 font-mono mt-0.5">{TOPBAR_SUB[view]}</div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {renderView()}
        </div>
      </main>
    </div>
  )
}