import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TIPO_LABEL = {
  T:'Titular', A:'Asistente', X:'Participación',
  P:'Presidente', TB:'Tesoros', PE:'Perlas',
  EBC:'Est. Bíblico', VC:'Vida Cristiana', NC:'Nec. Congr.'
}

const BADGE_CLASS = {
  T:'bg-accent-bg text-accent', A:'bg-blue-bg text-blue', X:'bg-amber-bg text-amber',
  P:'bg-purple-bg text-purple', TB:'bg-teal-bg text-teal', PE:'bg-rose-bg text-rose',
  EBC:'bg-orange-100 text-orange-700', VC:'bg-green-100 text-green-800', NC:'bg-red-100 text-red-800',
}

function StatCard({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="text-sm font-medium text-text1 mb-4 pb-3 border-b border-border">{title}</div>
      {children}
    </div>
  )
}

function Bar({ label, value, max, badge }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
        {badge
          ? <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-xs font-mono font-medium ${BADGE_CLASS[label] || 'bg-bg text-text2'}`}>{label}</span>
          : <span className="text-xs text-text2 truncate">{label}</span>
        }
      </div>
      <div className="flex-1 bg-bg rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-text2 w-6 text-right flex-shrink-0">{value}</span>
    </div>
  )
}

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-text2">{label}</span>
      <span className={`font-mono text-xs font-medium ${accent ? 'text-accent' : 'text-text1'}`}>{value}</span>
    </div>
  )
}

export default function Estadisticas() {
  const [personas, setPersonas]           = useState([])
  const [participaciones, setParticipaciones] = useState([])
  const [loading, setLoading]             = useState(true)
  const [filterLista, setFilterLista]     = useState('')
  const [filterMes, setFilterMes]         = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from('personas').select('*').order('nombre'),
      supabase.from('participaciones').select('*').order('fecha'),
    ])
    setPersonas(ps || [])
    setParticipaciones(rs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const canal = supabase.channel('stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // ── Aplicar filtros ──
  const regs = participaciones.filter(r => {
    if (filterLista && r.lista !== filterLista) return false
    if (filterMes   && r.mes   !== filterMes)   return false
    return true
  })

  const psFiltradas = personas.filter(p => {
    if (filterLista && p.lista !== filterLista) return false
    return true
  })

  // ── Cálculos ──
  const totalRegs   = regs.length
  const totalActivos = psFiltradas.filter(p => p.activo).length
  const totalInact  = psFiltradas.filter(p => !p.activo).length

  // Por tipo
  const porTipo = {}
  regs.forEach(r => { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1 })
  const maxTipo = Math.max(...Object.values(porTipo), 1)

  // Por mes
  const porMes = {}
  regs.forEach(r => { porMes[r.mes] = (porMes[r.mes] || 0) + 1 })
  const maxMes = Math.max(...Object.values(porMes), 1)

  // Por persona (top 10)
  const porPersona = {}
  regs.forEach(r => { porPersona[r.nombre] = (porPersona[r.nombre] || 0) + 1 })
  const topPersonas = Object.entries(porPersona)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxPersona = topPersonas[0]?.[1] || 1

  // Personas sin participaciones este año
  const conRegs = new Set(regs.map(r => r.clave))
  const sinRegs = psFiltradas.filter(p => p.activo && !conRegs.has(p.clave))

  // Meses sin actividad
  const mesesConActividad = new Set(regs.map(r => r.mes))
  const mesesSinActividad = MESES.filter(m => !mesesConActividad.has(m))

  // Peso total (Titulares valen 2)
  const pesoTotal = regs.reduce((acc, r) => acc + (r.peso || 1), 0)

  // Participaciones únicas por mes (conteo de personas distintas)
  const personasPorMes = {}
  regs.forEach(r => {
    if (!personasPorMes[r.mes]) personasPorMes[r.mes] = new Set()
    personasPorMes[r.mes].add(r.clave)
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-text3 font-mono text-sm">
      Calculando estadísticas...
    </div>
  )

  return (
    <div className="flex flex-col gap-5">

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <select value={filterLista} onChange={e => setFilterLista(e.target.value)}
          className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
          <option value="">Todas las listas</option>
          <option value="Mat">Matriculados</option>
          <option value="Anc/SM">Ancianos y SM</option>
        </select>
        <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
          className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
          <option value="">Todos los meses</option>
          {MESES.map(m => <option key={m}>{m}</option>)}
        </select>
        {(filterLista || filterMes) && (
          <button onClick={() => { setFilterLista(''); setFilterMes('') }}
            className="text-xs text-text3 hover:text-danger px-2 py-1 border border-border2 rounded-lg">
            ✕ Limpiar filtros
          </button>
        )}
        <span className="ml-auto font-mono text-xs text-text3">{totalRegs} registros</span>
      </div>

      {/* Resumen general */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Personas activas',   val: totalActivos, accent: true },
          { label: 'Personas inactivas', val: totalInact },
          { label: 'Total registros',    val: totalRegs },
          { label: 'Peso acumulado',     val: pesoTotal },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-xl px-4 py-3">
            <div className={`text-2xl font-mono font-medium ${s.accent ? 'text-accent' : 'text-text1'}`}>{s.val}</div>
            <div className="text-xs text-text3 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Por tipo */}
        <StatCard title="Participaciones por tipo">
          {Object.keys(porTipo).length === 0 ? (
            <div className="text-sm text-text3 py-4 text-center">Sin datos</div>
          ) : (
            Object.entries(porTipo)
              .sort((a, b) => b[1] - a[1])
              .map(([tipo, count]) => (
                <div key={tipo}>
                  <Bar label={tipo} value={count} max={maxTipo} badge />
                  <div className="text-xs text-text3 ml-28 -mt-1 mb-1">{TIPO_LABEL[tipo] || ''}</div>
                </div>
              ))
          )}
        </StatCard>

        {/* Por mes */}
        <StatCard title="Participaciones por mes">
          {MESES.filter(m => porMes[m]).length === 0 ? (
            <div className="text-sm text-text3 py-4 text-center">Sin datos</div>
          ) : (
            MESES.filter(m => porMes[m]).map(mes => (
              <div key={mes}>
                <Bar label={mes} value={porMes[mes]} max={maxMes} />
                <div className="text-xs text-text3 ml-28 -mt-1 mb-1">
                  {personasPorMes[mes]?.size || 0} personas distintas
                </div>
              </div>
            ))
          )}
          {mesesSinActividad.length > 0 && !filterMes && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-xs text-text3 font-mono uppercase tracking-wider mb-1">Sin actividad</div>
              <div className="flex flex-wrap gap-1">
                {mesesSinActividad.map(m => (
                  <span key={m} className="text-xs bg-danger-bg text-danger px-2 py-0.5 rounded font-mono">{m}</span>
                ))}
              </div>
            </div>
          )}
        </StatCard>

        {/* Top personas */}
        <StatCard title="Personas más activas (top 10)">
          {topPersonas.length === 0 ? (
            <div className="text-sm text-text3 py-4 text-center">Sin datos</div>
          ) : topPersonas.map(([nombre, count]) => (
            <Bar key={nombre} label={nombre} value={count} max={maxPersona} />
          ))}
        </StatCard>

        {/* Personas sin registros */}
        <StatCard title="Personas activas sin participaciones">
          {sinRegs.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <span className="text-accent text-lg">✓</span>
              <span className="text-sm text-text2">Todas las personas activas tienen al menos un registro</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {sinRegs.map(p => (
                <div key={p.clave} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0
                    ${p.sexo === 'F' ? 'bg-purple-100 text-purple' : 'bg-blue-bg text-blue'}`}>
                    {p.nombre.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <span className="font-mono text-xs text-text3 w-12 flex-shrink-0">{p.clave}</span>
                  <span className="text-sm text-text1 flex-1">{p.nombre}</span>
                  <span className="text-xs text-text3">{p.lista}</span>
                </div>
              ))}
            </div>
          )}
          {sinRegs.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <span className="font-mono text-xs text-danger">{sinRegs.length} persona{sinRegs.length !== 1 ? 's' : ''} sin registro{sinRegs.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </StatCard>

      </div>

      {/* Tabla resumen por mes */}
      {!filterMes && (
        <StatCard title="Resumen mensual detallado">
          <div className="overflow-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  <th className="text-left text-xs font-mono text-text3 pb-2 pr-4 border-b border-border">MES</th>
                  <th className="text-center text-xs font-mono text-text3 pb-2 px-2 border-b border-border">REGISTROS</th>
                  <th className="text-center text-xs font-mono text-text3 pb-2 px-2 border-b border-border">PERSONAS</th>
                  <th className="text-center text-xs font-mono text-text3 pb-2 px-2 border-b border-border">MAT</th>
                  <th className="text-center text-xs font-mono text-text3 pb-2 px-2 border-b border-border">ANC/SM</th>
                  <th className="text-center text-xs font-mono text-text3 pb-2 px-2 border-b border-border">PESO</th>
                </tr>
              </thead>
              <tbody>
                {MESES.map(mes => {
                  const rMes = regs.filter(r => r.mes === mes)
                  if (rMes.length === 0) return null
                  const pesoMes = rMes.reduce((a, r) => a + (r.peso || 1), 0)
                  const matMes  = rMes.filter(r => r.lista === 'Mat').length
                  const ancMes  = rMes.filter(r => r.lista === 'Anc/SM').length
                  return (
                    <tr key={mes} className="border-b border-border last:border-0 hover:bg-bg/50">
                      <td className="py-2 pr-4 text-sm text-text1">{mes}</td>
                      <td className="py-2 px-2 text-center font-mono text-xs text-text2">{rMes.length}</td>
                      <td className="py-2 px-2 text-center font-mono text-xs text-text2">{personasPorMes[mes]?.size || 0}</td>
                      <td className="py-2 px-2 text-center font-mono text-xs text-text2">{matMes}</td>
                      <td className="py-2 px-2 text-center font-mono text-xs text-text2">{ancMes}</td>
                      <td className="py-2 px-2 text-center font-mono text-xs font-medium text-accent">{pesoMes}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </StatCard>
      )}

    </div>
  )
}