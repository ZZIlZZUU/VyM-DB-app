import { useState } from 'react'
import { Check, RotateCcw, Briefcase, X, ArrowUpDown, AlertCircle } from 'lucide-react'
import {
  TIPO_COLOR,
  TIPO_BADGE_LABEL,
  evaluarReconfirmacionParte,
} from '../../../lib/conflictosRotacion'
import { Button } from '../../../components/ui/Button'
import { Badge } from '../../../components/ui/Badge'
import PersonaSelectorDesktop from './PersonaSelectorDesktop'

const GRID_EDIT = 'grid-cols-1 md:grid-cols-[64px_minmax(190px,1fr)_minmax(285px,350px)_128px]'
const GRID_READ = 'grid-cols-1 sm:grid-cols-[64px_minmax(190px,1fr)_minmax(250px,310px)]'

export default function FilaParteDesktop({
  parte,
  asignaciones,
  personas,
  historial,
  mes,
  fechaSemana,
  semanaAsignados,
  onAsignar,
  onQuitar,
  onIntercambiar,
  onConfirmar,
  clavePresidente,
  modoLectura,
  evento,
  horaCalculada,
  highlightQuery = '',
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

  const { necesitaReconfirmar } = evaluarReconfirmacionParte(
    parte,
    principal,
    ayudante,
    historial
  )

  const badgeLabel = TIPO_BADGE_LABEL[parte.tipo_asignacion] || parte.tipo_asignacion

  // Slot vacío — no renderizar asignable
  if (parte.tipo_asignacion === 'SMT_VACIO') {
    return (
      <div
        className={`grid gap-2 sm:gap-3 py-2.5 border-b border-border/50 last:border-0 items-center ${
          modoLectura ? GRID_READ : GRID_EDIT
        }`}
      >
        <div className="text-xs font-mono text-text3" />
        <div>
          <div className="text-xs text-text3 italic">Sin cuarta asignación</div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-alt text-text3">
            SMT
          </span>
        </div>
        <div />
        {!modoLectura && <div />}
      </div>
    )
  }

  const getInitials = (nombre = '') =>
    String(nombre)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() || '')
      .join('') || '?'

  // CONCLU y ORACION — read-only, siempre refleja al Presidente
  if (parte.tipo_asignacion === 'CONCLU' || parte.tipo_asignacion === 'ORACION') {
    const nombrePresidente = personas.find(p => p.clave === clavePresidente)?.nombre || '—'
    return (
      <div
        className={`grid gap-3 py-2.5 border-b border-border/60 last:border-0 items-center ${
          modoLectura ? GRID_READ : GRID_EDIT
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {horaCalculada || parte.hora_inicio || ''}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-text1 leading-snug line-clamp-2">
            {parte.titulo}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                TIPO_COLOR[parte.tipo_asignacion] || 'bg-surface-alt text-text2 border-border'
              }`}
            >
              {badgeLabel}
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
          <div className="px-2.5 py-1.5 text-xs text-text3 italic bg-surface-alt/50 border border-border rounded-lg truncate">
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
        className={`grid gap-3 py-2.5 border-b border-border/60 last:border-0 items-center ${
          modoLectura ? GRID_READ : GRID_EDIT
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {horaCalculada || parte.hora_inicio || ''}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-text1 leading-snug line-clamp-2">
            {tituloDiscurso}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
              Discurso SC
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
        className={`grid gap-3 py-2.5 border-b border-border/60 last:border-0 items-center opacity-70 ${
          modoLectura ? GRID_READ : GRID_EDIT
        }`}
      >
        <div className="text-xs font-mono text-text3 whitespace-nowrap">
          {horaCalculada || parte.hora_inicio || ''}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-medium text-text3 leading-snug line-through line-clamp-2">
            {parte.titulo}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-surface-alt text-text3 border-border">
              {badgeLabel}
            </span>
          </div>
        </div>

        <div className="px-2.5 py-1.5 text-xs text-text3 italic bg-surface-alt/50 border border-dashed border-border rounded-lg">
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

  const personaPrincipal = principal?.clave
    ? personas.find(p => p.clave === principal.clave) || null
    : null
  const personaAyudante = ayudante?.clave
    ? personas.find(p => p.clave === ayudante.clave) || null
    : null

  const nombrePrincipal = personaPrincipal?.nombre ?? principal?.clave ?? null
  const nombreAyudante = personaAyudante?.nombre ?? ayudante?.clave ?? null

  const normalizedQuery = highlightQuery.trim().toLowerCase()
  const matchesHighlight = Boolean(
    normalizedQuery &&
      ((nombrePrincipal && nombrePrincipal.toLowerCase().includes(normalizedQuery)) ||
        (principal?.clave && principal.clave.toLowerCase().includes(normalizedQuery)) ||
        (nombreAyudante && nombreAyudante.toLowerCase().includes(normalizedQuery)) ||
        (ayudante?.clave && ayudante.clave.toLowerCase().includes(normalizedQuery)))
  )

  const puedeIntercambiar = Boolean(
    parte.requiere_ayudante &&
      principal?.clave &&
      ayudante?.clave &&
      onIntercambiar
  )

  const faltaAyudante = Boolean(
    parte.requiere_ayudante && principal?.clave && !ayudante?.clave
  )

  return (
    <div
      id={`parte-${parte.id}`}
      className={`grid gap-3 py-2.5 px-2 -mx-2 rounded-xl border-b border-border/60 last:border-0 items-center transition-all ${
        modoLectura ? GRID_READ : GRID_EDIT
      } ${
        matchesHighlight
          ? 'bg-accent-muted-bg/60 ring-1 ring-accent-muted-border'
          : necesitaReconfirmar
            ? 'bg-amber-bg/40 border-l-2 border-l-amber'
            : 'hover:bg-surface-alt/30'
      }`}
    >
      {/* Hora */}
      <div className="text-xs font-mono text-text3 whitespace-nowrap">
        {horaCalculada || parte.hora_inicio || ''}
      </div>

      {/* Título y Tipo */}
      <div className="min-w-0">
        <div
          className="text-xs font-medium text-text1 leading-snug line-clamp-2"
          title={parte.titulo}
        >
          {parte.titulo}
        </div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
              TIPO_COLOR[parte.tipo_asignacion] || 'bg-surface-alt text-text2 border-border'
            }`}
          >
            {badgeLabel}
          </span>
          {parte.duracion_min && (
            <span className="text-[11px] text-text3 font-mono">
              {parte.duracion_min} min
            </span>
          )}
          {faltaAyudante && !modoLectura && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber">
              <AlertCircle className="w-3 h-3" />
              Falta ayudante
            </span>
          )}
        </div>
      </div>

      {/* Asignaciones: Modo Lectura vs Modo Edición */}
      {modoLectura ? (
        <div className="flex flex-col gap-1 min-w-0">
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
          ) : principal?.clave ? (
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-accent-muted-bg border border-accent-muted-border text-[10px] font-semibold text-accent flex items-center justify-center shrink-0">
                  {getInitials(nombrePrincipal)}
                </span>
                <div className="min-w-0">
                  <span
                    className="text-xs font-medium text-text1 block truncate"
                    title={
                      parte.requiere_ayudante && nombreAyudante
                        ? `${nombrePrincipal} y ${nombreAyudante}`
                        : nombrePrincipal
                    }
                  >
                    {nombrePrincipal}
                  </span>
                  {parte.requiere_ayudante && nombreAyudante && (
                    <span className="text-[11px] text-text2 block truncate">
                      Ayudante: {nombreAyudante}
                    </span>
                  )}
                  {parte.requiere_ayudante && !nombreAyudante && (
                    <span className="text-[10px] text-amber block">
                      Falta ayudante
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant={
                  principal?.confirmado && !necesitaReconfirmar
                    ? 'success'
                    : necesitaReconfirmar
                      ? 'warning'
                      : 'neutral'
                }
                size="xs"
                className="shrink-0"
              >
                {principal?.confirmado && !necesitaReconfirmar
                  ? '✓ Confirmado'
                  : necesitaReconfirmar
                    ? '↻ Reconfirmar'
                    : '◷ Por confirmar'}
              </Badge>
            </div>
          ) : (
            <div>
              <Badge variant="neutral" size="xs">
                — Sin asignar
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selectores de participantes + botón directo para quitar / intercambiar */}
          <div className="flex flex-col gap-1.5 min-w-0">
            {/* Titular */}
            <div className="flex flex-col gap-0.5 min-w-0">
              {parte.requiere_ayudante && (
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">
                    Titular
                  </span>
                  {puedeIntercambiar && (
                    <button
                      type="button"
                      onClick={() => onIntercambiar(parte, principal, ayudante)}
                      title="Intercambiar Titular ↔ Ayudante"
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-text3 hover:text-accent transition-colors cursor-pointer px-1 py-0.5 rounded hover:bg-surface-alt"
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      <span>Intercambiar</span>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-start gap-1 min-w-0">
                <div className="flex-1 min-w-0">
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
                </div>
                {principal?.clave && (
                  <button
                    type="button"
                    onClick={() =>
                      onQuitar
                        ? onQuitar(parte, 'principal', principal, ayudante)
                        : onAsignar(parte.id, null, 'principal', principal?.id)
                    }
                    aria-label={`Quitar ${nombrePrincipal} de ${parte.titulo}`}
                    title={
                      principal?.confirmado
                        ? `Quitar a ${nombrePrincipal} (asignación confirmada)`
                        : `Quitar a ${nombrePrincipal}`
                    }
                    className="h-[30px] w-7 shrink-0 inline-flex items-center justify-center rounded-lg border border-transparent text-text3 hover:text-danger hover:bg-danger-bg hover:border-danger/20 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Ayudante (solo en partes SMT que lo requieren) */}
            {parte.requiere_ayudante &&
              (() => {
                const titularSexo =
                  personaPrincipal?.sexo ||
                  personaAyudante?.sexo ||
                  null
                const tipoAyu = titularSexo === 'M' ? 'SMT_EXP_M' : 'SMT_EXP_F'
                const selectorDeshabilitado = !principal?.clave && !ayudante?.clave

                return (
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text3 px-0.5">
                      Ayudante
                    </span>
                    <div className="flex items-start gap-1 min-w-0">
                      <div className="flex-1 min-w-0">
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
                          disabled={selectorDeshabilitado}
                          placeholder={
                            selectorDeshabilitado
                              ? '— Elegir titular primero —'
                              : '— Sin ayudante —'
                          }
                        />
                      </div>
                      {ayudante?.clave && (
                        <button
                          type="button"
                          onClick={() =>
                            onQuitar
                              ? onQuitar(parte, 'ayudante', ayudante, principal)
                              : onAsignar(parte.id, null, 'ayudante', ayudante?.id)
                          }
                          aria-label={`Quitar ayudante ${nombreAyudante} de ${parte.titulo}`}
                          title={
                            ayudante?.confirmado
                              ? `Quitar ayudante ${nombreAyudante} (confirmado)`
                              : `Quitar ayudante ${nombreAyudante}`
                          }
                          className="h-[30px] w-7 shrink-0 inline-flex items-center justify-center rounded-lg border border-transparent text-text3 hover:text-danger hover:bg-danger-bg hover:border-danger/20 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
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
                    : 'Por confirmar'}
              </Button>
            ) : esOracionVisitantePredeterminada ? (
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                Predeterminada
              </span>
            ) : (
              <Badge variant="neutral" size="xs">
                — Sin asignar
              </Badge>
            )}
          </div>
        </>
      )}
    </div>
  )
}
