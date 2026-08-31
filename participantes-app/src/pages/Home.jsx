import { useState, useEffect, useCallback } from 'react'
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
import { formatFechaLegible, formatRangoSemanaLegible, formatRangoSemanaPrograma } from '../lib/fechas'
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

// Calcula el lunes o jueves más próximo desde la fecha actual
function getProximaReunion() {
  const hoy = new Date()
  const diaSemana = hoy.getDay() // 0 = Dom, 1 = Lun, 2 = Mar, 3 = Mie, 4 = Jue, 5 = Vie, 6 = Sab

  let diasHastaReunion = 0
  let nombreDia = ''

  if (diaSemana === 1) {
    // Hoy es Lunes
    diasHastaReunion = 0
    nombreDia = 'Lunes'
  } else if (diaSemana > 1 && diaSemana <= 4) {
    // Martes, Miércoles, Jueves
    diasHastaReunion = 4 - diaSemana
    nombreDia = 'Jueves'
  } else if (diaSemana === 0) {
    // Domingo -> Próximo Lunes
    diasHastaReunion = 1
    nombreDia = 'Lunes'
  } else {
    // Viernes o Sábado -> Próximo Lunes
    diasHastaReunion = (8 - diaSemana) % 7
    nombreDia = 'Lunes'
  }

  const fechaReunion = new Date(hoy)
  fechaReunion.setDate(hoy.getDate() + diasHastaReunion)

  const diaNum = fechaReunion.getDate()
  const mesNom = MESES[fechaReunion.getMonth()]

  let badgeTexto = ''
  let badgeVariant = 'neutral'
  if (diasHastaReunion === 0) {
    badgeTexto = 'Hoy'
    badgeVariant = 'success'
  } else if (diasHastaReunion === 1) {
    badgeTexto = 'Mañana'
    badgeVariant = 'warning'
  } else {
    badgeTexto = `En ${diasHastaReunion} días`
    badgeVariant = 'neutral'
  }

  return {
    textoFormateado: `${nombreDia} ${diaNum} de ${mesNom}`,
    diasRestantes: diasHastaReunion,
    badgeTexto,
    badgeVariant,
  }
}

export default function Home({ onNavigate, onOpenRegistrosCreate }) {
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

  // Estado para modal de edición de configuración en onboarding
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [editCongNombre, setEditCongNombre] = useState('')
  const [editAnio, setEditAnio] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [generatingDocx, setGeneratingDocx] = useState(false)

  // Descarte de Onboarding persistido en localStorage
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('onboarding_dismissed') === 'true'
  )

  const { toast, success, error: toastError } = useToast()

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

  // Guardar configuración desde el modal de Onboarding
  async function handleSaveConfig() {
    if (!editCongNombre.trim()) {
      toastError('El nombre de la congregación no puede estar vacío')
      return
    }
    setSavingConfig(true)
    try {
      await supabase.from('configuracion').upsert([
        { clave: 'nombre_congregacion', valor: editCongNombre.trim() },
        { clave: 'anio_en_curso', valor: editAnio.trim() || new Date().getFullYear().toString() },
      ])
      setCongregacion(editCongNombre.trim())
      setAnioEnCurso(editAnio.trim() || new Date().getFullYear().toString())
      setConfigModalOpen(false)
      success('Configuración guardada exitosamente')
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al guardar configuración: ' + err.message)
    } finally {
      setSavingConfig(false)
    }
  }

  function openConfigEdit() {
    setEditCongNombre(congregacion || 'Congregacion del Recreo')
    setEditAnio(anioEnCurso || new Date().getFullYear().toString())
    setConfigModalOpen(true)
  }

  // ── 1. CÁLCULO DE KPIS RÁPIDOS ─────────────────────────────────
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

  const proximaReunion = getProximaReunion()

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

  // ── 4. ONBOARDING (CONDICIONAL) ────────────────────────────────
  const esNombreDefault =
    !congregacion ||
    congregacion === 'Congregacion del Recreo' ||
    congregacion.trim().toLowerCase() === 'congregación del recreo'

  const paso1Completo = !esNombreDefault
  const paso2Completo = personas.length > 0
  const paso3Completo = semanas.length > 0
  const todosPasosCompletos = paso1Completo && paso2Completo && paso3Completo

  const mostrarOnboarding = !onboardingDismissed && (!todosPasosCompletos || esNombreDefault)

  function dismissOnboarding() {
    setOnboardingDismissed(true)
    localStorage.setItem('onboarding_dismissed', 'true')
  }

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
        congregacion: congregacion || 'Congregacion del Recreo',
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
            <Badge variant="neutral" size="sm">
              {congregacion}
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

      {/* ── 1. ONBOARDING (CONDICIONAL) ── */}
      {mostrarOnboarding && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-5 shadow-2xs relative">
          <button
            type="button"
            onClick={dismissOnboarding}
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            title="Ocultar asistente de configuración"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-6">
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
                  className={`p-3 rounded-xl border transition-all ${
                    paso1Completo
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                      : 'bg-surface border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
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
                  <h3 className="text-xs font-medium text-text1">Nombre de congregación</h3>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {paso1Completo ? congregacion : 'Personaliza el nombre oficial y año'}
                  </p>
                  <Button
                    variant={paso1Completo ? 'ghost' : 'accent'}
                    size="xs"
                    icon={Settings}
                    onClick={openConfigEdit}
                    className="mt-3 w-full text-[11px]"
                  >
                    {paso1Completo ? 'Editar nombre' : 'Configurar ahora →'}
                  </Button>
                </div>

                {/* Paso 2 */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    paso2Completo
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                      : 'bg-surface border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
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
                  <h3 className="text-xs font-medium text-text1">Importar participantes</h3>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {paso2Completo
                      ? `${personas.length} hermanos en catálogo`
                      : 'Carga el archivo CSV de participantes'}
                  </p>
                  <Button
                    variant={paso2Completo ? 'ghost' : 'secondary'}
                    size="xs"
                    icon={Upload}
                    onClick={() => onNavigate?.('exportar')}
                    className="mt-3 w-full text-[11px]"
                  >
                    {paso2Completo ? 'Ver importador' : 'Ir a importar CSV →'}
                  </Button>
                </div>

                {/* Paso 3 */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    paso3Completo
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                      : 'bg-surface border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
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
                  <h3 className="text-xs font-medium text-text1">Subir primer EPUB mwb</h3>
                  <p className="text-[11px] text-text3 mt-0.5">
                    {paso3Completo
                      ? 'Programa S-140 cargado y listo'
                      : 'Importa la guía de actividades mensual'}
                  </p>
                  <Button
                    variant={paso3Completo ? 'ghost' : 'secondary'}
                    size="xs"
                    icon={BookOpen}
                    onClick={() => onNavigate?.('programa')}
                    className="mt-3 w-full text-[11px]"
                  >
                    {paso3Completo ? 'Ver programa' : 'Subir EPUB mwb →'}
                  </Button>
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
            <span className="text-xs font-medium">Próxima reunión</span>
            <CalendarDays className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-text1 tracking-tight truncate leading-tight pt-1">
            {proximaReunion.textoFormateado}
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-text3">Agenda semanal</span>
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

      {/* ── MODAL: EDITAR CONFIGURACIÓN (ONBOARDING) ── */}
      <Dialog
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        title="Configurar Congregación"
        size="md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-text2">
            Este nombre aparecerá en el encabezado oficial del formulario S-140 descargado y en la interfaz general.
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="accent"
              size="sm"
              loading={savingConfig}
              onClick={handleSaveConfig}
            >
              Guardar configuración
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
