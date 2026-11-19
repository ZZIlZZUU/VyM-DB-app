import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileDown,
  BookOpen,
  Music,
  RotateCcw,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import {
  usePersonasQuery,
  useParticipacionesQuery,
  useSemanasQuery,
  usePartesQuery,
  useAsignacionesQuery,
} from '../core/queries/useAppQueries'
import { invalidateAppQueries, QUERY_KEYS } from '../core/queryClient'
import {
  formatFechaLegible,
  formatRangoSemanaPrograma,
  getHoyLocalIso,
  getImpactoEventoSemana,
  MESES,
} from '../lib/fechas'
import {
  buildSemanasConParticipaciones,
  buildPartesVirtualesDeSemana,
} from '../lib/semanasFallback'
import { useToast } from '../hooks/useToast'
import { useEventosReunion } from '../hooks/useEventosReunion'
import { useConfiguracion } from '../hooks/useConfiguracion'
import Toast from '../components/Toast'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { EmptyState } from '../components/ui/EmptyState'
import { SkeletonBlock } from '../components/Skeleton'

const SECCION_LABEL = {
  APERTURA: 'Apertura',
  TB: 'Tesoros de la Biblia',
  SMT: 'Seamos Mejores Maestros',
  VC: 'Nuestra Vida Cristiana',
  CIERRE: 'Cierre',
}

const TIPO_LABEL = {
  P: 'Presidente',
  ORACION: 'Oración apertura',
  ORACION_C: 'Oración cierre',
  OC: 'Oración cierre',
  CONCLU: 'Palabras de conclusión',
  TB: 'Tesoros de la Biblia',
  PE: 'Perlas escondidas',
  LB: 'Lectura de la Biblia',
  T: 'Titular (SMT)',
  A: 'Ayudante (SMT)',
  X: 'Participación',
  DSC: 'Discurso',
  SMT_EST: 'Estudiante',
  SMT_EXP: 'Explique sus creencias',
  SMT_DSC: 'Discurso',
  SMT_AYU: 'Ayudante',
  VC: 'Vida Cristiana',
  NC: 'Nec. de la congregación',
  EBC: 'Estudio bíblico',
  EBC_CON: 'Conductor EBC',
  LEBC: 'Lector EBC',
  SMT_VACIO: '—',
}

const TIPO_COLOR = {
  P: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  ORACION: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  ORACION_C: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  OC: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  CONCLU: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700/60',
  TB: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  PE: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  LB: 'bg-cyan-50 text-cyan-800 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
  T: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  A: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  X: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  DSC: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  SMT_EST: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  SMT_EXP: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  SMT_DSC: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  SMT_AYU: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  VC: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  NC: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  EBC: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  EBC_CON: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  LEBC: 'bg-pink-50 text-pink-800 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/40',
  SMT_VACIO: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200/60 dark:border-zinc-700/60',
}

const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']

// ── SKELETON PLACEHOLDER PARA LA TARJETA SEMANAL ───────────────
function SkeletonSemana() {
  return (
    <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs animate-fade-in">
      {/* Cabecera Skeleton */}
      <div className="p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-4 w-52 rounded-md" />
            <SkeletonBlock className="h-4 w-28 rounded-md" />
          </div>
          <SkeletonBlock className="h-3 w-40 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-md" />
          <SkeletonBlock className="h-6 w-24 rounded-md" />
          <SkeletonBlock className="h-6 w-20 rounded-md" />
        </div>
      </div>

      {/* Secciones Skeleton */}
      <div className="p-5 space-y-6">
        {[
          { labelWidth: 'w-24', rows: 2 },
          { labelWidth: 'w-36', rows: 3 },
          { labelWidth: 'w-44', rows: 4 },
          { labelWidth: 'w-40', rows: 3 },
        ].map((sec, i) => (
          <div key={i} className="space-y-2.5">
            <div className="pb-1 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <SkeletonBlock className={`h-3 ${sec.labelWidth} rounded-md`} />
              <SkeletonBlock className="h-2.5 w-12 rounded-md" />
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-50/30 dark:bg-zinc-900/20">
              {Array.from({ length: sec.rows }).map((_, rIdx) => (
                <div
                  key={rIdx}
                  className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <SkeletonBlock className="h-3 w-5 rounded-md" />
                    <SkeletonBlock className="h-5 w-12 rounded-md" />
                    <div className="space-y-1.5 flex-1">
                      <SkeletonBlock className="h-3.5 w-48 sm:w-64 rounded-md" />
                      <SkeletonBlock className="h-2.5 w-32 rounded-md" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                    <div className="space-y-1 text-right">
                      <SkeletonBlock className="h-3.5 w-28 rounded-md" />
                      <SkeletonBlock className="h-2.5 w-20 rounded-md" />
                    </div>
                    <SkeletonBlock className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SkeletonBlock className="h-4 w-60 rounded-md" />
        <SkeletonBlock className="h-8 w-56 rounded-lg" />
      </div>
    </div>
  )
}

export default function VistaSemanal({ onNavigate, initialSemanaId = null }) {
  const { config } = useConfiguracion()
  const { eventos } = useEventosReunion()

  const {
    data: semanas = [],
    isLoading: loadingSem,
    error: errSem,
  } = useSemanasQuery()
  const {
    data: partes = [],
    isLoading: loadingPar,
    error: errPar,
  } = usePartesQuery()
  const {
    data: asignaciones = [],
    isLoading: loadingAsi,
    error: errAsi,
  } = useAsignacionesQuery()
  const {
    data: personas = [],
    isLoading: loadingPer,
    error: errPer,
  } = usePersonasQuery()
  const {
    data: participaciones = [],
    isLoading: loadingPart,
    error: errPart,
  } = useParticipacionesQuery()

  const loading = loadingSem || loadingPar || loadingAsi || loadingPer || loadingPart
  const fetchError =
    errSem?.message ||
    errPar?.message ||
    errAsi?.message ||
    errPer?.message ||
    errPart?.message ||
    null
  const congregacion = config?.nombreCongregacion || 'Congregacion del Recreo'

  // Estados de navegación temporal
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedSemanaId, setSelectedSemanaId] = useState(initialSemanaId)
  const [exportingDocx, setExportingDocx] = useState(false)

  // Estado para transiciones suaves con Skeleton al cambiar de periodo
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimer = useRef(null)

  const triggerTransition = useCallback(() => {
    setIsTransitioning(true)
    if (transitionTimer.current) clearTimeout(transitionTimer.current)
    transitionTimer.current = setTimeout(() => {
      setIsTransitioning(false)
    }, 200)
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current)
    }
  }, [])

  const { toast, success, error: toastError } = useToast()

  const fetchData = useCallback(() => {
    invalidateAppQueries([
      QUERY_KEYS.programaSemanas,
      QUERY_KEYS.programaPartes,
      QUERY_KEYS.programaAsignaciones,
      QUERY_KEYS.personas,
      QUERY_KEYS.participaciones,
    ])
  }, [])

  const semanasUnificadas = useMemo(
    () => buildSemanasConParticipaciones(semanas, participaciones),
    [semanas, participaciones]
  )

  // ── Extraer Años Disponibles ───────────────────────────────────
  const aniosDisponibles = useMemo(() => {
    const yearsSet = new Set()
    semanasUnificadas.forEach(s => {
      if (s.anio) yearsSet.add(String(s.anio))
      else if (s.fecha_inicio) yearsSet.add(String(s.fecha_inicio).slice(0, 4))
    })
    if (yearsSet.size === 0) yearsSet.add(String(new Date().getFullYear()))
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a))
  }, [semanasUnificadas])

  // Inicializar Año
  useEffect(() => {
    if (aniosDisponibles.length > 0 && !selectedYear) {
      if (initialSemanaId) {
        const found = semanasUnificadas.find(s => s.id === initialSemanaId)
        if (found) {
          const y = found.anio || (found.fecha_inicio ? String(found.fecha_inicio).slice(0, 4) : null)
          if (y) {
            setSelectedYear(String(y))
            return
          }
        }
      }
      const currentYearStr = String(config?.anioEnCurso || new Date().getFullYear())
      if (aniosDisponibles.includes(currentYearStr)) {
        setSelectedYear(currentYearStr)
      } else {
        setSelectedYear(aniosDisponibles[0])
      }
    }
  }, [aniosDisponibles, selectedYear, initialSemanaId, semanasUnificadas, config?.anioEnCurso])

  // ── Extraer Meses Disponibles para el Año Seleccionado ──────────
  const mesesDisponibles = useMemo(() => {
    if (!selectedYear) return []
    const monthsSet = new Set()
    semanasUnificadas.forEach(s => {
      const sYear = s.anio ? String(s.anio) : (s.fecha_inicio ? String(s.fecha_inicio).slice(0, 4) : '')
      if (sYear === String(selectedYear)) {
        if (s.mes && MESES.includes(s.mes)) {
          monthsSet.add(s.mes)
        } else if (s.fecha_inicio) {
          const d = new Date(s.fecha_inicio + 'T12:00:00')
          monthsSet.add(MESES[d.getMonth()])
        }
      }
    })
    // Ordenar los meses en orden cronológico
    return MESES.filter(m => monthsSet.has(m))
  }, [semanasUnificadas, selectedYear])

  // Inicializar Mes
  useEffect(() => {
    if (mesesDisponibles.length > 0) {
      if (initialSemanaId && !selectedMonth) {
        const found = semanasUnificadas.find(s => s.id === initialSemanaId)
        if (found) {
          let m = found.mes
          if (!m && found.fecha_inicio) {
            m = MESES[new Date(found.fecha_inicio + 'T12:00:00').getMonth()]
          }
          if (m && mesesDisponibles.includes(m)) {
            setSelectedMonth(m)
            return
          }
        }
      }
      if (!selectedMonth || !mesesDisponibles.includes(selectedMonth)) {
        const currentMonthName = MESES[new Date().getMonth()]
        if (mesesDisponibles.includes(currentMonthName)) {
          setSelectedMonth(currentMonthName)
        } else {
          setSelectedMonth(mesesDisponibles[0])
        }
      }
    } else {
      setSelectedMonth('')
    }
  }, [mesesDisponibles, selectedMonth, initialSemanaId, semanasUnificadas])

  // ── Filtrar Semanas por Año y Mes ──────────────────────────────
  const semanasFiltradas = useMemo(() => {
    if (!selectedYear || !selectedMonth) return []
    return semanasUnificadas.filter(s => {
      const sYear = s.anio ? String(s.anio) : (s.fecha_inicio ? String(s.fecha_inicio).slice(0, 4) : '')
      let sMes = s.mes
      if (!sMes && s.fecha_inicio) {
        sMes = MESES[new Date(s.fecha_inicio + 'T12:00:00').getMonth()]
      }
      return sYear === String(selectedYear) && sMes === selectedMonth
    })
  }, [semanasUnificadas, selectedYear, selectedMonth])

  // Inicializar y seleccionar semana activa
  useEffect(() => {
    if (semanasFiltradas.length > 0) {
      if (initialSemanaId && semanasFiltradas.some(s => s.id === initialSemanaId)) {
        setSelectedSemanaId(initialSemanaId)
        return
      }
      if (!selectedSemanaId || !semanasFiltradas.some(s => s.id === selectedSemanaId)) {
        // Encontrar si alguna semana coincide con hoy (hora local)
        const hoyIso = getHoyLocalIso()
        const matchHoy = semanasFiltradas.find(s => {
          const ini = String(s.fecha_inicio || '').slice(0, 10)
          const fin = String(s.fecha_fin || '').slice(0, 10)
          return hoyIso >= ini && hoyIso <= fin
        })
        setSelectedSemanaId(matchHoy ? matchHoy.id : semanasFiltradas[0].id)
      }
    } else {
      setSelectedSemanaId(null)
    }
  }, [semanasFiltradas, selectedSemanaId, initialSemanaId])

  // Semana activa actual
  const semanaActiva = useMemo(() => {
    return semanasUnificadas.find(s => s.id === selectedSemanaId) || null
  }, [semanasUnificadas, selectedSemanaId])

  const virtualSemanaData = useMemo(
    () => (semanaActiva?.isVirtual ? buildPartesVirtualesDeSemana(semanaActiva) : null),
    [semanaActiva]
  )

  // Partes de la semana activa
  const partesSemanaActiva = useMemo(() => {
    if (!semanaActiva) return []
    if (virtualSemanaData) return virtualSemanaData.partes
    return partes.filter(p => p.semana_id === semanaActiva.id)
  }, [partes, semanaActiva, virtualSemanaData])

  const asignacionesActivas = useMemo(
    () => (virtualSemanaData ? virtualSemanaData.asignaciones : asignaciones),
    [virtualSemanaData, asignaciones]
  )

  // Índice de semana dentro de la lista completa ordenada
  const semanasOrdenadas = useMemo(() => {
    // Ordenar todas las semanas unificadas por fecha de inicio
    return [...semanasUnificadas].sort((a, b) => {
      const aDate = new Date((a.fecha_inicio || a.fecha_fin) + 'T00:00:00');
      const bDate = new Date((b.fecha_inicio || b.fecha_fin) + 'T00:00:00');
      return aDate - bDate;
    });
  }, [semanasUnificadas]);

  const activeIndex = semanasOrdenadas.findIndex(s => s.id === selectedSemanaId)

  function irASemana(target) {
    if (!target) return
    const year = target.anio
      ? String(target.anio)
      : target.fecha_inicio
        ? String(target.fecha_inicio).slice(0, 4)
        : ''
    const month =
      target.mes && MESES.includes(target.mes)
        ? target.mes
        : target.fecha_inicio
          ? MESES[new Date(target.fecha_inicio + 'T12:00:00').getMonth()]
          : ''
    triggerTransition()
    setSelectedYear(year)
    setSelectedMonth(month)
    setSelectedSemanaId(target.id)
  }

  function handlePrevWeek() {
    if (activeIndex > 0) irASemana(semanasOrdenadas[activeIndex - 1])
  }

  function handleNextWeek() {
    if (activeIndex >= 0 && activeIndex < semanasOrdenadas.length - 1) {
      irASemana(semanasOrdenadas[activeIndex + 1])
    }
  }

  const impactoSemana = useMemo(() => {
    if (!semanaActiva) return null
    return getImpactoEventoSemana(
      semanaActiva,
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
  }, [semanaActiva, eventos, config])

  // ── Cálculo de Estado de la Semana (Completa / Parcial / Sin Datos) ──
  const estadoSemana = useMemo(() => {
    if (impactoSemana?.cancelaEntreSemana) {
      return {
        texto: impactoSemana.esAsamblea
          ? (impactoSemana.evento?.tipo_evento === 'asamblea_regional' ? 'Asamblea Regional' : 'Asamblea de Circuito')
          : 'Cancelada',
        variant: 'purple',
        total: 0,
        asignadas: 0,
        confirmadas: 0,
        cancelaEntreSemana: true,
      }
    }

    if (!semanaActiva || partesSemanaActiva.length === 0) {
      return { texto: 'Sin datos', variant: 'neutral', total: 0, asignadas: 0, confirmadas: 0 }
    }

    const partesContables = partesSemanaActiva.filter(
      p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion)
    )
    const total = partesContables.length
    if (total === 0) {
      return { texto: 'Sin datos', variant: 'neutral', total: 0, asignadas: 0, confirmadas: 0 }
    }

    let asignadas = 0
    let confirmadas = 0

    partesContables.forEach(p => {
      const asigP = asignacionesActivas.find(a => a.parte_id === p.id && a.rol === 'principal')
      if (asigP?.clave) {
        asignadas++
        if (asigP.confirmado) {
          confirmadas++
        }
      }
    })

    if (semanaActiva.isVirtual) {
      return { texto: 'Registros (sin EPUB)', variant: 'info', total, asignadas, confirmadas }
    }
    if (asignadas === total) {
      return { texto: 'Completa', variant: 'success', total, asignadas, confirmadas }
    } else if (asignadas > 0) {
      return { texto: 'Parcial', variant: 'warning', total, asignadas, confirmadas }
    } else {
      return { texto: 'Sin asignar', variant: 'neutral', total, asignadas, confirmadas }
    }
  }, [semanaActiva, partesSemanaActiva, asignacionesActivas, impactoSemana])

  // ── Exportar S-140 de esta semana ─────────────────────────────
  async function handleExportarS140Semana() {
    if (!semanaActiva) return
    setExportingDocx(true)
    try {
      const { generarYDescargarS140, buildDatosDesdeSupabase } = await import('../lib/generarS140')
      const semanasNorm = buildDatosDesdeSupabase([semanaActiva], partes, asignaciones, personas, eventos, config)
      await generarYDescargarS140({
        congregacion: congregacion || config?.nombreCongregacion || 'Congregacion del Recreo',
        semanas: semanasNorm,
        config,
      })
      success(`S-140 exportado para la semana del ${formatFechaLegible(semanaActiva.fecha_inicio)}.`)
    } catch (err) {
      console.error(err)
      toastError('Error al exportar S-140: ' + err.message)
    } finally {
      setExportingDocx(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-48 rounded-lg" />
          <SkeletonBlock className="h-4 w-96 rounded-md" />
        </div>
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonSemana />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-text1">Error al cargar la vista semanal</h3>
        <p className="text-xs text-text3 font-mono">{fetchError}</p>
        <Button variant="outline" size="sm" icon={RotateCcw} onClick={fetchData}>
          Reintentar
        </Button>
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

  const SECCION_DOT = {
    APERTURA: 'bg-zinc-400 dark:bg-zinc-500',
    TB: 'bg-teal-500',
    SMT: 'bg-amber-500',
    VC: 'bg-rose-500',
    CIERRE: 'bg-zinc-400 dark:bg-zinc-500',
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toast toast={toast} />

      {/* ── ENCABEZADO DE LA VISTA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-medium tracking-tight text-text1">
              Vista Semanal
            </h1>
            <Badge variant="neutral" size="sm">
              Solo lectura
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-1">
            Consulta rápida semana a semana del programa de asignaciones y exportación puntual del S-140.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={() => onNavigate?.('programa')}
            className="text-xs"
          >
            Editar en Programa S-140 →
          </Button>
        </div>
      </div>

      {/* ── BARRA SUPERIOR DE CONTROLES TEMPORALES ── */}
      <div className="p-4 rounded-2xl bg-surface border border-border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Selectores de Año y Mes */}
        <div className="flex items-center gap-3">
          {/* Selector de Año */}
          <div className="w-28 shrink-0">
            <Select
              value={selectedYear}
              onChange={e => {
                triggerTransition()
                setSelectedYear(e.target.value)
                setSelectedMonth('')
                setSelectedSemanaId(null)
              }}
              size="sm"
              aria-label="Seleccionar año"
            >
              {aniosDisponibles.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>

          {/* Selector de Mes */}
          <div className="w-40 shrink-0">
            <Select
              value={selectedMonth}
              onChange={e => {
                triggerTransition()
                setSelectedMonth(e.target.value)
                setSelectedSemanaId(null)
              }}
              size="sm"
              disabled={mesesDisponibles.length === 0}
              aria-label="Seleccionar mes"
            >
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Navegación Semana a Semana */}
        <div className="flex items-center gap-3 justify-between md:justify-end flex-1">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            disabled={activeIndex <= 0}
            onClick={handlePrevWeek}
            aria-label="Semana anterior"
          >
            Anterior
          </Button>

          {/* Label Central del Rango y Estado */}
          <div className="flex items-center gap-2.5 px-3 py-1 bg-surface-alt border border-border rounded-lg min-w-0">
            <Calendar className="w-4 h-4 text-accent shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-text1 truncate">
                {semanaActiva
                  ? formatRangoSemanaPrograma(semanaActiva.fecha_inicio, semanaActiva.fecha_fin)
                  : 'Sin semana seleccionada'}
              </span>
              <Badge variant={estadoSemana.variant} size="xs" dot>
                {estadoSemana.texto}
              </Badge>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            iconRight={ChevronRight}
            disabled={activeIndex >= semanasOrdenadas.length - 1}
            onClick={handleNextWeek}
            aria-label="Semana siguiente"
          >
            Siguiente
          </Button>
        </div>
      </div>

      {/* ── CUERPO: AGENDA SEMANAL POR SECCIONES O SKELETON ── */}
      {isTransitioning ? (
        <SkeletonSemana />
      ) : !semanaActiva || partesSemanaActiva.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-12 px-6 shadow-2xs animate-view-fade">
          <EmptyState
            icon={CalendarDays}
            title="No hay datos para la semana seleccionada"
            description="No se han encontrado registros ni asignaciones del programa S-140 para este periodo. Puedes subir el archivo EPUB en la sección de Programa."
            action={
              <Button
                variant="outline"
                size="sm"
                icon={Sparkles}
                onClick={() => onNavigate?.('programa')}
              >
                Ir a Programa Semanal
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xs animate-view-fade">
          {/* Cabecera de la Semana Activa */}
          <div className="p-4 sm:p-5 bg-surface-alt/60 border-b border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-lg font-medium text-text1 tracking-tight">
                  Semana del {formatRangoSemanaPrograma(semanaActiva.fecha_inicio, semanaActiva.fecha_fin)}
                </span>
                <span className="font-mono text-xs text-text3">
                  (Semana {activeIndex + 1} de {semanasOrdenadas.length} en {selectedMonth})
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text3 font-mono">
                <BookOpen className="w-3.5 h-3.5 text-text3" />
                <span>{semanaActiva.capitulo_biblico || 'Lectura semanal'}</span>
              </div>
              {impactoSemana?.cancelaEntreSemana ? (
                <div className="flex items-center gap-1 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                    <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    {impactoSemana.tituloEvento}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Canciones de la Semana */}
            {!impactoSemana?.cancelaEntreSemana && (
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: 'Apertura', num: semanaActiva.cancion_apertura },
                  { label: 'Vida Cristiana', num: semanaActiva.cancion_vc },
                  { label: 'Cierre', num: semanaActiva.cancion_cierre },
                ]
                  .filter(c => c.num)
                  .map((c, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 font-mono text-[11px] bg-surface text-text2 px-2 py-0.5 rounded-md border border-border"
                    >
                      <Music className="w-3 h-3 text-text3" />
                      <span>
                        {c.label}: <strong className="text-text1">{c.num}</strong>
                      </span>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Lista de Partes Agrupadas por Sección o Banner de Evento */}
          {impactoSemana?.cancelaEntreSemana ? (
            <div className="p-8 text-center flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/40 flex items-center justify-center text-purple-700 dark:text-purple-300">
                <Calendar className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-2">
                <Badge variant="purple" size="sm">
                  {impactoSemana.esAsamblea
                    ? (impactoSemana.evento?.tipo_evento === 'asamblea_regional' ? 'Asamblea Regional' : 'Asamblea de Circuito')
                    : 'Reunión Cancelada'}
                </Badge>
                <h3 className="text-lg font-bold text-text1">
                  {impactoSemana.tituloEvento}
                </h3>
                {(impactoSemana.motivo || impactoSemana.descripcion) && (
                  <p className="text-xs text-text2 leading-relaxed">
                    {impactoSemana.motivo || impactoSemana.descripcion}
                  </p>
                )}
                <p className="text-[11px] text-text3 pt-2">
                  Durante esta semana no se celebró ni programó la reunión ordinaria de entre semana en la congregación.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-6">
              {impactoSemana?.esDesplazada && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 text-xs text-blue-900 dark:text-blue-200">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-semibold">Reunión desplazada: </span>
                    <span>Esta reunión se llevó a cabo el {formatFechaLegible(impactoSemana.fechaEfectiva)} {impactoSemana.horaEfectiva ? `a las ${impactoSemana.horaEfectiva} hrs` : ''}.</span>
                    {impactoSemana.motivo && <span className="block text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">Motivo: {impactoSemana.motivo}</span>}
                  </div>
                </div>
              )}

              {['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE'].map(sec => {
                const partesSeccion = partesSemanaActiva.filter(p => p.seccion === sec)
                if (partesSeccion.length === 0) return null

                return (
                  <div key={sec} className="space-y-2.5">
                    <div className="text-[11px] font-mono font-semibold text-text2 uppercase tracking-wider pb-1.5 border-b border-border/80 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${SECCION_DOT[sec] || 'bg-zinc-400'}`} />
                        <span>{SECCION_LABEL[sec]}</span>
                      </span>
                      <span className="text-[10px] font-normal text-text3">
                        {partesSeccion.length} {partesSeccion.length === 1 ? 'parte' : 'partes'}
                      </span>
                    </div>

                    <div className="divide-y divide-border/60 border border-border rounded-xl overflow-hidden bg-surface-alt/35">
                      {partesSeccion.map(parte => {
                        const asigP = asignacionesActivas.find(
                          a => a.parte_id === parte.id && a.rol === 'principal'
                        )
                        const asigA = asignacionesActivas.find(
                          a => a.parte_id === parte.id && a.rol === 'ayudante'
                        )

                        const personaP = personas.find(p => p.clave === asigP?.clave)
                        const personaA = personas.find(p => p.clave === asigA?.clave)

                        const isSoloVisual = TIPOS_SOLO_VISUAL.includes(parte.tipo_asignacion)
                        const isConfirmado = asigP?.confirmado
                        const tipoBadgeStyle =
                          TIPO_COLOR[parte.tipo_asignacion] ||
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'

                        return (
                          <div
                            key={parte.id}
                            className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-alt/70 transition-colors text-xs"
                          >
                            {/* Izquierda: Número, Título y Badge de Tipo */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="font-mono text-[11px] text-text3 w-6 shrink-0">
                                #{parte.numero_parte}
                              </span>

                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0 ${tipoBadgeStyle}`}
                              >
                                {parte.tipo_asignacion}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-text1 line-clamp-2 leading-snug break-words" title={parte.titulo}>
                                  {parte.titulo || TIPO_LABEL[parte.tipo_asignacion] || parte.tipo_asignacion}
                                </div>
                                <div className="text-[11px] text-text3 font-mono mt-0.5">
                                  {TIPO_LABEL[parte.tipo_asignacion] || parte.tipo_asignacion}
                                  {parte.duracion_min ? ` · ${parte.duracion_min} min` : ''}
                                </div>
                              </div>
                            </div>

                            {/* Derecha: Participantes Asignados y Badge de Estado */}
                            <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0 pl-9 sm:pl-0">
                              <div className="flex items-center gap-2 min-w-0">
                                {personaP && (
                                  <span className="w-6 h-6 rounded-full bg-accent-muted-bg border border-accent-muted-border text-[10px] font-semibold text-accent-muted-text flex items-center justify-center shrink-0">
                                    {getInitials(personaP.nombre)}
                                  </span>
                                )}
                                <div className="flex flex-col items-start sm:items-end min-w-0">
                                  <span
                                    className={`text-xs ${
                                      personaP ? 'font-medium text-text1' : 'text-text3 italic'
                                    }`}
                                  >
                                    {personaP
                                      ? personaA
                                        ? `${personaP.nombre} y ${personaA.nombre}`
                                        : personaP.nombre
                                      : '— Sin asignar'}
                                  </span>
                                  {personaP && parte.requiere_ayudante && !personaA && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                      Falta ayudante
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Badge de Confirmación */}
                              {!isSoloVisual ? (
                                isConfirmado ? (
                                  <Badge variant="success" size="xs" dot>
                                    ✓ Confirmado
                                  </Badge>
                                ) : asigP?.clave ? (
                                  <Badge variant="warning" size="xs" dot>
                                    ◷ Por confirmar
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral" size="xs">
                                    — Sin asignar
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="neutral" size="xs">
                                  Visual
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
          )}

          {/* ── FOOTER DE LA VISTA ── */}
          <div className="p-4 sm:p-5 bg-surface-alt/60 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-text2">
              <span className="font-mono font-medium text-text1">
                {impactoSemana?.cancelaEntreSemana
                  ? 'Semana sin reunión ordinaria'
                  : `${estadoSemana.asignadas} de ${estadoSemana.total} participaciones asignadas`}
              </span>
              {!impactoSemana?.cancelaEntreSemana && (
                <>
                  <span className="text-text3">·</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    {estadoSemana.confirmadas} confirmadas
                  </span>
                </>
              )}
            </div>

            {/* Botón de Exportar S-140 de esta semana */}
            <Button
              variant="accent"
              size="sm"
              icon={FileDown}
              loading={exportingDocx}
              disabled={Boolean(semanaActiva?.isVirtual) || (!impactoSemana?.cancelaEntreSemana && estadoSemana.confirmadas === 0)}
              title={semanaActiva?.isVirtual ? 'Requiere importar el archivo EPUB del mes para exportar S-140' : undefined}
              onClick={handleExportarS140Semana}
            >
              Exportar S-140 de esta semana (.docx)
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
