import { useState, useEffect, useCallback } from 'react'
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Database,
  FileText,
  X,
  ChevronDown,
  ChevronRight,
  Code,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SkeletonList } from '../components/Skeleton'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Dialog } from '../components/ui/Dialog'

function initials(email) {
  if (!email) return 'SY'
  return email.slice(0, 2).toUpperCase()
}

export default function HistorialCambios() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [operation, setOperation] = useState('ALL') // 'ALL', 'INSERT', 'UPDATE', 'DELETE'
  const [selectedLog, setSelectedLog] = useState(null)

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

    const channel = supabase
      .channel('audit-sync-realtime')
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
    const jsonStr = JSON.stringify(
      log.datos_despues || log.datos_antes || {}
    ).toLowerCase()
    return (
      (log.usuario_email || '').toLowerCase().includes(term) ||
      (log.tabla || '').toLowerCase().includes(term) ||
      (log.registro_id || '').toLowerCase().includes(term) ||
      jsonStr.includes(term)
    )
  })

  const formatDetalles = log => {
    const data = log.datos_despues || log.datos_antes
    if (!data) return log.registro_id ? `ID #${log.registro_id}` : '—'

    const partes = []
    if (data.nombre) partes.push(`Nombre: ${data.nombre}`)
    if (data.clave) partes.push(`Clave: ${data.clave}`)
    if (data.tipo) partes.push(`Tipo: ${data.tipo}`)
    if (data.mes) partes.push(`Mes: ${data.mes}`)
    if (data.email) partes.push(`Email: ${data.email}`)
    if (data.rol) partes.push(`Rol: ${data.rol}`)

    if (partes.length > 0) return partes.join(' · ')
    return JSON.stringify(data)
  }

  const opBadge = op => {
    switch (op) {
      case 'INSERT':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
      case 'UPDATE':
        return 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
      case 'DELETE':
        return 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
    }
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Historial de Cambios
            </h1>
            <Badge variant="neutral" size="sm">
              Últimos 50 eventos
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Registro cronológico y auditoría en tiempo real de todas las modificaciones del sistema.
          </p>
        </div>
      </div>

      {/* ── BARRA DE FILTROS Y BÚSQUEDA ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[240px]">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario, tabla o detalles..."
            icon={Search}
            size="sm"
            className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Operaciones */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todas las operaciones' },
            { id: 'INSERT', label: 'Creaciones (INSERT)' },
            { id: 'UPDATE', label: 'Cambios (UPDATE)' },
            { id: 'DELETE', label: 'Bajas (DELETE)' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOperation(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                operation === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLA DE AUDITORÍA ── */}
      <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
              <tr>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider w-44">
                  Fecha y Hora
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider w-56">
                  Usuario
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-center w-28">
                  Operación
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider w-36">
                  Tabla
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider">
                  Detalles del Cambio
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider text-right w-20">
                  JSON
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4">
                    <SkeletonList rows={6} cols={4} />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-text3">
                    No se encontraron registros de auditoría que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const fechaStr = log.created_at || log.fecha
                  const detallesStr = formatDetalles(log)

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 font-mono text-text3 text-[11px] whitespace-nowrap">
                        {fechaStr
                          ? new Date(fechaStr).toLocaleString('es-MX', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : '—'}
                      </td>

                      {/* Usuario */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center justify-center text-[9px] shrink-0">
                            {initials(log.usuario_email)}
                          </div>
                          <span
                            className="font-medium text-text1 text-xs truncate max-w-[180px]"
                            title={log.usuario_email || 'Sistema'}
                          >
                            {log.usuario_email || 'Sistema'}
                          </span>
                        </div>
                      </td>

                      {/* Operación */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${opBadge(
                            log.operacion
                          )}`}
                        >
                          {log.operacion}
                        </span>
                      </td>

                      {/* Tabla */}
                      <td className="py-3 px-4 font-mono text-text2 text-xs">
                        <span className="bg-zinc-100 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 text-[11px]">
                          {log.tabla}
                        </span>
                      </td>

                      {/* Detalles */}
                      <td className="py-3 px-4 text-text2 text-xs truncate max-w-sm" title={detallesStr}>
                        {detallesStr}
                      </td>

                      {/* Botón Ver Payload JSON */}
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="iconXs"
                          onClick={() => setSelectedLog(log)}
                          title="Ver datos completos en JSON"
                        >
                          <Code className="w-3.5 h-3.5 text-text3" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DIALOG: INSPECTOR DE DATOS JSON ── */}
      <Dialog
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Detalles de Evento #${selectedLog?.id}`}
        description={`${selectedLog?.operacion} en tabla "${selectedLog?.tabla}" por ${selectedLog?.usuario_email || 'Sistema'}`}
        width="md"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedLog && (
          <div className="space-y-3 py-1">
            {selectedLog.datos_antes && (
              <div>
                <span className="text-[10px] font-mono text-text3 uppercase tracking-wider block mb-1">
                  Estado Anterior (datos_antes)
                </span>
                <pre className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.datos_antes, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.datos_despues && (
              <div>
                <span className="text-[10px] font-mono text-text3 uppercase tracking-wider block mb-1">
                  Estado Resultante (datos_despues)
                </span>
                <pre className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedLog.datos_despues, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
