import { useMemo } from 'react'
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
} from 'lucide-react'
import { SECCION_LABEL } from '../../../lib/conflictosRotacion'
import { mapearHorariosPartesSemana } from '../../../lib/horarios'
import {
  formatFechaLegible,
  formatRangoSemanaPrograma,
  getImpactoEventoSemana,
} from '../../../lib/fechas'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import FilaParteDesktop from './FilaParteDesktop'

export default function TarjetaSemanaDesktop({
  semana,
  partes,
  asignaciones,
  personas,
  historial,
  onAsignar,
  onConfirmar,
  onConfirmarTodo,
  onEliminarSemana,
  onLimpiarAsignaciones,
  expandida,
  onToggleExpand,
  modoLectura,
  onRevisarSemana,
  onSugerirSemana,
  evento,
  impacto: propImpacto,
  config,
}) {
  const mes = semana.mes

  const impacto = propImpacto || getImpactoEventoSemana(semana, [evento].filter(Boolean))

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
  const totalPartes = partesContables.length

  const hayReconfirmaciones = partesContables.some(p => {
    if (esVisita && p.tipo_asignacion === 'EBC_CON') return false
    const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')
    if (!asigP?.clave) return false

    const pr = asigP.participacion_id ? historial.find(h => h.id === asigP.participacion_id) : null
    const ar = asigA?.participacion_id ? historial.find(h => h.id === asigA.participacion_id) : null

    const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
    const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
    const aNuevo =
      p.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
    const aRem = p.requiere_ayudante && !asigA?.clave && ar

    return pCambio || aCambio || aNuevo || aRem
  })

  const confirmadas = partesContables.filter(p => {
    if (esVisita && p.tipo_asignacion === 'EBC_CON') {
      return true
    }
    const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    if (esVisita && p.tipo_asignacion === 'ORACION_C' && impacto?.oracionVisitante !== false && !asigP?.clave) {
      return true
    }

    const asigParte = asignaciones.filter(a => a.parte_id === p.id && a.confirmado)
    const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')

    const pr = asigP?.participacion_id ? historial.find(h => h.id === asigP.participacion_id) : null
    const ar = asigA?.participacion_id ? historial.find(h => h.id === asigA.participacion_id) : null
    const pCambio = !!asigP?.participacion_id && pr && pr.clave !== asigP?.clave
    const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
    const aNuevo =
      p.requiere_ayudante && asigA?.clave && asigP?.participacion_id && !asigA?.participacion_id
    const aRem = p.requiere_ayudante && !asigA?.clave && ar
    const necesitaRec = pCambio || aCambio || aNuevo || aRem

    return asigParte.some(a => a.rol === 'principal') && !necesitaRec
  }).length

  const hayAsignaciones = partesContables.some(p => {
    if (esVisita && p.tipo_asignacion === 'EBC_CON') return false
    const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
    return !!asigP?.clave
  })

  const todasAsignadas =
    totalPartes > 0 &&
    partesContables.every(p => {
      if (esVisita && p.tipo_asignacion === 'EBC_CON') return true
      if (esVisita && p.tipo_asignacion === 'ORACION_C' && impacto?.oracionVisitante !== false) return true
      const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
      return !!asigP?.clave
    })

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
    confirmadas < totalPartes &&
    (hayAsignaciones || todasSugeridas)

  const mostrarBotonSugerir =
    !cancelaEntreSemana &&
    !todasAsignadas &&
    confirmadas < totalPartes &&
    totalPartes > 0

  const pct = totalPartes > 0 ? Math.round((confirmadas / totalPartes) * 100) : 0
  const secciones = ['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE']

  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all">
      {/* Card Header Accordion */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800/60 select-none">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer mr-3"
        >
          {/* Fechas y Lectura */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              <span className="text-sm font-semibold text-text1">
                {formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text3 font-mono mt-0.5">
              <BookOpen className="w-3.5 h-3.5 opacity-60" />
              <span>{semana.capitulo_biblico}</span>
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

          {/* Canciones y Progreso */}
          <div className="flex items-center gap-4">
            {!cancelaEntreSemana && (
              <div className="hidden md:flex items-center gap-1">
                {[semana.cancion_apertura, semana.cancion_vc, semana.cancion_cierre]
                  .filter(Boolean)
                  .map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800/80 text-text2 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60"
                    >
                      <Music className="w-3 h-3 text-text3" />
                      {c}
                    </span>
                  ))}
              </div>
            )}

            <div className="flex items-center gap-2.5">
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
                <ChevronUp className="w-4 h-4 text-text3" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text3" />
              )}
            </div>
          </div>
        </button>

        {/* Acciones Rápidas */}
        {!modoLectura && (
          <div className="flex items-center gap-2 shrink-0">
            {mostrarBotonRevisar && (
              <Button
                variant="secondary"
                size="xs"
                icon={CheckCircle2}
                onClick={e => {
                  e.stopPropagation()
                  onRevisarSemana?.(semana)
                }}
                className="font-medium text-xs shadow-2xs"
              >
                Revisar y aprobar semana
              </Button>
            )}
            {mostrarBotonSugerir && (
              <Button
                variant="secondary"
                size="xs"
                icon={Sparkles}
                onClick={e => {
                  e.stopPropagation()
                  onSugerirSemana?.(semana.id)
                }}
                className="font-medium text-xs shadow-2xs"
              >
                Completar con sugerencias
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
              {impacto?.esDesplazada && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-semibold">Reunión desplazada: </span>
                    <span>Esta reunión se llevará a cabo el {formatFechaLegible(impacto.fechaEfectiva)} {impacto.horaEfectiva ? `a las ${impacto.horaEfectiva} hrs` : ''}.</span>
                    {impacto.motivo && <span className="block text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">Motivo: {impacto.motivo}</span>}
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

                return (
                  <div key={sec} className="space-y-2">
                    <div className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                      {SECCION_LABEL[sec]}
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
                        onConfirmar={onConfirmar}
                        clavePresidente={clavePresidente}
                        modoLectura={modoLectura}
                        evento={evento}
                        horaCalculada={mapaHoras[parte.id]}
                      />
                    ))}
                  </div>
                )
              })}

              {!modoLectura && (
                <div className="flex items-center justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800/80 gap-3">
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
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
