import { memo, useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileDown,
  FileText,
  GripVertical,
  History,
  Info,
  LayoutGrid,
  Loader2,
  Music,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { Dialog } from '../ui/Dialog'
import { formatFechaLegible, formatRangoSemanaPrograma, getHoyLocalIso } from '../../lib/fechas'
import { buildLogResumenCorto } from '../../lib/homeAlertas'
import { buildUsuariosByEmailMap, resolveAutorLog, getTablaLabel } from '../../lib/auditoria'
import {
  GRID_COLS,
  WIDGET_CATALOG,
  getWidgetMeta,
  getColSpanClass,
  getRowSpanClass,
  getColStartClass,
  getRowStartClass,
  resizeWidgetWithNeighbors,
  moveWidgetInGrid,
} from './homeWidgetsConfig'

const DESKTOP_ROW_PX = 128
const GRID_GAP_PX = 16
const ROW_STRIDE_PX = DESKTOP_ROW_PX + GRID_GAP_PX
const FLIP_DURATION_MS = 230
const FLIP_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

const CONTOUR_HANDLES = [
  {
    key: 'nw',
    label: 'Redimensionar esquina superior izquierda',
    className: '-top-1.5 -left-1.5 w-3.5 h-3.5 rounded-full cursor-nwse-resize',
  },
  {
    key: 'n',
    label: 'Redimensionar borde superior',
    className: '-top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 rounded-full cursor-ns-resize',
  },
  {
    key: 'ne',
    label: 'Redimensionar esquina superior derecha',
    className: '-top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full cursor-nesw-resize',
  },
  {
    key: 'e',
    label: 'Redimensionar borde derecho',
    className: 'top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full cursor-ew-resize',
  },
  {
    key: 'se',
    label: 'Redimensionar esquina inferior derecha',
    className: '-bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full cursor-nwse-resize',
  },
  {
    key: 's',
    label: 'Redimensionar borde inferior',
    className: '-bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 rounded-full cursor-ns-resize',
  },
  {
    key: 'sw',
    label: 'Redimensionar esquina inferior izquierda',
    className: '-bottom-1.5 -left-1.5 w-3.5 h-3.5 rounded-full cursor-nesw-resize',
  },
  {
    key: 'w',
    label: 'Redimensionar borde izquierdo',
    className: 'top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-8 rounded-full cursor-ew-resize',
  },
]

const SECCION_VISUAL = {
  APERTURA: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    bar: 'bg-emerald-600 dark:bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    short: 'Apertura',
  },
  TB: {
    dot: 'bg-teal-500',
    bar: 'bg-teal-500',
    text: 'text-teal-700 dark:text-teal-300',
    short: 'Tesoros',
  },
  SMT: {
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
    short: 'Maestros',
  },
  VC: {
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
    short: 'Vida Cristiana',
  },
  CIERRE: {
    dot: 'bg-emerald-600 dark:bg-emerald-400',
    bar: 'bg-emerald-600 dark:bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    short: 'Cierre',
  },
}

const TABLA_LABEL = {
  personas: 'Participantes',
  participaciones: 'Registros',
  programa_semanas: 'Semanas',
  programa_partes: 'Partes',
  programa_asignaciones: 'Asignaciones',
  configuracion: 'Configuración',
  congregacion_config: 'Configuración',
  eventos_reunion: 'Calendario',
  usuarios_autorizados: 'Usuarios',
}

function getInitials(nombre) {
  if (!nombre || typeof nombre !== 'string') return '?'
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function formatHoraCorta(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function computeMaxEnvelope(orig, meta, handle) {
  if (!meta) return { ...orig }
  let envX = orig.x
  let envW = Math.min(meta.maxW, GRID_COLS - orig.x)
  let envY = orig.y
  let envH = meta.maxH

  if (handle.includes('w')) {
    const anchorRight = orig.x + orig.w
    envX = Math.max(0, anchorRight - meta.maxW)
    envW = anchorRight - envX
  }
  if (handle.includes('n')) {
    const anchorBottom = orig.y + orig.h
    envY = Math.max(0, anchorBottom - meta.maxH)
    envH = anchorBottom - envY
  }

  return { x: envX, y: envY, w: envW, h: envH }
}

function clampNum(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

const MemoizedWidgetBody = memo(function WidgetBody({
  id,
  w,
  h,
  isEditing,
  congregacionActiva,
  mesActual,
  anioActual,
  totalPersonas,
  totalActivos,
  participacionesMesActual,
  semanasIncompletasCount,
  semanasMesActualCount,
  proximaReunion,
  alertas,
  totalAlertasDescartadas,
  onDismissAlert,
  onRestoreAlerts,
  personasSinActividad2Meses,
  semanaActual,
  partesSemanaActual,
  progSemanaActual,
  semanaProximaReunion,
  progProximaReunion,
  seccionBreakdownProxima,
  personasPorClave,
  asignacionesPorParte,
  ultimasFechasPorClave,
  proximasSemanas,
  eventosFuturos,
  calcularProgresoSemana,
  logsRecientes,
  usuariosByEmail,
  loadingLogs,
  generatingDocx,
  handleGenerarS140Directo,
  onNavigate,
  onOpenRegistrosCreate,
  SECCION_LABEL,
  TIPO_LABEL,
  TIPOS_SOLO_VISUAL,
}) {
  switch (id) {
    case 'hero_reunion': {
      const esFinDeSemana = proximaReunion?.tipo === 'fin_semana'
      const pct = esFinDeSemana ? 100 : (progProximaReunion?.pct ?? 0)
      const size = 96
      const stroke = 9
      const radius = (size - stroke) / 2
      const circ = 2 * Math.PI * radius
      const offset = circ * (1 - Math.min(100, Math.max(0, pct)) / 100)

      return (
        <div className="bg-warm-green-gradient border border-accent-muted-border rounded-2xl p-5 shadow-2xs h-full flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 min-h-0">
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={proximaReunion?.badgeVariant || 'success'} size="xs" dot>
                  {proximaReunion?.badgeTexto || 'Próxima'}
                </Badge>
                <span className="text-[11px] font-mono uppercase tracking-wider text-text3">
                  {proximaReunion?.nombreReunion || 'Reunión Vida y Ministerio'}
                </span>
                {congregacionActiva && (
                  <span className="text-[11px] text-text3 hidden sm:inline">
                    · {congregacionActiva}
                  </span>
                )}
              </div>

              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-text1 tracking-tight leading-tight">
                  {proximaReunion?.textoFormateado || 'Sin programar'}
                </h2>
                <p className="text-xs text-text2 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                    {proximaReunion?.horaFormateada || 'Horario por definir'}
                  </span>
                  {semanaProximaReunion ? (
                    <span className="text-text3">
                      · Semana {formatRangoSemanaPrograma(semanaProximaReunion.fecha_inicio, semanaProximaReunion.fecha_fin)}
                      {semanaProximaReunion.isVirtual ? ' (sin EPUB)' : ''}
                    </span>
                  ) : !esFinDeSemana ? (
                    <span className="text-amber-700 dark:text-amber-300">
                      · Semana sin cargar en el programa
                    </span>
                  ) : null}
                </p>
              </div>

              {!isEditing && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <Button
                    variant="accent"
                    size="sm"
                    icon={CalendarDays}
                    onClick={() => onNavigate?.('programa')}
                  >
                    Abrir Programa S-140
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FileDown}
                    loading={generatingDocx}
                    onClick={handleGenerarS140Directo}
                    className="bg-surface/80"
                  >
                    Exportar Word
                  </Button>
                </div>
              )}
            </div>

            {esFinDeSemana ? (
              <div className="flex items-center gap-4 bg-surface/80 dark:bg-surface/65 border border-border rounded-xl p-3.5 shrink-0 max-w-sm">
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx={40}
                      cy={40}
                      r={33}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={7}
                      className="text-emerald-600/20 dark:text-emerald-400/20"
                    />
                    <circle
                      cx={40}
                      cy={40}
                      r={33}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={7}
                      strokeLinecap="round"
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <Badge variant="success" size="xs" dot>
                    Todo en orden
                  </Badge>
                  <div className="text-xs font-semibold text-text1 leading-snug">
                    Reunión de fin de semana
                  </div>
                  <p className="text-[11px] text-text3 leading-snug">
                    No requiere programación de asignaciones S-140 en la app.
                  </p>
                  <div className="text-[10px] font-mono text-text2 pt-0.5 truncate">
                    {progSemanaActual
                      ? `Entre semana: ${progSemanaActual.confirmadas}/${progSemanaActual.total} (${progSemanaActual.pct}%)`
                      : 'Entre semana: sin programa cargado'}
                  </div>
                </div>
              </div>
            ) : !semanaProximaReunion ? (
              <div className="flex items-center gap-3.5 bg-surface/80 dark:bg-surface/65 border border-border rounded-xl p-3.5 shrink-0 max-w-sm">
                <div className="w-11 h-11 rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <Badge variant="warning" size="xs" dot>
                    Sin programa cargado
                  </Badge>
                  <div className="text-xs font-semibold text-text1 leading-snug">
                    Semana no importada en Programa S-140
                  </div>
                  <p className="text-[11px] text-text3 leading-snug">
                    Importa el archivo EPUB del mes para ver y confirmar sus asignaciones.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 sm:gap-5 bg-surface/80 dark:bg-surface/65 border border-border rounded-xl p-3.5 shrink-0">
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={stroke}
                      className="text-border/80"
                    />
                    <circle
                      cx={size / 2}
                      cy={size / 2}
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={offset}
                      className="text-emerald-600 dark:text-emerald-400 transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="font-display text-xl font-bold text-text1 leading-none">
                      {semanaProximaReunion?.isVirtual ? (progProximaReunion?.total ?? 0) : `${pct}%`}
                    </span>
                    <span className="text-[10px] font-mono text-text3 mt-0.5">
                      {semanaProximaReunion?.isVirtual
                        ? 'sin EPUB'
                        : progProximaReunion
                        ? `${progProximaReunion.confirmadas}/${progProximaReunion.total}`
                        : '0/0'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 min-w-[140px]">
                  {seccionBreakdownProxima.map(sb => (
                    <div key={sb.sec} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="flex items-center gap-1.5 font-medium text-text2">
                          <span className={`w-2 h-2 rounded-full ${sb.visual.dot}`} />
                          {sb.visual.short}
                        </span>
                        <span className="font-mono text-text1 font-semibold">
                          {sb.confirmadas}/{sb.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${sb.visual.bar}`}
                          style={{ width: `${sb.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {h >= 3 && semanaProximaReunion && (
            <div className="pt-2.5 border-t border-accent-muted-border/60 flex items-center justify-between gap-2 flex-wrap text-xs text-text2 shrink-0">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                {semanasMesActualCount === 0
                  ? `No hay semanas EPUB cargadas para ${mesActual}.`
                  : semanasIncompletasCount === 0
                  ? `Todas las semanas de ${mesActual} están al 100%.`
                  : `${semanasIncompletasCount} semana(s) de ${mesActual} aún requieren confirmación.`}
              </span>
              <span className="font-mono text-[11px] text-text3">
                Año de servicio {anioActual}
              </span>
            </div>
          )}
        </div>
      )
    }

    case 'por_resolver': {
      const maxItems = h >= 3 || w >= 6 ? 6 : 3
      const visibleAlertas = alertas.slice(0, maxItems)
      const hiddenAlertasCount = Math.max(0, alertas.length - visibleAlertas.length)
      return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-2xs h-full flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <h2 className="font-display text-base font-semibold text-text1 truncate">
                Por resolver hoy
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isEditing && totalAlertasDescartadas > 0 && (
                <button
                  type="button"
                  onClick={onRestoreAlerts}
                  className="text-[11px] font-medium text-text3 hover:text-text1 hover:underline cursor-pointer"
                  title="Volver a mostrar avisos descartados"
                >
                  Restaurar ({totalAlertasDescartadas})
                </button>
              )}
              <Badge
                variant={
                  alertas.some(a => a.tipo === 'danger')
                    ? 'danger'
                    : alertas.length > 0
                    ? 'warning'
                    : 'success'
                }
                size="xs"
                dot
              >
                {alertas.length === 0
                  ? 'Al día'
                  : `${alertas.length} ${alertas.length === 1 ? 'aviso' : 'avisos'}`}
              </Badge>
            </div>
          </div>

          {visibleAlertas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 px-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-1.5" />
              <p className="text-xs font-semibold text-text1">Todo bajo control</p>
              <p className="text-[11px] text-text3 mt-0.5">
                No hay asignaciones vencidas ni alertas urgentes para {mesActual}.
              </p>
              {!isEditing && totalAlertasDescartadas > 0 && (
                <button
                  type="button"
                  onClick={onRestoreAlerts}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restaurar {totalAlertasDescartadas} aviso(s) descartado(s)
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-0.5">
              {visibleAlertas.map(alerta => {
                const tone =
                  alerta.tipo === 'danger'
                    ? 'bg-red-50/70 dark:bg-red-950/25 border-red-200/80 dark:border-red-900/40'
                    : alerta.tipo === 'warning'
                    ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/40'
                    : 'bg-surface-alt/65 border-border'

                const iconColor =
                  alerta.tipo === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : alerta.tipo === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-700 dark:text-emerald-400'

                return (
                  <div
                    key={alerta.id}
                    className={`group p-2.5 rounded-xl border flex flex-col gap-1.5 relative ${tone}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 shrink-0 ${iconColor}`}>
                        {alerta.tipo === 'danger' ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : alerta.tipo === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <Info className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1 pr-5">
                        <div className="text-xs font-semibold text-text1 leading-snug">
                          {alerta.titulo}
                        </div>
                        <p className="text-[11px] text-text2 leading-snug mt-0.5 line-clamp-2">
                          {alerta.mensaje}
                        </p>
                      </div>
                      {!isEditing && onDismissAlert && (
                        <button
                          type="button"
                          onClick={() => onDismissAlert(alerta.id)}
                          aria-label={`Descartar aviso: ${alerta.titulo}`}
                          title="Descartar aviso"
                          className="absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center text-text3 hover:text-text1 hover:bg-surface/80 opacity-65 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex items-center justify-end gap-3">
                        {alerta.secondaryLinkTexto && alerta.onSecondaryAction && (
                          <button
                            type="button"
                            onClick={alerta.onSecondaryAction}
                            className="text-[11px] font-medium text-text2 hover:text-text1 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            {alerta.secondaryLinkTexto}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={alerta.onAction}
                          className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          {alerta.linkTexto || 'Resolver'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
              {hiddenAlertasCount > 0 && (
                <div className="text-center text-[10px] font-mono text-text3 pt-0.5">
                  +{hiddenAlertasCount} aviso(s) adicional(es)
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    case 'kpi_participantes': {
      const pctActivos = totalPersonas > 0 ? Math.round((totalActivos / totalPersonas) * 100) : 0
      return (
        <button
          type="button"
          disabled={isEditing}
          onClick={() => onNavigate?.('personas')}
          className="w-full h-full text-left p-3.5 rounded-2xl bg-surface border border-border hover:border-border2 shadow-2xs flex flex-col justify-between transition-colors cursor-pointer disabled:cursor-grab overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 text-text3">
            <span className="text-xs font-medium truncate">Participantes activos</span>
            <span className="w-6.5 h-6.5 rounded-lg bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-display text-3xl font-bold text-text1 tracking-tight leading-none">
            {totalActivos}
          </div>
          <div className="space-y-1">
            <div className="text-[11px] text-text3 flex items-center justify-between">
              <span className="truncate">de {totalPersonas} en catálogo</span>
              <span className="font-mono text-[10px] font-semibold text-text2">
                {pctActivos}%
              </span>
            </div>
            {h >= 2 && (
              <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                  style={{ width: `${pctActivos}%` }}
                />
              </div>
            )}
          </div>
        </button>
      )
    }

    case 'kpi_confirmadas': {
      return (
        <button
          type="button"
          disabled={isEditing}
          onClick={() => onNavigate?.('registros')}
          className="w-full h-full text-left p-3.5 rounded-2xl bg-surface border border-border hover:border-border2 shadow-2xs flex flex-col justify-between transition-colors cursor-pointer disabled:cursor-grab overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 text-text3">
            <span className="text-xs font-medium truncate">
              Participaciones de {mesActual}
            </span>
            <span className="w-6.5 h-6.5 rounded-lg bg-blue-500/12 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-display text-3xl font-bold text-emerald-700 dark:text-emerald-400 tracking-tight leading-none">
            {participacionesMesActual}
          </div>
          <div className="text-[11px] text-text3 flex items-center justify-between gap-2">
            <span className="truncate">Asignaciones registradas</span>
            {progSemanaActual && h >= 2 && (
              <Badge variant={semanaActual?.isVirtual ? 'info' : 'neutral'} size="xs">
                {semanaActual?.isVirtual
                  ? `Semana: ${progSemanaActual.total} reg.`
                  : `Semana: ${progSemanaActual.pct}%`}
              </Badge>
            )}
          </div>
        </button>
      )
    }

    case 'kpi_sin_asignar': {
      const sinProgramaMes = semanasMesActualCount === 0
      return (
        <button
          type="button"
          disabled={isEditing}
          onClick={() => onNavigate?.('programa')}
          className="w-full h-full text-left p-3.5 rounded-2xl bg-surface border border-border hover:border-border2 shadow-2xs flex flex-col justify-between transition-colors cursor-pointer disabled:cursor-grab overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 text-text3">
            <span className="text-xs font-medium truncate">Semanas pendientes</span>
            <span className="w-6.5 h-6.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="font-display text-3xl font-bold text-text1 tracking-tight leading-none">
            {semanasIncompletasCount}
          </div>
          <div className="text-[11px] text-text3 flex items-center justify-between gap-2">
            <span className="truncate">en {mesActual}</span>
            <Badge
              variant={sinProgramaMes ? 'neutral' : semanasIncompletasCount === 0 ? 'success' : 'warning'}
              size="xs"
            >
              {sinProgramaMes ? 'Sin programa' : semanasIncompletasCount === 0 ? 'Al 100%' : 'Incompletas'}
            </Badge>
          </div>
        </button>
      )
    }

    case 'programa_semana': {
      return (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xs h-full flex flex-col">
          <div className="p-4 sm:p-5 bg-surface-alt/55 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <h2 className="font-display text-base sm:text-lg font-semibold text-text1 tracking-tight">
                  Agenda de la Semana Actual
                </h2>
                {semanaActual && (
                  <Badge variant="neutral" size="xs">
                    {formatRangoSemanaPrograma(semanaActual.fecha_inicio, semanaActual.fecha_fin)}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-text3 truncate">
                {semanaActual?.isVirtual
                  ? 'Registros sin guía EPUB · Asignaciones capturadas directamente.'
                  : semanaActual?.capitulo_biblico
                  ? `${semanaActual.capitulo_biblico} · Titular y ayudante unificados`
                  : 'Titular y ayudante unificados con estado de confirmación por sección.'}
              </p>
            </div>

            {semanaActual && progSemanaActual && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-semibold text-text1">
                  {semanaActual.isVirtual
                    ? `${progSemanaActual.total} reg.`
                    : `${progSemanaActual.confirmadas}/${progSemanaActual.total}`}
                </span>
                <Badge
                  variant={
                    semanaActual.isVirtual
                      ? 'info'
                      : progSemanaActual.pct === 100
                      ? 'success'
                      : progSemanaActual.pct >= 50
                      ? 'warning'
                      : 'neutral'
                  }
                  size="xs"
                >
                  {semanaActual.isVirtual ? 'Sin EPUB' : `${progSemanaActual.pct}%`}
                </Badge>
              </div>
            )}
          </div>

          {!semanaActual || partesSemanaActual.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={Calendar}
                title="No hay programa para la semana en curso"
                description="Sube el archivo EPUB en Programa S-140 para ver la agenda aquí."
                action={
                  !isEditing && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      onClick={() => onNavigate?.('programa')}
                    >
                      Ir a Programa Semanal
                    </Button>
                  )
                }
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 sm:px-5 py-2 border-b border-border/70 flex items-center gap-2 flex-wrap text-xs bg-surface shrink-0">
                <span className="font-mono text-[10px] text-text3 uppercase tracking-wider">
                  Canciones:
                </span>
                {[
                  { label: 'Apertura', num: semanaActual.cancion_apertura },
                  { label: 'VC', num: semanaActual.cancion_vc },
                  { label: 'Cierre', num: semanaActual.cancion_cierre },
                ]
                  .filter(c => c.num)
                  .map((c, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 font-mono text-[11px] bg-surface-alt text-text2 px-2 py-0.5 rounded-md border border-border"
                    >
                      <Music className="w-3 h-3 text-text3" />
                      {c.label}: <strong className="text-text1">{c.num}</strong>
                    </span>
                  ))}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:px-5 divide-y divide-border/70">
                {['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE'].map(sec => {
                  const partesSeccion = partesSemanaActual.filter(p => p.seccion === sec)
                  if (partesSeccion.length === 0) return null
                  const visual = SECCION_VISUAL[sec] || SECCION_VISUAL.APERTURA

                  return (
                    <div key={sec} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-text3">
                        <span className={`w-2 h-2 rounded-full ${visual.dot}`} />
                        <span>{SECCION_LABEL?.[sec] || sec}</span>
                      </div>

                      <div className="space-y-1">
                        {partesSeccion.map(parte => {
                          const parAsig = asignacionesPorParte.get(parte.id)
                          const asigP = parAsig?.principal
                          const asigA = parAsig?.ayudante
                          const personaP = asigP?.clave ? personasPorClave.get(asigP.clave) : null
                          const personaA = asigA?.clave ? personasPorClave.get(asigA.clave) : null
                          const isSoloVisual = TIPOS_SOLO_VISUAL.includes(parte.tipo_asignacion)
                          const isConfirmado = asigP?.confirmado

                          const nombresUnificados = personaP
                            ? personaA
                              ? `${personaP.nombre} y ${personaA.nombre}`
                              : personaP.nombre
                            : '— Sin asignar'

                          return (
                            <div
                              key={parte.id}
                              className="flex items-center justify-between gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-surface-alt/65 transition-colors text-xs"
                            >
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <span className="font-mono text-[10px] text-text3 w-5 shrink-0 pt-0.5">
                                  #{parte.numero_parte}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-text1 line-clamp-2 leading-snug break-words" title={parte.titulo}>
                                    {parte.titulo || TIPO_LABEL?.[parte.tipo_asignacion] || parte.tipo_asignacion}
                                  </div>
                                  <div className="text-[11px] text-text3 font-mono truncate mt-0.5">
                                    {TIPO_LABEL?.[parte.tipo_asignacion] || parte.tipo_asignacion}
                                    {parte.duracion_min ? ` · ${parte.duracion_min} min` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {personaP && (
                                  <span className="hidden sm:inline-flex w-6 h-6 rounded-full bg-surface-alt border border-border items-center justify-center text-[10px] font-semibold text-text2">
                                    {getInitials(personaP.nombre)}
                                  </span>
                                )}
                                <span
                                  className={`text-xs max-w-[160px] truncate ${
                                    personaP ? 'font-medium text-text1' : 'text-text3'
                                  }`}
                                  title={nombresUnificados}
                                >
                                  {nombresUnificados}
                                </span>

                                {!isSoloVisual ? (
                                  isConfirmado ? (
                                    <Badge variant="success" size="xs" dot>
                                      Confirmado
                                    </Badge>
                                  ) : asigP?.clave ? (
                                    <Badge variant="warning" size="xs" dot>
                                      Pendiente
                                    </Badge>
                                  ) : (
                                    <Badge variant="neutral" size="xs">
                                      Sin asignar
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="neutral" size="xs">
                                    Auto
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {!isEditing && (
                <div className="px-4 sm:px-5 py-2.5 border-t border-border bg-surface-alt/35 flex items-center justify-between text-xs shrink-0">
                  <span className="text-text3 truncate">
                    Lectura rápida del programa en curso.
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('semanal', { semanaId: semanaActual?.id })}
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer shrink-0"
                  >
                    <span>Ver semanal completo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    case 'mas_adelante': {
      return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-2xs h-full flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <h2 className="font-display text-base font-semibold text-text1 truncate">
                Más adelante
              </h2>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => onNavigate?.('calendario')}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
              >
                Calendario →
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
            {proximasSemanas.length === 0 && eventosFuturos.length === 0 ? (
              <div className="py-5 text-center text-xs text-text3">
                No hay semanas futuras ni eventos especiales registrados todavía.
              </div>
            ) : (
              <>
                {proximasSemanas.slice(0, h >= 3 ? 4 : 2).map(s => {
                  const prog = calcularProgresoSemana ? calcularProgresoSemana(s.id) : { pct: 0, confirmadas: 0, total: 0 }
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isEditing}
                      onClick={() => onNavigate?.(s.isVirtual ? 'semanal' : 'programa', s.isVirtual ? { semanaId: s.id } : undefined)}
                      className="w-full p-2.5 rounded-xl bg-surface-alt/55 hover:bg-surface-alt border border-border/80 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:cursor-grab"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-text1 truncate">
                          {formatRangoSemanaPrograma(s.fecha_inicio, s.fecha_fin)}
                        </div>
                        <div className="text-[11px] text-text3">
                          {s.isVirtual
                            ? `${prog.total} reg. sin guía EPUB`
                            : `${prog.confirmadas}/${prog.total} asignaciones listas`}
                        </div>
                      </div>
                      <Badge
                        variant={s.isVirtual ? 'info' : prog.pct === 100 ? 'success' : prog.pct > 0 ? 'warning' : 'neutral'}
                        size="xs"
                        dot
                      >
                        {s.isVirtual ? 'Registros' : `${prog.pct}%`}
                      </Badge>
                    </button>
                  )
                })}

                {eventosFuturos.slice(0, h >= 3 ? 2 : 1).map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    disabled={isEditing}
                    onClick={() => onNavigate?.('calendario')}
                    className="w-full p-2.5 rounded-xl bg-amber-50/55 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/35 border border-amber-200/70 dark:border-amber-900/40 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:cursor-grab"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text1 truncate">
                        {ev.titulo_evento}
                      </div>
                      <div className="text-[11px] text-text3">
                        {formatFechaLegible(ev.fecha_efectiva || ev.fecha_original, true)}
                      </div>
                    </div>
                    <Badge variant="purple" size="xs">
                      Evento
                    </Badge>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )
    }

    case 'actividad_reciente': {
      const maxLogs = h >= 3 ? 6 : 3
      const slicedLogs = logsRecientes.slice(0, maxLogs)

      return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-2xs h-full flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-4 h-4 text-text3 shrink-0" />
              <h2 className="font-display text-base font-semibold text-text1 truncate">
                Actividad reciente
              </h2>
              <Badge variant="success" size="xs" dot pulse>
                En vivo
              </Badge>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => onNavigate?.('historial')}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
              >
                Bitácora →
              </button>
            )}
          </div>

          {loadingLogs ? (
            <div className="space-y-2 py-2 flex-1">
              <div className="h-9 rounded-xl bg-surface-alt animate-pulse" />
              <div className="h-9 rounded-xl bg-surface-alt animate-pulse" />
            </div>
          ) : slicedLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 text-xs text-text3">
              Sin movimientos recientes en la bitácora.
            </div>
          ) : (
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
              {slicedLogs.map(log => {
                const badgeVar =
                  log.operacion === 'INSERT'
                    ? 'success'
                    : log.operacion === 'UPDATE'
                    ? 'warning'
                    : 'danger'
                const resumen = buildLogResumenCorto(log)
                const autor = resolveAutorLog(log, usuariosByEmail)
                const tablaNombre = getTablaLabel(log.tabla) || TABLA_LABEL[log.tabla] || log.tabla
                const subtitulo = resumen
                  ? `${resumen} · ${autor.labelCorto}`
                  : autor.labelCorto

                return (
                  <div
                    key={log.id}
                    className="px-2.5 py-2 rounded-xl bg-surface-alt/50 border border-border/70 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={badgeVar} size="xs">
                        {log.operacion === 'INSERT'
                          ? 'Alta'
                          : log.operacion === 'UPDATE'
                          ? 'Edición'
                          : 'Baja'}
                      </Badge>
                      <div className="min-w-0">
                        <div className="font-medium text-text1 truncate">
                          {tablaNombre}
                        </div>
                        <div
                          className="text-[10px] text-text3 truncate"
                          title={autor.email ? `${subtitulo} (${autor.email})` : subtitulo}
                        >
                          {subtitulo}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-text3 shrink-0">
                      {formatHoraCorta(log.created_at || log.fecha)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    case 'rezago_rotacion': {
      const maxRows = h >= 3 ? 6 : 4
      const listado = personasSinActividad2Meses.slice(0, maxRows)
      return (
        <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-2xs h-full flex flex-col justify-between gap-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <h2 className="font-display text-base font-semibold text-text1 truncate">
                Participantes con más espera
              </h2>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => onNavigate?.('matriz')}
                className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
              >
                Ver Matriz →
              </button>
            )}
          </div>

          {listado.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-4 px-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" />
              <p className="text-xs font-semibold text-text1">Rotación equilibrada</p>
              <p className="text-[11px] text-text3">
                Ningún participante activo supera los 2 meses sin asignar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 min-h-0 overflow-y-auto content-start">
              {listado.map(p => {
                const lastFecha = ultimasFechasPorClave.get(p.clave)
                return (
                  <button
                    key={p.clave}
                    type="button"
                    disabled={isEditing}
                    onClick={() =>
                      onNavigate?.('personas', { personaClave: p.clave, tab: 'historial' })
                    }
                    className="group w-full p-2.5 rounded-xl bg-surface-alt/55 hover:bg-surface-alt border border-border hover:border-border2 flex items-center gap-2.5 min-w-0 text-left transition-colors cursor-pointer disabled:cursor-grab"
                  >
                    <span className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-[11px] font-semibold text-text1 shrink-0">
                      {getInitials(p.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-text1 truncate">
                        {p.nombre}
                      </div>
                      <div className="text-[11px] text-text3 truncate">
                        {lastFecha
                          ? `Última: ${formatFechaLegible(lastFecha, true)}`
                          : 'Sin registros previos'}
                      </div>
                    </div>
                    {!isEditing && (
                      <ChevronRight className="w-3.5 h-3.5 text-text3 opacity-60 group-hover:opacity-100 shrink-0 transition-opacity" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    case 'accesos_rapidos': {
      const compactMode = h === 1 && w <= 4
      const gridColsClass =
        w >= 10 && h === 1 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'

      const actions = [
        {
          id: 'nuevo_registro',
          title: 'Nuevo registro',
          desc: 'Registrar participación',
          icon: Plus,
          tone: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
          onClick: () => (onOpenRegistrosCreate ? onOpenRegistrosCreate() : onNavigate?.('registros')),
        },
        {
          id: 's140',
          title: 'Generar S-140',
          desc: 'Plantilla Word (.docx)',
          icon: generatingDocx ? Loader2 : FileDown,
          spin: generatingDocx,
          disabled: generatingDocx,
          tone: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
          onClick: handleGenerarS140Directo,
        },
        {
          id: 'personas',
          title: 'Ver personas',
          desc: 'Catálogo y rotación',
          icon: Users,
          tone: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
          onClick: () => onNavigate?.('personas'),
        },
        {
          id: 'stats',
          title: 'Estadísticas',
          desc: 'Métricas y balance',
          icon: Sparkles,
          tone: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
          onClick: () => onNavigate?.('estadisticas'),
        },
      ]

      return (
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-2xs h-full flex flex-col justify-between gap-2.5 overflow-hidden">
          {!compactMode && (
            <div className="flex items-center justify-between gap-2 shrink-0">
              <h2 className="font-display text-base font-semibold text-text1">
                Accesos Rápidos
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text3">
                Atajos
              </span>
            </div>
          )}

          <div className={`grid ${gridColsClass} gap-2 flex-1 min-h-0`}>
            {actions.map(act => {
              const Icon = act.icon
              return (
                <button
                  key={act.id}
                  type="button"
                  disabled={isEditing || act.disabled}
                  onClick={act.onClick}
                  className={`rounded-xl bg-surface-alt/55 hover:bg-surface-alt border border-border hover:border-border2 transition-all text-left flex ${
                    compactMode
                      ? 'items-center gap-2 p-2'
                      : 'flex-col justify-between p-2.5'
                  } cursor-pointer disabled:opacity-60 disabled:cursor-grab overflow-hidden`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 ${act.tone}`}>
                      <Icon className={`w-3.5 h-3.5 ${act.spin ? 'animate-spin' : ''}`} />
                    </span>
                    {!compactMode && (
                      <ChevronRight className="w-3.5 h-3.5 text-text3" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-text1 truncate">
                      {act.title}
                    </div>
                    {!compactMode && (
                      <div className="text-[11px] text-text3 truncate">
                        {act.desc}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    default:
      return null
  }
})

function WidgetFrame({
  item,
  isEditing,
  isActiveInteraction,
  registerNode,
  onStartMove,
  onStartResize,
  onResizeStep,
  onRemove,
  children,
}) {
  const meta = getWidgetMeta(item.id)
  const colStart = getColStartClass(item.x)
  const colSpan = getColSpanClass(item.w)
  const rowStart = getRowStartClass(item.y)
  const rowSpan = getRowSpanClass(item.h)

  return (
    <div
      ref={el => registerNode(item.id, el)}
      className={`${colStart} ${colSpan} ${rowStart} ${rowSpan} min-w-0 h-full flex flex-col relative transition-[box-shadow,ring-color] duration-150 ${
        isEditing
          ? `group rounded-2xl ring-2 select-none ${
              isActiveInteraction
                ? 'ring-emerald-600 dark:ring-emerald-400 z-30 shadow-xl'
                : 'ring-emerald-600/45 dark:ring-emerald-400/40 z-10'
            }`
          : ''
      }`}
    >
      {/* 8 puntos/manijas de redimensionado en el contorno (estilo Word / Android en escritorio xl+) */}
      {isEditing &&
        CONTOUR_HANDLES.map(h => (
          <button
            key={h.key}
            type="button"
            tabIndex={-1}
            aria-label={`${h.label}: ${meta?.titulo || item.id}`}
            title={`${h.label} (${item.w}×${item.h})`}
            onPointerDown={e => onStartResize(e, item, h.key)}
            className={`hidden xl:block absolute z-40 touch-none bg-surface border-2 border-emerald-600 dark:border-emerald-400 shadow-sm hover:scale-125 hover:bg-emerald-600 dark:hover:bg-emerald-400 transition-transform ${h.className}`}
          />
        ))}

      {/* Barra superior compacta de edición / movimiento / controles rápidos */}
      {isEditing && meta && (
        <div
          onPointerDown={e => {
            if (e.target.closest('button, select')) return
            onStartMove(e, item)
          }}
          className="mb-1 px-2.5 py-1 rounded-xl bg-surface-alt/95 border border-border2 flex flex-wrap items-center justify-between gap-1.5 text-[11px] shadow-2xs cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold text-text1 truncate max-w-[130px]">
              {meta.titulo}
            </span>
            <span
              className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-text2 shrink-0"
              title={`Límites: mín ${meta.minW}×${meta.minH}, máx ${meta.maxW}×${meta.maxH}`}
            >
              {item.w}×{item.h}
            </span>
          </div>

          <div
            className="flex items-center gap-1 flex-wrap"
            onPointerDown={e => e.stopPropagation()}
          >
            {Array.isArray(meta.presets) && meta.presets.length > 0 && (
              <select
                aria-label={`Tamaño sugerido para ${meta.titulo}`}
                value={`${item.w}x${item.h}`}
                onChange={e => {
                  const [pw, ph] = e.target.value.split('x').map(Number)
                  if (pw && ph) onResizeStep(item, pw, ph)
                }}
                className="h-5.5 px-1 rounded-md bg-surface border border-border text-[10px] font-medium text-text2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                {!meta.presets.some(p => p.w === item.w && p.h === item.h) && (
                  <option value={`${item.w}x${item.h}`}>
                    {item.w}×{item.h}
                  </option>
                )}
                {meta.presets.map(p => (
                  <option key={p.label} value={`${p.w}x${p.h}`}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}

            <div className="xl:hidden inline-flex items-center rounded-md border border-border bg-surface overflow-hidden">
              <span className="px-1 text-[10px] font-mono text-text3">W</span>
              <button
                type="button"
                aria-label={`Reducir ancho de ${meta.titulo}`}
                disabled={item.w <= meta.minW}
                onClick={() => onResizeStep(item, item.w - 1, item.h)}
                className="w-5 h-5 flex items-center justify-center text-text2 hover:bg-surface-alt disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                -
              </button>
              <button
                type="button"
                aria-label={`Aumentar ancho de ${meta.titulo}`}
                disabled={item.w >= meta.maxW}
                onClick={() => onResizeStep(item, item.w + 1, item.h)}
                className="w-5 h-5 flex items-center justify-center text-text2 hover:bg-surface-alt disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            <div className="xl:hidden inline-flex items-center rounded-md border border-border bg-surface overflow-hidden">
              <span className="px-1 text-[10px] font-mono text-text3">H</span>
              <button
                type="button"
                aria-label={`Reducir alto de ${meta.titulo}`}
                disabled={item.h <= meta.minH}
                onClick={() => onResizeStep(item, item.w, item.h - 1)}
                className="w-5 h-5 flex items-center justify-center text-text2 hover:bg-surface-alt disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                -
              </button>
              <button
                type="button"
                aria-label={`Aumentar alto de ${meta.titulo}`}
                disabled={item.h >= meta.maxH}
                onClick={() => onResizeStep(item, item.w, item.h + 1)}
                className="w-5 h-5 flex items-center justify-center text-text2 hover:bg-surface-alt disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            <button
              type="button"
              title="Quitar widget del inicio"
              aria-label={`Quitar ${meta.titulo} del inicio`}
              onClick={() => onRemove(item.id)}
              className="w-5.5 h-5.5 rounded-md border border-red-200 dark:border-red-900/50 bg-red-50/80 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido del widget (arrastrable en modo edición) */}
      <div
        onPointerDown={e => {
          if (!isEditing) return
          if (e.target.closest('button, select, input, a')) return
          onStartMove(e, item)
        }}
        className={`flex-1 min-h-0 flex flex-col ${
          isEditing ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export default function HomeWidgetGrid({
  layout = [],
  isEditing = false,
  onToggleEdit,
  onCommitLayout,
  onRemoveWidget,
  onAddWidget,
  onResetLayout,
  congregacionActiva,
  mesActual,
  anioActual,
  totalPersonas,
  totalActivos,
  participacionesMesActual,
  semanas = [],
  asignaciones = [],
  personas = [],
  participaciones = [],
  eventosReunion = [],
  semanasIncompletasMesActual = [],
  semanasMesActualCount = 0,
  proximaReunion,
  alertas = [],
  totalAlertasDescartadas = 0,
  onDismissAlert,
  onRestoreAlerts,
  personasSinActividad2Meses = [],
  semanaActual,
  partesSemanaActual = [],
  progSemanaActual,
  semanaProximaReunion,
  partesProximaReunion = [],
  progProximaReunion,
  calcularProgresoSemana,
  logsRecientes = [],
  usuarios = [],
  loadingLogs = false,
  generatingDocx = false,
  handleGenerarS140Directo,
  onNavigate,
  onOpenRegistrosCreate,
  SECCION_LABEL,
  TIPO_LABEL,
  TIPOS_SOLO_VISUAL = [],
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [interaction, setInteraction] = useState(null)

  const gridContainerRef = useRef(null)
  const widgetNodesRef = useRef(new Map())
  const prevRectsRef = useRef(new Map())
  const activeAnimationsRef = useRef(new Map())
  const latestInteractionRef = useRef(null)
  const dragDeltaRef = useRef(null)
  const cleanupListenersRef = useRef(null)

  const registerWidgetNode = useCallback((id, el) => {
    if (el) {
      widgetNodesRef.current.set(id, el)
    } else {
      widgetNodesRef.current.delete(id)
    }
  }, [])

  const snapshotWidgetRects = useCallback(() => {
    const snap = new Map()
    for (const [id, el] of widgetNodesRef.current.entries()) {
      if (!el) continue
      snap.set(id, el.getBoundingClientRect())
    }
    prevRectsRef.current = snap
  }, [])

  useEffect(() => {
    const animations = activeAnimationsRef.current
    return () => {
      cleanupListenersRef.current?.()
      for (const anim of animations.values()) {
        anim.cancel?.()
      }
      animations.clear()
    }
  }, [])

  const activeLayout = interaction?.previewLayout || layout

  const visibleWidgets = useMemo(
    () =>
      activeLayout
        .filter(item => item.visible !== false)
        .sort((a, b) => a.y - b.y || a.x - b.x),
    [activeLayout]
  )

  const layoutSignature = useMemo(
    () => visibleWidgets.map(w => `${w.id}:${w.x},${w.y},${w.w},${w.h}`).join('|'),
    [visibleWidgets]
  )

  const hiddenWidgets = useMemo(
    () => activeLayout.filter(item => item.visible === false),
    [activeLayout]
  )

  const totalMeshRows = useMemo(() => {
    const maxRow = visibleWidgets.reduce((acc, item) => Math.max(acc, item.y + item.h), 9)
    const previewRow = interaction?.previewRect
      ? interaction.previewRect.y + interaction.previewRect.h
      : 0
    return Math.min(28, Math.max(9, maxRow + (isEditing ? 2 : 0), previewRow))
  }, [visibleWidgets, isEditing, interaction])

  // Motor FLIP acelerado por GPU ante cualquier reacomodo, ajuste elástico, inserción o retiro
  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current
    if (!prevRects || prevRects.size === 0) return
    prevRectsRef.current = new Map()

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const activeMoveId =
      latestInteractionRef.current?.mode === 'move' && latestInteractionRef.current?.moved
        ? latestInteractionRef.current.id
        : null

    for (const item of visibleWidgets) {
      const el = widgetNodesRef.current.get(item.id)
      if (!el) continue

      // Mantener enganchado al cursor el widget que se está moviendo sin competir con FLIP
      if (item.id === activeMoveId && dragDeltaRef.current) {
        const { dx, dy, orig, colStride } = dragDeltaRef.current
        const residX = dx - (item.x - orig.x) * colStride
        const residY = dy - (item.y - orig.y) * ROW_STRIDE_PX
        el.style.transform = `translate3d(${residX.toFixed(1)}px, ${residY.toFixed(1)}px, 0) scale(1.012)`
        continue
      }

      if (reducedMotion) continue

      const prev = prevRects.get(item.id)
      if (!prev) continue

      const priorAnim = activeAnimationsRef.current.get(item.id)
      if (priorAnim) {
        priorAnim.cancel()
        activeAnimationsRef.current.delete(item.id)
      }

      const next = el.getBoundingClientRect()
      if (next.width === 0 || next.height === 0) continue

      const dx = prev.left - next.left
      const dy = prev.top - next.top
      const sx = prev.width / next.width
      const sy = prev.height / next.height

      if (
        Math.abs(dx) < 1 &&
        Math.abs(dy) < 1 &&
        Math.abs(sx - 1) < 0.01 &&
        Math.abs(sy - 1) < 0.01
      ) {
        continue
      }

      if (typeof el.animate === 'function') {
        const anim = el.animate(
          [
            {
              transformOrigin: '0 0',
              transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})`,
            },
            {
              transformOrigin: '0 0',
              transform: 'translate3d(0, 0, 0) scale(1, 1)',
            },
          ],
          {
            duration: FLIP_DURATION_MS,
            easing: FLIP_EASING,
          }
        )
        activeAnimationsRef.current.set(item.id, anim)
        anim.onfinish = () => {
          if (activeAnimationsRef.current.get(item.id) === anim) {
            activeAnimationsRef.current.delete(item.id)
          }
        }
      }
    }
  }, [layoutSignature, visibleWidgets])

  // Índices O(1) memoizados para render rápido de partes, personas y rezago
  const personasPorClave = useMemo(
    () => new Map(personas.map(p => [p.clave, p])),
    [personas]
  )

  const usuariosByEmail = useMemo(
    () => buildUsuariosByEmailMap(usuarios),
    [usuarios]
  )

  const asignacionesPorParte = useMemo(() => {
    const map = new Map()
    for (const a of asignaciones) {
      if (!a?.parte_id) continue
      const existing = map.get(a.parte_id) || { principal: null, ayudante: null }
      if (a.rol === 'principal') existing.principal = a
      else if (a.rol === 'ayudante') existing.ayudante = a
      map.set(a.parte_id, existing)
    }
    return map
  }, [asignaciones])

  const seccionBreakdownProxima = useMemo(() => {
    const targetSecs = ['TB', 'SMT', 'VC']
    return targetSecs.map(sec => {
      const partesSec = partesProximaReunion.filter(
        p => p.seccion === sec && !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion)
      )
      const total = partesSec.length
      const confirmadas = partesSec.filter(
        p => asignacionesPorParte.get(p.id)?.principal?.confirmado
      ).length
      const pct = total > 0 ? Math.round((confirmadas / total) * 100) : 0
      return { sec, total, confirmadas, pct, visual: SECCION_VISUAL[sec] }
    })
  }, [partesProximaReunion, asignacionesPorParte, TIPOS_SOLO_VISUAL])

  const ultimasFechasPorClave = useMemo(() => {
    const map = new Map()
    for (const r of participaciones) {
      if (!r?.clave || !r?.fecha) continue
      const prev = map.get(r.clave)
      if (!prev || r.fecha > prev) map.set(r.clave, r.fecha)
    }
    return map
  }, [participaciones])

  const hoyLocal = getHoyLocalIso()

  const proximasSemanas = useMemo(() => {
    const baseIni = String(semanaActual?.fecha_inicio || hoyLocal).slice(0, 10)
    return semanas
      .filter(s => {
        const ini = String(s.fecha_inicio || '').slice(0, 10)
        return semanaActual ? ini > baseIni : ini >= hoyLocal
      })
      .sort((a, b) => String(a.fecha_inicio || '').localeCompare(String(b.fecha_inicio || '')))
      .slice(0, 4)
  }, [semanas, semanaActual, hoyLocal])

  const eventosFuturos = useMemo(() => {
    return (eventosReunion || [])
      .filter(e => String(e.fecha_efectiva || e.fecha_original || '').slice(0, 10) >= hoyLocal)
      .sort((a, b) =>
        String(a.fecha_efectiva || a.fecha_original || '').localeCompare(
          String(b.fecha_efectiva || b.fecha_original || '')
        )
      )
      .slice(0, 3)
  }, [eventosReunion, hoyLocal])

  const beginPointerInteraction = useCallback(
    (e, item, mode, handle = 'se') => {
      if (e.button !== 0 && e.pointerType === 'mouse') return
      if (!gridContainerRef.current) return
      e.preventDefault()
      e.stopPropagation()

      cleanupListenersRef.current?.()

      const gridRect = gridContainerRef.current.getBoundingClientRect()
      const colStride = (gridRect.width + GRID_GAP_PX) / GRID_COLS
      const startX = e.clientX
      const startY = e.clientY
      const candidateMain = gridContainerRef.current.closest('main')
      const mainScrolls =
        candidateMain &&
        candidateMain.scrollHeight > candidateMain.clientHeight + 1 &&
        /auto|scroll|overlay/.test(window.getComputedStyle(candidateMain).overflowY || '')
      const scrollEl = mainScrolls
        ? candidateMain
        : document.scrollingElement || document.documentElement
      const startScrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY
      const baseLayout = layout
      const orig = { x: item.x, y: item.y, w: item.w, h: item.h }
      const meta = getWidgetMeta(item.id) || { minW: 1, minH: 1, maxW: 12, maxH: 5 }
      const maxBounds = mode === 'resize' ? computeMaxEnvelope(orig, meta, handle) : null

      let lastCellKey = `${mode}:${orig.x},${orig.y},${orig.w},${orig.h}`
      let latestPointer = { clientX: e.clientX, clientY: e.clientY }
      let rafId = null

      const initialState = {
        mode,
        id: item.id,
        handle,
        orig,
        maxBounds,
        previewRect: orig,
        previewLayout: baseLayout,
        moved: mode === 'resize',
      }
      latestInteractionRef.current = initialState
      dragDeltaRef.current = mode === 'move' ? { dx: 0, dy: 0, orig, colStride } : null
      setInteraction(initialState)

      function applyDragTransform(dx, dy, targetItem) {
        const el = widgetNodesRef.current.get(item.id)
        if (!el) return
        const residX = dx - (targetItem.x - orig.x) * colStride
        const residY = dy - (targetItem.y - orig.y) * ROW_STRIDE_PX
        el.style.willChange = 'transform'
        el.style.zIndex = '40'
        el.style.transform = `translate3d(${residX.toFixed(1)}px, ${residY.toFixed(1)}px, 0) scale(1.012)`
      }

      function processFrame() {
        rafId = null
        const currentScrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY
        const dx = latestPointer.clientX - startX
        const dy = latestPointer.clientY - startY + (currentScrollTop - startScrollTop)

        if (mode === 'move' && !latestInteractionRef.current?.moved) {
          if (Math.hypot(dx, dy) < 6) return
        }

        const dCols = Math.round(dx / colStride)
        const dRows = Math.round(dy / ROW_STRIDE_PX)

        if (mode === 'move') {
          dragDeltaRef.current = { dx, dy, orig, colStride }

          const nextX = clampNum(orig.x + dCols, 0, GRID_COLS - orig.w)
          const nextY = Math.max(0, orig.y + dRows)
          const cellKey = `move:${nextX},${nextY},${orig.w},${orig.h}`

          if (cellKey !== lastCellKey) {
            lastCellKey = cellKey
            snapshotWidgetRects()
            const nextLayout = moveWidgetInGrid(baseLayout, item.id, nextX, nextY)
            const placedTarget = nextLayout.find(w => w.id === item.id) || {
              ...orig,
              x: nextX,
              y: nextY,
            }
            const updatedState = {
              mode,
              id: item.id,
              handle,
              orig,
              maxBounds,
              previewRect: {
                x: placedTarget.x,
                y: placedTarget.y,
                w: placedTarget.w,
                h: placedTarget.h,
              },
              previewLayout: nextLayout,
              moved: true,
            }
            latestInteractionRef.current = updatedState
            setInteraction(updatedState)
          } else {
            if (!latestInteractionRef.current?.moved) {
              latestInteractionRef.current = { ...latestInteractionRef.current, moved: true }
            }
            const currentPlaced =
              latestInteractionRef.current?.previewLayout?.find(w => w.id === item.id) || orig
            applyDragTransform(dx, dy, currentPlaced)
          }
          return
        }

        // Modo 'resize': solo dispara reacomodo 2D y FLIP al cruzar un umbral de celda
        let left = orig.x
        let right = orig.x + orig.w
        let top = orig.y
        let bottom = orig.y + orig.h

        if (handle.includes('e')) {
          const maxPossibleW = Math.min(meta.maxW, GRID_COLS - left)
          const targetW = clampNum(right + dCols - left, meta.minW, maxPossibleW)
          right = left + targetW
        }
        if (handle.includes('w')) {
          const maxPossibleW = Math.min(meta.maxW, right)
          const targetW = clampNum(right - (left + dCols), meta.minW, maxPossibleW)
          left = right - targetW
        }
        if (handle.includes('s')) {
          const targetH = clampNum(bottom + dRows - top, meta.minH, meta.maxH)
          bottom = top + targetH
        }
        if (handle.includes('n')) {
          const maxPossibleH = Math.min(meta.maxH, bottom)
          const targetH = clampNum(bottom - (top + dRows), meta.minH, maxPossibleH)
          top = bottom - targetH
        }

        const candidateRect = {
          x: left,
          y: top,
          w: right - left,
          h: bottom - top,
        }
        const cellKey = `resize:${candidateRect.x},${candidateRect.y},${candidateRect.w},${candidateRect.h}`
        if (cellKey === lastCellKey) return
        lastCellKey = cellKey

        snapshotWidgetRects()
        const nextLayout = resizeWidgetWithNeighbors(baseLayout, item.id, candidateRect, handle)
        const placedTarget = nextLayout.find(w => w.id === item.id) || candidateRect
        const updatedState = {
          mode,
          id: item.id,
          handle,
          orig,
          maxBounds,
          previewRect: {
            x: placedTarget.x,
            y: placedTarget.y,
            w: placedTarget.w,
            h: placedTarget.h,
          },
          previewLayout: nextLayout,
          moved: true,
        }
        latestInteractionRef.current = updatedState
        setInteraction(updatedState)
      }

      function onPointerMove(ev) {
        latestPointer = { clientX: ev.clientX, clientY: ev.clientY }
        if (rafId === null) {
          rafId = window.requestAnimationFrame(processFrame)
        }
      }

      function finishInteraction(shouldCommit) {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId)
          rafId = null
        }
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerCancel)
        window.removeEventListener('keydown', onKeyDown)
        cleanupListenersRef.current = null

        const el = widgetNodesRef.current.get(item.id)
        if (el) {
          // Capturar el rectángulo visual exacto (con transform sub-píxel) antes de limpiar inline styles para FLIP de aterrizaje suave
          snapshotWidgetRects()
          el.style.transform = ''
          el.style.willChange = ''
          el.style.zIndex = ''
        }

        const latest = latestInteractionRef.current
        latestInteractionRef.current = null
        dragDeltaRef.current = null
        setInteraction(null)

        if (shouldCommit && latest?.moved && latest?.previewLayout) {
          onCommitLayout?.(latest.previewLayout)
        }
      }

      function onPointerUp() {
        finishInteraction(true)
      }

      function onPointerCancel() {
        finishInteraction(false)
      }

      function onKeyDown(ev) {
        if (ev.key === 'Escape') {
          finishInteraction(false)
        }
      }

      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      window.addEventListener('pointercancel', onPointerCancel)
      window.addEventListener('keydown', onKeyDown)

      cleanupListenersRef.current = () => {
        if (rafId !== null) {
          window.cancelAnimationFrame(rafId)
          rafId = null
        }
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
        window.removeEventListener('pointercancel', onPointerCancel)
        window.removeEventListener('keydown', onKeyDown)
      }
    },
    [layout, snapshotWidgetRects, onCommitLayout]
  )

  const handleResizeStep = useCallback(
    (item, nextW, nextH) => {
      snapshotWidgetRects()
      const handle =
        nextW !== item.w && nextH !== item.h
          ? 'se'
          : nextW !== item.w
          ? 'e'
          : 's'
      const nextLayout = resizeWidgetWithNeighbors(
        layout,
        item.id,
        { x: item.x, y: item.y, w: nextW, h: nextH },
        handle
      )
      onCommitLayout?.(nextLayout)
    },
    [layout, snapshotWidgetRects, onCommitLayout]
  )

  const handleRemoveWithFlip = useCallback(
    id => {
      snapshotWidgetRects()
      onRemoveWidget?.(id)
    },
    [snapshotWidgetRects, onRemoveWidget]
  )

  const handleAddWithFlip = useCallback(
    id => {
      snapshotWidgetRects()
      onAddWidget?.(id)
    },
    [snapshotWidgetRects, onAddWidget]
  )

  const handleResetWithFlip = useCallback(() => {
    snapshotWidgetRects()
    onResetLayout?.()
  }, [snapshotWidgetRects, onResetLayout])

  const semanasIncompletasCount = semanasIncompletasMesActual.length

  return (
    <div className="space-y-4">
      {/* Banner / Barra de personalización en modo edición */}
      {isEditing && (
        <div className="p-3.5 rounded-2xl bg-warm-green-gradient border border-accent-muted-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
              <LayoutGrid className="w-4 h-4" />
            </span>
            <div>
              <div className="text-xs font-semibold text-text1">
                Personalizando tu pantalla de Inicio
              </div>
              <p className="text-[11px] text-text2 mt-0.5">
                Arrastra cualquier tarjeta para moverla o tira de los puntos del contorno para ajustar ancho y alto. Los vecinos se ajustan o empujan automáticamente respetando sus límites mínimos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setPickerOpen(true)}
              className="bg-surface/90"
            >
              Añadir widget
              {hiddenWidgets.length > 0 ? ` (${hiddenWidgets.length})` : ''}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetWithFlip}
              className="bg-surface/90"
            >
              Restaurar sugerido
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={Check}
              onClick={onToggleEdit}
            >
              Listo
            </Button>
          </div>
        </div>
      )}

      {/* Cuadrícula dinámica 12 columnas con malla translúcida en modo edición */}
      {visibleWidgets.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-8">
          <EmptyState
            icon={LayoutGrid}
            title="Tu inicio está vacío"
            description="Ocultaste todos los widgets. Agrega uno del catálogo o restaura el diseño sugerido."
            action={
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button
                  variant="accent"
                  size="sm"
                  icon={Plus}
                  onClick={() => setPickerOpen(true)}
                >
                  Añadir widget
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={RotateCcw}
                  onClick={handleResetWithFlip}
                >
                  Restaurar diseño sugerido
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className={`relative [overflow-anchor:none] ${isEditing ? 'xl:pb-8' : ''}`}>
          {/* Malla translúcida de fondo y guías desacopladas para evitar scroll anchoring y desplazamientos de celdas */}
          {isEditing && (
            <>
              <div
                aria-hidden="true"
                className="hidden xl:grid grid-cols-12 auto-rows-[128px] gap-4 pointer-events-none select-none absolute inset-x-0 top-0 z-0 [overflow-anchor:none]"
              >
                {Array.from({ length: totalMeshRows * GRID_COLS }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-dashed border-emerald-700/20 dark:border-emerald-400/15 bg-surface-alt/25"
                  />
                ))}
              </div>

              {(interaction?.maxBounds || interaction?.previewRect) && (
                <div
                  aria-hidden="true"
                  className="hidden xl:grid grid-cols-12 auto-rows-[128px] gap-4 pointer-events-none select-none absolute inset-x-0 top-0 z-20 [overflow-anchor:none]"
                >
                  {/* Alcance máximo permitido del widget que se está redimensionando */}
                  {interaction?.maxBounds && (
                    <div
                      className={`${getColStartClass(interaction.maxBounds.x)} ${getColSpanClass(
                        interaction.maxBounds.w
                      )} ${getRowStartClass(interaction.maxBounds.y)} ${getRowSpanClass(
                        interaction.maxBounds.h
                      )} rounded-2xl border-2 border-dashed border-amber-500/75 dark:border-amber-400/65 bg-amber-500/8 dark:bg-amber-400/10 flex items-end justify-end p-2.5 z-10 transition-all duration-150 ease-out`}
                    >
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-surface/95 border border-amber-500/40 text-amber-700 dark:text-amber-300 shadow-2xs">
                        Máx permitido: {interaction.maxBounds.w}×{interaction.maxBounds.h}
                      </span>
                    </div>
                  )}

                  {/* Huella objetivo en vivo al mover / redimensionar */}
                  {interaction?.previewRect && (
                    <div
                      className={`${getColStartClass(interaction.previewRect.x)} ${getColSpanClass(
                        interaction.previewRect.w
                      )} ${getRowStartClass(interaction.previewRect.y)} ${getRowSpanClass(
                        interaction.previewRect.h
                      )} rounded-2xl border-2 border-emerald-600 dark:border-emerald-400 bg-emerald-500/15 dark:bg-emerald-400/15 flex items-start justify-end p-2.5 z-20 transition-all duration-150 ease-out`}
                    >
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-700 text-white shadow-sm">
                        {interaction.previewRect.w}×{interaction.previewRect.h}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Contenedor real de tarjetas */}
          <div
            ref={gridContainerRef}
            className="relative z-10 grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 auto-rows-[minmax(116px,auto)] xl:auto-rows-[128px] gap-4 grid-flow-dense items-stretch [overflow-anchor:none]"
          >
            {visibleWidgets.map(item => (
              <WidgetFrame
                key={item.id}
                item={item}
                isEditing={isEditing}
                isActiveInteraction={interaction?.id === item.id}
                registerNode={registerWidgetNode}
                onStartMove={(e, targetItem) => beginPointerInteraction(e, targetItem, 'move')}
                onStartResize={(e, targetItem, handleKey) =>
                  beginPointerInteraction(e, targetItem, 'resize', handleKey)
                }
                onResizeStep={handleResizeStep}
                onRemove={handleRemoveWithFlip}
              >
                <MemoizedWidgetBody
                  id={item.id}
                  w={item.w}
                  h={item.h}
                  isEditing={isEditing}
                  congregacionActiva={congregacionActiva}
                  mesActual={mesActual}
                  anioActual={anioActual}
                  totalPersonas={totalPersonas}
                  totalActivos={totalActivos}
                  participacionesMesActual={participacionesMesActual}
                  semanasIncompletasCount={semanasIncompletasCount}
                  semanasMesActualCount={semanasMesActualCount}
                  proximaReunion={proximaReunion}
                  alertas={alertas}
                  totalAlertasDescartadas={totalAlertasDescartadas}
                  onDismissAlert={onDismissAlert}
                  onRestoreAlerts={onRestoreAlerts}
                  personasSinActividad2Meses={personasSinActividad2Meses}
                  semanaActual={semanaActual}
                  partesSemanaActual={partesSemanaActual}
                  progSemanaActual={progSemanaActual}
                  semanaProximaReunion={semanaProximaReunion}
                  progProximaReunion={progProximaReunion}
                  seccionBreakdownProxima={seccionBreakdownProxima}
                  personasPorClave={personasPorClave}
                  asignacionesPorParte={asignacionesPorParte}
                  ultimasFechasPorClave={ultimasFechasPorClave}
                  proximasSemanas={proximasSemanas}
                  eventosFuturos={eventosFuturos}
                  calcularProgresoSemana={calcularProgresoSemana}
                  logsRecientes={logsRecientes}
                  usuariosByEmail={usuariosByEmail}
                  loadingLogs={loadingLogs}
                  generatingDocx={generatingDocx}
                  handleGenerarS140Directo={handleGenerarS140Directo}
                  onNavigate={onNavigate}
                  onOpenRegistrosCreate={onOpenRegistrosCreate}
                  SECCION_LABEL={SECCION_LABEL}
                  TIPO_LABEL={TIPO_LABEL}
                  TIPOS_SOLO_VISUAL={TIPOS_SOLO_VISUAL}
                />
              </WidgetFrame>
            ))}
          </div>
        </div>
      )}

      {/* Modal catálogo de widgets */}
      <Dialog
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Catálogo de widgets de Inicio"
        description="Activa, oculta o vuelve a colocar bloques en tu cuadrícula personalizada."
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                handleResetWithFlip()
                setPickerOpen(false)
              }}
            >
              Restaurar sugerido
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={Check}
              onClick={() => setPickerOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {WIDGET_CATALOG.map(meta => {
            const current = layout.find(l => l.id === meta.id)
            const isActive = Boolean(current && current.visible !== false)
            return (
              <div
                key={meta.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isActive
                    ? 'bg-emerald-500/5 border-accent-muted-border'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-text1">
                      {meta.titulo}
                    </span>
                    <Badge variant="neutral" size="xs">
                      {meta.categoria}
                    </Badge>
                    <span className="font-mono text-[10px] text-text3">
                      Mín {meta.minW}×{meta.minH} · Máx {meta.maxW}×{meta.maxH}
                    </span>
                  </div>
                  <p className="text-xs text-text2 leading-relaxed">
                    {meta.descripcion}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isActive ? (
                    <Button
                      variant="outline"
                      size="xs"
                      icon={X}
                      onClick={() => handleRemoveWithFlip(meta.id)}
                    >
                      Quitar
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="xs"
                      icon={Plus}
                      onClick={() => handleAddWithFlip(meta.id)}
                    >
                      Añadir
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Dialog>
    </div>
  )
}
