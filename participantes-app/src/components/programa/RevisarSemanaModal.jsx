import { useState, useMemo } from 'react'
import {
  Check,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from 'lucide-react'
import {
  SECCION_LABEL,
  TIPO_COLOR,
  evaluarConflictosPersona,
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
      const yaConfirmada = !!asigP?.confirmado

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

        estado = advertencias.length > 0 ? 'amarillo' : 'verde'
      }

      return {
        parte,
        asigP,
        asigA,
        personaP,
        personaA,
        estado,
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

  if (!isOpen || !semana) return null

  const totalPartes = partesEvaluadas.length
  const partesPendientes = partesEvaluadas.filter(p => p.estado !== 'confirmada')
  const totalPendientes = partesPendientes.length
  const totalAdvertencias = partesEvaluadas.filter(p => p.estado === 'amarillo').length
  const seleccionadasCount = Object.values(seleccionadas).filter(Boolean).length

  const handleToggle = parteId => {
    setSeleccionadas(prev => ({
      ...prev,
      [parteId]: !prev[parteId],
    }))
  }

  const handleConfirmar = () => {
    const ids = Object.keys(seleccionadas).filter(id => seleccionadas[id])
    onConfirmarBatch(semana, ids)
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Revisar semana — ${formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)}`}
      description={`${totalPartes} partes (${totalPendientes} pendientes) · ${totalAdvertencias} con advertencias`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-text2 font-medium">
            {seleccionadasCount} de {totalPendientes} partes pendientes seleccionadas
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isBatchSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="accent"
              size="sm"
              disabled={seleccionadasCount === 0 || isBatchSaving}
              onClick={handleConfirmar}
            >
              {isBatchSaving ? 'Confirmando...' : 'Confirmar seleccionadas'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
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
              <div className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
                {SECCION_LABEL[sec]}
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {partesSec.map(item => {
                  const { parte, personaP, personaA, estado, advertencias } = item
                  const isChecked = !!seleccionadas[parte.id]

                  return (
                    <div
                      key={parte.id}
                      className="flex items-start justify-between gap-3 py-2.5 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 px-1.5 rounded-lg"
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
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 bg-surface dark:bg-zinc-800 cursor-pointer"
                          />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>

                      {/* Info de la parte */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border shrink-0 ${
                              TIPO_COLOR[parte.tipo_asignacion] || 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {parte.tipo_asignacion}
                          </span>
                          <span className="text-xs font-semibold text-text1 truncate">
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
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Advertencia
                          </span>
                        )}

                        {estado === 'rojo' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                              <AlertCircle className="w-3 h-3" />
                              Sin sugerencia
                            </span>
                            <button
                              type="button"
                              onClick={() => onAsignarManual(parte.id)}
                              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
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
  if (!props.isOpen || !props.semana) return null
  return (
    <RevisarSemanaModalInner
      key={`${props.semana.id}-${props.isOpen}`}
      {...props}
    />
  )
}
