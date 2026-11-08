import { useState } from 'react'
import { Check, RotateCcw, Briefcase } from 'lucide-react'
import { TIPO_COLOR } from '../../../lib/conflictosRotacion'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import PersonaSelectorDesktop from './PersonaSelectorDesktop'

export default function FilaParteDesktop({
  parte,
  asignaciones,
  personas,
  historial,
  mes,
  fechaSemana,
  semanaAsignados,
  onAsignar,
  onConfirmar,
  clavePresidente,
  modoLectura,
  evento,
  horaCalculada,
}) {
  const [flashing, setFlashing] = useState(false)
  const asig = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'principal')
  const asigAyu = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'ayudante')
  const principal = asig[0] || null
  const ayudante = asigAyu[0] || null

  const esVisitaSC = evento?.tipo_evento === 'visita_sc'
  const esVisitaSucursal = evento?.tipo_evento === 'visita_sucursal'
  const esVisita = esVisitaSC || esVisitaSucursal
  const nombreVisitante = esVisita
    ? (evento.nombre_visitante || (esVisitaSC ? 'Superintendente de Circuito' : 'Representante de la Sucursal'))
    : null

  const principalPartRecord = principal?.participacion_id
    ? historial.find(h => h.id === principal.participacion_id)
    : null
  const ayudantePartRecord = ayudante?.participacion_id
    ? historial.find(h => h.id === ayudante.participacion_id)
    : null

  const principalCambiado =
    !!principal?.participacion_id &&
    principalPartRecord &&
    principalPartRecord.clave !== principal?.clave
  const ayudanteCambiado =
    !!ayudante?.participacion_id &&
    ayudantePartRecord &&
    ayudantePartRecord.clave !== ayudante?.clave
  const ayudanteNuevo =
    parte.requiere_ayudante &&
    ayudante?.clave &&
    principal?.participacion_id &&
    !ayudante?.participacion_id
  const ayudanteRemovido = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

  const necesitaReconfirmar =
    principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido

  // Slot vacío — no renderizar asignable
  if (parte.tipo_asignacion === 'SMT_VACIO') {
    return (
      <div
        className={`grid gap-2 sm:gap-3 py-2.5 border-b border-zinc-100 dark:divide-zinc-800/60 last:border-0 items-center ${
          modoLectura
            ? 'grid-cols-1 sm:grid-cols-[72px_1fr_200px]'
            : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
        }`}
      >
        <div className="text-xs font-mono text-text3 w-16" />
        <div>
          <div className="text-xs text-text3 italic">Sin cuarta asignación</div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-text3">
            SMT
          </span>
        </div>
        <div />
        {!modoLectura && <div />}
      </div>
    )
  }

  // CONCLU y ORACION — read-only, siempre refleja al Presidente
  if (parte.tipo_asignacion === 'CONCLU' || parte.tipo_asignacion === 'ORACION') {
    const nombrePresidente = personas.find(p => p.clave === clavePresidente)?.nombre || '—'
    return (
      <div
        className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 items-center ${
          modoLectura
            ? 'grid-cols-1 sm:grid-cols-[72px_1fr_200px]'
            : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {horaCalculada || parte.hora_inicio || ''}
        </div>
        <div>
          <div className="text-xs font-medium text-text1 leading-snug">{parte.titulo}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                TIPO_COLOR[parte.tipo_asignacion] || 'bg-zinc-100 text-zinc-700'
              }`}
            >
              {parte.tipo_asignacion}
            </span>
          </div>
        </div>

        {modoLectura ? (
          <div className="flex flex-col">
            <span
              className={
                clavePresidente ? 'text-xs font-medium text-text1' : 'text-xs text-text3 italic'
              }
            >
              {clavePresidente ? nombrePresidente : '— Asignar presidente primero'}
            </span>
          </div>
        ) : (
          <div className="px-2.5 py-1.5 text-xs text-text3 italic bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 rounded-lg">
            {clavePresidente ? nombrePresidente : '— Presidente asignado —'}
          </div>
        )}
        {!modoLectura && <div />}
      </div>
    )
  }

  // Discurso de la Visita (sustituye al EBC)
  if (esVisita && parte.tipo_asignacion === 'EBC_CON') {
    const tituloDiscurso = esVisitaSC
      ? 'Discurso del Superintendente (30 mins.)'
      : 'Discurso del Representante de la Sucursal (30 mins.)'

    return (
      <div
        className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 items-center ${
          modoLectura
            ? 'grid-cols-1 sm:grid-cols-[72px_1fr_200px]'
            : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {horaCalculada || parte.hora_inicio || ''}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text1 leading-snug truncate">
            {tituloDiscurso}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              DISCURSO SC
            </span>
            <span className="text-[11px] text-text3 font-mono">30 min</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 min-w-0">
          <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-medium truncate">{nombreVisitante}</span>
          <Badge variant="success" size="xs" className="ml-auto shrink-0">
            Visitante
          </Badge>
        </div>

        {!modoLectura && <div />}
      </div>
    )
  }

  // Lector de EBC — En visita no se requiere lector
  if (esVisita && parte.tipo_asignacion === 'LEBC') {
    return (
      <div
        className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 items-center opacity-70 ${
          modoLectura
            ? 'grid-cols-1 sm:grid-cols-[72px_1fr_200px]'
            : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {horaCalculada || parte.hora_inicio || ''}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-text3 leading-snug line-through truncate">
            {parte.titulo}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border bg-zinc-100 dark:bg-zinc-800 text-text3">
              LEBC
            </span>
          </div>
        </div>

        <div className="px-2.5 py-1.5 text-xs text-text3 italic bg-zinc-50/50 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
          No requiere lector (Discurso de 30 min)
        </div>

        {!modoLectura && <div />}
      </div>
    )
  }

  const esOracionVisitantePredeterminada =
    esVisita &&
    parte.tipo_asignacion === 'ORACION_C' &&
    evento?.oracion_visitante !== false &&
    !principal?.clave

  return (
    <div
      id={`parte-${parte.id}`}
      className={`grid gap-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 items-center transition-all ${
        modoLectura
          ? 'grid-cols-1 sm:grid-cols-[72px_1fr_200px]'
          : 'grid-cols-1 md:grid-cols-[80px_1fr_220px_110px]'
      }`}
    >
      {/* Hora */}
      <div className="text-xs font-mono text-text3 whitespace-nowrap">
        {horaCalculada || parte.hora_inicio || ''}
      </div>

      {/* Título y Tipo */}
      <div className="min-w-0">
        <div className="text-xs font-medium text-text1 leading-snug truncate">{parte.titulo}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
              TIPO_COLOR[parte.tipo_asignacion] || 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {parte.tipo_asignacion}
          </span>
          {parte.duracion_min && (
            <span className="text-[11px] text-text3 font-mono">
              {parte.duracion_min} min
            </span>
          )}
        </div>
      </div>

      {/* Asignaciones: Modo Lectura vs Modo Edición */}
      {modoLectura ? (
        <div className="flex flex-col gap-0.5 min-w-0">
          {esOracionVisitantePredeterminada ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate">
                {nombreVisitante}
              </span>
              <Badge variant="success" size="xs">
                Visitante
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`text-xs truncate ${
                  principal?.clave ? 'font-medium text-text1' : 'text-text3 italic'
                }`}
              >
                {principal?.clave
                  ? personas.find(p => p.clave === principal.clave)?.nombre ?? principal.clave
                  : '— Sin asignar'}
              </span>
              {principal?.clave && (
                <Badge
                  variant={
                    principal?.confirmado && !necesitaReconfirmar
                      ? 'success'
                      : necesitaReconfirmar
                        ? 'warning'
                        : 'neutral'
                  }
                  size="xs"
                >
                  {principal?.confirmado && !necesitaReconfirmar
                    ? 'Confirmado'
                    : necesitaReconfirmar
                      ? 'Reconfirmar'
                      : 'Pendiente'}
                </Badge>
              )}
            </div>
          )}
          {parte.requiere_ayudante && (
            <span className="text-[11px] text-text3 truncate">
              {ayudante?.clave
                ? `↳ ${personas.find(p => p.clave === ayudante.clave)?.nombre ?? ayudante.clave}`
                : principal?.clave
                  ? '↳ Sin ayudante'
                  : null}
            </span>
          )}
        </div>
      ) : (
        <>
          {/* Selectores de participantes */}
          <div className="flex flex-col gap-1.5 min-w-0">
            <PersonaSelectorDesktop
              tipo={parte.tipo_asignacion}
              value={principal?.clave}
              onChange={clave => onAsignar(parte.id, clave, 'principal', principal?.id)}
              personas={personas}
              historial={historial}
              mes={mes}
              fechaSemana={fechaSemana}
              yaAsignados={semanaAsignados
                .filter(a => !(a.parte_id === parte.id && a.rol === 'principal'))
                .map(a =>
                  a.parte_id === parte.id && a.rol === 'ayudante'
                    ? { ...a, esTitularMismaParte: true }
                    : a
                )}
              disabled={false}
              placeholder={
                esVisita && evento?.oracion_visitante !== false && parte.tipo_asignacion === 'ORACION_C'
                  ? `${nombreVisitante} (Visitante)`
                  : undefined
              }
            />
            {parte.requiere_ayudante &&
              (() => {
                const titularSexo = personas.find(p => p.clave === principal?.clave)?.sexo
                const tipoAyu = titularSexo === 'M' ? 'SMT_EXP_M' : 'SMT_EXP_F'
                return (
                  <PersonaSelectorDesktop
                    tipo={tipoAyu}
                    value={ayudante?.clave}
                    onChange={clave => onAsignar(parte.id, clave, 'ayudante', ayudante?.id)}
                    personas={personas}
                    historial={historial}
                    mes={mes}
                    fechaSemana={fechaSemana}
                    yaAsignados={semanaAsignados
                      .filter(a => !(a.parte_id === parte.id && a.rol === 'ayudante'))
                      .map(a =>
                        a.parte_id === parte.id && a.rol === 'principal'
                          ? { ...a, esTitularMismaParte: true }
                          : a
                      )}
                    disabled={!principal?.clave}
                  />
                )
              })()}
          </div>

          {/* Botón de Confirmación */}
          <div className="flex items-center justify-end">
            {principal?.clave ? (
              <Button
                variant={
                  necesitaReconfirmar
                    ? 'danger'
                    : principal?.confirmado
                      ? 'accent'
                      : 'outline'
                }
                size="xs"
                loading={flashing}
                onClick={async () => {
                  setFlashing(true)
                  await onConfirmar(parte.id, principal, ayudante)
                  setTimeout(() => setFlashing(false), 500)
                }}
                icon={necesitaReconfirmar ? RotateCcw : Check}
              >
                {necesitaReconfirmar
                  ? 'Reconfirmar'
                  : principal?.confirmado
                    ? 'Confirmado'
                    : 'Confirmar'}
              </Button>
            ) : esOracionVisitantePredeterminada ? (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                Predeterminada
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
