import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SkeletonList } from '../components/Skeleton'

export default function HistorialCambios() {
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [operation, setOperation]   = useState('ALL') // 'ALL', 'INSERT', 'UPDATE', 'DELETE'

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('historial_cambios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (operation !== 'ALL') {
        query = query.eq('operacion', operation)
      }

      const { data, error } = await query
      if (error) throw error
      setLogs(data || [])
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [operation])

  useEffect(() => {
    fetchLogs()

    // Realtime sync for audit logs
    const channel = supabase
      .channel('audit-sync')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'historial_cambios' },
        () => fetchLogs()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLogs])

  const filteredLogs = logs.filter(log => {
    const term = search.toLowerCase()
    const jsonStr = JSON.stringify(log.datos_despues || log.datos_antes || {}).toLowerCase()
    return (
      (log.usuario_email || '').toLowerCase().includes(term) ||
      (log.tabla || '').toLowerCase().includes(term) ||
      (log.registro_id || '').toLowerCase().includes(term) ||
      jsonStr.includes(term)
    )
  })

  const formatDetalles = (log) => {
    const data = log.datos_despues || log.datos_antes
    if (!data) return log.registro_id ? `ID #${log.registro_id}` : '—'

    const partes = []
    if (data.nombre) partes.push(`Nombre: ${data.nombre}`)
    if (data.clave)  partes.push(`Clave: ${data.clave}`)
    if (data.tipo)   partes.push(`Tipo: ${data.tipo}`)
    if (data.mes)    partes.push(`Mes: ${data.mes}`)
    if (data.email)  partes.push(`Email: ${data.email}`)
    if (data.rol)    partes.push(`Rol: ${data.rol}`)

    if (partes.length > 0) return partes.join(' · ')
    return JSON.stringify(data)
  }

  // Helper for operation styling
  const opBadge = (op) => {
    switch (op) {
      case 'INSERT':
        return 'bg-accent-bg text-accent border border-accent/20'
      case 'UPDATE':
        return 'bg-amber-bg text-amber border border-amber/20'
      case 'DELETE':
        return 'bg-rose-bg text-rose border border-rose/20'
      default:
        return 'bg-bg text-text3 border border-border'
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── HEADER & FILTROS ── */}
      <div className="bg-surface border border-border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-text1">Auditoría del Sistema</h2>
          <p className="text-xs text-text3 mt-0.5">Últimos 50 cambios realizados por los usuarios</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Operaciones */}
          {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map(op => (
            <button
              key={op}
              onClick={() => setOperation(op)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                operation === op
                  ? op === 'INSERT'
                    ? 'bg-accent text-white border-accent'
                    : op === 'UPDATE'
                      ? 'bg-amber text-white border-amber'
                      : op === 'DELETE'
                        ? 'bg-danger text-white border-danger'
                        : 'bg-text1 text-surface border-text1'
                  : 'bg-bg border-border2 text-text2 hover:text-text1'
              }`}
            >
              {op === 'ALL' ? 'Todos' : op}
            </button>
          ))}
        </div>
      </div>

      {/* ── BÚSQUEDA ── */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por usuario, tabla o detalles..."
          className="w-full pl-9 pr-4 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text3 text-sm select-none">
          🔍
        </span>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-5">
            <SkeletonList rows={6} cols={4} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-12 px-4 text-center max-w-sm mx-auto flex flex-col items-center gap-3">
            {/* SVG Ilustración Empty State */}
            <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center border border-accent/10">
              <svg
                className="w-8 h-8 text-accent/60 stroke-current fill-none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-text1">Sin registros encontrados</h3>
            <p className="text-xs text-text3">
              No hay cambios en el historial que coincidan con la búsqueda o el filtro seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="w-full text-left border-collapse text-xs hidden md:table">
              <thead>
                <tr className="bg-bg border-b border-border text-text3 font-mono uppercase tracking-wider">
                  <th className="px-5 py-3 font-semibold">Fecha y Hora</th>
                  <th className="px-5 py-3 font-semibold">Usuario</th>
                  <th className="px-5 py-3 font-semibold">Operación</th>
                  <th className="px-5 py-3 font-semibold">Tabla</th>
                  <th className="px-5 py-3 font-semibold">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLogs.map(log => {
                  const fechaStr = log.created_at || log.fecha
                  const detallesStr = formatDetalles(log)
                  return (
                    <tr key={log.id} className="hover:bg-bg/40 transition-colors">
                      <td className="px-5 py-3 text-text3 font-mono">
                        {fechaStr ? new Date(fechaStr).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-text1 font-medium truncate max-w-[150px]" title={log.usuario_email}>
                        {log.usuario_email || 'Sistema'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${opBadge(log.operacion)}`}>
                          {log.operacion}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-text2 text-[11px]">
                        {log.tabla}
                      </td>
                      <td className="px-5 py-3 text-text2 max-w-[280px] truncate" title={detallesStr}>
                        {detallesStr}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="flex flex-col md:hidden divide-y divide-border/60">
              {filteredLogs.map(log => {
                const fechaStr = log.created_at || log.fecha
                const detallesStr = formatDetalles(log)
                return (
                  <div key={log.id} className="p-4 flex flex-col gap-2 hover:bg-bg/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text3 font-mono">
                        {fechaStr ? new Date(fechaStr).toLocaleString('es-MX') : '—'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${opBadge(log.operacion)}`}>
                        {log.operacion}
                      </span>
                    </div>
                    <div className="text-xs text-text1 font-medium truncate">
                      👤 {log.usuario_email || 'Sistema'}
                    </div>
                    <div className="text-[11px] text-text2">
                      📁 Tabla: <span className="font-mono">{log.tabla}</span>
                    </div>
                    <div className="text-[11px] text-text3 font-mono bg-bg/50 border border-border2 rounded p-2 mt-1 truncate" title={detallesStr}>
                      {detallesStr}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
