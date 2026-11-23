import { useState, useMemo } from 'react'
import {
  Check,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  ClipboardCheck,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react'
import {
  SECCION_LABEL,
  TIPO_COLOR,
  TIPO_BADGE_LABEL,
  evaluarConflictosPersona,
  evaluarReconfirmacionParte,
} from '../../lib/conflictosRotacion'
import { formatRangoSemanaPrograma } from '../../lib/fechas'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'

function RevisarSemanaModalInner({
  isOpen,
  onClose,
  semana,
  partes,
  asignaciones,
  personas,
  historial,
  onConfirmarBatch,
  onCambiarEstadoRevision,
  onAsignarManual,
  isBatchSaving,
  evento,
}) {
  const esVisitaSC = evento?.tipo_evento === 'visita_sc'
  const esVisitaSucursal = evento?.tipo_evento === 'visita_sucursal'
  const esVisita = esVisitaSC || esVisitaSucursal
  const nombreVisitante = esVisita
    ? (evento.nombre_visitante || (esVisitaSC ? 'Superintendente de Circuito' : 'Representante de la Sucursal'))
    : null

  const secciones = ['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE']

  const partesEvaluadas = useMemo(() => {
    const tieneOracionCAsignada = (asignaciones || []).some(a =>
      (partes || []).some(p => p.id === a.parte_id && p.tipo_asignacion === 'ORACION_C' && a.clave)
    )
    const tiposSoloVisual = [
      'SMT_VACIO',
      'ORACION',
      'CONCLU',
      ...(esVisita ? ['EBC_CON', 'LEBC'] : []),
      ...(esVisita && evento?.oracion_visitante !== false && !tieneOracionCAsignada ? ['ORACION_C'] : []),
    ]

    const partesSemana = (partes || []).filter(
      p => p.semana_id === semana?.id && !tiposSoloVisual.includes(p.tipo_asignacion)
    )

    const semanaAsignados = (asignaciones || [])
      .filter(a => a.clave && partesSemana.some(p => p.id === a.parte_id))
      .map(a => {
        const parteObj = partesSemana.find(p => p.id === a.parte_id)
        return {
          id: a.id,
          parte_id: a.parte_id,
          rol: a.rol,
          clave: a.clave,
          tipo: a.rol === 'ayudante' ? 'SMT_AYU' : (parteObj?.tipo_asignacion || ''),
        }
      })

    return partesSemana.map(parte => {
      const asigP = asignaciones.find(a => a.parte_id === parte.id && a.rol === 'principal')
      const asigA = asignaciones.find(a => a.parte_id === parte.id && a.rol === 'ayudante')

      const personaP = asigP?.clave ? personas.find(p => p.clave === asigP.clave) : null
      const personaA = asigA?.clave ? personas.find(p => p.clave === asigA.clave) : null
      const { necesitaReconfirmar } = evaluarReconfirmacionParte(parte, asigP, asigA, historial)
      const yaConfirmada = !!asigP?.confirmado && !necesitaReconfirmar

      let estado
      let advertencias = []

      if (yaConfirmada) {
        estado = 'confirmada'
      } else if (!asigP?.clave || !personaP) {
        estado = 'rojo'
      } else {
        const yaAsigParaP = semanaAsignados
          .filter(a => !(a.parte_id === parte.id && a.rol === 'principal'))
          .map(a =>
            a.parte_id === parte.id && a.rol === 'ayudante'
              ? { ...a, esTitularMismaParte: true }
              : a
          )
        const yaAsigParaA = semanaAsignados
          .filter(a => !(a.parte_id === parte.id && a.rol === 'ayudante'))
          .map(a =>
            a.parte_id === parte.id && a.rol === 'principal'
              ? { ...a, esTitularMismaParte: true }
              : a
          )

        const confsP = evaluarConflictosPersona(
          personaP,
          parte.tipo_asignacion,
          historial,
          semana?.mes,
          semana?.fecha_inicio,
          yaAsigParaP
        ).filter(c => c.severity === 'warning')

        const confsA =
          parte.requiere_ayudante && personaA
            ? evaluarConflictosPersona(
                personaA,
                'SMT_AYU',
                historial,
                semana?.mes,
                semana?.fecha_inicio,
                yaAsigParaA
              ).filter(c => c.severity === 'warning')
            : []

        advertencias = [
          ...confsP.map(c => ({ ...c, persona: personaP.nombre, esAyudante: false })),
          ...confsA.map(c => ({ ...c, persona: personaA.nombre, esAyudante: true })),
        ]

        if (parte.requiere_ayudante && !personaA) {
          advertencias.push({
            tipo: 'falta_ayudante',
            severity: 'warning',
            mensaje: 'Falta asignar ayudante para esta parte SMT',
            persona: personaP.nombre,
            esAyudante: false,
          })
        }

        if (necesitaReconfirmar) {
          advertencias.unshift({
            tipo: 'reconfirmacion',
            severity: 'warning',
            mensaje: 'Asignación modificada: requiere reconfirmar para actualizar el historial',
            persona: personaP.nombre,
            esAyudante: false,
          })
        }

        estado = advertencias.length > 0 ? 'amarillo' : 'verde'
      }

      return {
        parte,
        asigP,
        asigA,
        personaP,
        personaA,
        estado,
        necesitaReconfirmar,
        advertencias,
      }
    })
  }, [asignaciones, evento?.oracion_visitante, esVisita, historial, partes, personas, semana])

  const [seleccionadas, setSeleccionadas] = useState(() => {
    const initial = {}
    partesEvaluadas.forEach(item => {
      initial[item.parte.id] = item.estado === 'verde'
    })
    return initial
  })

  const [notaRevision, setNotaRevision] = useState(() => semana?.notas_revision || '')
  const [marcarVerificadaAlConfirmar, setMarcarVerificadaAlConfirmar] = useState(true)
  const [savingEstado, setSavingEstado] = useState(false)

  if (!isOpen || !semana) return null

  const totalPartes = partesEvaluadas.length
  const partesPendientes = partesEvaluadas.filter(p => p.estado !== 'confirmada')
  const totalPendientes = partesPendientes.length
  const totalAdvertencias = partesEvaluadas.filter(p => p.estado === 'amarillo').length
  const totalSinAsignar = partesEvaluadas.filter(p => p.estado === 'rojo').length
  const seleccionadasCount = Object.values(seleccionadas).filter(Boolean).length

  const quedariaCompletaAlConfirmar =
    totalSinAsignar === 0 &&
    partesPendientes.every(item => !!seleccionadas[item.parte.id])

  const handleToggle = parteId => {
    setSeleccionadas(prev => ({
      ...prev,
      [parteId]: !prev[parteId],
    }))
  }

  const handleSeleccionarSoloVerdes = () => {
    const next = {}
    partesEvaluadas.forEach(item => {
      next[item.parte.id] = item.estado === 'verde'
    })
    setSeleccionadas(next)
  }

  const handleSeleccionarTodasPendientes = () => {
    const next = {}
    partesEvaluadas.forEach(item => {
      next[item.parte.id] = item.estado === 'verde' || item.estado === 'amarillo'
    })
    setSeleccionadas(next)
  }

  const handleDeseleccionarTodas = () => {
    setSeleccionadas({})
  }

  const handleConfirmar = () => {
    const ids = Object.keys(seleccionadas).filter(id => seleccionadas[id])
    const marcarVerificada =
      quedariaCompletaAlConfirmar && marcarVerificadaAlConfirmar
    onConfirmarBatch(semana, ids, {
      marcarVerificada,
      notasRevision: notaRevision.trim() || null,
    })
  }

  const handleMarcarEnRevision = async () => {
    if (!onCambiarEstadoRevision) return
    setSavingEstado(true)
    try {
      await onCambiarEstadoRevision(semana.id, 'en_revision', notaRevision.trim() || null)
      onClose?.()
    } finally {
      setSavingEstado(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Revisar semana — ${formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)}`}
      description={`${totalPartes} partes (${totalPendientes} pendientes) · ${totalAdvertencias} con advertencias${totalSinAsignar > 0 ? ` · ${totalSinAsignar} sin asignar` : ''}`}
      size="lg"
      footer={
        <div className="flex flex-col gap-3 w-full">
          {onCambiarEstadoRevision && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                type="text"
                value={notaRevision}
                onChange={e => setNotaRevision(e.target.value)}
                placeholder="Nota opcional de revisión (ej: confirmar disponibilidad del conductor)..."
                className="flex-1 h-8 px-2.5 rounded-lg border border-border2 bg-surface text-xs text-text1 placeholder:text-text3 focus:border-accent focus:outline-none"
              />
              {quedariaCompletaAlConfirmar && (
                <label className="inline-flex items-center gap-1.5 text-[11px] text-text2 cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={marcarVerificadaAlConfirmar}
                    onChange={e => setMarcarVerificadaAlConfirmar(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-border2 text-accent focus:ring-accent cursor-pointer"
                  />
                  <span>Marcar verificada</span>
                </label>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <span className="text-xs text-text2 font-medium">
              {seleccionadasCount} de {totalPendientes} pendientes seleccionadas
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isBatchSaving || savingEstado}
              >
                Cancelar
              </Button>
              {onCambiarEstadoRevision && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={ClipboardCheck}
                  loading={savingEstado}
                  disabled={isBatchSaving}
                  onClick={handleMarcarEnRevision}
                >
                  Dejar en revisión
                </Button>
              )}
              <Button
                variant="accent"
                size="sm"
                icon={quedariaCompletaAlConfirmar && marcarVerificadaAlConfirmar ? ShieldCheck : Check}
                disabled={seleccionadasCount === 0 || isBatchSaving || savingEstado}
                onClick={handleConfirmar}
              >
                {isBatchSaving
                  ? 'Confirmando...'
                  : quedariaCompletaAlConfirmar && marcarVerificadaAlConfirmar
                    ? 'Confirmar y verificar'
                    : 'Confirmar seleccionadas'}
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Acciones rápidas de selección */}
        {totalPendientes > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-surface-alt/60 border border-border text-xs">
            <span className="text-[11px] text-text2 font-medium">Selección rápida:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSeleccionarSoloVerdes}
                className="px-2 py-1 rounded-md text-[11px] font-medium bg-surface border border-border text-text1 hover:border-accent-muted-border cursor-pointer transition-colors"
              >
                Solo sin conflictos
              </button>
              <button
                type="button"
                onClick={handleSeleccionarTodasPendientes}
                className="px-2 py-1 rounded-md text-[11px] font-medium bg-surface border border-border text-text1 hover:border-accent-muted-border cursor-pointer transition-colors"
              >
                Todas las pendientes
              </button>
              <button
                type="button"
                onClick={handleDeseleccionarTodas}
                className="px-2 py-1 rounded-md text-[11px] font-medium text-text3 hover:text-text1 hover:bg-surface cursor-pointer transition-colors"
              >
                Ninguna
              </button>
            </div>
          </div>
        )}

        {esVisita && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200">
            <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>{esVisitaSC ? 'Visita del SC' : 'Visita Sucursal'}:</strong> {nombreVisitante} (Discurso de 30 min y oración final a cargo de la visita).
            </span>
          </div>
        )}

        {secciones.map(sec => {
          const partesSec = partesEvaluadas.filter(item => item.parte.seccion === sec)
          if (!partesSec.length) return null

          return (
            <div key={sec} className="space-y-2">
              <div className="text-[10px] font-mono font-semibold text-text3 uppercase tracking-wider pb-1 border-b border-border/80">
                {SECCION_LABEL[sec]}
              </div>

              <div className="divide-y divide-border/60">
                {partesSec.map(item => {
                  const { parte, personaP, personaA, estado, necesitaReconfirmar, advertencias } = item
                  const isChecked = !!seleccionadas[parte.id]
                  const badgeLabel = TIPO_BADGE_LABEL[parte.tipo_asignacion] || parte.tipo_asignacion

                  return (
                    <div
                      key={parte.id}
                      className="flex items-start justify-between gap-3 py-2.5 transition-colors hover:bg-surface-alt/40 px-1.5 rounded-lg"
                    >
                      {/* Checkbox o Placeholder */}
                      <div className="pt-0.5 shrink-0">
                        {estado === 'confirmada' ? (
                          <div className="w-4 h-4 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                        ) : estado !== 'rojo' ? (
                          <input
                            type="checkbox"
                            id={`chk-${parte.id}`}
                            checked={isChecked}
                            onChange={() => handleToggle(parte.id)}
                            className="w-4 h-4 rounded border-border2 text-accent focus:ring-accent focus:ring-offset-0 bg-surface cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>

                      {/* Info de la parte */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${
                              TIPO_COLOR[parte.tipo_asignacion] || 'bg-surface-alt text-text2 border-border'
                            }`}
                          >
                            {badgeLabel}
                          </span>
                          <span className="text-xs font-semibold text-text1 line-clamp-2">
                            {parte.titulo}
                          </span>
                        </div>

                        {/* Nombre sugerido */}
                        <div className="mt-1 text-xs text-text2">
                          {personaP ? (
                            <span className="font-medium text-text1">
                              {personaP.nombre}
                              {personaA && (
                                <span className="font-normal text-text2 ml-1">
                                  / {personaA.nombre}{' '}
                                  <span className="text-text3 text-[11px]">(Ayudante)</span>
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text3 italic">Sin asignación</span>
                          )}
                        </div>

                        {/* Mensajes de advertencia */}
                        {estado === 'amarillo' && advertencias.length > 0 && (
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            {advertencias.map((adv, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400/90 font-medium"
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>
                                  {adv.esAyudante ? `Ayudante: ${adv.mensaje}` : adv.mensaje}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Semáforo indicador / Enlace */}
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {estado === 'confirmada' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            Confirmada
                          </span>
                        )}

                        {estado === 'verde' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Sin conflictos
                          </span>
                        )}

                        {estado === 'amarillo' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              {necesitaReconfirmar ? (
                                <RotateCcw className="w-3 h-3" />
                              ) : (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {necesitaReconfirmar ? 'Reconfirmar' : 'Advertencia'}
                            </span>
                            <button
                              type="button"
                              onClick={() => onAsignarManual(parte.id)}
                              className="text-[11px] font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Ir a revisar</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {estado === 'rojo' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <AlertCircle className="w-3 h-3" />
                              Sin asignar
                            </span>
                            <button
                              type="button"
                              onClick={() => onAsignarManual(parte.id)}
                              className="text-xs font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>Asignar manualmente</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
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
    </Dialog>
  )
}

export default function RevisarSemanaModal(props) {
  const modalKey = `${props.semana?.id || 'none'}-${props.isOpen ? 'open' : 'closed'}`
  return <RevisarSemanaModalInner key={modalKey} {...props} />
}
