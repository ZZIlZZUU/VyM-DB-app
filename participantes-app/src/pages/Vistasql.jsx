import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const BADGE_CLASS = {
  T:'bg-accent-bg text-accent', A:'bg-blue-bg text-blue', X:'bg-amber-bg text-amber',
  P:'bg-purple-bg text-purple', TB:'bg-teal-bg text-teal', PE:'bg-rose-bg text-rose',
  EBC:'bg-orange-100 text-orange-700', VC:'bg-green-100 text-green-800', NC:'bg-red-100 text-red-800',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function Pill({ value }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-medium ${BADGE_CLASS[value] || 'bg-bg text-text2'}`}>
      {value}
    </span>
  )
}

export default function VistaSql() {
  const [tab, setTab] = useState('personas')

  // ── Personas ──
  const [personas, setPersonas]       = useState([])
  const [pSearch, setPSearch]         = useState('')
  const [pLista, setPLista]           = useState('')
  const [pEstatus, setPEstatus]       = useState('')
  const [pActivo, setPActivo]         = useState('')
  const [loadingP, setLoadingP]       = useState(true)

  // ── Participaciones ──
  const [participaciones, setParticipaciones] = useState([])
  const [rSearch, setRSearch]         = useState('')
  const [rMes, setRMes]               = useState('')
  const [rTipo, setRTipo]             = useState('')
  const [rLista, setRLista]           = useState('')
  const [loadingR, setLoadingR]       = useState(true)

  const fetchPersonas = useCallback(async () => {
    setLoadingP(true)
    const { data } = await supabase.from('personas').select('*').order('nombre')
    setPersonas(data || [])
    setLoadingP(false)
  }, [])

  const fetchParticipaciones = useCallback(async () => {
    setLoadingR(true)
    const { data } = await supabase
      .from('participaciones').select('*').order('fecha', { ascending: false })
    setParticipaciones(data || [])
    setLoadingR(false)
  }, [])

  useEffect(() => { fetchPersonas(); fetchParticipaciones() }, [fetchPersonas, fetchParticipaciones])

  // Realtime
  useEffect(() => {
    const canal = supabase.channel('sql-view-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, fetchPersonas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, fetchParticipaciones)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchPersonas, fetchParticipaciones])

  // ── Filtros personas ──
  const filteredPersonas = personas.filter(p => {
    if (pSearch && !p.nombre.toLowerCase().includes(pSearch.toLowerCase()) && !p.clave.toLowerCase().includes(pSearch.toLowerCase())) return false
    if (pLista && p.lista !== pLista) return false
    if (pEstatus && p.estatus !== pEstatus) return false
    if (pActivo === 'true'  && !p.activo)  return false
    if (pActivo === 'false' && p.activo)   return false
    return true
  })

  // ── Filtros participaciones ──
  const filteredPartic = participaciones.filter(r => {
    if (rSearch && !r.nombre.toLowerCase().includes(rSearch.toLowerCase()) && !r.clave.toLowerCase().includes(rSearch.toLowerCase())) return false
    if (rMes   && r.mes  !== rMes)   return false
    if (rTipo  && r.tipo !== rTipo)  return false
    if (rLista && r.lista !== rLista) return false
    return true
  })

  // ── Eliminar ──
  async function deletePersona(clave) {
    if (!confirm(`¿Deshabilitar a esta persona? Sus registros se conservan.`)) return
    await supabase.from('personas').update({ activo: false }).eq('clave', clave)
    fetchPersonas()
  }

  async function deleteParticipacion(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('participaciones').delete().eq('id', id)
    fetchParticipaciones()
  }

  async function toggleActivo(persona) {
    await supabase.from('personas').update({ activo: !persona.activo }).eq('clave', persona.clave)
    fetchPersonas()
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        {[['personas','participantes.csv'],['participaciones','participaciones.csv']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-mono border-b-2 -mb-px transition-none
              ${tab === id ? 'text-accent border-accent font-medium' : 'text-text3 border-transparent hover:text-text2'}`}
          >{label}</button>
        ))}
      </div>

      {/* ── TABLA PERSONAS ── */}
      {tab === 'personas' && (
        <>
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <input value={pSearch} onChange={e => setPSearch(e.target.value)} placeholder="Buscar nombre o clave..."
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent min-w-44" />
            <select value={pLista} onChange={e => setPLista(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
              <option value="">Todas las listas</option>
              <option value="Mat">Matriculados</option>
              <option value="Anc/SM">Ancianos / SM</option>
            </select>
            <select value={pEstatus} onChange={e => setPEstatus(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
              <option value="">Todos los estatus</option>
              <option>Matriculado</option><option>Matriculada</option>
              <option>Matriculado bautizado</option><option>Matriculada bautizada</option>
              <option>Anciano</option><option>Siervo Ministerial</option>
            </select>
            <select value={pActivo} onChange={e => setPActivo(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
              <option value="">Activos e inactivos</option>
              <option value="true">Solo activos</option>
              <option value="false">Solo inactivos</option>
            </select>
            <span className="ml-auto font-mono text-xs text-text3">{filteredPersonas.length} persona{filteredPersonas.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  {['CLAVE','LISTA','NOMBRE','SEXO','ESTATUS','ACTIVO','CREATED_AT',''].map(h => (
                    <th key={h} className="bg-bg px-3 py-2 text-left text-xs font-mono font-medium text-text3 tracking-wider border-b border-border whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingP ? (
                  <tr><td colSpan={8} className="text-center py-8 text-sm text-text3 font-mono">Cargando...</td></tr>
                ) : filteredPersonas.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-sm text-text3">Sin resultados</td></tr>
                ) : filteredPersonas.map(p => (
                  <tr key={p.clave} className={`border-b border-border last:border-0 hover:bg-bg/50 ${!p.activo ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2 font-mono text-xs text-text3">{p.clave}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text2">{p.lista}</td>
                    <td className="px-3 py-2 text-sm text-text1 font-medium">{p.nombre}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text2">{p.sexo}</td>
                    <td className="px-3 py-2 text-xs text-text2">{p.estatus}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${p.activo ? 'bg-accent-bg text-accent' : 'bg-bg text-text3'}`}>
                        {p.activo ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-text3 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => toggleActivo(p)}
                          title={p.activo ? 'Deshabilitar' : 'Habilitar'}
                          className="text-xs text-text3 hover:text-accent px-1.5 py-0.5 rounded hover:bg-accent-bg"
                        >{p.activo ? '⏸' : '▶'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-text3 font-mono">
            → Usa Gestión → Personas para agregar o editar
          </div>
        </>
      )}

      {/* ── TABLA PARTICIPACIONES ── */}
      {tab === 'participaciones' && (
        <>
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <input value={rSearch} onChange={e => setRSearch(e.target.value)} placeholder="Buscar nombre o clave..."
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent min-w-44" />
            <select value={rLista} onChange={e => setRLista(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
              <option value="">Todas las listas</option>
              <option value="Mat">Matriculados</option>
              <option value="Anc/SM">Ancianos / SM</option>
            </select>
            <select value={rMes} onChange={e => setRMes(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
              <option value="">Todos los meses</option>
              {MESES.map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={rTipo} onChange={e => setRTipo(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none">
              <option value="">Todos los tipos</option>
              {['T','A','X','P','TB','PE','EBC','VC','NC'].map(t => <option key={t}>{t}</option>)}
            </select>
            <span className="ml-auto font-mono text-xs text-text3">{filteredPartic.length} registro{filteredPartic.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-auto">
            <table className="w-full border-collapse min-w-max">
              <thead>
                <tr>
                  {['ID','CLAVE','NOMBRE','LISTA','FECHA','MES','TIPO','PESO','OBSERVACIONES',''].map(h => (
                    <th key={h} className="bg-bg px-3 py-2 text-left text-xs font-mono font-medium text-text3 tracking-wider border-b border-border whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingR ? (
                  <tr><td colSpan={10} className="text-center py-8 text-sm text-text3 font-mono">Cargando...</td></tr>
                ) : filteredPartic.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-8 text-sm text-text3">Sin resultados</td></tr>
                ) : filteredPartic.map(r => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                    <td className="px-3 py-2 font-mono text-xs text-text3">{r.id}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text3">{r.clave}</td>
                    <td className="px-3 py-2 text-sm text-text1">{r.nombre}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text2">{r.lista}</td>
                    <td className="px-3 py-2 font-mono text-xs text-text2 whitespace-nowrap">{r.fecha}</td>
                    <td className="px-3 py-2 text-xs text-text2">{r.mes}</td>
                    <td className="px-3 py-2"><Pill value={r.tipo} /></td>
                    <td className="px-3 py-2 font-mono text-xs text-text2 text-center">{r.peso}</td>
                    <td className="px-3 py-2 text-xs text-text2 italic max-w-32 truncate">{r.observaciones || ''}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => deleteParticipacion(r.id)}
                        className="text-xs text-text3 hover:text-danger px-1.5 py-0.5 rounded hover:bg-danger-bg"
                        title="Eliminar"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-text3 font-mono">
            → Compatible con Supabase / PostgreSQL
          </div>
        </>
      )}
    </div>
  )
}