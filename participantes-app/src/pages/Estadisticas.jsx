import { useState, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
} from 'recharts'
import {
  Users,
  FileText,
  Flame,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Check,
  Calendar,
  Filter,
  X,
  RotateCcw,
  Sparkles,
  Info,
  PieChart as PieIcon,
  LineChart as LineIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPO_LABEL = {
  T: 'Titular',
  A: 'Asistente',
  X: 'Participación',
  LB: 'Lectura Bíblica',
  P: 'Presidente',
  TB: 'Tesoros',
  PE: 'Perlas',
  SMT_DSC: 'Discurso',
  EBC: 'Est. Bíblico',
  LEBC: 'Lector EBC',
  VC: 'Vida Cristiana',
  NC: 'Nec. Congr.',
  ORACION_C: 'Oración conclusión',
}

function initials(nombre) {
  return (nombre || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ── Custom Tooltips Recharts ──────────────────────────────────
function TipoTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { tipo, count, label } = payload[0].payload

  return (
    <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-text1">{tipo}</span>
        <span className="text-text3 text-[11px]">({label})</span>
      </div>
      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
        {count} {count === 1 ? 'participación' : 'participaciones'}
      </div>
    </div>
  )
}

function MesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const { count, personas } = payload[0].payload

  return (
    <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <div className="font-semibold text-text1">{label}</div>
      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
        {count} {count === 1 ? 'participación' : 'participaciones'}
      </div>
      <div className="text-text3 text-[11px]">{personas} participantes distintos</div>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, count, percent, color } = payload[0].payload

  return (
    <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-text1">{name}</span>
      </div>
      <div className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
        {count} {count === 1 ? 'participación' : 'participaciones'} ({percent.toFixed(1)}%)
      </div>
    </div>
  )
}

function LineTimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs space-y-2 min-w-[170px]">
      <div className="font-semibold text-text1 pb-1 border-b border-zinc-100 dark:border-zinc-800">
        {label}
      </div>
      <div className="space-y-1.5">
        {payload.map(p => (
          <div key={p.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-text2 text-[11px]">{p.name}:</span>
            </div>
            <span className="font-mono font-semibold text-text1">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tarjeta Contenedora de Estadísticas ───────────────────────
function StatCard({ title, icon: Icon, badge, children }) {
  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl p-5 flex flex-col shadow-2xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-text3" />}
          <h3 className="text-sm font-semibold text-text1 tracking-tight">{title}</h3>
        </div>
        {badge && (
          <Badge variant="neutral" size="xs">
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ── Barra de Progreso Personalizada ───────────────────────────
function CustomBar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
      <div className="w-36 shrink-0 truncate text-xs font-medium text-text1" title={label}>
        {label}
      </div>
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs font-semibold text-text2 w-8 text-right shrink-0">
        {value}
      </span>
    </div>
  )
}

// ── Componente Principal ──────────────────────────────────────
export default function Estadisticas() {
  const [personas, setPersonas] = useState([])
  const [participaciones, setParticipaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [filterLista, setFilterLista] = useState('')
  const [filterMes, setFilterMes] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [{ data: ps, error: psErr }, { data: rs, error: rsErr }] = await Promise.all([
        supabase.from('personas').select('*').order('nombre'),
        supabase.from('participaciones').select('*').order('fecha'),
      ])
      if (psErr) throw psErr
      if (rsErr) throw rsErr
      setPersonas(ps || [])
      setParticipaciones(rs || [])
    } catch (err) {
      console.error('[fetchData]', err)
      setFetchError(err?.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const canal = supabase
      .channel('stats-sync-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // Aplicar filtros
  const regs = participaciones.filter(r => {
    if (filterLista && r.lista !== filterLista) return false
    if (filterMes && r.mes !== filterMes) return false
    return true
  })

  const psFiltradas = personas.filter(p => {
    if (filterLista && p.lista !== filterLista) return false
    return true
  })

  // Cálculos estadísticos
  const totalRegs = regs.length
  const totalActivos = psFiltradas.filter(p => p.activo).length
  const totalInact = psFiltradas.filter(p => !p.activo).length
  const pesoTotal = regs.reduce((acc, r) => acc + (r.peso || 1), 0)
  const promedioPorActivo =
    totalActivos > 0 ? (totalRegs / totalActivos).toFixed(1) : '0'

  // Por tipo
  const porTipo = {}
  regs.forEach(r => {
    porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1
  })
  const dataTipo = Object.entries(porTipo)
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, count]) => ({
      tipo,
      count,
      label: TIPO_LABEL[tipo] || tipo,
    }))

  // Por mes
  const porMes = {}
  regs.forEach(r => {
    porMes[r.mes] = (porMes[r.mes] || 0) + 1
  })

  // Por persona (Top 10)
  const porPersona = {}
  regs.forEach(r => {
    porPersona[r.nombre] = (porPersona[r.nombre] || 0) + 1
  })
  const topPersonas = Object.entries(porPersona)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  const maxPersona = topPersonas[0]?.[1] || 1

  // Personas sin participaciones
  const conRegs = new Set(regs.map(r => r.clave))
  const sinRegs = psFiltradas.filter(p => p.activo && !conRegs.has(p.clave))

  // Personas con poca actividad (1-2 participaciones)
  const regCountByClave = {}
  regs.forEach(r => {
    if (r.clave) regCountByClave[r.clave] = (regCountByClave[r.clave] || 0) + 1
  })
  const pocaActividad = psFiltradas
    .filter(p => p.activo && regCountByClave[p.clave] >= 1 && regCountByClave[p.clave] <= 2)
    .map(p => ({ ...p, count: regCountByClave[p.clave] }))
    .sort((a, b) => a.count - b.count || a.nombre.localeCompare(b.nombre))

  // Meses sin actividad
  const mesesConActividad = new Set(regs.map(r => r.mes))
  const mesesSinActividad = MESES.filter(m => !mesesConActividad.has(m))

  // Personas por mes
  const personasPorMes = {}
  regs.forEach(r => {
    if (!personasPorMes[r.mes]) personasPorMes[r.mes] = new Set()
    personasPorMes[r.mes].add(r.clave)
  })

  const dataMes = MESES.filter(m => porMes[m]).map(mes => ({
    mes,
    mesAbr: mes.slice(0, 3),
    count: porMes[mes] || 0,
    personas: personasPorMes[mes]?.size || 0,
  }))

  // ── Distribución Mat vs Anc/SM (PieChart) ──
  const totalMat = regs.filter(r => r.lista === 'Mat').length
  const totalAncSM = regs.filter(r => r.lista === 'Anc/SM').length
  const totalMatAnc = totalMat + totalAncSM
  const dataPie = [
    {
      name: 'Matriculados',
      key: 'Mat',
      count: totalMat,
      percent: totalMatAnc > 0 ? (totalMat / totalMatAnc) * 100 : 0,
      color: '#10B981',
    },
    {
      name: 'Ancianos / SM',
      key: 'Anc/SM',
      count: totalAncSM,
      percent: totalMatAnc > 0 ? (totalAncSM / totalMatAnc) * 100 : 0,
      color: '#3B82F6',
    },
  ].filter(d => d.count > 0)

  // ── Timeline por Mes y Tipo (LineChart) ──
  const personaMap = new Map(personas.map(p => [p.clave, p]))
  const dataTimeline = MESES.map(mes => {
    const regsDelMes = regs.filter(r => r.mes === mes)
    let matCount = 0
    let ancCount = 0
    let smCount = 0
    let ncCount = 0

    regsDelMes.forEach(r => {
      if (r.tipo === 'NC') {
        ncCount++
      } else if (r.lista === 'Mat') {
        matCount++
      } else {
        const p = personaMap.get(r.clave)
        if (p?.estatus === 'Anciano' || r.tipo === 'P' || r.tipo === 'VC') {
          ancCount++
        } else if (p?.estatus === 'Siervo Ministerial') {
          smCount++
        } else {
          ancCount++
        }
      }
    })

    return {
      mes,
      mesAbr: mes.slice(0, 3),
      Mat: matCount,
      Anc: ancCount,
      SM: smCount,
      NC: ncCount,
      Total: matCount + ancCount + smCount + ncCount,
    }
  })

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <h3 className="text-base font-semibold text-text1">Error de carga</h3>
        <p className="text-xs text-text3 font-mono">{fetchError}</p>
        <Button variant="outline" size="sm" icon={RotateCcw} onClick={fetchData}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER Y FILTROS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Estadísticas
            </h1>
            <Badge variant="neutral" size="sm">
              {totalRegs} registros computados
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Balance anual de participaciones, métricas de actividad y distribución mensual.
          </p>
        </div>

        {/* Filtros de la Barra */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Lista */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
            {[
              { id: '', label: 'Todas' },
              { id: 'Mat', label: 'Matriculados' },
              { id: 'Anc/SM', label: 'Ancianos / SM' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterLista(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  filterLista === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selector Mes */}
          <div className="w-36">
            <Select
              value={filterMes}
              onChange={e => setFilterMes(e.target.value)}
              size="sm"
            >
              <option value="">Todos los meses</option>
              {MESES.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          {(filterLista || filterMes) && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => {
                setFilterLista('')
                setFilterMes('')
              }}
              title="Limpiar filtros"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {totalRegs === 0 ? (
        <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl py-16 px-6 text-center flex flex-col items-center justify-center min-h-[380px] shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center mb-4 text-emerald-700 dark:text-emerald-300">
            <BarChart3 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-text1">Sin estadísticas registradas</h3>
          <p className="text-xs text-text3 max-w-sm mt-1.5 leading-relaxed">
            No se han registrado participaciones con los filtros seleccionados para calcular las métricas.
          </p>
        </div>
      ) : (
        <>
          {/* ── TARJETAS KPI PRINCIPALES ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-text3">
                <span className="text-xs font-medium">Personas activas</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-mono text-text1 tracking-tight">
                {totalActivos}
              </div>
              <span className="text-[11px] text-text3 block">
                {totalInact} registradas como inactivas
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-text3">
                <span className="text-xs font-medium">Total participaciones</span>
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
                {totalRegs}
              </div>
              <span className="text-[11px] text-text3 block">
                Asignaciones en el año actual
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-text3">
                <span className="text-xs font-medium">Peso acumulado</span>
                <Flame className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-text1 tracking-tight">
                {pesoTotal}
              </div>
              <span className="text-[11px] text-text3 block">
                Puntaje de esfuerzo relativo
              </span>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-text3">
                <span className="text-xs font-medium">Promedio por activo</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-text1 tracking-tight">
                {promedioPorActivo}
              </div>
              <span className="text-[11px] text-text3 block">
                Part. promedio por persona
              </span>
            </div>
          </div>

          {/* ── CUADRÍCULA DE GRÁFICOS Y ANÁLISIS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Gráfico: Por Tipo */}
            <StatCard
              title="Participaciones por tipo de asignación"
              icon={BarChart3}
              badge={`${dataTipo.length} tipos`}
            >
              {dataTipo.length === 0 ? (
                <div className="py-12 text-center text-xs text-text3">Sin datos</div>
              ) : (
                <div className="pt-2">
                  <ResponsiveContainer width="100%" height={Math.max(220, dataTipo.length * 32 + 20)}>
                    <BarChart
                      data={dataTipo}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 36, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="tipo"
                        width={40}
                        tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<TipoTooltip />} cursor={{ fill: 'rgba(21, 128, 61, 0.08)' }} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        {dataTipo.map(({ tipo }) => (
                          <Cell key={tipo} fill="#15803D" fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </StatCard>

            {/* Gráfico: Por Mes */}
            <StatCard
              title="Participaciones por mes"
              icon={Calendar}
              badge={`${dataMes.length} meses activos`}
            >
              {dataMes.length === 0 ? (
                <div className="py-12 text-center text-xs text-text3">Sin datos</div>
              ) : (
                <div className="pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dataMes} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="mesAbr"
                        tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<MesTooltip />} cursor={{ fill: 'rgba(21, 128, 61, 0.08)' }} />
                      <Bar
                        dataKey="count"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                        fill="#15803D"
                        fillOpacity={0.85}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  {mesesSinActividad.length > 0 && !filterMes && (
                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono text-[10px] text-text3 uppercase tracking-wider">
                        Sin actividad:
                      </span>
                      {mesesSinActividad.map(m => (
                        <span
                          key={m}
                          className="font-mono text-[10px] bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded border border-red-200/60 dark:border-red-800/60"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </StatCard>

            {/* Gráfico 3: Distribución Mat vs Anc/SM */}
            <StatCard
              title="Distribución Matriculados vs Ancianos / SM"
              icon={PieIcon}
              badge={`${dataPie.length} grupos`}
            >
              {dataPie.length === 0 ? (
                <div className="py-12 text-center text-xs text-text3">Sin datos</div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-2">
                  <ResponsiveContainer width="100%" height={210}>
                    <PieChart>
                      <Tooltip content={<PieTooltip />} />
                      <Pie
                        data={dataPie}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        stroke="none"
                      >
                        {dataPie.map(entry => (
                          <Cell key={entry.key} fill={entry.color} fillOpacity={0.9} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Leyenda personalizada con badges y porcentajes */}
                  <div className="flex items-center justify-center gap-6 mt-1 flex-wrap text-xs">
                    {dataPie.map(entry => (
                      <div key={entry.key} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-text2 text-xs font-medium">{entry.name}:</span>
                        <span className="font-mono font-semibold text-text1">
                          {entry.count} ({entry.percent.toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </StatCard>

            {/* Gráfico 4: Evolución Temporal por Mes */}
            <StatCard
              title="Evolución mensual por tipo"
              icon={LineIcon}
              badge="Timeline anual"
            >
              {regs.length === 0 ? (
                <div className="py-12 text-center text-xs text-text3">Sin datos</div>
              ) : (
                <div className="pt-2">
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart
                      data={dataTimeline}
                      margin={{ top: 10, right: 16, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="mesAbr"
                        tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#71717a' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<LineTimelineTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="Mat"
                        name="Matriculados"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#10B981' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Anc"
                        name="Ancianos"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#3B82F6' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="SM"
                        name="Siervos Min."
                        stroke="#8B5CF6"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#8B5CF6' }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="NC"
                        name="Nec. Congr."
                        stroke="#EF4444"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#EF4444' }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Leyenda con badges de color */}
                  <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex-wrap text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                      <span className="text-text2">Matriculados</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
                      <span className="text-text2">Ancianos</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                      <span className="text-text2">Siervos Min.</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                      <span className="text-text2">Nec. Congr.</span>
                    </div>
                  </div>
                </div>
              )}
            </StatCard>

            {/* Top 10 Participantes */}
            <StatCard title="Participantes más activos (Top 10)" icon={Flame}>
              {topPersonas.length === 0 ? (
                <div className="py-12 text-center text-xs text-text3">Sin datos</div>
              ) : (
                <div className="space-y-1">
                  {topPersonas.map(([nombre, count]) => (
                    <CustomBar key={nombre} label={nombre} value={count} max={maxPersona} />
                  ))}
                </div>
              )}
            </StatCard>

            {/* Personas sin asignaciones / Poca actividad */}
            <div className="space-y-5">
              {/* Sin participaciones */}
              <StatCard
                title="Personas activas sin participaciones"
                icon={AlertTriangle}
                badge={sinRegs.length ? `${sinRegs.length} pendientes` : 'Al día'}
              >
                {sinRegs.length === 0 ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <Check className="w-4 h-4" />
                    <span>Todas las personas activas tienen al menos una participación</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {sinRegs.map(p => (
                      <div
                        key={p.clave}
                        className="p-2 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                              p.sexo === 'F'
                                ? 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40'
                                : 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
                            }`}
                          >
                            {initials(p.nombre)}
                          </div>
                          <span className="font-mono text-text3 text-[11px]">{p.clave}</span>
                          <span className="font-medium text-text1 truncate">{p.nombre}</span>
                        </div>
                        <Badge variant="neutral" size="xs">
                          {p.lista}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </StatCard>

              {/* Poca actividad */}
              <StatCard
                title="Personas con baja actividad (1–2 partes)"
                icon={Info}
                badge={pocaActividad.length ? `${pocaActividad.length} personas` : 'Ninguna'}
              >
                {pocaActividad.length === 0 ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                    <Check className="w-4 h-4" />
                    <span>No hay participantes con baja actividad en este periodo</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {pocaActividad.map(p => (
                      <div
                        key={p.clave}
                        className="p-2 rounded-lg bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                              p.sexo === 'F'
                                ? 'bg-purple-500/10 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40'
                                : 'bg-blue-500/10 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40'
                            }`}
                          >
                            {initials(p.nombre)}
                          </div>
                          <span className="font-mono text-text3 text-[11px]">{p.clave}</span>
                          <span className="font-medium text-text1 truncate">{p.nombre}</span>
                        </div>
                        <Badge variant="warning" size="xs">
                          {p.count} part.
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </StatCard>
            </div>
          </div>

          {/* ── TABLA RESUMEN MENSUAL DETALLADO ── */}
          {!filterMes && (
            <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text1 tracking-tight">
                  Resumen mensual consolidado
                </h3>
                <span className="font-mono text-xs text-text3">
                  Distribución anual
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-max">
                  <thead className="bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
                    <tr>
                      <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider">
                        Mes
                      </th>
                      <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                        Total Registros
                      </th>
                      <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                        Personas Distintas
                      </th>
                      <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                        Matriculados
                      </th>
                      <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                        Ancianos y SM
                      </th>
                      <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                        Peso Acumulado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {MESES.map(mes => {
                      const rMes = regs.filter(r => r.mes === mes)
                      if (rMes.length === 0) return null
                      const pesoMes = rMes.reduce((a, r) => a + (r.peso || 1), 0)
                      const matMes = rMes.filter(r => r.lista === 'Mat').length
                      const ancMes = rMes.filter(r => r.lista === 'Anc/SM').length

                      return (
                        <tr
                          key={mes}
                          className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-text1">{mes}</td>
                          <td className="px-3 py-3 text-center font-mono text-text2">
                            {rMes.length}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-text2">
                            {personasPorMes[mes]?.size || 0}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-text2">
                            {matMes}
                          </td>
                          <td className="px-3 py-3 text-center font-mono text-text2">
                            {ancMes}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {pesoMes}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}