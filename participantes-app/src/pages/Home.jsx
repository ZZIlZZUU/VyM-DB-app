import { useState, useEffect, useCallback, useRef } from 'react'
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
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { generarYDescargarS140, buildDatosDesdeSupabase } from '../lib/generarS140'
import {
  formatFechaLegible,
  formatRangoSemanaLegible,
  formatRangoSemanaPrograma,
  getProximaReunion,
} from '../lib/fechas'
import { formatMesYYYYMM, getMesActualYYYYMM } from '../lib/generarReporteMensual'
import { useConfiguracion } from '../hooks/useConfiguracion'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
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
  CONCLU: 'Palabras de conclusión',
  TB: 'Tesoros de la Biblia',
  PE: 'Perlas escondidas',
  LB: 'Lectura de la Biblia',
  SMT_EST: 'Estudiante',
  SMT_EXP: 'Explique sus creencias',
  SMT_DSC: 'Discurso',
  SMT_AYU: 'Ayudante',
  VC: 'Vida Cristiana',
  NC: 'Nec. de la congregación',
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

export default function Home({ onNavigate, onOpenRegistrosCreate, rol }) {
  const { config: globalConfig, guardarConfiguracion: guardarGlobalConfig } = useConfiguracion()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [personas, setPersonas] = useState([])
  const [participaciones, setParticipaciones] = useState([])
  const [semanas, setSemanas] = useState([])
  const [partes, setPartes] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [configuracion, setConfiguracion] = useState([])
  const [congregacion, setCongregacion] = useState('')
  const [anioEnCurso, setAnioEnCurso] = useState(new Date().getFullYear().toString())

  // Wizard Interactivo de Onboarding (Brief #20 Rework)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1) // 1, 2, 3
  const [editCongNombre, setEditCongNombre] = useState('')
  const [editAnio, setEditAnio] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [generatingDocx, setGeneratingDocx] = useState(false)

  // Descarte y completado de Onboarding persistido en localStorage
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('onboarding_dismissed') === 'true'
  )
  const [onboardingComplete, setOnboardingComplete] = useState(
    () => localStorage.getItem('onboarding_complete') === 'true'
  )
  const hasCheckedAutoOpen = useRef(false)

  const { toast, success, error: toastError, showToast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setFetchError(null)
      const [
        { data: per, error: perErr },
        { data: part, error: partErr },
        { data: sem, error: semErr },
        { data: par, error: parErr },
        { data: asi, error: asiErr },
        { data: cfg, error: cfgErr },
      ] = await Promise.all([
        supabase.from('personas').select('*').order('nombre'),
        supabase.from('participaciones').select('*').order('fecha'),
        supabase.from('programa_semanas').select('*').order('fecha_inicio'),
        supabase.from('programa_partes').select('*').order('numero_parte'),
        supabase.from('programa_asignaciones').select('*'),
        supabase.from('configuracion').select('*'),
      ])

      if (perErr) throw perErr
      if (partErr) throw partErr
      if (semErr) throw semErr
      if (parErr) throw parErr
      if (asiErr) throw asiErr
      if (cfgErr) console.warn('[configuracion error]', cfgErr)

      setPersonas(per || [])
      setParticipaciones(part || [])
      setSemanas(sem || [])
      setPartes(par || [])
      setAsignaciones(asi || [])
      setConfiguracion(cfg || [])

      const nombreCfg = cfg?.find(r => r.clave === 'nombre_congregacion')?.valor
      const anioCfg = cfg?.find(r => r.clave === 'anio_en_curso')?.valor

      if (nombreCfg) setCongregacion(nombreCfg)
      else setCongregacion('Congregacion del Recreo')

      if (anioCfg) setAnioEnCurso(anioCfg)
    } catch (err) {
      console.error('[Home fetchData]', err)
      setFetchError(err?.message || 'Error al sincronizar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscripciones Realtime
  useEffect(() => {
    const canal = supabase
      .channel('home-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_semanas' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_partes' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_asignaciones' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracion' }, () => fetchData())
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // ── ESTADOS DE ONBOARDING Y ASISTENTE (Brief #30) ──────────────
  const paso1Completo =
    localStorage.getItem('onboarding_step1') === 'true' ||
    configuracion.some(r => r.clave === 'nombre_congregacion' && r.valor?.trim()) ||
    configuracion.some(r => r.clave === 'configuracion_inicial_completada')
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

  // Participaciones del mes en curso
  const participacionesMesActual = participaciones.filter(p => {
    if (p.mes) return p.mes === mesActual
    if (p.fecha) {
      const d = new Date(p.fecha + 'T12:00:00')
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === anioActual
    }
    return false
  }).length

  // Semanas del mes actual con progreso < 100%
  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']

  function calcularProgresoSemana(semanaId) {
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
    if (s.mes) return s.mes === mesActual
    if (s.fecha_inicio) {
      const d = new Date(s.fecha_inicio + 'T12:00:00')
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === anioActual
    }
    return false
  })

  const semanasIncompletasMesActual = semanasMesActual.filter(s => {
    const prog = calcularProgresoSemana(s.id)
    return prog.total > 0 && prog.confirmadas < prog.total
  })

  const proximaReunion = getProximaReunion(globalConfig)

  // ── 2. MOTOR DE REGLAS — ALERTAS PROACTIVAS ────────────────────
  const alertas = []

  // Alerta 1: Semanas del mes actual con partes sin confirmar
  if (semanasIncompletasMesActual.length > 0) {
    alertas.push({
      id: 'semanas_incompletas',
      tipo: 'warning',
      titulo: `Semanas incompletas en ${mesActual}`,
      mensaje: `Hay ${semanasIncompletasMesActual.length} semana(s) con asignaciones pendientes de confirmar en el programa de este mes.`,
      linkTexto: 'Revisar programa →',
      onAction: () => onNavigate?.('programa'),
    })
  }

  // Alerta 2: Personas activas con > 2 meses sin participar
  const fechaHoy = new Date()
  const haceDosMeses = new Date(fechaHoy)
  haceDosMeses.setDate(haceDosMeses.getDate() - 60)
  const haceDosMesesIso = haceDosMeses.toISOString().slice(0, 10)

  const personasSinActividad2Meses = personas.filter(p => {
    if (!p.activo) return false
    const partsPersona = participaciones.filter(r => r.clave === p.clave)
    if (partsPersona.length === 0) return true
    const ultPart = partsPersona.reduce((latest, r) => {
      const f = String(r.fecha || '').slice(0, 10)
      return !latest || f > latest ? f : latest
    }, null)
    return !ultPart || ultPart < haceDosMesesIso
  })

  if (personasSinActividad2Meses.length > 0) {
    alertas.push({
      id: 'personas_inactivas',
      tipo: 'info',
      titulo: 'Participantes sin actividad reciente',
      mensaje: `${personasSinActividad2Meses.length} participante(s) activo(s) llevan más de 2 meses consecutivos sin ninguna asignación registrada.`,
      linkTexto: 'Ver personas →',
      onAction: () => onNavigate?.('personas'),
    })
  }

  // Alerta 3: Programa del mes siguiente sin cargar
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

  if (semanasProximoMes.length === 0) {
    alertas.push({
      id: 'programa_proximo_mes',
      tipo: 'danger',
      titulo: `Programa de ${proxMesInfo.mes} sin cargar`,
      mensaje: `Aún no se ha importado el archivo EPUB mwb para las reuniones de ${proxMesInfo.mes} ${proxMesInfo.anio}.`,
      linkTexto: 'Cargar EPUB →',
      onAction: () => onNavigate?.('programa'),
    })
  }

  // ── 3. WIDGET — SEMANA ACTUAL ──────────────────────────────────
  const hoyIso = new Date().toISOString().slice(0, 10)

  let semanaActual = semanas.find(s => {
    const ini = String(s.fecha_inicio || '').slice(0, 10)
    const fin = String(s.fecha_fin || '').slice(0, 10)
    return hoyIso >= ini && hoyIso <= fin
  })

  // Fallback: si hoy no cae exactamente en ninguna semana, tomar la más próxima en el futuro, o la última registrada
  if (!semanaActual && semanas.length > 0) {
    const futuras = semanas.filter(s => String(s.fecha_inicio || '').slice(0, 10) >= hoyIso)
    semanaActual = futuras.length > 0 ? futuras[0] : semanas[semanas.length - 1]
  }

  const partesSemanaActual = semanaActual
    ? partes.filter(p => p.semana_id === semanaActual.id)
    : []

  const progSemanaActual = semanaActual ? calcularProgresoSemana(semanaActual.id) : null


  // ── 5. ACCIÓN RÁPIDA: GENERAR S-140 DIRECTAMENTE ───────────────
  async function handleGenerarS140Directo() {
    if (semanas.length === 0) {
      toastError('No hay semanas en el programa para generar el S-140. Carga un archivo EPUB primero.')
      onNavigate?.('programa')
      return
    }

    setGeneratingDocx(true)
    try {
      // Filtrar las semanas del mes actual o tomar las 4-5 primeras
      let semanasParaDocx = semanasMesActual.length > 0 ? semanasMesActual : semanas.slice(0, 5)
      const semanasNorm = buildDatosDesdeSupabase(semanasParaDocx, partes, asignaciones, personas)

      await generarYDescargarS140({
        congregacion: congregacionActiva,
        semanas: semanasNorm,
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toast toast={toast} />

      {/* ── ENCABEZADO DE BIENVENIDA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Panel Principal
            </h1>
            <Badge
              variant="neutral"
              size="sm"
              className="cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
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
          <p className="text-xs text-text2 mt-1">
            Resumen general de participaciones, agenda de reuniones y estado del programa S-140.
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

      {/* ── 2. KPIS RÁPIDOS (4 TARJETAS MÉTRICAS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Personas Activas */}
        <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-text3">
            <span className="text-xs font-medium">Personas activas</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-text1 tracking-tight">
            {totalActivos}
          </div>
          <div className="text-[11px] text-text3 flex items-center justify-between">
            <span>de {totalPersonas} en catálogo</span>
            <span className="font-mono text-[10px]">
              {totalPersonas > 0 ? Math.round((totalActivos / totalPersonas) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* KPI 2: Participaciones del Mes */}
        <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-text3">
            <span className="text-xs font-medium">Participaciones de {mesActual}</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            {participacionesMesActual}
          </div>
          <span className="text-[11px] text-text3 block truncate">
            Asignaciones registradas en el mes
          </span>
        </div>

        {/* KPI 3: Semanas con progreso < 100% */}
        <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-text3">
            <span className="text-xs font-medium">Semanas pendientes</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-text1 tracking-tight">
            {semanasIncompletasMesActual.length}
          </div>
          <div className="text-[11px] text-text3 flex items-center justify-between">
            <span>en el mes de {mesActual}</span>
            {semanasIncompletasMesActual.length === 0 ? (
              <Badge variant="success" size="xs">
                Al 100%
              </Badge>
            ) : (
              <Badge variant="warning" size="xs">
                Incompletas
              </Badge>
            )}
          </div>
        </div>

        {/* KPI 4: Próxima Reunión */}
        <div className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-text3">
            <span className="text-xs font-medium truncate" title={proximaReunion.nombreReunion}>
              Próx: {proximaReunion.nombreReunion || 'Reunión'}
            </span>
            <CalendarDays className="w-4 h-4 text-purple-500 shrink-0" />
          </div>
          <div className="text-lg font-bold text-text1 tracking-tight truncate leading-tight pt-1">
            {proximaReunion.textoFormateado}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-text3">{proximaReunion.horaFormateada}</span>
            <Badge variant={proximaReunion.badgeVariant} size="xs">
              {proximaReunion.badgeTexto}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── 3. ALERTAS PROACTIVAS (INBOX DINÁMICO) ── */}
      {alertas.length > 0 && (
        <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-text1 tracking-tight">
                Alertas y Avisos Proactivos
              </h2>
            </div>
            <Badge variant="warning" size="xs" dot>
              {alertas.length} {alertas.length === 1 ? 'aviso activo' : 'avisos activos'}
            </Badge>
          </div>

          <div className="space-y-2.5">
            {alertas.map(alerta => {
              const bgClass =
                alerta.tipo === 'danger'
                  ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200/80 dark:border-red-800/40 text-red-900 dark:text-red-200'
                  : alerta.tipo === 'warning'
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-800/40 text-amber-900 dark:text-amber-200'
                  : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/40 text-blue-900 dark:text-blue-200'

              const iconClass =
                alerta.tipo === 'danger'
                  ? 'text-red-600 dark:text-red-400'
                  : alerta.tipo === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'

              return (
                <div
                  key={alerta.id}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${bgClass}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 shrink-0 ${iconClass}`}>
                      {alerta.tipo === 'danger' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : alerta.tipo === 'warning' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h3 className="text-xs font-semibold text-text1">{alerta.titulo}</h3>
                      <p className="text-xs text-text2 leading-relaxed">{alerta.mensaje}</p>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={alerta.onAction}
                    className="shrink-0 font-medium self-end sm:self-auto bg-surface/90 dark:bg-surface text-text1 border-zinc-300 dark:border-zinc-700"
                  >
                    {alerta.linkTexto}
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 4. WIDGET — SEMANA ACTUAL ── */}
      <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xs">
        {/* Cabecera del Widget */}
        <div className="p-4 sm:p-5 bg-zinc-50/70 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-semibold text-text1 tracking-tight">
                Agenda de la Semana Actual
              </h2>
              {semanaActual && (
                <Badge variant="neutral" size="xs">
                  {formatRangoSemanaPrograma(semanaActual.fecha_inicio, semanaActual.fecha_fin)}
                </Badge>
              )}
            </div>
            {semanaActual && (
              <p className="text-xs text-text3 font-mono mt-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{semanaActual.capitulo_biblico || 'Lectura semanal'}</span>
              </p>
            )}
          </div>

          {semanaActual && progSemanaActual && (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-text1">
                    {progSemanaActual.confirmadas}/{progSemanaActual.total} partes
                  </span>
                  <Badge
                    variant={
                      progSemanaActual.pct === 100
                        ? 'success'
                        : progSemanaActual.pct >= 50
                        ? 'warning'
                        : 'neutral'
                    }
                    size="xs"
                  >
                    {progSemanaActual.pct}% confirmada
                  </Badge>
                </div>
                <div className="w-36 bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      progSemanaActual.pct === 100
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : progSemanaActual.pct >= 50
                        ? 'bg-amber-500'
                        : 'bg-zinc-400 dark:bg-zinc-600'
                    }`}
                    style={{ width: `${progSemanaActual.pct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contenido de la Semana Actual */}
        {!semanaActual || partesSemanaActual.length === 0 ? (
          <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-text3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-text1">No hay programa para la semana en curso</h3>
            <p className="text-xs text-text3 max-w-sm">
              Sube el archivo EPUB de la guía de actividades en la sección de Programa para ver la agenda aquí.
            </p>
            <Button
              variant="outline"
              size="sm"
              icon={Upload}
              onClick={() => onNavigate?.('programa')}
            >
              Ir a Programa S-140
            </Button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Canciones de la semana */}
            <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-zinc-100 dark:border-zinc-800/60 text-xs">
              <span className="font-mono text-[10px] text-text3 uppercase tracking-wider">
                Canciones:
              </span>
              {[
                { label: 'Apertura', num: semanaActual.cancion_apertura },
                { label: 'Vida Cristiana', num: semanaActual.cancion_vc },
                { label: 'Cierre', num: semanaActual.cancion_cierre },
              ]
                .filter(c => c.num)
                .map((c, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-900 text-text2 px-2 py-0.5 rounded-md border border-zinc-200/80 dark:border-zinc-800"
                  >
                    <Music className="w-3 h-3 text-text3" />
                    <span>
                      {c.label}: <strong className="text-text1">{c.num}</strong>
                    </span>
                  </span>
                ))}
            </div>

            {/* Tabla / Lista compacta de partes */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {['APERTURA', 'TB', 'SMT', 'VC', 'CIERRE'].map(sec => {
                const partesSeccion = partesSemanaActual.filter(p => p.seccion === sec)
                if (partesSeccion.length === 0) return null

                return (
                  <div key={sec} className="py-2.5 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="text-[10px] font-mono font-semibold text-text3 uppercase tracking-wider">
                      {SECCION_LABEL[sec]}
                    </div>
                    <div className="space-y-1">
                      {partesSeccion.map(parte => {
                        const asigP = asignaciones.find(
                          a => a.parte_id === parte.id && a.rol === 'principal'
                        )
                        const asigA = asignaciones.find(
                          a => a.parte_id === parte.id && a.rol === 'ayudante'
                        )

                        const personaP = personas.find(p => p.clave === asigP?.clave)
                        const personaA = personas.find(p => p.clave === asigA?.clave)

                        const isSoloVisual = TIPOS_SOLO_VISUAL.includes(parte.tipo_asignacion)
                        const isConfirmado = asigP?.confirmado

                        return (
                          <div
                            key={parte.id}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="font-mono text-[10px] text-text3 w-5 shrink-0">
                                #{parte.numero_parte}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-text1 truncate" title={parte.titulo}>
                                  {parte.titulo || TIPO_LABEL[parte.tipo_asignacion] || parte.tipo_asignacion}
                                </div>
                                <div className="text-[11px] text-text3 font-mono">
                                  {TIPO_LABEL[parte.tipo_asignacion] || parte.tipo_asignacion}
                                  {parte.duracion_min ? ` · ${parte.duracion_min} min` : ''}
                                </div>
                              </div>
                            </div>

                            {/* Asignados */}
                            <div className="flex items-center gap-3 shrink-0 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-medium text-text1 text-xs">
                                  {personaP ? personaP.nombre : '— Sin asignar'}
                                </span>
                                {personaA && (
                                  <span className="text-[11px] text-text3 flex items-center gap-1">
                                    <span className="text-text3/70">↳</span>
                                    <span>{personaA.nombre}</span>
                                  </span>
                                )}
                              </div>

                              {/* Badge Estado */}
                              {!isSoloVisual ? (
                                isConfirmado ? (
                                  <Badge variant="success" size="xs" dot>
                                    Confirmado
                                  </Badge>
                                ) : asigP?.clave ? (
                                  <Badge variant="warning" size="xs" dot>
                                    Pendiente
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral" size="xs">
                                    Sin asignar
                                  </Badge>
                                )
                              ) : (
                                <Badge variant="neutral" size="xs">
                                  Auto
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

            {/* Footer con enlace al histórico completo */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-text3">
                Vista de lectura rápida de la semana seleccionada.
              </span>
              <button
                type="button"
                onClick={() => onNavigate?.('semanal', { semanaId: semanaActual?.id })}
                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium cursor-pointer"
              >
                <span>Ver histórico completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. ACCESOS RÁPIDOS (GRID 2x2) ── */}
      <div>
        <h2 className="text-xs font-mono font-semibold text-text3 uppercase tracking-wider mb-3">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Nuevo Registro */}
          <button
            type="button"
            onClick={() => {
              if (onOpenRegistrosCreate) onOpenRegistrosCreate()
              else onNavigate?.('registros')
            }}
            className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all text-left group cursor-pointer shadow-2xs flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-text3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Nuevo registro
              </h3>
              <p className="text-xs text-text3 mt-0.5">
                Registrar participación individual
              </p>
            </div>
          </button>

          {/* Card 2: Generar S-140 */}
          <button
            type="button"
            disabled={generatingDocx}
            onClick={handleGenerarS140Directo}
            className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 hover:border-blue-500/50 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all text-left group cursor-pointer shadow-2xs flex flex-col justify-between h-32 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                {generatingDocx ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-text3 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Generar S-140
              </h3>
              <p className="text-xs text-text3 mt-0.5">
                Descargar plantilla Word (.docx)
              </p>
            </div>
          </button>

          {/* Card 3: Directorio de Personas */}
          <button
            type="button"
            onClick={() => onNavigate?.('personas')}
            className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 hover:border-purple-500/50 hover:bg-purple-50/20 dark:hover:bg-purple-950/20 transition-all text-left group cursor-pointer shadow-2xs flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-text3 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Ver personas
              </h3>
              <p className="text-xs text-text3 mt-0.5">
                Gestionar participantes y catálogo
              </p>
            </div>
          </button>

          {/* Card 4: Estadísticas */}
          <button
            type="button"
            onClick={() => onNavigate?.('estadisticas')}
            className="p-4 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/50 hover:bg-amber-50/20 dark:hover:bg-amber-950/20 transition-all text-left group cursor-pointer shadow-2xs flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <ChevronRight className="w-4 h-4 text-text3 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                Estadísticas
              </h3>
              <p className="text-xs text-text3 mt-0.5">
                Métricas anuales y balance
              </p>
            </div>
          </button>
        </div>
      </div>

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
