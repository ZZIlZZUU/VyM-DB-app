import { useMemo, useState } from 'react'
import {
  Calendar,
  Music,
  BookOpen,
  CheckCheck,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  ShieldCheck,
  ClipboardCheck,
  Eraser,
  MessageSquareText,
} from 'lucide-react'
import {
  SECCION_LABEL,
  ESTADO_REVISION_META,
  normalizarEstadoRevision,
  calcularEstadoSemana,
  evaluarReconfirmacionParte,
} from '../../../lib/conflictosRotacion'
import { mapearHorariosPartesSemana } from '../../../lib/horarios'
import {
  formatFechaLegible,
  formatRangoSemanaPrograma,
  getImpactoEventoSemana,
} from '../../../lib/fechas'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import { Select } from '../../../components/ui/Select'
import FilaParteDesktop from './FilaParteDesktop'

export default function TarjetaSemanaDesktop({
  semana,
  partes,
  asignaciones,
  personas,
  historial,
  onAsignar,
  onQuitar,
  onIntercambiar,
  onConfirmar,
  onConfirmarTodo,
  onEliminarSemana,
  onLimpiarAsignaciones,
  onCambiarEstadoRevision,
  expandida,
  onToggleExpand,
  modoLectura,
  onRevisarSemana,
  onSugerirSemana,
  evento,
  impacto: propImpacto,
  estadoSemana: propEstadoSemana,
  config,
  highlightQuery = '',
}) {
  const mes = semana.mes
  const [notaDraft, setNotaDraft] = useState(semana.notas_revision || '')
  const [editandoNota, setEditandoNota] = useState(false)
  const [savingRevision, setSavingRevision] = useState(false)

  const openNotaEditor = () => {
    setNotaDraft(semana.notas_revision || '')
    setEditandoNota(true)
  }

  const impacto =
    propImpacto ||
    getImpactoEventoSemana(
      semana,
      [evento].filter(Boolean),
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )

  const estadoSemana = useMemo(() => {
    if (propEstadoSemana) return propEstadoSemana
    return calcularEstadoSemana(
      semana,
      partes,
      asignaciones,
      historial,
      [evento].filter(Boolean),
      config,
      personas
    )
  }, [propEstadoSemana, semana, partes, asignaciones, historial, evento, config, personas])

  const mapaHoras = useMemo(() => {
    return mapearHorariosPartesSemana(
      {
        ...semana,
        hora_efectiva: impacto?.horaEfectiva,
      },
      partes,
      config
    )
  }, [semana, partes, config, impacto?.horaEfectiva])

  const cancelaEntreSemana = impacto?.cancelaEntreSemana || false
  const esVisitaSC = impacto?.esVisitaSC ?? (evento?.tipo_evento === 'visita_sc')
  const esVisitaSucursal = impacto?.esVisitaSucursal ?? (evento?.tipo_evento === 'visita_sucursal')
  const esVisita = impacto?.esVisita ?? (esVisitaSC || esVisitaSucursal)
  const nombreVisitante =
    impacto?.nombreVisitante ||
    (esVisita
      ? (evento?.nombre_visitante || (esVisitaSC ? 'Superintendente de Circuito' : 'Representante de la Sucursal'))
      : null)

  const semanaAsignados = asignaciones
    .filter(a => a.clave && partes.some(p => p.id === a.parte_id))
    .map(a => {
      const parteObj = partes.find(p => p.id === a.parte_id)
      return {
        id: a.id,
        parte_id: a.parte_id,
        rol: a.rol,
        clave: a.clave,
        tipo: a.rol === 'ayudante' ? 'SMT_AYU' : (parteObj?.tipo_asignacion || ''),
      }
    })

  const tieneAsignacionesPrevias = asignaciones.some(
    a => partes.some(p => p.id === a.parte_id) && !!a.clave
  )

  const partePresidente = partes.find(p => p.tipo_asignacion === 'P')
  const asigPresidente = partePresidente
    ? asignaciones.find(a => a.parte_id === partePresidente.id && a.rol === 'principal')
    : null
  const clavePresidente = asigPresidente?.clave || null

  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU', ...(esVisita ? ['LEBC'] : [])]
  const partesContables = partes.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))

  const {
    totalPartes,
    confirmadas,
    hayReconfirmaciones,
    alertasCount,
    faltanAyudantes,
    pct,
  } = estadoSemana

  const estadoRevision = normalizarEstadoRevision(semana.estado_revision)
  const metaRevision = ESTADO_REVISION_META[estadoRevision] || ESTADO_REVISION_META.borrador

  const hayAsignaciones = estadoSemana.asignadas > 0
  const todasAsignadas = totalPartes > 0 && estadoSemana.asignadas === totalPartes
  const todasSugeridas =
    totalPartes > 0 &&
    partesContables.every(p => {
      if (esVisita && p.tipo_asignacion === 'EBC_CON') return true
      if (esVisita && p.tipo_asignacion === 'ORACION_C' && impacto?.oracionVisitante !== false) return true
      const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
      return asigP?.clave && asigP.sugerido_por_app === true
    })

  const mostrarBotonRevisar =
    !cancelaEntreSemana &&
    totalPartes > 0 &&
    (confirmadas < totalPartes || hayReconfirmaciones) &&
    (hayAsignaciones || todasSugeridas)

  const secciones = ['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE']

  const progressBarColor = cancelaEntreSemana
    ? 'bg-purple-500/70'
    : pct === 100
      ? 'bg-accent'
      : pct >= 50
        ? 'bg-amber'
        : 'bg-rose-500/75'

  const cardBorderCls =
    estadoRevision === 'en_revision'
      ? 'border-blue/40 hover:border-blue/60'
      : estadoRevision === 'verificada'
        ? 'border-accent-muted-border hover:border-accent/50'
        : 'border-border hover:border-accent-muted-border'

  async function handleEstadoChange(nuevoEstado) {
    if (!onCambiarEstadoRevision) return
    setSavingRevision(true)
    try {
      const notaActual = editandoNota ? notaDraft.trim() || null : undefined
      await onCambiarEstadoRevision(semana.id, nuevoEstado, notaActual)
    } finally {
      setSavingRevision(false)
    }
  }

  async function handleGuardarNota() {
    if (!onCambiarEstadoRevision) return
    setSavingRevision(true)
    try {
      await onCambiarEstadoRevision(semana.id, estadoRevision, notaDraft.trim() || null)
      setEditandoNota(false)
    } finally {
      setSavingRevision(false)
    }
  }

  const mostrarBannerRevision =
    !cancelaEntreSemana &&
    (estadoRevision === 'en_revision' || Boolean(semana.notas_revision) || editandoNota)

  return (
    <div className={`bg-surface border rounded-2xl overflow-hidden shadow-2xs transition-all ${cardBorderCls}`}>
      {/* Card Header Accordion */}
      <div className="relative bg-surface-alt/60 border-b border-border/80 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex-1 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-left cursor-pointer min-w-0"
          >
            {/* Fechas, Lectura y Eventos */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Calendar className="w-4 h-4 text-accent shrink-0" />
                <span className="font-display text-base font-medium text-text1 tracking-tight">
                  {formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)}
                </span>

                {/* Badge de estado de revisión visible incluso colapsada */}
                {!cancelaEntreSemana && estadoRevision === 'en_revision' && (
                  <Badge variant="info" size="xs" dot pulse>
                    En revisión
                  </Badge>
                )}
                {!cancelaEntreSemana && estadoRevision === 'verificada' && (
                  <Badge variant="success" size="xs">
                    <ShieldCheck className="w-3 h-3" />
                    Verificada
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-text3 font-mono mt-0.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 opacity-60 shrink-0" />
                  <span>{semana.capitulo_biblico}</span>
                </span>
                {semana.notas_revision && !expandida && (
                  <span
                    className="inline-flex items-center gap-1 font-sans text-[11px] text-blue truncate max-w-[260px]"
                    title={semana.notas_revision}
                  >
                    <MessageSquareText className="w-3 h-3 shrink-0" />
                    <span className="truncate">{semana.notas_revision}</span>
                  </span>
                )}
              </div>

              {cancelaEntreSemana ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                    <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    {impacto.tituloEvento}
                  </span>
                </div>
              ) : esVisita ? (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    <Briefcase className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {esVisitaSC ? 'Visita del SC' : 'Visita Sucursal'}: {nombreVisitante}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Canciones, Alertas y Progreso */}
            <div className="flex items-center gap-2.5 flex-wrap lg:justify-end">
              {!cancelaEntreSemana && (
                <div className="hidden xl:flex items-center gap-1">
                  {[semana.cancion_apertura, semana.cancion_vc, semana.cancion_cierre]
                    .filter(Boolean)
                    .map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 font-mono text-[11px] bg-surface text-text2 px-2 py-0.5 rounded-md border border-border"
                      >
                        <Music className="w-3 h-3 text-text3" />
                        {c}
                      </span>
                    ))}
                </div>
              )}

              {!cancelaEntreSemana && alertasCount > 0 && (
                <Badge variant="warning" size="xs" title="Conflictos de rotación detectados en esta semana">
                  <AlertTriangle className="w-3 h-3" />
                  {alertasCount} {alertasCount === 1 ? 'alerta' : 'alertas'}
                </Badge>
              )}

              {!cancelaEntreSemana && faltanAyudantes > 0 && (
                <Badge variant="warning" size="xs" title="Partes SMT con titular asignado pero sin ayudante">
                  {faltanAyudantes} sin ayudante
                </Badge>
              )}

              {!cancelaEntreSemana && hayReconfirmaciones && (
                <Badge variant="danger" size="xs">
                  <RotateCcw className="w-3 h-3" />
                  Reconfirmar
                </Badge>
              )}

              <div className="flex items-center gap-2">
                {cancelaEntreSemana ? (
                  <Badge variant="purple" size="sm">
                    Sin reunión ordinaria
                  </Badge>
                ) : (
                  <Badge
                    variant={
                      pct === 100
                        ? 'success'
                        : pct >= 50
                          ? 'warning'
                          : 'neutral'
                    }
                    size="sm"
                  >
                    {confirmadas}/{totalPartes} confirmadas
                  </Badge>
                )}
                {expandida ? (
                  <ChevronUp className="w-4 h-4 text-text3 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text3 shrink-0" />
                )}
              </div>
            </div>
          </button>

          {/* Controles compactos de cabecera */}
          {!modoLectura && (
            <div
              className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
              onClick={e => e.stopPropagation()}
            >
              {!cancelaEntreSemana && onCambiarEstadoRevision && (
                <div className="w-[126px]">
                  <Select
                    size="xs"
                    value={estadoRevision}
                    disabled={savingRevision}
                    onChange={e => handleEstadoChange(e.target.value)}
                    aria-label={`Estado de revisión de la semana ${formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)}`}
                    title={`Estado de revisión: ${metaRevision.description}`}
                  >
                    <option value="borrador">Borrador</option>
                    <option value="en_revision">En revisión</option>
                    <option value="verificada">Verificada</option>
                  </Select>
                </div>
              )}

              {mostrarBotonRevisar && !expandida && (
                <Button
                  variant="secondary"
                  size="xs"
                  icon={CheckCircle2}
                  onClick={() => onRevisarSemana?.(semana)}
                  title="Revisar y aprobar asignaciones de la semana"
                >
                  Revisar
                </Button>
              )}

              <Button
                variant="dangerGhost"
                size="iconSm"
                onClick={() => onEliminarSemana(semana.id)}
                aria-label="Eliminar semana"
                title="Eliminar semana"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Barra de progreso fina inferior */}
        <div className="h-[3px] w-full bg-border/50 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${cancelaEntreSemana ? 100 : pct}%` }}
          />
        </div>
      </div>

      {/* Contenido Expandido */}
      {expandida && (
        <div className="px-5 py-4 space-y-5 animate-view-fade">
          {cancelaEntreSemana ? (
            <div className="space-y-4">
              {tieneAsignacionesPrevias && !modoLectura && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">Esta semana cuenta con asignaciones guardadas previamente</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                        Debido a {impacto.tituloEvento}, no se celebrará la reunión ordinaria de entre semana. Las asignaciones previas han quedado inactivas.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="xs"
                    icon={Trash2}
                    onClick={() => onLimpiarAsignaciones?.(semana.id)}
                    className="shrink-0 self-end sm:self-center"
                  >
                    Limpiar asignaciones de esta semana
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start gap-4 p-5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-800/40 text-purple-950 dark:text-purple-100">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shrink-0">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-200/60 dark:bg-purple-800/60 text-purple-900 dark:text-purple-200">
                      {impacto.esAsamblea
                        ? (impacto.evento?.tipo_evento === 'asamblea_regional' ? 'Asamblea Regional' : 'Asamblea de Circuito')
                        : 'Reunión Cancelada'}
                    </span>
                    {impacto.fechaEfectiva && (
                      <span className="text-xs text-text3 font-mono">
                        {impacto.fechaEfectiva}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold text-text1">
                    {impacto.tituloEvento}
                  </h4>
                  {(impacto.motivo || impacto.descripcion) && (
                    <p className="text-xs text-text2 leading-relaxed">
                      {impacto.motivo || impacto.descripcion}
                    </p>
                  )}
                  <p className="text-[11px] text-text3 pt-1">
                    Durante esta semana no se programa la reunión de entre semana en la congregación. No es necesario asignar participantes para esta semana.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Banner de estado de revisión y nota editable */}
              {mostrarBannerRevision && (
                <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-blue-bg/70 border border-blue/25 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-blue font-semibold">
                      <ClipboardCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {estadoRevision === 'en_revision'
                          ? 'Semana en revisión'
                          : 'Nota de revisión'}
                      </span>
                      {semana.revisado_por && (
                        <span className="text-[11px] font-normal text-text3">
                          · Último cambio por {semana.revisado_por}
                        </span>
                      )}
                    </div>

                    {!modoLectura && onCambiarEstadoRevision && (
                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {!editandoNota && (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={openNotaEditor}
                          >
                            {semana.notas_revision ? 'Editar nota' : 'Agregar nota'}
                          </Button>
                        )}
                        {estadoRevision === 'en_revision' && (
                          <Button
                            variant="accent"
                            size="xs"
                            icon={ShieldCheck}
                            loading={savingRevision}
                            onClick={() => handleEstadoChange('verificada')}
                          >
                            Marcar verificada
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {editandoNota && !modoLectura ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={notaDraft}
                        onChange={e => setNotaDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleGuardarNota()
                          if (e.key === 'Escape') {
                            setNotaDraft(semana.notas_revision || '')
                            setEditandoNota(false)
                          }
                        }}
                        placeholder="Ej: Verificar disponibilidad del conductor o cambiar lector EBC..."
                        className="flex-1 h-8 px-2.5 rounded-lg border border-border2 bg-surface text-xs text-text1 placeholder:text-text3 focus:border-accent focus:outline-none"
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setNotaDraft(semana.notas_revision || '')
                            setEditandoNota(false)
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          loading={savingRevision}
                          onClick={handleGuardarNota}
                        >
                          Guardar nota
                        </Button>
                      </div>
                    </div>
                  ) : semana.notas_revision ? (
                    <p className="text-xs text-text1 leading-relaxed">
                      {semana.notas_revision}
                    </p>
                  ) : (
                    <p className="text-[11px] text-text2">
                      Esta semana está marcada para verificación antes de emitir el S-140. Puedes agregar una nota con los cambios por confirmar.
                    </p>
                  )}
                </div>
              )}

              {hayReconfirmaciones && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-amber-50/85 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-semibold">Reconfirmaciones pendientes: </span>
                      <span>
                        Se modificaron asignaciones ya confirmadas. Actualiza las confirmaciones antes de compartir el S-140.
                      </span>
                    </div>
                  </div>
                  {!modoLectura && (
                    <Button
                      variant="danger"
                      size="xs"
                      icon={RotateCcw}
                      onClick={() => onConfirmarTodo(semana.id, partes, asignaciones)}
                      className="shrink-0 self-end sm:self-center"
                    >
                      Reconfirmar semana
                    </Button>
                  )}
                </div>
              )}

              {impacto?.esDesplazada && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-semibold">Reunión desplazada: </span>
                    <span>
                      Esta reunión se llevará a cabo el {formatFechaLegible(impacto.fechaEfectiva)}{' '}
                      {impacto.horaEfectiva ? `a las ${impacto.horaEfectiva} hrs` : ''}.
                    </span>
                    {impacto.motivo && (
                      <span className="block text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                        Motivo: {impacto.motivo}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {esVisita && (
                <div className="flex items-start sm:items-center gap-2.5 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-200">
                  <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-semibold">
                      {esVisitaSC
                        ? 'Semana de Visita del Superintendente de Circuito'
                        : 'Semana de Visita de Representante de la Sucursal'}
                      :{' '}
                    </span>
                    <span className="font-medium">{nombreVisitante}</span>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      El Estudio Bíblico y su lector se sustituyen por el Discurso de servicio de 30 minutos a cargo de la visita.{' '}
                      {evento?.oracion_visitante !== false
                        ? 'La oración de conclusión también la ofrece el visitante.'
                        : ''}
                    </p>
                  </div>
                </div>
              )}

              {secciones.map(sec => {
                const partesSeccion = partes.filter(p => p.seccion === sec)
                if (!partesSeccion.length) return null

                const secContables = partesSeccion.filter(
                  p =>
                    p.tipo_asignacion !== 'CONCLU' &&
                    p.tipo_asignacion !== 'ORACION' &&
                    p.tipo_asignacion !== 'SMT_VACIO' &&
                    !(esVisita && p.tipo_asignacion === 'LEBC')
                )
                const secConfirmadas = secContables.filter(p => {
                  if (esVisita && p.tipo_asignacion === 'EBC_CON') return true
                  const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
                  if (esVisita && p.tipo_asignacion === 'ORACION_C' && impacto?.oracionVisitante !== false && !asigP?.clave) {
                    return true
                  }
                  const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')
                  const { necesitaReconfirmar } = evaluarReconfirmacionParte(p, asigP, asigA, historial)
                  return !!asigP?.confirmado && !necesitaReconfirmar
                }).length

                const secDot = {
                  APERTURA: 'bg-zinc-400 dark:bg-zinc-500',
                  TB: 'bg-teal-500',
                  SMT: 'bg-amber-500',
                  VC: 'bg-rose-500',
                  CIERRE: 'bg-zinc-400 dark:bg-zinc-500',
                }[sec] || 'bg-zinc-400'

                return (
                  <div key={sec} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/80">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${secDot}`} />
                        <span className="text-[11px] font-mono font-semibold text-text2 uppercase tracking-wider">
                          {SECCION_LABEL[sec]}
                        </span>
                      </div>
                      {secContables.length > 0 && (
                        <span
                          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${
                            secConfirmadas === secContables.length
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60'
                              : 'bg-surface-alt text-text3 border-border'
                          }`}
                        >
                          {secConfirmadas} de {secContables.length} confirmadas
                        </span>
                      )}
                    </div>
                    {partesSeccion.map(parte => (
                      <FilaParteDesktop
                        key={parte.id}
                        parte={parte}
                        asignaciones={asignaciones}
                        personas={personas}
                        historial={historial}
                        mes={mes}
                        fechaSemana={semana.fecha_inicio}
                        semanaAsignados={semanaAsignados}
                        onAsignar={onAsignar}
                        onQuitar={onQuitar}
                        onIntercambiar={onIntercambiar}
                        onConfirmar={onConfirmar}
                        clavePresidente={clavePresidente}
                        modoLectura={modoLectura}
                        evento={evento}
                        horaCalculada={mapaHoras[parte.id]}
                        highlightQuery={highlightQuery}
                      />
                    ))}
                  </div>
                )
              })}

              {!modoLectura && (
                <div className="flex flex-wrap items-center justify-between pt-3 border-t border-border/80 gap-2.5">
                  <div className="flex items-center gap-2">
                    {tieneAsignacionesPrevias && onLimpiarAsignaciones && (
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={Eraser}
                        onClick={() => onLimpiarAsignaciones(semana.id)}
                        className="text-text3 hover:text-danger"
                      >
                        Limpiar semana
                      </Button>
                    )}
                    {onCambiarEstadoRevision && !mostrarBannerRevision && (
                      <Button
                        variant="ghost"
                        size="xs"
                        icon={MessageSquareText}
                        onClick={openNotaEditor}
                        className="text-text3 hover:text-text1"
                      >
                        Nota de revisión
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {confirmadas < totalPartes && totalPartes > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Sparkles}
                        onClick={() => onSugerirSemana?.(semana.id)}
                      >
                        {todasSugeridas || todasAsignadas ? 'Regenerar sugerencias' : 'Completar con sugerencias'}
                      </Button>
                    )}
                    {mostrarBotonRevisar && (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={CheckCircle2}
                        onClick={() => onRevisarSemana?.(semana)}
                      >
                        Revisar y aprobar semana
                      </Button>
                    )}
                    <Button
                      variant={hayReconfirmaciones ? 'danger' : pct === 100 ? 'secondary' : 'accent'}
                      size="sm"
                      icon={hayReconfirmaciones ? RotateCcw : CheckCheck}
                      onClick={() => onConfirmarTodo(semana.id, partes, asignaciones)}
                    >
                      {hayReconfirmaciones
                        ? 'Actualizar confirmaciones pendientes'
                        : pct === 100 && totalPartes > 0
                          ? 'Toda la semana confirmada'
                          : 'Confirmar toda la semana'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
