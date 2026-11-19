import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Users,
  FileText,
  Clock,
  CalendarDays,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  Plus,
  FileDown,
  Sparkles,
  ChevronRight,
  BookOpen,
  Music,
  Check,
  RotateCcw,
  Settings,
  Upload,
  Info,
  X,
  ExternalLink,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  usePersonasQuery,
  useParticipacionesQuery,
  useSemanasQuery,
  usePartesQuery,
  useAsignacionesQuery,
  useHistorialCambiosQuery,
  useUsuariosQuery,
} from '../core/queries/useAppQueries'
import HomeWidgetGrid from '../components/home/HomeWidgetGrid'
import {
  loadHomeLayout,
  saveHomeLayout,
  resetHomeLayout,
  addWidgetToLayout,
  compactLayoutVertically,
} from '../components/home/homeWidgetsConfig'
import { invalidateAppQueries, QUERY_KEYS } from '../core/queryClient'
import {
  formatFechaLegible,
  formatRangoSemanaLegible,
  formatRangoSemanaPrograma,
  getHoyLocalIso,
  getImpactoEventoSemana,
  getProximaReunion,
} from '../lib/fechas'
import {
  buildSemanasConParticipaciones,
  buildPartesVirtualesDeSemana,
} from '../lib/semanasFallback'
import {
  loadDismissedAlertIds,
  saveDismissedAlertIds,
  sortPersonasPorEspera,
  buildHomeAlertas,
} from '../lib/homeAlertas'
import { formatMesYYYYMM, getMesActualYYYYMM } from '../lib/generarReporteMensual'
import { loadHomeAlertPrefs } from '../lib/themes'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { useEventosReunion } from '../hooks/useEventosReunion'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Dialog } from '../components/ui/Dialog'
import { Input } from '../components/ui/Input'
import { Tooltip } from '../components/ui/Tooltip'
import { SkeletonBlock } from '../components/Skeleton'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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

function getMesActualNombre() {
  const d = new Date()
  return MESES[d.getMonth()]
}

function getProximoMesInfo() {
  const d = new Date()
  const nextMonthIndex = (d.getMonth() + 1) % 12
  const nextYear = nextMonthIndex === 0 ? d.getFullYear() + 1 : d.getFullYear()
  return {
    mes: MESES[nextMonthIndex],
    anio: nextYear,
  }
}

function getSaludoContextual() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function getFechaHoyLegible() {
  try {
    const str = new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    return str.charAt(0).toUpperCase() + str.slice(1)
  } catch {
    return ''
  }
}

export default function Home({ onNavigate, onOpenRegistrosCreate, rol, userName, user }) {
  const { config: globalConfig, guardarConfiguracion: guardarGlobalConfig } = useConfiguracion()
  const { eventos: eventosReunion } = useEventosReunion()

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

  const loading = loadingPer || loadingPart || loadingSem || loadingPar || loadingAsi
  const fetchError =
    errPer?.message ||
    errPart?.message ||
    errSem?.message ||
    errPar?.message ||
    errAsi?.message ||
    null

  const [congregacion, setCongregacion] = useState('')
  const [anioEnCurso, setAnioEnCurso] = useState(new Date().getFullYear().toString())

  // Wizard Interactivo de Onboarding (Brief #20 Rework)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1) // 1, 2, 3
  const [editCongNombre, setEditCongNombre] = useState('')
  const [editAnio, setEditAnio] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [generatingDocx, setGeneratingDocx] = useState(false)

  // Cuadrícula dinámica de widgets en Inicio (persistida en localStorage)
  const [widgetLayout, setWidgetLayout] = useState(() => loadHomeLayout())
  const [isEditingHome, setIsEditingHome] = useState(false)
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => loadDismissedAlertIds())
  const [alertPrefs, setAlertPrefs] = useState(() => loadHomeAlertPrefs())

  useEffect(() => {
    function handlePrefsSync(e) {
      const detail = e?.detail || {}
      if (detail.home_layout_reset || detail.reset_all) {
        setWidgetLayout(loadHomeLayout())
      }
      if (detail.dismissed_alerts_reset || detail.reset_all) {
        setDismissedAlertIds(loadDismissedAlertIds())
      }
      if (detail.pref_home_alerts || detail.reset_all) {
        setAlertPrefs(loadHomeAlertPrefs())
      }
    }
    window.addEventListener('preferences-updated', handlePrefsSync)
    return () => window.removeEventListener('preferences-updated', handlePrefsSync)
  }, [])

  const handleDismissAlert = useCallback(alertId => {
    if (!alertId) return
    setDismissedAlertIds(prev => {
      if (prev.includes(alertId)) return prev
      const next = [...prev, alertId]
      saveDismissedAlertIds(next)
      return next
    })
  }, [])

  const handleRestoreAlerts = useCallback(() => {
    setDismissedAlertIds([])
    saveDismissedAlertIds([])
  }, [])
  const { data: logsRecientes = [], isLoading: loadingLogs } = useHistorialCambiosQuery({
    operation: 'ALL',
    limit: 6,
  })
  const { data: usuarios = [] } = useUsuariosQuery()

  const updateAndSaveLayout = useCallback(updater => {
    setWidgetLayout(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveHomeLayout(next)
      return next
    })
  }, [])

  const handleCommitWidgetLayout = useCallback(
    nextLayout => {
      updateAndSaveLayout(nextLayout)
    },
    [updateAndSaveLayout]
  )

  const handleRemoveWidget = useCallback(
    id => {
      updateAndSaveLayout(prev =>
        compactLayoutVertically(
          prev.map(item => (item.id === id ? { ...item, visible: false } : item))
        )
      )
    },
    [updateAndSaveLayout]
  )

  const handleAddWidget = useCallback(
    id => {
      updateAndSaveLayout(prev => addWidgetToLayout(prev, id))
    },
    [updateAndSaveLayout]
  )

  const handleResetWidgetLayout = useCallback(() => {
    setWidgetLayout(resetHomeLayout())
  }, [])

  // Descarte y completado de Onboarding persistido en localStorage
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('onboarding_dismissed') === 'true'
  )
  const [onboardingComplete, setOnboardingComplete] = useState(
    () => localStorage.getItem('onboarding_complete') === 'true'
  )
  const hasCheckedAutoOpen = useRef(false)

  const { toast, success, error: toastError, showToast } = useToast()

  const fetchData = useCallback(() => {
    invalidateAppQueries([
      QUERY_KEYS.personas,
      QUERY_KEYS.participaciones,
      QUERY_KEYS.programaSemanas,
      QUERY_KEYS.programaPartes,
      QUERY_KEYS.programaAsignaciones,
      QUERY_KEYS.configuracion,
    ])
  }, [])

  // ── ESTADOS DE ONBOARDING Y ASISTENTE (Brief #30) ──────────────
  const paso1Completo =
    localStorage.getItem('onboarding_step1') === 'true' ||
    Boolean(globalConfig?.nombreCongregacion?.trim())
  const paso2Completo = personas.length > 0
  const paso3Completo = semanas.length > 0
  const todosPasosCompletos = paso1Completo && paso2Completo && paso3Completo

  const mostrarChecklist = !onboardingDismissed && !onboardingComplete && !todosPasosCompletos

  // Auto-apertura del Wizard en primera visita si ningún paso está completo
  useEffect(() => {
    if (loading || hasCheckedAutoOpen.current) return
    hasCheckedAutoOpen.current = true

    const isDismissed = localStorage.getItem('onboarding_dismissed') === 'true'
    const isComplete = localStorage.getItem('onboarding_complete') === 'true'

    if (!isDismissed && !isComplete && !paso1Completo && !paso2Completo && !paso3Completo) {
      setEditCongNombre(congregacion || 'Congregacion del Recreo')
      setEditAnio(anioEnCurso || new Date().getFullYear().toString())
      setWizardStep(1)
      setWizardOpen(true)
    }
  }, [loading, paso1Completo, paso2Completo, paso3Completo, congregacion, anioEnCurso])

  // ── DETECCIÓN DE CAMBIO DE MES — REPORTE MENSUAL AUTOMÁTICO (Brief #33) ──
  const hasCheckedReporteMes = useRef(false)

  useEffect(() => {
    if (hasCheckedReporteMes.current) return
    hasCheckedReporteMes.current = true

    const mesActual = getMesActualYYYYMM()
    const ultimoMes = localStorage.getItem('ultimo_mes_reportado')

    if (!ultimoMes) {
      // Primera visita: registrar mes actual sin disparar generación de reporte incompleto
      localStorage.setItem('ultimo_mes_reportado', mesActual)
      return
    }

    if (ultimoMes !== mesActual) {
      // Mes nuevo detectado — invocar Edge Function con el mes que acaba de cerrar
      supabase.functions
        .invoke('reporte-mensual', {
          body: { mes: ultimoMes },
        })
        .then(({ data, error }) => {
          if (error) {
            console.warn('[Home reporte-mensual]:', error)
            return
          }
          if (data?.status === 'generated') {
            const mesNombre = formatMesYYYYMM(ultimoMes)
            showToast(
              <span>
                Reporte de {mesNombre.toLowerCase()} generado y guardado en backups.{' '}
                <button
                  type="button"
                  onClick={() => onNavigate?.('exportar')}
                  className="font-semibold underline ml-1 hover:opacity-80"
                >
                  Ver →
                </button>
              </span>,
              'info',
              6000
            )
          }
        })
        .catch(err => console.warn('[Home reporte-mensual error]:', err))

      localStorage.setItem('ultimo_mes_reportado', mesActual)
    }
  }, [onNavigate, showToast])

  // ── HANDLERS WIZARD DE ONBOARDING ──────────────────────────────
  function openWizard(step = 1) {
    setWizardStep(step)
    setEditCongNombre(congregacion || 'Congregacion del Recreo')
    setEditAnio(anioEnCurso || new Date().getFullYear().toString())
    setWizardOpen(true)
  }

  function handleDismissWizard() {
    setOnboardingDismissed(true)
    localStorage.setItem('onboarding_dismissed', 'true')
    setWizardOpen(false)
  }

  function handleFinalizarWizard() {
    setOnboardingComplete(true)
    localStorage.setItem('onboarding_complete', 'true')
    setWizardOpen(false)
    success('¡Todo listo! La app está configurada')
  }

  async function handleSaveStep1() {
    const trimmed = editCongNombre.trim()
    if (!trimmed) {
      toastError('El nombre de la congregación no puede estar vacío')
      return
    }

    setSavingConfig(true)
    try {
      const anioVal = editAnio.trim() || new Date().getFullYear().toString()
      await guardarGlobalConfig({
        ...(globalConfig || {}),
        nombreCongregacion: trimmed,
        anioEnCurso: anioVal,
      })
      setCongregacion(trimmed)
      setAnioEnCurso(anioVal)
      localStorage.setItem('onboarding_step1', 'true')
      success('Nombre de congregación guardado exitosamente')

      if (personas.length > 0 && semanas.length > 0) {
        setOnboardingComplete(true)
        localStorage.setItem('onboarding_complete', 'true')
        setWizardOpen(false)
      } else {
        setWizardStep(2)
      }
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al guardar configuración: ' + (err.message || 'Error desconocido'))
    } finally {
      setSavingConfig(false)
    }
  }

  // ── 1. CÁLCULO DE KPIS RÁPIDOS ─────────────────────────────────
  const congregacionActiva = globalConfig?.nombreCongregacion || congregacion || 'Congregación del Recreo'
  const totalPersonas = personas.length
  const totalActivos = personas.filter(p => p.activo).length
  const mesActual = getMesActualNombre()
  const anioActual = new Date().getFullYear()

  // Participaciones del mes y año en curso
  const participacionesMesActual = participaciones.filter(p => {
    if (p.fecha) {
      const d = new Date(String(p.fecha).slice(0, 10) + 'T12:00:00')
      if (!Number.isNaN(d.getTime())) {
        return d.getMonth() === new Date().getMonth() && d.getFullYear() === anioActual
      }
    }
    return p.mes === mesActual
  }).length

  const semanasUnificadas = useMemo(
    () => buildSemanasConParticipaciones(semanas, participaciones),
    [semanas, participaciones]
  )

  // Semanas del mes actual con progreso < 100%
  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']

  function calcularProgresoSemana(semanaId) {
    const semTarget = semanasUnificadas.find(s => s.id === semanaId)
    if (semTarget?.isVirtual) {
      const totalV = semTarget.participaciones?.length || 0
      return { confirmadas: totalV, total: totalV, pct: totalV > 0 ? 100 : 0, isVirtual: true }
    }

    const partesSemana = partes.filter(
      p => p.semana_id === semanaId && !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion)
    )
    const total = partesSemana.length
    if (total === 0) return { confirmadas: 0, total: 0, pct: 0 }

    const confirmadas = partesSemana.filter(p => {
      const asigParte = asignaciones.filter(a => a.parte_id === p.id && a.confirmado)
      const asigP = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
      const asigA = asignaciones.find(a => a.parte_id === p.id && a.rol === 'ayudante')

      const pr = asigP?.participacion_id
        ? participaciones.find(h => h.id === asigP.participacion_id)
        : null
      const ar = asigA?.participacion_id
        ? participaciones.find(h => h.id === asigA.participacion_id)
        : null

      const pCambio = !!asigP?.participacion_id && pr && pr.clave !== asigP?.clave
      const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
      const aNuevo =
        p.requiere_ayudante && asigA?.clave && asigP?.participacion_id && !asigA?.participacion_id
      const aRem = p.requiere_ayudante && !asigA?.clave && ar
      const necesitaRec = pCambio || aCambio || aNuevo || aRem

      return asigParte.some(a => a.rol === 'principal') && !necesitaRec
    }).length

    const pct = Math.round((confirmadas / total) * 100)
    return { confirmadas, total, pct }
  }

  const semanasMesActual = semanas.filter(s => {
    const itemAnio = s.anio ?? (s.fecha_inicio ? Number(String(s.fecha_inicio).slice(0, 4)) : null)
    if (itemAnio && Number(itemAnio) !== anioActual) return false
    if (s.mes) return s.mes === mesActual
    if (s.fecha_inicio) {
      const d = new Date(String(s.fecha_inicio).slice(0, 10) + 'T12:00:00')
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === anioActual
    }
    return false
  })

  const semanasIncompletasMesActual = semanasMesActual.filter(s => {
    const impacto = getImpactoEventoSemana(
      s,
      eventosReunion,
      globalConfig?.diaReunionEntreSemana,
      globalConfig?.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) return false
    const prog = calcularProgresoSemana(s.id)
    return prog.total > 0 && prog.confirmadas < prog.total
  })

  const proximaReunion = getProximaReunion(globalConfig, new Date(), eventosReunion)

  // ── 2. MOTOR DE REGLAS — ALERTAS PROACTIVAS ────────────────────
  const fechaHoy = new Date()
  const haceDosMeses = new Date(fechaHoy)
  haceDosMeses.setDate(haceDosMeses.getDate() - 60)
  const haceDosMesesIso = getHoyLocalIso(haceDosMeses)

  const personasSinActividad2Meses = useMemo(
    () => sortPersonasPorEspera(personas, participaciones, haceDosMesesIso),
    [personas, participaciones, haceDosMesesIso]
  )

  const hoyIsoStr = getHoyLocalIso()
  const eventoProximo = (eventosReunion || []).find(e => {
    const fFin = e.fecha_fin_evento || e.fecha_efectiva || e.fecha_original
    return fFin && fFin >= hoyIsoStr
  })

  const proxMesInfo = getProximoMesInfo()
  const semanasProximoMes = semanas.filter(s => {
    if (s.mes && s.mes === proxMesInfo.mes) {
      if (s.anio) return Number(s.anio) === proxMesInfo.anio
      return true
    }
    if (s.fecha_inicio) {
      const d = new Date(s.fecha_inicio + 'T12:00:00')
      const targetMonthIndex = MESES.indexOf(proxMesInfo.mes)
      return d.getMonth() === targetMonthIndex && d.getFullYear() === proxMesInfo.anio
    }
    return false
  })

  const alertasCompletas = buildHomeAlertas({
    mesActual,
    anioActual,
    semanasIncompletasMesActual,
    personasSinActividad2Meses,
    eventoProximo,
    semanasProximoMes,
    proxMesInfo,
    participaciones,
    rol,
    onNavigate,
  })

  const alertasHabilitadas = alertasCompletas.filter(a => {
    if (a.id.startsWith('semanas_incompletas_') && !alertPrefs.semanasIncompletas) return false
    if (a.id.startsWith('personas_inactivas_') && !alertPrefs.personasInactivas) return false
    if (a.id.startsWith('programa_proximo_mes_') && !alertPrefs.epubDisponible) return false
    return true
  })

  const dismissedSet = new Set(dismissedAlertIds)
  const alertas = alertasHabilitadas.filter(a => !dismissedSet.has(a.id))
  const totalAlertasDescartadas = alertasHabilitadas.length - alertas.length

  // ── 3. WIDGET — SEMANA ACTUAL Y PRÓXIMA REUNIÓN ────────────────
  const hoyIso = getHoyLocalIso()

  const findSemanaParaFecha = isoFecha => {
    if (!isoFecha) return null
    return (
      semanasUnificadas.find(s => {
        const ini = String(s.fecha_inicio || '').slice(0, 10)
        const fin = String(s.fecha_fin || '').slice(0, 10)
        return isoFecha >= ini && isoFecha <= fin
      }) || null
    )
  }

  const semanaActual = findSemanaParaFecha(hoyIso)
  const semanaProximaReunion = findSemanaParaFecha(proximaReunion?.fechaIso)

  const virtualSemanaActual = useMemo(
    () => (semanaActual?.isVirtual ? buildPartesVirtualesDeSemana(semanaActual) : null),
    [semanaActual]
  )
  const virtualProxima = useMemo(
    () =>
      semanaProximaReunion?.isVirtual
        ? buildPartesVirtualesDeSemana(semanaProximaReunion)
        : null,
    [semanaProximaReunion]
  )

  const partesSemanaActual = semanaActual
    ? semanaActual.isVirtual
      ? virtualSemanaActual.partes
      : partes.filter(p => p.semana_id === semanaActual.id)
    : []
  const partesProximaReunion = semanaProximaReunion
    ? semanaProximaReunion.isVirtual
      ? virtualProxima.partes
      : partes.filter(p => p.semana_id === semanaProximaReunion.id)
    : []

  const asignacionesEfectivas = useMemo(() => {
    if (!virtualSemanaActual && !virtualProxima) return asignaciones
    const extras = [...(virtualSemanaActual?.asignaciones || [])]
    if (virtualProxima && semanaProximaReunion?.id !== semanaActual?.id) {
      extras.push(...virtualProxima.asignaciones)
    }
    return [...asignaciones, ...extras]
  }, [asignaciones, virtualSemanaActual, virtualProxima, semanaActual?.id, semanaProximaReunion?.id])

  const progSemanaActual = semanaActual ? calcularProgresoSemana(semanaActual.id) : null
  const progProximaReunion = semanaProximaReunion
    ? calcularProgresoSemana(semanaProximaReunion.id)
    : null


  // ── 5. ACCIÓN RÁPIDA: GENERAR S-140 DIRECTAMENTE ───────────────
  async function handleGenerarS140Directo() {
    if (semanas.length === 0) {
      toastError('No hay semanas en el programa para generar el S-140. Carga un archivo EPUB primero.')
      onNavigate?.('programa')
      return
    }

    setGeneratingDocx(true)
    try {
      const { generarYDescargarS140, buildDatosDesdeSupabase } = await import('../lib/generarS140')
      // Filtrar las semanas del mes actual o tomar las 4-5 primeras
      let semanasParaDocx = semanasMesActual.length > 0 ? semanasMesActual : semanas.slice(0, 5)
      const semanasNorm = buildDatosDesdeSupabase(semanasParaDocx, partes, asignaciones, personas, eventosReunion, globalConfig)

      await generarYDescargarS140({
        congregacion: congregacionActiva,
        semanas: semanasNorm,
        config: globalConfig,
      })
      success('Documento S-140 generado y descargado con éxito.')
    } catch (err) {
      console.error(err)
      toastError('Error al generar S-140: ' + err.message)
    } finally {
      setGeneratingDocx(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-48 rounded-lg" />
          <SkeletonBlock className="h-4 w-96 rounded-md" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonBlock className="h-28 rounded-xl" />
          <SkeletonBlock className="h-28 rounded-xl" />
          <SkeletonBlock className="h-28 rounded-xl" />
          <SkeletonBlock className="h-28 rounded-xl" />
        </div>
        <SkeletonBlock className="h-64 rounded-xl" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-text1">Error al cargar el panel principal</h3>
        <p className="text-xs text-text3 font-mono">{fetchError}</p>
        <Button variant="outline" size="sm" icon={RotateCcw} onClick={fetchData}>
          Reintentar conexión
        </Button>
      </div>
    )
  }

  const displayName = (
    userName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    ''
  ).trim()

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toast toast={toast} />

      {/* ── ENCABEZADO DE BIENVENIDA ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text3">
            {getFechaHoyLegible()}
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-text1">
              {getSaludoContextual()}
              {displayName ? `, ${displayName}` : ''}
            </h1>
            <Badge
              variant="neutral"
              size="sm"
              className="cursor-pointer hover:bg-surface-alt transition-colors"
              onClick={() => {
                if (rol === 'admin') {
                  onNavigate?.('configuracion')
                } else {
                  openWizard(1)
                }
              }}
              title={
                rol === 'admin'
                  ? 'Configuración del Sistema (Nombre, Días y Horarios de Reunión)'
                  : 'Modificar congregación o año'
              }
            >
              {congregacionActiva}
            </Badge>
          </div>
          <p className="text-xs text-text2">
            Resumen general de participaciones, agenda de reuniones y widgets configurables.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={isEditingHome ? 'accent' : 'outline'}
            size="sm"
            icon={isEditingHome ? Check : SlidersHorizontal}
            onClick={() => setIsEditingHome(v => !v)}
            className="text-xs"
          >
            {isEditingHome ? 'Listo' : 'Personalizar Inicio'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={() => onNavigate?.('programa')}
            className="text-xs"
          >
            Ir al Programa S-140
          </Button>
        </div>
      </div>

      {/* ── 1. CHECKLIST DE ONBOARDING (CONDICIONAL) ── */}
      {mostrarChecklist && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 shadow-2xs relative">
          <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDismissWizard}
              className="text-xs text-text3 hover:text-text1 hover:underline transition-colors cursor-pointer px-1 py-0.5"
            >
              Saltar por ahora
            </button>
            <button
              type="button"
              onClick={handleDismissWizard}
              className="p-1 rounded-lg text-text3 hover:text-text1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Cerrar aviso"
              aria-label="Cerrar aviso de bienvenida"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-24 sm:pr-28">
              <h2 className="text-sm font-semibold text-text1 tracking-tight">
                Primeros pasos: Configura tu congregación
              </h2>
              <p className="text-xs text-text2 mt-0.5 leading-relaxed">
                Completa estos tres pasos esenciales para personalizar los informes y comenzar a gestionar las participaciones.
              </p>

              {/* Checklist de 3 pasos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {/* Paso 1 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    paso1Completo
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                      : 'bg-surface border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text3">
                        Paso 1
                      </span>
                      {paso1Completo ? (
                        <Badge variant="success" size="xs" dot>
                          Completado
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    <h3
                      className={`text-xs font-medium ${
                        paso1Completo
                          ? 'text-text2 line-through decoration-emerald-500/50'
                          : 'text-text1'
                      }`}
                    >
                      Nombre de congregación
                    </h3>
                    <p className="text-[11px] text-text3 mt-0.5">
                      {paso1Completo ? congregacionActiva : 'Personaliza el nombre oficial y año'}
                    </p>
                  </div>
                  {!paso1Completo && (
                    <Button
                      variant="accent"
                      size="xs"
                      icon={ArrowRight}
                      onClick={() => {
                        if (rol === 'admin') {
                          onNavigate?.('configuracion')
                        } else {
                          openWizard(1)
                        }
                      }}
                      className="mt-3 w-full text-[11px]"
                    >
                      Configurar →
                    </Button>
                  )}
                </div>

                {/* Paso 2 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    paso2Completo
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                      : 'bg-surface border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text3">
                        Paso 2
                      </span>
                      {paso2Completo ? (
                        <Badge variant="success" size="xs" dot>
                          {personas.length} importadas
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    <h3
                      className={`text-xs font-medium ${
                        paso2Completo
                          ? 'text-text2 line-through decoration-emerald-500/50'
                          : 'text-text1'
                      }`}
                    >
                      Importar participantes
                    </h3>
                    <p className="text-[11px] text-text3 mt-0.5">
                      {paso2Completo
                        ? `${personas.length} hermanos en catálogo`
                        : 'Carga el archivo CSV de participantes'}
                    </p>
                  </div>
                  {!paso2Completo && (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={ArrowRight}
                      onClick={() => openWizard(2)}
                      className="mt-3 w-full text-[11px]"
                    >
                      Configurar →
                    </Button>
                  )}
                </div>

                {/* Paso 3 */}
                <div
                  className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                    paso3Completo
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                      : 'bg-surface border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text3">
                        Paso 3
                      </span>
                      {paso3Completo ? (
                        <Badge variant="success" size="xs" dot>
                          {semanas.length} semanas
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="xs">
                          Pendiente
                        </Badge>
                      )}
                    </div>
                    <h3
                      className={`text-xs font-medium ${
                        paso3Completo
                          ? 'text-text2 line-through decoration-emerald-500/50'
                          : 'text-text1'
                      }`}
                    >
                      Subir primer EPUB mwb
                    </h3>
                    <p className="text-[11px] text-text3 mt-0.5">
                      {paso3Completo
                        ? 'Programa S-140 cargado y listo'
                        : 'Importa la guía de actividades mensual'}
                    </p>
                  </div>
                  {!paso3Completo && (
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={ArrowRight}
                      onClick={() => openWizard(3)}
                      className="mt-3 w-full text-[11px]"
                    >
                      Configurar →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. CUADRÍCULA DINÁMICA DE WIDGETS CONFIGURABLES ── */}
      <HomeWidgetGrid
        layout={widgetLayout}
        isEditing={isEditingHome}
        onToggleEdit={() => setIsEditingHome(v => !v)}
        onCommitLayout={handleCommitWidgetLayout}
        onRemoveWidget={handleRemoveWidget}
        onAddWidget={handleAddWidget}
        onResetLayout={handleResetWidgetLayout}
        congregacionActiva={congregacionActiva}
        mesActual={mesActual}
        anioActual={anioActual}
        totalPersonas={totalPersonas}
        totalActivos={totalActivos}
        participacionesMesActual={participacionesMesActual}
        semanas={semanasUnificadas}
        asignaciones={asignacionesEfectivas}
        personas={personas}
        participaciones={participaciones}
        eventosReunion={eventosReunion}
        semanasIncompletasMesActual={semanasIncompletasMesActual}
        semanasMesActualCount={semanasMesActual.length}
        proximaReunion={proximaReunion}
        alertas={alertas}
        totalAlertasDescartadas={totalAlertasDescartadas}
        onDismissAlert={handleDismissAlert}
        onRestoreAlerts={handleRestoreAlerts}
        personasSinActividad2Meses={personasSinActividad2Meses}
        semanaActual={semanaActual}
        partesSemanaActual={partesSemanaActual}
        progSemanaActual={progSemanaActual}
        semanaProximaReunion={semanaProximaReunion}
        partesProximaReunion={partesProximaReunion}
        progProximaReunion={progProximaReunion}
        calcularProgresoSemana={calcularProgresoSemana}
        logsRecientes={logsRecientes}
        usuarios={usuarios}
        loadingLogs={loadingLogs}
        generatingDocx={generatingDocx}
        handleGenerarS140Directo={handleGenerarS140Directo}
        onNavigate={onNavigate}
        onOpenRegistrosCreate={onOpenRegistrosCreate}
        SECCION_LABEL={SECCION_LABEL}
        TIPO_LABEL={TIPO_LABEL}
        TIPOS_SOLO_VISUAL={TIPOS_SOLO_VISUAL}
      />

      {/* ── MODAL: WIZARD DE ONBOARDING (Brief #30) ── */}
      <Dialog
        isOpen={wizardOpen}
        onClose={handleDismissWizard}
        title={
          wizardStep === 1
            ? 'Configuración inicial — Congregación y año'
            : wizardStep === 2
            ? 'Configuración inicial — Importar participantes'
            : 'Configuración inicial — Programa de reuniones'
        }
        description={
          wizardStep === 1
            ? 'Paso 1 de 3: Personaliza los datos oficiales de tu congregación'
            : wizardStep === 2
            ? 'Paso 2 de 3: Carga o registra a los participantes'
            : 'Paso 3 de 3: Importa la guía mensual de actividades'
        }
        size="lg"
        footer={
          wizardStep === 1 ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissWizard}
              >
                Saltar por ahora
              </Button>
              <Button
                variant="accent"
                size="sm"
                loading={savingConfig}
                onClick={handleSaveStep1}
                icon={ArrowRight}
              >
                Guardar y continuar
              </Button>
            </>
          ) : wizardStep === 2 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setWizardStep(1)}
              >
                Atrás
              </Button>
              <Button
                variant="accent"
                size="sm"
                icon={ArrowRight}
                onClick={() => setWizardStep(3)}
              >
                Continuar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setWizardStep(2)}
              >
                Atrás
              </Button>
              <Button
                variant="accent"
                size="sm"
                icon={Check}
                onClick={handleFinalizarWizard}
              >
                Finalizar
              </Button>
            </>
          )
        }
      >
        <div className="space-y-4">
          {/* Barra de progreso / Stepper */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  wizardStep === 1
                    ? 'bg-emerald-600 text-white'
                    : paso1Completo
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-text3'
                }`}
              >
                {paso1Completo && wizardStep !== 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </div>
              <span
                className={`text-xs ${
                  wizardStep === 1 ? 'font-semibold text-text1' : 'text-text3'
                }`}
              >
                Congregación
              </span>
            </div>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  wizardStep === 2
                    ? 'bg-emerald-600 text-white'
                    : paso2Completo
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-text3'
                }`}
              >
                {paso2Completo && wizardStep !== 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </div>
              <span
                className={`text-xs ${
                  wizardStep === 2 ? 'font-semibold text-text1' : 'text-text3'
                }`}
              >
                Participantes
              </span>
            </div>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  wizardStep === 3
                    ? 'bg-emerald-600 text-white'
                    : paso3Completo
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-text3'
                }`}
              >
                {paso3Completo && wizardStep !== 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </div>
              <span
                className={`text-xs ${
                  wizardStep === 3 ? 'font-semibold text-text1' : 'text-text3'
                }`}
              >
                Programa
              </span>
            </div>
          </div>

          {/* Paso 1: Congregación y año */}
          {wizardStep === 1 && (
            <div className="space-y-4 pt-1">
              <p className="text-xs text-text2 leading-relaxed">
                Ingresa el nombre oficial de tu congregación y el año de servicio. Estos datos aparecerán en el encabezado de los formularios S-140 generados y en los registros.
              </p>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text1">
                  Nombre de la congregación <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editCongNombre}
                  onChange={e => setEditCongNombre(e.target.value)}
                  placeholder="Ej. Congregación Los Olivos"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-text1">
                  Año en curso
                </label>
                <Input
                  value={editAnio}
                  onChange={e => setEditAnio(e.target.value)}
                  placeholder="Ej. 2026"
                />
              </div>

              {rol === 'admin' && (
                <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-text2 flex items-center justify-between">
                  <span>¿Deseas personalizar días, horarios o circuito?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardOpen(false)
                      onNavigate?.('configuracion')
                    }}
                    className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline text-[11px] cursor-pointer ml-2"
                  >
                    Abrir Configuración →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Paso 2: Participantes */}
          {wizardStep === 2 && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80">
                <div>
                  <span className="text-xs font-medium text-text1">Estado del catálogo:</span>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {personas.length > 0
                      ? '¡Paso completado! Ya cuentas con participantes en el catálogo.'
                      : 'Aún no hay participantes registrados en la base de datos.'}
                  </p>
                </div>
                <Badge variant={personas.length > 0 ? 'success' : 'neutral'} size="sm" dot={personas.length > 0}>
                  {personas.length} {personas.length === 1 ? 'persona' : 'personas'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tarjeta 1: CSV */}
                <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-surface flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-text1">Importar archivo CSV</h4>
                    <p className="text-[11px] text-text3 leading-relaxed">
                      Carga la lista completa de matriculados y ancianos/siervos ministeriales desde un archivo CSV.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={ExternalLink}
                    onClick={() => {
                      setWizardOpen(false)
                      onNavigate?.('exportar')
                    }}
                    className="mt-3 w-full text-[11px]"
                  >
                    Ir a Importar CSV
                  </Button>
                </div>

                {/* Tarjeta 2: Manual */}
                <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-surface flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                  <div className="space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-semibold text-text1">Agregar manualmente</h4>
                    <p className="text-[11px] text-text3 leading-relaxed">
                      Registra a los hermanos uno a uno asignando sus privilegios y roles de manera personalizada.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={ExternalLink}
                    onClick={() => {
                      setWizardOpen(false)
                      onNavigate?.('personas')
                    }}
                    className="mt-3 w-full text-[11px]"
                  >
                    Ir a Personas
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Programa */}
          {wizardStep === 3 && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80">
                <div>
                  <span className="text-xs font-medium text-text1">Estado del programa:</span>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {semanas.length > 0
                      ? '¡Paso completado! Ya tienes semanas registradas en el sistema.'
                      : 'Aún no se ha importado ninguna guía mensual de actividades.'}
                  </p>
                </div>
                <Badge variant={semanas.length > 0 ? 'success' : 'neutral'} size="sm" dot={semanas.length > 0}>
                  {semanas.length} {semanas.length === 1 ? 'semana' : 'semanas'}
                </Badge>
              </div>

              <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-surface space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-text1">Guía de Actividades mensual (EPUB)</h4>
                    <p className="text-[11px] text-text3 leading-relaxed mt-1">
                      El archivo <code className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px]">.epub</code> de la Guía de Actividades para la reunión Vida y Ministerio Cristianos (mwb) se descarga mensualmente desde jw.org. Al importarlo en la sección de Programa, la aplicación extrae automáticamente todas las semanas, cánticos y títulos de las partes.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="xs"
                  icon={BookOpen}
                  onClick={() => {
                    setWizardOpen(false)
                    onNavigate?.('programa')
                  }}
                  className="w-full text-[11px]"
                >
                  Ir a Programa S-140 para importar EPUB
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  )
}
