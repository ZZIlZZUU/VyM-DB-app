import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  List,
  Plus,
  Trash2,
  Briefcase,
  AlertTriangle,
  Clock,
  CalendarCheck,
  AlignLeft,
  Tag,
  ArrowRight,
  Check,
  Shield,
  Eye,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Sheet } from './ui/Sheet'
import Toast from './Toast'
import { useToast } from '../hooks/useToast'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { useEventosReunion } from '../hooks/useEventosReunion'
import {
  formatFechaLegible,
  addDaysIso,
  inferirAfectaReunion,
} from '../lib/fechas'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_SEMANA_CORTOS_JS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const DIA_SEMANA_MAP = {
  'Lunes': 1,
  'Martes': 2,
  'Miércoles': 3,
  'Jueves': 4,
  'Viernes': 5,
  'Sábado': 6,
  'Domingo': 0,
}

export const TIPOS_EVENTO_DEFAULT = [
  {
    id: 'visita_sc',
    label: 'Visita del Superintendente de Circuito',
    shortLabel: 'Visita SC',
    color: 'emerald',
    dotClass: 'bg-emerald-500',
    desc: 'Discurso de servicio de 30 min sustituye el Estudio Bíblico de Congregación',
  },
  {
    id: 'visita_sucursal',
    label: 'Visita de Representante de Sucursal',
    shortLabel: 'Visita Sucursal',
    color: 'emerald',
    dotClass: 'bg-emerald-500',
    desc: 'Discurso especial de 30 min sustituye el Estudio Bíblico de Congregación',
  },
  {
    id: 'asamblea_circuito',
    label: 'Asamblea de Circuito',
    shortLabel: 'Asamblea de Circuito',
    color: 'purple',
    dotClass: 'bg-purple-500',
    desc: '1 día de asamblea · Sin reunión ordinaria en esa fecha',
  },
  {
    id: 'asamblea_regional',
    label: 'Asamblea Regional',
    shortLabel: 'Asamblea Regional',
    color: 'blue',
    dotClass: 'bg-sky-500',
    desc: '3 días seguidos de asamblea · Cancela la reunión por la que pasa',
  },
  {
    id: 'reunion_desplazada',
    label: 'Reunión Desplazada',
    shortLabel: 'Reunión Desplazada',
    color: 'amber',
    dotClass: 'bg-amber-500',
    desc: 'Traslada la reunión de su día habitual a una nueva fecha u hora',
  },
  {
    id: 'reunion_cancelada',
    label: 'Reunión Cancelada',
    shortLabel: 'Reunión Cancelada',
    color: 'red',
    dotClass: 'bg-red-500',
    desc: 'Suspende la reunión ordinaria de la fecha seleccionada',
  },
]

function formatFechaCortaNotion(isoStr) {
  if (!isoStr) return 'Seleccionar fecha'
  const [y, m, d] = String(isoStr).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return isoStr
  const dt = new Date(y, m - 1, d)
  const diaSem = DIAS_SEMANA_CORTOS_JS[dt.getDay()]
  const mesNom = MESES_CORTOS[m - 1]
  return `${diaSem}, ${d} ${mesNom} ${y}`
}

export function CalendarioEventos({
  eventos: propEventos,
  semanas: propSemanas,
  diaReunionEntreSemana: propDiaEntre,
  diaReunionFinSemana: propDiaFin,
  onCrearEvento,
  onEditarEvento,
  onEliminarEvento,
  tiposEvento = TIPOS_EVENTO_DEFAULT,
  standalone = false,
  rol = 'admin',
  config: propConfig,
  readOnly = false,
}) {
  const { config: hookConfig } = useConfiguracion()
  const {
    eventos: hookEventos,
    saving: savingEventos,
    guardarEvento,
    eliminarEvento,
  } = useEventosReunion()
  const { toast, success, error: toastError } = useToast()

  const activeConfig = propConfig || hookConfig
  const eventos = propEventos ?? hookEventos
  const diaReunionEntreSemana = propDiaEntre || activeConfig?.diaReunionEntreSemana || 'Martes'
  const diaReunionFinSemana = propDiaFin || activeConfig?.diaReunionFinSemana || 'Sábado'

  const [fetchedSemanas, setFetchedSemanas] = useState([])
  useEffect(() => {
    if (propSemanas) return
    supabase
      .from('programa_semanas')
      .select('id, fecha_inicio, fecha_fin, mes, anio')
      .order('fecha_inicio', { ascending: false })
      .then(({ data }) => {
        if (data) setFetchedSemanas(data)
      })
  }, [propSemanas])

  const semanas = propSemanas ?? fetchedSemanas
  const canEdit = !readOnly && rol === 'admin'

  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [vistaModo, setVistaModo] = useState('calendario') // 'calendario' | 'lista'

  // Estado interno del Side-Sheet estilo Notion Calendar
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState(null)
  const [eventoForm, setEventoForm] = useState({
    semana_id: '',
    tipo_evento: 'visita_sc',
    titulo_evento: 'Visita del Superintendente de Circuito',
    fecha_original: '',
    fecha_efectiva: '',
    hora_efectiva: '',
    afecta_reunion: 'entre_semana',
    descripcion: '',
    nombre_visitante: '',
    oracion_visitante: true,
  })

  const anio = currentDate.getFullYear()
  const mesIndex = currentDate.getMonth()

  function prevMonth() {
    setCurrentDate(new Date(anio, mesIndex - 1, 1))
  }
  function nextMonth() {
    setCurrentDate(new Date(anio, mesIndex + 1, 1))
  }
  function goToday() {
    setCurrentDate(new Date())
  }

  function getDiaSemanaNorm(jsDay) {
    return jsDay === 0 ? 6 : jsDay - 1
  }

  function formatDateLocal(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function findSemanaForIso(iso) {
    if (!iso || !semanas?.length) return null
    return semanas.find(s => iso >= s.fecha_inicio && iso <= s.fecha_fin) || null
  }

  // Abrir Side-Sheet para crear evento
  function handleOpenCrear(initData = {}) {
    if (!canEdit) return
    if (onCrearEvento) {
      onCrearEvento(initData)
      return
    }
    const hoyIso = formatDateLocal(new Date())
    const fechaClick = initData.fecha_efectiva || initData.fecha_original || hoyIso
    const semMatch = initData.semana_id
      ? semanas.find(s => s.id === initData.semana_id)
      : findSemanaForIso(fechaClick)

    // Si hacen clic en sábado/viernes/domingo sugerir asamblea o visita según el día
    const [y, m, d] = fechaClick.split('-').map(Number)
    const dayOfWeek = new Date(y, m - 1, d).getDay()
    const numFin = DIA_SEMANA_MAP[diaReunionFinSemana] ?? 6

    const tipoDefault = initData.tipo_evento || (dayOfWeek === 5 ? 'asamblea_regional' : dayOfWeek === numFin ? 'asamblea_circuito' : 'visita_sc')
    const opt = tiposEvento.find(t => t.id === tipoDefault) || tiposEvento[0]
    const afectaAuto = inferirAfectaReunion(
      tipoDefault,
      fechaClick,
      diaReunionEntreSemana,
      diaReunionFinSemana
    )

    setEditingEvento(null)
    setEventoForm({
      semana_id: semMatch?.id || '',
      tipo_evento: tipoDefault,
      titulo_evento: opt?.label || 'Visita del Superintendente de Circuito',
      fecha_original: fechaClick,
      fecha_efectiva: tipoDefault === 'reunion_desplazada' ? addDaysIso(fechaClick, 1) : fechaClick,
      hora_efectiva: '',
      afecta_reunion: afectaAuto,
      descripcion: '',
      nombre_visitante: tipoDefault === 'visita_sc' ? (activeConfig?.nombreSuperintendenteCircuito || '') : '',
      oracion_visitante: true,
    })
    setSheetOpen(true)
  }

  // Abrir Side-Sheet para ver o editar evento
  function handleOpenEditar(evt) {
    if (onEditarEvento && canEdit) {
      onEditarEvento(evt)
      return
    }
    const baseFecha = evt.fecha_original || evt.fecha_efectiva || ''
    const afectaAuto = inferirAfectaReunion(
      evt.tipo_evento,
      baseFecha,
      diaReunionEntreSemana,
      diaReunionFinSemana
    )
    setEditingEvento(evt)
    setEventoForm({
      semana_id: evt.semana_id || findSemanaForIso(baseFecha)?.id || '',
      tipo_evento: evt.tipo_evento || 'visita_sc',
      titulo_evento: evt.titulo_evento || '',
      fecha_original: evt.fecha_original || evt.fecha_efectiva || '',
      fecha_efectiva: evt.fecha_efectiva || evt.fecha_original || '',
      hora_efectiva: evt.hora_efectiva || '',
      afecta_reunion: evt.afecta_reunion || afectaAuto,
      descripcion: evt.descripcion ? evt.descripcion.replace(/\[VISITANTE:[^\]]+\]/, '').trim() : '',
      nombre_visitante: evt.nombre_visitante || '',
      oracion_visitante: evt.oracion_visitante !== false,
    })
    setSheetOpen(true)
  }

  async function handleSaveInternal(e) {
    e?.preventDefault?.()
    if (!canEdit) return

    if (!eventoForm.titulo_evento.trim()) {
      toastError('Indica un título para el evento.')
      return
    }

    if (
      (eventoForm.tipo_evento === 'visita_sc' || eventoForm.tipo_evento === 'visita_sucursal') &&
      !eventoForm.nombre_visitante?.trim()
    ) {
      toastError('Indica el nombre del orador visitante.')
      return
    }

    const fechaBase =
      eventoForm.tipo_evento === 'reunion_desplazada'
        ? eventoForm.fecha_original || eventoForm.fecha_efectiva
        : eventoForm.fecha_efectiva || eventoForm.fecha_original

    const afectaCalculada = inferirAfectaReunion(
      eventoForm.tipo_evento,
      fechaBase,
      diaReunionEntreSemana,
      diaReunionFinSemana
    )

    const semMatch =
      findSemanaForIso(fechaBase) ||
      (eventoForm.tipo_evento === 'asamblea_regional'
        ? findSemanaForIso(addDaysIso(fechaBase, 1)) || findSemanaForIso(addDaysIso(fechaBase, 2))
        : null)

    const payload = {
      ...eventoForm,
      id: editingEvento?.id,
      fecha_original: fechaBase,
      fecha_efectiva:
        eventoForm.tipo_evento === 'reunion_desplazada'
          ? eventoForm.fecha_efectiva
          : fechaBase,
      afecta_reunion: afectaCalculada,
      semana_id: semMatch?.id || eventoForm.semana_id || null,
    }

    const res = await guardarEvento(payload)
    if (res.ok) {
      success(editingEvento ? 'Evento actualizado.' : 'Evento agendado.')
      setSheetOpen(false)
    } else {
      toastError('Error al guardar: ' + (res.error?.message || 'Error desconocido'))
    }
  }

  async function handleDeleteInternal(id, titulo) {
    if (!canEdit) return
    if (onEliminarEvento) {
      onEliminarEvento(id, titulo)
      return
    }
    if (!window.confirm(`¿Eliminar el evento "${titulo}"?`)) return
    const res = await eliminarEvento(id)
    if (res.ok) {
      success('Evento eliminado.')
      setSheetOpen(false)
    } else {
      toastError('No se pudo eliminar: ' + res.error?.message)
    }
  }

  // Generar cuadrícula del mes
  const diasGrid = useMemo(() => {
    const primerDiaMes = new Date(anio, mesIndex, 1)
    const ultimoDiaMes = new Date(anio, mesIndex + 1, 0)
    const totalDiasMes = ultimoDiaMes.getDate()

    const diaSemanaInicio = getDiaSemanaNorm(primerDiaMes.getDay()) // 0=Lun, 6=Dom
    const dias = []

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
        esHoy: false,
      })
    }

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

    const resto = (7 - (dias.length % 7)) % 7
    for (let d = 1; d <= resto; d++) {
      const dateObj = new Date(anio, mesIndex + 1, d)
      const iso = formatDateLocal(dateObj)
      dias.push({
        numero: d,
        iso,
        dateObj,
        esMesActual: false,
        esHoy: false,
      })
    }

    return dias
  }, [anio, mesIndex])

  // Mapear eventos a fechas (incluyendo soporte de 3 días seguidos para Asamblea Regional)
  function getEventosParaDia(iso, dateObj) {
    const numDiaJS = dateObj.getDay()
    const numEntreSemana = DIA_SEMANA_MAP[diaReunionEntreSemana] ?? 2
    const numFinSemana = DIA_SEMANA_MAP[diaReunionFinSemana] ?? 6
    const esDiaReunion = numDiaJS === numEntreSemana || numDiaJS === numFinSemana

    const resultados = []

    for (const evt of eventos) {
      // Caso especial: Asamblea Regional dura 3 días seguidos desde su fecha de inicio
      if (evt.tipo_evento === 'asamblea_regional') {
        const startIso = evt.fecha_efectiva || evt.fecha_original
        if (startIso) {
          const d1 = startIso
          const d2 = addDaysIso(startIso, 1)
          const d3 = addDaysIso(startIso, 2)
          if (iso === d1) {
            resultados.push({ evt, spanPos: 'start', diaIndice: 1, totalDias: 3 })
            continue
          }
          if (iso === d2) {
            resultados.push({ evt, spanPos: 'middle', diaIndice: 2, totalDias: 3 })
            continue
          }
          if (iso === d3) {
            resultados.push({ evt, spanPos: 'end', diaIndice: 3, totalDias: 3 })
            continue
          }
          continue
        }
      }

      // 1. Si tiene fecha efectiva exacta
      if (evt.fecha_efectiva === iso) {
        resultados.push({ evt, spanPos: 'single', diaIndice: 1, totalDias: 1 })
        continue
      }
      // 2. Si tiene fecha original exacta y no fue desplazada
      if (evt.fecha_original === iso && !evt.fecha_efectiva) {
        resultados.push({ evt, spanPos: 'single', diaIndice: 1, totalDias: 1 })
        continue
      }

      // 3. Fallback si solo tiene semana_id sin fecha específica
      if (evt.semana_id && !evt.fecha_efectiva && !evt.fecha_original) {
        const sem = semanas.find(s => s.id === evt.semana_id)
        if (sem && sem.fecha_inicio && sem.fecha_fin) {
          const dentroDeSemana = iso >= sem.fecha_inicio && iso <= sem.fecha_fin
          if (dentroDeSemana && (esDiaReunion || iso === sem.fecha_inicio)) {
            resultados.push({ evt, spanPos: 'single', diaIndice: 1, totalDias: 1 })
          }
        }
      }
    }

    return resultados
  }

  function getMetaTipo(tipoId) {
    return (
      tiposEvento.find(t => t.id === tipoId) ||
      TIPOS_EVENTO_DEFAULT.find(t => t.id === tipoId) || {
        label: tipoId,
        shortLabel: tipoId,
        color: 'neutral',
        dotClass: 'bg-zinc-400',
      }
    )
  }

  // Cálculo de impacto automático para mostrar en la sidesheet sin preguntas redundantes
  const fechaBaseForm =
    eventoForm.tipo_evento === 'reunion_desplazada'
      ? eventoForm.fecha_original || eventoForm.fecha_efectiva
      : eventoForm.fecha_efectiva || eventoForm.fecha_original

  const afectaAutoActual = inferirAfectaReunion(
    eventoForm.tipo_evento,
    fechaBaseForm,
    diaReunionEntreSemana,
    diaReunionFinSemana
  )

  const textoImpactoReunion = useMemo(() => {
    const etiquetaReunion =
      afectaAutoActual === 'ambas'
        ? `ambas reuniones (${diaReunionEntreSemana} y ${diaReunionFinSemana})`
        : afectaAutoActual === 'fin_semana'
        ? `la reunión del ${diaReunionFinSemana.toLowerCase()}`
        : `la reunión del ${diaReunionEntreSemana.toLowerCase()}`

    if (eventoForm.tipo_evento === 'asamblea_regional') {
      return `3 días seguidos · Cancela automáticamente ${etiquetaReunion}`
    }
    if (eventoForm.tipo_evento === 'asamblea_circuito' || eventoForm.tipo_evento === 'reunion_cancelada') {
      return `Cancela automáticamente ${etiquetaReunion}`
    }
    if (eventoForm.tipo_evento === 'reunion_desplazada') {
      return `Traslada ${etiquetaReunion} a la nueva fecha indicada`
    }
    if (eventoForm.tipo_evento === 'visita_sc' || eventoForm.tipo_evento === 'visita_sucursal') {
      return `Adapta el S-140 de la semana (Discurso de 30 min y omite EBC)`
    }
    return `Afecta ${etiquetaReunion}`
  }, [eventoForm.tipo_evento, afectaAutoActual, diaReunionEntreSemana, diaReunionFinSemana])

  const metaTipoSeleccionado = getMetaTipo(eventoForm.tipo_evento)

  return (
    <div className={standalone ? 'space-y-5 max-w-6xl mx-auto pb-14' : 'space-y-4'}>
      <Toast toast={toast} />

      {/* Encabezado cuando se abre desde la Sidebar como vista principal */}
      {standalone && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-text1">
                Calendario de la Congregación
              </h1>
              {!canEdit && (
                <Badge variant="neutral" size="sm" icon={Eye}>
                  Vista de lectura
                </Badge>
              )}
            </div>
            <p className="text-xs text-text2 mt-1">
              Consulta las fechas de reunión ordinarias, visitas del Superintendente, asambleas y cambios de horario.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Controles y Cabecera del Calendario */}
      <div className="rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
        <div className="px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/70 dark:border-zinc-800/80">
          {/* Izquierda: Mes / Año + Controles de navegación estilo Notion Calendar */}
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-text1 tracking-tight min-w-[145px]">
              {MESES[mesIndex]} <span className="text-text3 font-normal">{anio}</span>
            </h3>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text2 hover:text-text1 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={ goToday }
                className="px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text2 hover:text-text1 transition-colors cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-text2 hover:text-text1 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Derecha: Leyenda compacta + Toggle Vista + Nuevo Evento */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="hidden lg:flex items-center gap-3 text-[11px] text-text3 mr-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-emerald-500" /> Visita
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-purple-500" /> Circuito
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-sky-500" /> Regional (3d)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-amber-500" /> Traslado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-xs bg-red-500" /> Cancelada
              </span>
            </div>

            {/* Toggle Vista Calendario / Lista */}
            <div className="inline-flex rounded-lg border border-zinc-200/80 dark:border-zinc-800 p-0.5 bg-zinc-100/60 dark:bg-zinc-900/60">
              <button
                type="button"
                onClick={() => setVistaModo('calendario')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  vistaModo === 'calendario'
                    ? 'bg-white dark:bg-zinc-800 text-text1 shadow-2xs'
                    : 'text-text3 hover:text-text1'
                }`}
                title="Vista de cuadrícula mensual"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mes</span>
              </button>
              <button
                type="button"
                onClick={() => setVistaModo('lista')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  vistaModo === 'lista'
                    ? 'bg-white dark:bg-zinc-800 text-text1 shadow-2xs'
                    : 'text-text3 hover:text-text1'
                }`}
                title="Vista de lista de eventos"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Agenda ({eventos.length})</span>
              </button>
            </div>

            {canEdit && (
              <Button
                variant="accent"
                size="sm"
                icon={Plus}
                onClick={() => handleOpenCrear()}
              >
                Nuevo evento
              </Button>
            )}
          </div>
        </div>

        {/* ── MODO 1: CUADRÍCULA DE CALENDARIO ESTILO NOTION CALENDAR ── */}
        {vistaModo === 'calendario' && (
          <div>
            {/* Cabecera días de semana */}
            <div className="grid grid-cols-7 border-b border-zinc-200/70 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/30 text-[11px] font-medium text-text3">
              {DIAS_SEMANA.map((dia, idx) => (
                <div
                  key={dia}
                  className={`py-2 px-2.5 text-right border-r border-zinc-200/50 dark:border-zinc-800/60 last:border-r-0 ${
                    idx >= 5 ? 'text-zinc-400 dark:text-zinc-500' : ''
                  }`}
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Celdas de días: líneas limpias 1px sin doble borde ni glow en celda hoy */}
            <div className="grid grid-cols-7 auto-rows-fr">
              {diasGrid.map((dia, idx) => {
                const evtsDia = getEventosParaDia(dia.iso, dia.dateObj)
                const numDiaJS = dia.dateObj.getDay()
                const numEntreSemana = DIA_SEMANA_MAP[diaReunionEntreSemana] ?? 2
                const numFinSemana = DIA_SEMANA_MAP[diaReunionFinSemana] ?? 6
                const esDiaReunion = numDiaJS === numEntreSemana || numDiaJS === numFinSemana
                const esFinDeSemanaCol = (idx % 7) >= 5

                // Si hay una asamblea, cancelación o traslado en este día de reunión, la reunión ordinaria queda reemplazada
                const reunionSuspendidaHoy =
                  esDiaReunion &&
                  evtsDia.some(({ evt }) =>
                    ['asamblea_regional', 'asamblea_circuito', 'reunion_cancelada'].includes(evt.tipo_evento)
                  )

                return (
                  <div
                    key={`${dia.iso}-${idx}`}
                    onClick={() => {
                      if (evtsDia.length > 0) {
                        handleOpenEditar(evtsDia[0].evt)
                      } else if (canEdit) {
                        const sem = findSemanaForIso(dia.iso)
                        handleOpenCrear({ fecha_efectiva: dia.iso, semana_id: sem?.id || '' })
                      }
                    }}
                    className={`min-h-[96px] sm:min-h-[112px] p-1.5 sm:p-2 flex flex-col justify-between border-b border-r border-zinc-200/70 dark:border-zinc-800/80 [&:nth-child(7n)]:border-r-0 transition-colors group ${
                      canEdit || evtsDia.length > 0 ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      !dia.esMesActual
                        ? 'bg-zinc-50/60 dark:bg-zinc-950/40'
                        : esFinDeSemanaCol
                        ? 'bg-zinc-50/30 dark:bg-zinc-900/20 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/35'
                        : 'bg-surface hover:bg-zinc-50/80 dark:hover:bg-zinc-900/45'
                    }`}
                  >
                    {/* Cabecera de celda: Indicador sutil de reunión a la izquierda, número a la derecha (o viceversa) */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-xs font-mono leading-none rounded-md w-6 h-6 flex items-center justify-center transition-colors ${
                          dia.esHoy
                            ? 'bg-sky-500 text-white font-semibold'
                            : dia.esMesActual
                            ? 'text-text2 font-medium group-hover:text-text1'
                            : 'text-zinc-300 dark:text-zinc-700'
                        }`}
                      >
                        {dia.numero}
                      </span>

                      {esDiaReunion && dia.esMesActual && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded text-text3 transition-opacity ${
                            reunionSuspendidaHoy
                              ? 'line-through opacity-45'
                              : 'bg-zinc-100/80 dark:bg-zinc-800/70'
                          }`}
                          title={
                            reunionSuspendidaHoy
                              ? 'Reunión ordinaria suspendida por evento'
                              : 'Día ordinario de reunión'
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              numDiaJS === numEntreSemana ? 'bg-emerald-500/75' : 'bg-indigo-400/75'
                            }`}
                          />
                          <span className="hidden sm:inline">Reunión</span>
                        </span>
                      )}
                    </div>

                    {/* Píldoras de Eventos en el día (con soporte multi-día para Asamblea Regional) */}
                    <div className="space-y-1 my-0.5 flex-1 overflow-hidden">
                      {evtsDia.map(({ evt, spanPos, diaIndice, totalDias }) => {
                        const meta = getMetaTipo(evt.tipo_evento)
                        const esVisita =
                          evt.tipo_evento === 'visita_sc' || evt.tipo_evento === 'visita_sucursal'
                        const esRegional = evt.tipo_evento === 'asamblea_regional'
                        const nombreVis = evt.nombre_visitante

                        const colorClasses = esVisita
                          ? 'bg-emerald-500/12 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-l-[3px] border-l-emerald-500 hover:bg-emerald-500/20'
                          : esRegional
                          ? 'bg-sky-500/14 dark:bg-sky-500/18 text-sky-900 dark:text-sky-200 border-l-[3px] border-l-sky-500 hover:bg-sky-500/25'
                          : evt.tipo_evento === 'reunion_desplazada'
                          ? 'bg-amber-500/12 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200 border-l-[3px] border-l-amber-500 hover:bg-amber-500/20'
                          : evt.tipo_evento === 'reunion_cancelada'
                          ? 'bg-red-500/12 dark:bg-red-500/15 text-red-900 dark:text-red-200 border-l-[3px] border-l-red-500 hover:bg-red-500/20'
                          : 'bg-purple-500/12 dark:bg-purple-500/15 text-purple-900 dark:text-purple-200 border-l-[3px] border-l-purple-500 hover:bg-purple-500/20'

                        const radiusClass =
                          spanPos === 'start'
                            ? 'rounded-l-md rounded-r-xs'
                            : spanPos === 'middle'
                            ? 'rounded-xs border-l-0'
                            : spanPos === 'end'
                            ? 'rounded-l-xs rounded-r-md border-l-0'
                            : 'rounded-md'

                        return (
                          <div
                            key={`${evt.id}-${diaIndice}`}
                            onClick={e => {
                              e.stopPropagation()
                              handleOpenEditar(evt)
                            }}
                            className={`text-[10.5px] leading-tight px-1.5 py-1 font-medium truncate flex items-center justify-between gap-1 cursor-pointer transition-colors ${colorClasses} ${radiusClass}`}
                            title={`${evt.titulo_evento}${nombreVis ? ` — ${nombreVis}` : ''}${
                              totalDias > 1 ? ` (Día ${diaIndice} de ${totalDias})` : ''
                            }`}
                          >
                            <span className="truncate">
                              {nombreVis
                                ? `${meta.shortLabel || meta.label}: ${nombreVis}`
                                : evt.titulo_evento}
                            </span>
                            {totalDias > 1 && (
                              <span className="text-[9px] font-mono opacity-75 shrink-0">
                                {diaIndice}/{totalDias}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Botón sutil en hover para agregar (solo admins) */}
                    {canEdit ? (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end pt-0.5">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation()
                            const sem = findSemanaForIso(dia.iso)
                            handleOpenCrear({ fecha_efectiva: dia.iso, semana_id: sem?.id || '' })
                          }}
                          className="text-[10px] text-text3 hover:text-text1 flex items-center gap-0.5 cursor-pointer py-0.5 px-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                          title="Agregar evento en este día"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-3" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MODO 2: LISTA DE EVENTOS ── */}
        {vistaModo === 'lista' && (
          <div className="p-4 sm:p-5">
            {eventos.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-text3 flex items-center justify-center mx-auto">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-text1">No hay eventos o excepciones programadas</p>
                <p className="text-[11px] text-text3 max-w-sm mx-auto">
                  Cuando se programe una Visita del Superintendente, Asamblea o cambio de reunión, aparecerá aquí.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {eventos.map(evt => {
                  const metaTipo = getMetaTipo(evt.tipo_evento)
                  const esVisita =
                    evt.tipo_evento === 'visita_sc' || evt.tipo_evento === 'visita_sucursal'
                  const esRegional = evt.tipo_evento === 'asamblea_regional'
                  const fechaInicioEvt = evt.fecha_efectiva || evt.fecha_original

                  return (
                    <div
                      key={evt.id}
                      onClick={() => handleOpenEditar(evt)}
                      className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-3 transition-colors cursor-pointer"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${metaTipo.dotClass || 'bg-emerald-500'}`} />
                            <span className="text-[11px] font-medium text-text2">
                              {metaTipo.label}
                            </span>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteInternal(evt.id, evt.titulo_evento)
                              }}
                              className="text-text3 hover:text-red-500 transition-colors cursor-pointer p-1"
                              title="Eliminar evento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-text1">{evt.titulo_evento}</h4>

                        {esVisita && evt.nombre_visitante && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                            <Briefcase className="w-3.5 h-3.5 shrink-0" />
                            <span>{evt.nombre_visitante}</span>
                          </div>
                        )}

                        {evt.tipo_evento === 'reunion_desplazada' ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {formatFechaCortaNotion(evt.fecha_original)} →{' '}
                            <span className="font-medium">{formatFechaCortaNotion(evt.fecha_efectiva)}</span>
                            {evt.hora_efectiva ? ` · ${evt.hora_efectiva}` : ''}
                          </p>
                        ) : esRegional && fechaInicioEvt ? (
                          <p className="text-xs text-sky-600 dark:text-sky-400 font-medium">
                            {formatFechaCortaNotion(fechaInicioEvt)} →{' '}
                            {formatFechaCortaNotion(addDaysIso(fechaInicioEvt, 2))} · 3 días
                          </p>
                        ) : (
                          <p className="text-xs text-text3">
                            {fechaInicioEvt ? formatFechaLegible(fechaInicioEvt) : 'Fecha por confirmar'}
                          </p>
                        )}

                        {evt.descripcion && (
                          <p className="text-xs text-text3 line-clamp-2">
                            {evt.descripcion.replace(/\[VISITANTE:[^\]]+\]/, '').trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SIDE-SHEET SOBRIA ESTILO NOTION CALENDAR ── */}
      {!onCrearEvento && (
        <Sheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          width="sm"
          title={canEdit ? (editingEvento ? 'Detalles del evento' : 'Nuevo evento') : 'Detalles del evento'}
          footer={
            canEdit ? (
              <div className="flex items-center justify-between w-full">
                {editingEvento ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteInternal(editingEvento.id, eventoForm.titulo_evento)}
                    className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium py-1.5 px-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSheetOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    loading={savingEventos}
                    onClick={handleSaveInternal}
                  >
                    {editingEvento ? 'Guardar' : 'Agendar'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end w-full">
                <Button variant="outline" size="sm" onClick={() => setSheetOpen(false)}>
                  Cerrar
                </Button>
              </div>
            )
          }
        >
          <form onSubmit={handleSaveInternal} className="space-y-1 text-xs">
            {/* 1. Título limpio con punto de color estilo Notion Calendar */}
            <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/70">
              <input
                type="text"
                disabled={!canEdit}
                value={eventoForm.titulo_evento}
                onChange={e => setEventoForm(prev => ({ ...prev, titulo_evento: e.target.value }))}
                placeholder="Título del evento"
                className="w-full text-base font-semibold text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 bg-transparent focus:outline-none disabled:opacity-90"
                required
              />
              <span
                className={`w-3 h-3 rounded-xs shrink-0 ${metaTipoSeleccionado.dotClass || 'bg-emerald-500'}`}
                title={metaTipoSeleccionado.label}
              />
            </div>

            {/* 2. Fila de Tipo de Evento */}
            <div className="py-3 border-b border-zinc-100 dark:border-zinc-800/70 flex items-center gap-3">
              <Tag className="w-4 h-4 text-text3 shrink-0" />
              <div className="flex-1 min-w-0">
                {canEdit ? (
                  <select
                    value={eventoForm.tipo_evento}
                    onChange={e => {
                      const tipo = e.target.value
                      const opt = tiposEvento.find(t => t.id === tipo)
                      setEventoForm(prev => {
                        const titulosPorDefecto = tiposEvento.map(t => t.label)
                        const mantenerTitulo =
                          prev.titulo_evento && !titulosPorDefecto.includes(prev.titulo_evento)
                        const fechaBase = prev.fecha_original || prev.fecha_efectiva
                        return {
                          ...prev,
                          tipo_evento: tipo,
                          titulo_evento: mantenerTitulo ? prev.titulo_evento : (opt?.label || prev.titulo_evento),
                          fecha_efectiva:
                            tipo === 'reunion_desplazada' && prev.fecha_efectiva === prev.fecha_original
                              ? addDaysIso(fechaBase, 1)
                              : fechaBase,
                          nombre_visitante:
                            tipo === 'visita_sc'
                              ? prev.nombre_visitante || activeConfig?.nombreSuperintendenteCircuito || ''
                              : prev.nombre_visitante,
                        }
                      })
                    }}
                    className="w-full bg-transparent text-xs font-medium text-text1 focus:outline-none cursor-pointer py-1 rounded hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 px-1.5 -mx-1.5 transition-colors"
                  >
                    {tiposEvento.map(t => (
                      <option key={t.id} value={t.id} className="bg-surface text-text1">
                        {t.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-medium text-text1">{metaTipoSeleccionado.label}</span>
                )}
              </div>
            </div>

            {/* 3. Fila de Fecha y Duración (3 días automáticos para Asamblea Regional) */}
            <div className="py-3.5 border-b border-zinc-100 dark:border-zinc-800/70 flex items-start gap-3">
              <Clock className="w-4 h-4 text-text3 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2.5">
                {eventoForm.tipo_evento === 'reunion_desplazada' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text3 text-[11px]">Reunión original</span>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={eventoForm.fecha_original}
                        onChange={e =>
                          setEventoForm(prev => ({ ...prev, fecha_original: e.target.value }))
                        }
                        className="bg-zinc-100/80 dark:bg-zinc-800/70 text-text1 text-xs px-2 py-1 rounded-md border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                        Nueva fecha
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          disabled={!canEdit}
                          value={eventoForm.fecha_efectiva}
                          onChange={e =>
                            setEventoForm(prev => ({ ...prev, fecha_efectiva: e.target.value }))
                          }
                          className="bg-zinc-100/80 dark:bg-zinc-800/70 text-text1 text-xs px-2 py-1 rounded-md border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none"
                          required
                        />
                        <input
                          type="time"
                          disabled={!canEdit}
                          value={eventoForm.hora_efectiva}
                          onChange={e =>
                            setEventoForm(prev => ({ ...prev, hora_efectiva: e.target.value }))
                          }
                          placeholder="Hora"
                          className="bg-zinc-100/80 dark:bg-zinc-800/70 text-text1 text-xs px-2 py-1 rounded-md border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none w-24"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text2">
                        {eventoForm.tipo_evento === 'asamblea_regional' ? 'Inicio' : 'Fecha'}
                      </span>
                      <input
                        type="date"
                        disabled={!canEdit}
                        value={eventoForm.fecha_efectiva || eventoForm.fecha_original}
                        onChange={e => {
                          const val = e.target.value
                          setEventoForm(prev => ({
                            ...prev,
                            fecha_original: val,
                            fecha_efectiva: val,
                          }))
                        }}
                        className="bg-zinc-100/80 dark:bg-zinc-800/70 text-text1 text-xs px-2.5 py-1 rounded-md border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Rango automático de 3 días para Asamblea Regional (sin bloquear día de inicio) */}
                    {eventoForm.tipo_evento === 'asamblea_regional' && fechaBaseForm && (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-text2 pt-0.5">
                        <span className="text-text3">Fin (3 días)</span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium">
                            {formatFechaCortaNotion(addDaysIso(fechaBaseForm, 2))}
                          </span>
                          <span className="text-[10px] font-mono text-text3">3d</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resumen silencioso e intuitivo del efecto en las reuniones */}
                <p className="text-[11px] text-text3 leading-snug">
                  {textoImpactoReunion}
                </p>
              </div>
            </div>

            {/* 4. Fila de Orador Visitante (solo para Visita SC o Sucursal, diseño plano sin cajas pesadas) */}
            {(eventoForm.tipo_evento === 'visita_sc' || eventoForm.tipo_evento === 'visita_sucursal') && (
              <div className="py-3.5 border-b border-zinc-100 dark:border-zinc-800/70 flex items-start gap-3">
                <Briefcase className="w-4 h-4 text-text3 shrink-0 mt-1" />
                <div className="flex-1 space-y-2.5">
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={eventoForm.nombre_visitante}
                    onChange={e =>
                      setEventoForm(prev => ({ ...prev, nombre_visitante: e.target.value }))
                    }
                    placeholder={
                      eventoForm.tipo_evento === 'visita_sc'
                        ? 'Nombre del Superintendente de Circuito *'
                        : 'Nombre del Representante de Sucursal *'
                    }
                    className="w-full bg-zinc-100/70 dark:bg-zinc-800/60 text-xs text-text1 placeholder:text-text3 px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />

                  <label className="flex items-center gap-2 cursor-pointer text-text2 hover:text-text1 select-none text-[11px]">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={eventoForm.oracion_visitante}
                      onChange={e =>
                        setEventoForm(prev => ({ ...prev, oracion_visitante: e.target.checked }))
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Realiza la oración final en el S-140</span>
                  </label>
                </div>
              </div>
            )}

            {/* 5. Fila de Notas / Descripción estilo Notion Calendar */}
            <div className="py-3.5 flex items-start gap-3">
              <AlignLeft className="w-4 h-4 text-text3 shrink-0 mt-1" />
              <textarea
                rows={3}
                disabled={!canEdit}
                value={eventoForm.descripcion}
                onChange={e =>
                  setEventoForm(prev => ({ ...prev, descripcion: e.target.value }))
                }
                placeholder={canEdit ? 'Añadir descripción o nota...' : 'Sin notas adicionales'}
                className="w-full text-xs text-text1 placeholder:text-text3 bg-transparent focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}
