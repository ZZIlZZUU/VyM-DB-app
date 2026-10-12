import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Plus,
  Trash2,
  Edit2,
  Briefcase,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  CalendarCheck,
} from 'lucide-react'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { formatFechaLegible } from '../lib/fechas'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const DIA_SEMANA_MAP = {
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
  'Domingo': 0,
}

export function CalendarioEventos({
  eventos = [],
  semanas = [],
  diaReunionEntreSemana = 'Martes',
  diaReunionFinSemana = 'Sábado',
  onCrearEvento,
  onEditarEvento,
  onEliminarEvento,
  tiposEvento = [],
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [vistaModo, setVistaModo] = useState('calendario') // 'calendario' | 'lista'

  const anio = currentDate.getFullYear()
  const mesIndex = currentDate.getMonth()

  // Navegación de mes
  function prevMonth() {
    setCurrentDate(new Date(anio, mesIndex - 1, 1))
  }
  function nextMonth() {
    setCurrentDate(new Date(anio, mesIndex + 1, 1))
  }
  function goToday() {
    setCurrentDate(new Date())
  }

  // Helper de número de día JS (0=Dom, 1=Lun ... 6=Sab) normalizado a 0=Lun ... 6=Dom
  function getDiaSemanaNorm(jsDay) {
    return jsDay === 0 ? 6 : jsDay - 1
  }

  // Helper para formatear fecha local como YYYY-MM-DD sin desajustes UTC
  function formatDateLocal(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Generar cuadrícula del mes
  const diasGrid = useMemo(() => {
    const primerDiaMes = new Date(anio, mesIndex, 1)
    const ultimoDiaMes = new Date(anio, mesIndex + 1, 0)
    const totalDiasMes = ultimoDiaMes.getDate()

    const diaSemanaInicio = getDiaSemanaNorm(primerDiaMes.getDay()) // 0=Lun, 6=Dom
    const dias = []

    // Días del mes anterior para rellenar
    const ultimoDiaMesAnt = new Date(anio, mesIndex, 0).getDate()
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const d = ultimoDiaMesAnt - i
      const dateObj = new Date(anio, mesIndex - 1, d)
      const iso = formatDateLocal(dateObj)
      dias.push({
        numero: d,
        iso,
        dateObj,
        esMesActual: false,
      })
    }

    // Días del mes actual
    const hoyIso = formatDateLocal(new Date())
    for (let d = 1; d <= totalDiasMes; d++) {
      const dateObj = new Date(anio, mesIndex, d)
      const iso = `${anio}-${String(mesIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      dias.push({
        numero: d,
        iso,
        dateObj,
        esMesActual: true,
        esHoy: iso === hoyIso,
      })
    }

    // Días del mes siguiente para completar cuadrícula (múltiplo de 7, máx 42 celdas)
    const resto = (7 - (dias.length % 7)) % 7
    for (let d = 1; d <= resto; d++) {
      const dateObj = new Date(anio, mesIndex + 1, d)
      const iso = formatDateLocal(dateObj)
      dias.push({
        numero: d,
        iso,
        dateObj,
        esMesActual: false,
      })
    }

    return dias
  }, [anio, mesIndex])

  // Mapear eventos a fechas o semanas
  function getEventosParaDia(iso, dateObj) {
    const numDiaJS = dateObj.getDay()
    const numEntreSemana = DIA_SEMANA_MAP[diaReunionEntreSemana] ?? 2
    const numFinSemana = DIA_SEMANA_MAP[diaReunionFinSemana] ?? 6
    const esDiaReunion = numDiaJS === numEntreSemana || numDiaJS === numFinSemana

    return eventos.filter(evt => {
      // 1. Si tiene fecha efectiva exacta
      if (evt.fecha_efectiva === iso) return true
      // 2. Si tiene fecha original exacta y no fue desplazada
      if (evt.fecha_original === iso && !evt.fecha_efectiva) return true

      // 3. Si coincide con una semana programada
      if (evt.semana_id) {
        const sem = semanas.find(s => s.id === evt.semana_id)
        if (sem && sem.fecha_inicio && sem.fecha_fin) {
          const dentroDeSemana = iso >= sem.fecha_inicio && iso <= sem.fecha_fin
          if (!dentroDeSemana) return false

          // Si el evento tiene fecha efectiva, ya fue evaluado arriba
          if (evt.fecha_efectiva) return evt.fecha_efectiva === iso

          // Si es día de reunión en esa semana, renderizarlo aquí
          if (esDiaReunion) return true

          // Si no es día de reunión pero es el inicio de la semana y ningún otro día coincide
          if (iso === sem.fecha_inicio) return true
        }
      }
      return false
    })
  }

  function getMetaTipo(tipoId) {
    return (
      tiposEvento.find(t => t.id === tipoId) || {
        label: tipoId,
        color: 'neutral',
      }
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de Controles y Cabecera del Calendario */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-text1 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Calendario de Eventos y Excepciones
            </h3>
            <p className="text-[11px] text-text3">
              Gestiona visitas del Superintendente de Circuito, representantes, asambleas y traslados de reunión.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Toggle Vista Calendario / Lista */}
            <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-50 dark:bg-zinc-900/60">
              <button
                type="button"
                onClick={() => setVistaModo('calendario')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  vistaModo === 'calendario'
                    ? 'bg-white dark:bg-zinc-800 text-text1 shadow-2xs'
                    : 'text-text3 hover:text-text1'
                }`}
                title="Vista de cuadrícula mensual"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calendario</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaModo('lista')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  vistaModo === 'lista'
                    ? 'bg-white dark:bg-zinc-800 text-text1 shadow-2xs'
                    : 'text-text3 hover:text-text1'
                }`}
                title="Vista de lista de eventos"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista ({eventos.length})</span>
              </button>
            </div>

            <Button
              variant="accent"
              size="sm"
              icon={Plus}
              onClick={() => onCrearEvento?.()}
            >
              Nuevo Evento
            </Button>
          </div>
        </div>

        {/* Navegación de Fechas (Mes / Año) */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text2 transition-colors cursor-pointer"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text2 transition-colors cursor-pointer"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <h4 className="text-sm font-semibold text-text1 ml-2">
              {MESES[mesIndex]} {anio}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text2 transition-colors cursor-pointer"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Leyenda de Colores */}
        <div className="flex items-center gap-3 text-[11px] text-text3 flex-wrap pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
          <span className="font-medium text-text2">Leyenda:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Visita SC / Sucursal
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Asamblea
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Traslado de Reunión
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Reunión Cancelada
          </span>
        </div>
      </div>

      {/* ── MODO 1: CUADRÍCULA DE CALENDARIO ── */}
      {vistaModo === 'calendario' && (
        <div className="rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
          {/* Cabecera días de semana */}
          <div className="grid grid-cols-7 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 text-center text-[11px] font-semibold text-text3 py-2">
            {DIAS_SEMANA.map((dia, idx) => (
              <div key={dia} className={idx >= 5 ? 'text-zinc-400 dark:text-zinc-500' : ''}>
                {dia}
              </div>
            ))}
          </div>

          {/* Celdas de días */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-100 dark:divide-zinc-800/60 bg-zinc-50/20 dark:bg-zinc-900/10">
            {diasGrid.map((dia, idx) => {
              const evtsDia = getEventosParaDia(dia.iso, dia.dateObj)
              const numDiaJS = dia.dateObj.getDay()
              const numEntreSemana = DIA_SEMANA_MAP[diaReunionEntreSemana] ?? 2
              const numFinSemana = DIA_SEMANA_MAP[diaReunionFinSemana] ?? 6
              const esDiaReunion = numDiaJS === numEntreSemana || numDiaJS === numFinSemana

              return (
                <div
                  key={`${dia.iso}-${idx}`}
                  onClick={() => {
                    if (evtsDia.length > 0) {
                      onEditarEvento?.(evtsDia[0])
                    } else {
                      // Buscar semana coincidente si existe
                      const sem = semanas.find(s => dia.iso >= s.fecha_inicio && dia.iso <= s.fecha_fin)
                      onCrearEvento?.({ fecha_efectiva: dia.iso, semana_id: sem?.id || '' })
                    }
                  }}
                  className={`min-h-[90px] sm:min-h-[105px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                    dia.esMesActual
                      ? 'bg-surface hover:bg-zinc-50/90 dark:hover:bg-zinc-900/60'
                      : 'bg-zinc-50/50 dark:bg-zinc-950/40 text-zinc-400 dark:text-zinc-600 opacity-60'
                  } ${
                    dia.esHoy
                      ? 'ring-1 ring-sky-400/60 dark:ring-sky-500/50 bg-sky-50/30 dark:bg-sky-950/15'
                      : esDiaReunion && dia.esMesActual
                      ? 'ring-1 ring-inset ring-zinc-200/70 dark:ring-zinc-800/80'
                      : ''
                  }`}
                >
                  {/* Número de día e indicador de reunión */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-medium rounded-md w-5 h-5 flex items-center justify-center ${
                        dia.esHoy
                          ? 'bg-sky-500 text-white font-bold shadow-2xs ring-1 ring-sky-400/40'
                          : dia.esMesActual
                          ? 'text-text1'
                          : 'text-zinc-400 dark:text-zinc-600'
                      }`}
                    >
                      {dia.numero}
                    </span>

                    {esDiaReunion && dia.esMesActual && (
                      <span
                        className="text-[9.5px] font-mono px-1 rounded bg-zinc-100 dark:bg-zinc-800 text-text3"
                        title="Día ordinario de reunión"
                      >
                        Reunión
                      </span>
                    )}
                  </div>

                  {/* Píldoras de Eventos en el día */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {evtsDia.map(evt => {
                      const meta = getMetaTipo(evt.tipo_evento)
                      const esVisita = evt.tipo_evento === 'visita_sc' || evt.tipo_evento === 'visita_sucursal'
                      const nombreVis = evt.nombre_visitante

                      return (
                        <div
                          key={evt.id}
                          onClick={e => {
                            e.stopPropagation()
                            onEditarEvento?.(evt)
                          }}
                          className={`text-[10px] leading-tight px-1.5 py-1 rounded-md border font-medium truncate flex items-center gap-1 shadow-2xs cursor-pointer hover:opacity-80 transition-opacity ${
                            esVisita
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                              : evt.tipo_evento === 'reunion_desplazada'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                              : evt.tipo_evento === 'reunion_cancelada'
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 border-red-300 dark:border-red-800'
                              : 'bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-800'
                          }`}
                          title={`${evt.titulo_evento}${nombreVis ? ` — ${nombreVis}` : ''} (Clic para editar)`}
                        >
                          {esVisita ? (
                            <Briefcase className="w-2.5 h-2.5 shrink-0" />
                          ) : evt.tipo_evento === 'reunion_desplazada' ? (
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                          ) : evt.tipo_evento === 'reunion_cancelada' ? (
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          ) : (
                            <CalendarCheck className="w-2.5 h-2.5 shrink-0" />
                          )}
                          <span className="truncate">
                            {nombreVis ? `${meta.label}: ${nombreVis}` : evt.titulo_evento}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Botón sutil en hover para agregar */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        const sem = semanas.find(s => dia.iso >= s.fecha_inicio && dia.iso <= s.fecha_fin)
                        onCrearEvento?.({ fecha_efectiva: dia.iso, semana_id: sem?.id || '' })
                      }}
                      className="text-[10px] text-text3 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-0.5 cursor-pointer py-0.5 px-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Agregar evento en este día"
                    >
                      <Plus className="w-2.5 h-2.5" /> Evento
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MODO 2: LISTA DE EVENTOS ── */}
      {vistaModo === 'lista' && (
        <div className="rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs p-4 sm:p-5">
          {eventos.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-text3 flex items-center justify-center mx-auto">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-text1">No hay eventos o excepciones programadas</p>
              <p className="text-[11px] text-text3 max-w-sm mx-auto">
                Si tu congregación tiene una Asamblea, Visita del SC, o traslada una reunión, regístrala con el botón superior.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {eventos.map(evt => {
                const metaTipo = getMetaTipo(evt.tipo_evento)
                const esVisita = evt.tipo_evento === 'visita_sc' || evt.tipo_evento === 'visita_sucursal'

                return (
                  <div
                    key={evt.id}
                    className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={metaTipo.color} size="xs">
                          {metaTipo.label}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditarEvento?.(evt)}
                            className="text-text3 hover:text-text1 transition-colors cursor-pointer p-1"
                            title="Editar evento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEliminarEvento?.(evt.id, evt.titulo_evento)}
                            className="text-text3 hover:text-red-500 transition-colors cursor-pointer p-1"
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-xs font-semibold text-text1">{evt.titulo_evento}</h4>

                      {/* Info de Visitante si aplica */}
                      {esVisita && evt.nombre_visitante && (
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                          <Briefcase className="w-3.5 h-3.5 shrink-0" />
                          <span>Orador visitante: {evt.nombre_visitante}</span>
                        </div>
                      )}

                      {evt.tipo_evento === 'reunion_desplazada' ? (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          Desplazada al: {evt.fecha_efectiva} {evt.hora_efectiva ? `a las ${evt.hora_efectiva}` : ''}
                        </p>
                      ) : (
                        <p className="text-[11px] text-text3">
                          Semana programada: {evt.fecha_original ? formatFechaLegible(evt.fecha_original) : 'Fecha por confirmar'}
                        </p>
                      )}

                      {evt.descripcion && (
                        <p className="text-[11px] text-text3 italic leading-relaxed">
                          "{evt.descripcion.replace(/\[VISITANTE:[^\]]+\]/, '').trim()}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between text-[10px] text-text3 font-mono">
                      <span>Afecta: {evt.afecta_reunion}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Reflejado en S-140</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
