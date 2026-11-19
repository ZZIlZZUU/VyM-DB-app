import { useState, useMemo } from 'react'
import {
  History,
  Search,
  Database,
  X,
  Code,
  Copy,
  Check,
} from 'lucide-react'
import { useHistorialCambiosQuery, useUsuariosQuery } from '../core/queries/useAppQueries'
import { formatFechaLegible } from '../lib/fechas'
import {
  TABLA_LABELS,
  getTablaLabel,
  buildUsuariosByEmailMap,
  resolveAutorLog,
} from '../lib/auditoria'
import { SkeletonList } from '../components/Skeleton'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'

function parsePayload(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}

function formatLogDate(str) {
  if (!str) return '—'
  try {
    const d = new Date(str)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

export default function HistorialCambios({ currentUser, initialUserEmail = 'ALL' }) {
  const [search, setSearch] = useState('')
  const [operation, setOperation] = useState('ALL') // 'ALL', 'INSERT', 'UPDATE', 'DELETE'
  const [filterUsuario, setFilterUsuario] = useState(() => initialUserEmail || 'ALL')
  const [filterTabla, setFilterTabla] = useState('ALL')
  const [limit, setLimit] = useState(50)
  const [selectedLog, setSelectedLog] = useState(null)
  const [copied, setCopied] = useState(false)

  const { data: usuarios = [] } = useUsuariosQuery()
  const usuariosByEmail = useMemo(() => buildUsuariosByEmailMap(usuarios), [usuarios])

  const {
    data: logs = [],
    isLoading: loading,
  } = useHistorialCambiosQuery({
    operation,
    limit,
    usuarioEmail: filterUsuario,
    tabla: filterTabla,
  })

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return logs
    return logs.filter(log => {
      const autor = resolveAutorLog(log, usuariosByEmail)
      const payload = parsePayload(log.datos_despues || log.datos_antes)
      const jsonStr = (typeof payload === 'object' ? JSON.stringify(payload) : String(payload || '')).toLowerCase()
      const regIdStr = String(log.registro_id ?? '').toLowerCase()
      return (
        autor.nombre.toLowerCase().includes(term) ||
        (autor.email || '').toLowerCase().includes(term) ||
        (log.tabla || '').toLowerCase().includes(term) ||
        getTablaLabel(log.tabla).toLowerCase().includes(term) ||
        regIdStr.includes(term) ||
        jsonStr.includes(term)
      )
    })
  }, [logs, search, usuariosByEmail])

  const hasActiveFilters =
    Boolean(search.trim()) ||
    operation !== 'ALL' ||
    filterUsuario !== 'ALL' ||
    filterTabla !== 'ALL'

  const resetFilters = () => {
    setSearch('')
    setOperation('ALL')
    setFilterUsuario('ALL')
    setFilterTabla('ALL')
  }

  const formatDetalles = log => {
    const data = parsePayload(log.datos_despues || log.datos_antes)
    if (!data) return log.registro_id != null ? `ID #${log.registro_id}` : '—'
    if (typeof data !== 'object') return String(data)

    const partes = []
    if (data.nombre) partes.push(`Nombre: ${data.nombre}`)
    if (data.clave) partes.push(`Clave: ${data.clave}`)
    if (data.tipo) partes.push(`Tipo: ${data.tipo}`)
    if (data.fecha) partes.push(`Fecha: ${formatFechaLegible(data.fecha)}`)
    if (data.mes) partes.push(`Mes: ${data.mes}`)
    if (data.email) partes.push(`Email: ${data.email}`)
    if (data.rol) partes.push(`Rol: ${data.rol}`)
    if (data.persona_clave) partes.push(`Vínculo: ${data.persona_clave}`)

    if (partes.length > 0) return partes.join(' · ')
    return JSON.stringify(data)
  }

  const opBadge = op => {
    switch (op) {
      case 'INSERT':
        return 'bg-accent-muted-bg text-accent border-accent-muted-border'
      case 'UPDATE':
        return 'bg-amber-bg text-amber border-amber/25'
      case 'DELETE':
        return 'bg-danger-bg text-danger border-danger/25'
      default:
        return 'bg-surface-alt text-text2 border-border'
    }
  }

  const buildCambioLegible = log => {
    if (!log) return []
    const antes = parsePayload(log.datos_antes)
    const despues = parsePayload(log.datos_despues)
    if (log.operacion === 'UPDATE' && antes && despues && typeof antes === 'object' && typeof despues === 'object') {
      const keys = Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]))
      const diffs = keys
        .filter(k => JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
        .map(k => ({
          campo: k,
          antes: antes[k] ?? '—',
          despues: despues[k] ?? '—',
        }))
      return diffs
    }
    const base = despues || antes
    if (base && typeof base === 'object') {
      return Object.entries(base)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .slice(0, 6)
        .map(([campo, val]) => ({
          campo,
          antes: log.operacion === 'DELETE' ? val : null,
          despues: log.operacion === 'DELETE' ? null : val,
        }))
    }
    return []
  }

  const tablaOptions = Object.entries(TABLA_LABELS).filter(([k]) => k !== 'congregacion_config')
  const selectedAutor = selectedLog ? resolveAutorLog(selectedLog, usuariosByEmail) : null

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl font-medium tracking-tight text-text1">
              Historial de Cambios
            </h1>
            <Badge variant="success" size="sm" dot pulse>
              En vivo
            </Badge>
            <Badge variant="neutral" size="sm">
              Últimos {limit} eventos
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Registro cronológico y auditoría por usuario de todas las modificaciones del sistema.
          </p>
        </div>

        {/* Selector de límite */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-text3 font-medium">Mostrar:</span>
          <div className="inline-flex p-0.5 rounded-lg bg-surface-alt border border-border text-xs">
            {[50, 100, 200].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => setLimit(cnt)}
                className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all cursor-pointer ${
                  limit === cnt
                    ? 'bg-surface text-text1 shadow-2xs font-semibold'
                    : 'text-text3 hover:text-text2'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BARRA DE FILTROS Y BÚSQUEDA ── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-surface border border-border shadow-2xs">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario, tabla o detalles..."
            aria-label="Buscar en auditoría de cambios"
            icon={Search}
            size="sm"
            className="border-border bg-surface-alt/50 text-text1"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro Usuario + Filtro Tabla */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
          <div className="sm:w-48">
            <Select
              value={filterUsuario}
              onChange={e => setFilterUsuario(e.target.value)}
              size="sm"
              aria-label="Filtrar por usuario"
            >
              <option value="ALL">Todos los usuarios</option>
              {currentUser?.email && (
                <option value={currentUser.email}>Solo mis cambios</option>
              )}
              {usuarios.map(u => (
                <option key={u.email} value={u.email}>
                  {u.nombre ? `${u.nombre} (${u.rol})` : u.email}
                </option>
              ))}
              <option value="__SISTEMA__">Sistema (automático)</option>
            </Select>
          </div>

          <div className="sm:w-44">
            <Select
              value={filterTabla}
              onChange={e => setFilterTabla(e.target.value)}
              size="sm"
              aria-label="Filtrar por tabla"
            >
              <option value="ALL">Todas las tablas</option>
              {tablaOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Segmented Operaciones */}
        <div className="flex items-center p-0.5 rounded-lg bg-surface-alt border border-border text-xs shrink-0 overflow-x-auto">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'INSERT', label: 'Altas' },
            { id: 'UPDATE', label: 'Ediciones' },
            { id: 'DELETE', label: 'Bajas' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOperation(tab.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                operation === tab.id
                  ? 'bg-surface text-text1 shadow-2xs border border-border'
                  : 'text-text3 hover:text-text1'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TABLA DE AUDITORÍA ── */}
      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-max">
            <thead className="sticky top-0 z-10 bg-surface-alt/95 border-b border-border text-text2 select-none">
              <tr>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider w-44">
                  Fecha y Hora
                </th>
                <th className="py-3 px-4 font-mono uppercase text-[10px] tracking-wider w-64">
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
            <tbody className="divide-y divide-border/70">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4">
                    <SkeletonList rows={6} cols={4} />
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4">
                    <EmptyState
                      icon={hasActiveFilters ? Search : History}
                      title="Sin eventos de auditoría"
                      description={
                        hasActiveFilters
                          ? 'No se encontraron registros de auditoría que coincidan con los filtros seleccionados.'
                          : 'Aún no hay actividad de auditoría registrada.'
                      }
                      action={
                        hasActiveFilters ? (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={resetFilters}
                          >
                            Limpiar filtros
                          </Button>
                        ) : null
                      }
                    />
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const fechaStr = log.created_at || log.fecha
                  const detallesStr = formatDetalles(log)
                  const autor = resolveAutorLog(log, usuariosByEmail)

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-alt/55 transition-colors"
                    >
                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 font-mono text-text3 text-[11px] whitespace-nowrap">
                        {formatLogDate(fechaStr)}
                      </td>

                      {/* Usuario */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full font-semibold flex items-center justify-center text-[9px] shrink-0 border ${
                              autor.esSistema
                                ? 'bg-surface-alt text-text3 border-border'
                                : 'bg-accent-muted-bg text-accent border-accent-muted-border'
                            }`}
                          >
                            {autor.esSistema ? <Database className="w-3 h-3" /> : autor.iniciales}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="font-medium text-text1 text-xs truncate max-w-[160px]"
                                title={autor.email || 'Sistema / Registro automático'}
                              >
                                {autor.nombre}
                              </span>
                              {autor.rol && (
                                <Badge
                                  variant={autor.rol === 'admin' ? 'purple' : 'info'}
                                  size="xs"
                                  className="uppercase"
                                >
                                  {autor.rol === 'admin' ? 'Admin' : 'Editor'}
                                </Badge>
                              )}
                            </div>
                            {autor.email && (
                              <span className="block text-[10px] font-mono text-text3 truncate max-w-[200px]">
                                {autor.email}
                              </span>
                            )}
                          </div>
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
                        <span
                          className="bg-surface-alt px-1.5 py-0.5 rounded border border-border text-[11px]"
                          title={log.tabla}
                        >
                          {getTablaLabel(log.tabla)}
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
        description={
          selectedLog
            ? `${selectedLog.operacion} en "${getTablaLabel(selectedLog.tabla)}" por ${
                selectedAutor?.esSistema
                  ? 'Sistema'
                  : `${selectedAutor?.nombre}${selectedAutor?.email ? ` (${selectedAutor.email})` : ''}`
              }`
            : ''
        }
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              icon={copied ? Check : Copy}
              onClick={() => {
                const fullPayload = {
                  id: selectedLog?.id,
                  operacion: selectedLog?.operacion,
                  tabla: selectedLog?.tabla,
                  registro_id: selectedLog?.registro_id,
                  usuario_email: selectedLog?.usuario_email,
                  usuario_id: selectedLog?.usuario_id,
                  created_at: selectedLog?.created_at,
                  datos_antes: parsePayload(selectedLog?.datos_antes),
                  datos_despues: parsePayload(selectedLog?.datos_despues),
                }
                navigator.clipboard.writeText(JSON.stringify(fullPayload, null, 2))
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? 'Copiado al portapapeles' : 'Copiar JSON completo'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedLog && (
          <div className="space-y-3 py-1">
            {(() => {
              const diffs = buildCambioLegible(selectedLog)
              if (diffs.length === 0) return null
              return (
                <div className="p-3 rounded-xl bg-surface-alt/70 border border-border space-y-1.5">
                  <span className="text-[10px] font-mono text-text3 uppercase tracking-wider block">
                    Resumen legible del cambio
                  </span>
                  <div className="space-y-1 text-xs">
                    {diffs.map((d, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-text1">
                          {d.campo}:
                        </span>
                        {d.antes !== null && (
                          <span className="text-text3 line-through">
                            {typeof d.antes === 'object' ? JSON.stringify(d.antes) : String(d.antes)}
                          </span>
                        )}
                        {d.antes !== null && d.despues !== null && (
                          <span className="text-text3">→</span>
                        )}
                        {d.despues !== null && (
                          <span className="font-medium text-accent">
                            {typeof d.despues === 'object' ? JSON.stringify(d.despues) : String(d.despues)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {selectedLog.datos_antes && (
              <div>
                <span className="text-[10px] font-mono text-text3 uppercase tracking-wider block mb-1">
                  Estado Anterior (datos_antes)
                </span>
                <pre className="p-3 rounded-xl bg-surface-alt border border-border font-mono text-[11px] text-text2 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(parsePayload(selectedLog.datos_antes), null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.datos_despues && (
              <div>
                <span className="text-[10px] font-mono text-text3 uppercase tracking-wider block mb-1">
                  Estado Resultante (datos_despues)
                </span>
                <pre className="p-3 rounded-xl bg-surface-alt border border-border font-mono text-[11px] text-text2 overflow-x-auto max-h-48 leading-relaxed">
                  {JSON.stringify(parsePayload(selectedLog.datos_despues), null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  )
}
