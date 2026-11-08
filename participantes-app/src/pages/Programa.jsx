import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Music,
  BookOpen,
  Check,
  Trash2,
  Upload,
  FileDown,
  Pencil,
  Eye,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RefreshCw,
  X,
  Printer,
  Briefcase,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parsearEPUB, inferirTipoParteSMT } from '../lib/epubParser'
import { sugerirCandidatos, sugerirAyudante } from '../lib/asignacionesSugeridas'
import {
  PESO_TIPO,
  TIPO_PARTICIPACION,
  formatearIssueLegible,
  buildHistorialParaSemana,
  getEventoParaSemana,
  calcularEstadoSemana,
} from '../lib/conflictosRotacion'
import {
  formatRangoSemanaPrograma,
  getImpactoEventoSemana,
} from '../lib/fechas'
import {
  useSemanasQuery,
  usePartesQuery,
  useAsignacionesQuery,
  usePersonasQuery,
  useParticipacionesQuery,
} from '../core/queries/useAppQueries'
import { invalidateAppQueries, QUERY_KEYS } from '../core/queryClient'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { useEventosReunion } from '../hooks/useEventosReunion'
import { useConfiguracion } from '../hooks/useConfiguracion'
import Toast from '../components/Toast'
import { SkeletonPrograma } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import RevisarSemanaModal from '../components/programa/RevisarSemanaModal'
import TarjetaSemanaDesktop from '../environments/desktop/programa/TarjetaSemanaDesktop'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'

export default function Programa() {
  const { config } = useConfiguracion()
  const { eventos } = useEventosReunion()
  const { toast, showToast, success, error: toastError, dismiss } = useToast()
  const { confirm, confirmProps } = useConfirm()
  const navigate = useNavigate()

  // Datos desde la caché global de TanStack Query
  const {
    data: semanas = [],
    isLoading: loadingSemanas,
    error: errSemanas,
    refetch: refetchSemanas,
  } = useSemanasQuery()
  const {
    data: rawPartes = [],
    isLoading: loadingPartes,
    error: errPartes,
    refetch: refetchPartes,
  } = usePartesQuery()
  const {
    data: asignaciones = [],
    isLoading: loadingAsig,
    error: errAsig,
    refetch: refetchAsig,
  } = useAsignacionesQuery()
  const {
    data: allPersonas = [],
    isLoading: loadingPer,
    error: errPer,
    refetch: refetchPer,
  } = usePersonasQuery()
  const {
    data: rawHistorial = [],
    isLoading: loadingHis,
    error: errHis,
    refetch: refetchHis,
  } = useParticipacionesQuery()

  const personas = useMemo(
    () => allPersonas.filter(p => p.activo),
    [allPersonas]
  )

  const historial = useMemo(
    () => [...rawHistorial].sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || ''))),
    [rawHistorial]
  )

  const partes = useMemo(() => {
    return rawPartes.map(p => {
      if (p.seccion === 'SMT' && p.tipo_asignacion === 'SMT_DSC' && p.titulo) {
        const inferido = inferirTipoParteSMT(p.titulo)
        if (inferido.tipo !== 'SMT_DSC') {
          return {
            ...p,
            tipo_asignacion: inferido.tipo,
            requiere_ayudante: inferido.requiere_ayudante,
          }
        }
      }
      return p
    })
  }, [rawPartes])

  // Auto-reparación silenciosa en BD si hay partes SMT mal etiquetadas
  useEffect(() => {
    rawPartes.forEach(p => {
      if (p.seccion === 'SMT' && p.tipo_asignacion === 'SMT_DSC' && p.titulo) {
        const inferido = inferirTipoParteSMT(p.titulo)
        if (inferido.tipo !== 'SMT_DSC') {
          supabase
            .from('programa_partes')
            .update({
              tipo_asignacion: inferido.tipo,
              requiere_ayudante: inferido.requiere_ayudante,
            })
            .eq('id', p.id)
            .then()
        }
      }
    })
  }, [rawPartes])

  const loading = loadingSemanas || loadingPartes || loadingAsig || loadingPer || loadingHis
  const fetchError =
    errSemanas?.message ||
    errPartes?.message ||
    errAsig?.message ||
    errPer?.message ||
    errHis?.message ||
    null

  const congregacion = config?.nombreCongregacion || 'Congregacion del Recreo'

  const [uploading, setUploading] = useState(false)
  const [vistaTab, setVistaTab] = useState('semanas')
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [modoLectura, setModoLectura] = useState(() => {
    try {
      return localStorage.getItem('programa_modoLectura') === 'true'
    } catch {
      return false
    }
  })

  // Toast persistente de programa completo al 100%
  const [toastProgramaCompleto, setToastProgramaCompleto] = useState(null)
  const wasProgramCompleteRef = useRef(false)
  const isInitialLoadedRef = useRef(false)

  // Modal de Revisar y Aprobar Semana (Brief #29)
  const [semanaParaRevisar, setSemanaParaRevisar] = useState(null)
  const [isBatchSaving, setIsBatchSaving] = useState(false)

  // Flujo EPUB Automático (Brief #31)
  const [epubsDisponibles, setEpubsDisponibles] = useState([])
  const [nuevoEpubDisponible, setNuevoEpubDisponible] = useState(null)
  const [isSyncingEpubs, setIsSyncingEpubs] = useState(false)
  const [menuGuiasOpen, setMenuGuiasOpen] = useState(false)
  const menuGuiasRef = useRef(null)
  const [mostrarFabS140, setMostrarFabS140] = useState(false)
  const checkedEpubRef = useRef(false)

  const [menuS140TopOpen, setMenuS140TopOpen] = useState(false)
  const [menuS140FabOpen, setMenuS140FabOpen] = useState(false)
  const menuS140TopRef = useRef(null)
  const menuS140FabRef = useRef(null)
  const botonS140TopRef = useRef(null)

  const refreshPrograma = useCallback(() => {
    invalidateAppQueries([
      QUERY_KEYS.semanas,
      QUERY_KEYS.partes,
      QUERY_KEYS.asignaciones,
      QUERY_KEYS.participaciones,
    ])
  }, [])

  const retryFetch = useCallback(() => {
    refetchSemanas()
    refetchPartes()
    refetchAsig()
    refetchPer()
    refetchHis()
  }, [refetchSemanas, refetchPartes, refetchAsig, refetchPer, refetchHis])

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuGuiasRef.current && !menuGuiasRef.current.contains(event.target)) {
        setMenuGuiasOpen(false)
      }
      if (menuS140TopRef.current && !menuS140TopRef.current.contains(event.target)) {
        setMenuS140TopOpen(false)
      }
      if (menuS140FabRef.current && !menuS140FabRef.current.contains(event.target)) {
        setMenuS140FabOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Mostrar FAB flotante de Descargar S-140 al hacer scroll hacia abajo
  useEffect(() => {
    const mainEl = document.querySelector('main')

    function checkVisibility() {
      if (botonS140TopRef.current) {
        const rect = botonS140TopRef.current.getBoundingClientRect()
        if (rect.bottom < 65) {
          setMostrarFabS140(true)
          return
        }
      }
      const scrollPos = mainEl ? mainEl.scrollTop : (window.scrollY || document.documentElement.scrollTop)
      setMostrarFabS140(scrollPos > 150)
    }

    if (mainEl) {
      mainEl.addEventListener('scroll', checkVisibility, { passive: true })
    }
    window.addEventListener('scroll', checkVisibility, { passive: true, capture: true })

    let observer = null
    if (typeof IntersectionObserver !== 'undefined' && botonS140TopRef.current) {
      observer = new IntersectionObserver(
        ([entry]) => {
          setMostrarFabS140(!entry.isIntersecting)
        },
        { root: mainEl || null, threshold: 0.1 }
      )
      observer.observe(botonS140TopRef.current)
    }

    return () => {
      if (mainEl) mainEl.removeEventListener('scroll', checkVisibility)
      window.removeEventListener('scroll', checkVisibility, { capture: true })
      if (observer) observer.disconnect()
    }
  }, [semanas.length])

  useEffect(() => {
    try {
      localStorage.setItem('programa_modoLectura', String(modoLectura))
    } catch {
      // ignore storage errors
    }
  }, [modoLectura])

  // Detección de programa completado al 100% en la sesión activa
  const resumenProgresoPrograma = useMemo(() => {
    if (loading) return null
    let totalConfirmadasEnPrograma = 0
    let totalPartesEnPrograma = 0
    let semanasCompletadas = 0

    semanas.forEach(s => {
      const { esCompleta, confirmadas, totalPartes } = calcularEstadoSemana(
        s,
        partes,
        asignaciones,
        historial,
        eventos,
        config
      )
      totalConfirmadasEnPrograma += confirmadas
      totalPartesEnPrograma += totalPartes
      if (esCompleta) {
        semanasCompletadas++
      }
    })

    const isNowProgramComplete =
      semanas.length > 0 && semanasCompletadas === semanas.length

    return {
      isNowProgramComplete,
      totalSemanas: semanas.length,
      totalAsignaciones: totalConfirmadasEnPrograma,
      totalPartes: totalPartesEnPrograma,
    }
  }, [loading, semanas, partes, asignaciones, historial, eventos, config])

  useEffect(() => {
    if (!resumenProgresoPrograma) return
    const { isNowProgramComplete, totalSemanas, totalAsignaciones, totalPartes } =
      resumenProgresoPrograma

    if (!isInitialLoadedRef.current) {
      wasProgramCompleteRef.current = isNowProgramComplete
      isInitialLoadedRef.current = true
      return
    }

    const timer = setTimeout(() => {
      if (!wasProgramCompleteRef.current && isNowProgramComplete) {
        dismiss()
        setToastProgramaCompleto({
          totalSemanas,
          totalAsignaciones,
          totalPartes,
        })
      } else if (!isNowProgramComplete) {
        setToastProgramaCompleto(null)
      }
      wasProgramCompleteRef.current = isNowProgramComplete
    }, 0)

    return () => clearTimeout(timer)
  }, [resumenProgresoPrograma, dismiss])

  const handleToggleExpand = useCallback(semanaId => {
    setExpandedWeeks(prev => ({ ...prev, [semanaId]: !prev[semanaId] }))
  }, [])

  // Flujo EPUB Automático (Brief #31)
  const cargarEpubsDisponibles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('epub_disponibles')
        .select('*')
        .order('issue', { ascending: false })
      if (!error && data) {
        setEpubsDisponibles(data)
      }
    } catch (err) {
      console.warn('No se pudieron consultar epub_disponibles:', err)
    }
  }, [])

  const sincronizarGuiaEpub = useCallback(
    async (manual = false) => {
      if (manual) {
        setIsSyncingEpubs(true)
        showToast('Buscando guías en JW.org...')
      }
      try {
        const { data, error } = await supabase.functions.invoke('fetch-epub', {
          body: { sync: true },
        })

        if (!error && data) {
          if (data.epubs && data.epubs.length > 0) {
            setEpubsDisponibles(data.epubs)
          } else {
            await cargarEpubsDisponibles()
          }

          if (manual) {
            if (data.downloadedCount > 0) {
              success(`${data.downloadedCount} nueva(s) guía(s) descargada(s)`)
            } else {
              showToast('Las guías ya están sincronizadas')
            }
          }

          const latest = data.latestEpub
          if (latest) {
            const { data: semActuales } = await supabase
              .from('programa_semanas')
              .select('epub_filename, anio, mes')

            const yaCargado = semActuales?.some(
              s =>
                s.epub_filename === latest.filename ||
                (latest.issue &&
                  String(s.anio) === latest.issue.slice(0, 4) &&
                  ((latest.issue.endsWith('11') &&
                    (s.mes?.toLowerCase().includes('noviembre') ||
                      s.mes?.toLowerCase().includes('diciembre'))) ||
                    (latest.issue.endsWith('09') &&
                      (s.mes?.toLowerCase().includes('septiembre') ||
                        s.mes?.toLowerCase().includes('octubre'))) ||
                    (latest.issue.endsWith('07') &&
                      (s.mes?.toLowerCase().includes('julio') ||
                        s.mes?.toLowerCase().includes('agosto'))) ||
                    (latest.issue.endsWith('05') &&
                      (s.mes?.toLowerCase().includes('mayo') ||
                        s.mes?.toLowerCase().includes('junio'))) ||
                    (latest.issue.endsWith('03') &&
                      (s.mes?.toLowerCase().includes('marzo') ||
                        s.mes?.toLowerCase().includes('abril'))) ||
                    (latest.issue.endsWith('01') &&
                      (s.mes?.toLowerCase().includes('enero') ||
                        s.mes?.toLowerCase().includes('febrero')))))
            )
            setNuevoEpubDisponible(yaCargado ? null : latest)
          }
        } else if (error) {
          console.error('[fetch-epub error]', error)
          if (manual) toastError('Error al sincronizar: ' + (error.message || 'Error desconocido'))
        }
      } catch (err) {
        console.warn('Sincronización de EPUB omitida o error de red:', err)
        if (manual) toastError('Error de red al sincronizar guías')
      } finally {
        if (manual) setIsSyncingEpubs(false)
      }
    },
    [cargarEpubsDisponibles, showToast, success, toastError]
  )

  useEffect(() => {
    if (checkedEpubRef.current) return
    checkedEpubRef.current = true

    cargarEpubsDisponibles()
    sincronizarGuiaEpub(false)
  }, [cargarEpubsDisponibles, sincronizarGuiaEpub])

  async function procesarArchivoEPUB(fileOrBlob, filename) {
    if (semanas && semanas.length > 0) {
      const ok = await confirm({
        title: '¿Reemplazar el programa actual?',
        message: `Actualmente hay ${semanas.length} semanas registradas en el programa. Al importar una nueva Guía de Actividades se borrarán las semanas y asignaciones actuales de la vista de programa. (El historial de participaciones previas confirmadas se conservará).`,
        danger: true,
      })
      if (!ok) {
        return
      }
    }

    setUploading(true)
    showToast('Eliminando semanas anteriores y cargando las nuevas...')

    try {
      await supabase
        .from('programa_asignaciones')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      await supabase
        .from('programa_partes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      await supabase
        .from('programa_semanas')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      const semanasParsed = await parsearEPUB(fileOrBlob)
      if (!semanasParsed || semanasParsed.length === 0) {
        throw new Error('No se encontraron semanas en el archivo EPUB. Comprueba que sea una Guía de Actividades válida.')
      }

      let insertadas = 0
      const errores = []

      for (const s of semanasParsed) {
        const { data: semData, error: semError } = await supabase
          .from('programa_semanas')
          .insert({
            fecha_inicio: s.fecha_inicio,
            fecha_fin: s.fecha_fin,
            capitulo_biblico: s.capitulo_biblico,
            cancion_apertura: s.cancion_apertura,
            cancion_vc: s.cancion_vc,
            cancion_cierre: s.cancion_cierre,
            mes: s.fecha_inicio
              ? new Date(s.fecha_inicio + 'T12:00:00')
                  .toLocaleString('es-MX', { month: 'long' })
                  .replace(/^\w/, c => c.toUpperCase())
              : '',
            anio: s.fecha_inicio
              ? new Date(s.fecha_inicio + 'T12:00:00').getFullYear()
              : new Date().getFullYear(),
            epub_filename: filename,
          })
          .select()
          .single()

        if (semError || !semData) {
          console.error('Error insertando semana del EPUB:', semError)
          errores.push(`Semana ${s.fecha_inicio}: ${semError?.message || 'Error al insertar'}`)
          continue
        }

        const partesPayload = s.partes.map((p, i) => ({
          semana_id: semData.id,
          seccion: p.seccion,
          numero_parte: Number.isInteger(p.numero_parte) ? p.numero_parte : i + 1,
          titulo: p.titulo,
          duracion_min: p.duracion_min || null,
          tipo_asignacion: p.tipo,
          requiere_ayudante: p.requiere_ayudante || false,
          hora_inicio: p.hora_inicio || null,
          hora_fin: p.hora_fin || null,
        }))

        const { error: partesError } = await supabase.from('programa_partes').insert(partesPayload)
        if (partesError) {
          console.error('Error insertando partes del EPUB:', partesError)
          errores.push(`Partes de ${s.fecha_inicio}: ${partesError.message}`)
          continue
        }

        insertadas++
      }

      if (errores.length > 0) {
        toastError(`Se importaron ${insertadas} de ${semanasParsed.length} semanas. Hubo ${errores.length} errores:\n${errores.join(', ')}`)
      } else {
        success(`${insertadas} semanas importadas exitosamente`)
      }
      setNuevoEpubDisponible(null)
      refreshPrograma()
    } catch (err) {
      console.error(err)
      toastError('Error al procesar el EPUB: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleEPUB(e) {
    const file = e.target.files?.[0]
    if (!file) return
    await procesarArchivoEPUB(file, file.name)
    e.target.value = ''
  }

  async function handleSeleccionarEpubStorage(filename) {
    if (!filename) return
    setUploading(true)
    showToast('Descargando Guía EPUB desde Storage...')
    try {
      const { data: blob, error: downloadError } = await supabase
        .storage
        .from('epubs')
        .download(filename)

      if (downloadError) {
        throw new Error(downloadError.message || 'No se pudo descargar el archivo de Supabase Storage')
      }

      await procesarArchivoEPUB(blob, filename)
    } catch (err) {
      console.error('Error al descargar EPUB de Storage:', err)
      toastError('Error al descargar EPUB: ' + err.message)
      setUploading(false)
    }
  }

  async function handleAsignar(parteId, clave, rol, existingId) {
    if (!clave) {
      if (existingId) {
        const asigExistente = asignaciones.find(a => a.id === existingId)
        if (asigExistente?.participacion_id) {
          await supabase.from('participaciones').delete().eq('id', asigExistente.participacion_id)
        }
        await supabase.from('programa_asignaciones').delete().eq('id', existingId)
        refreshPrograma()
      }
      return
    }

    const payload = { parte_id: parteId, clave, rol, sugerido_por_app: false, confirmado: false }

    if (existingId) {
      await supabase.from('programa_asignaciones').update(payload).eq('id', existingId)
    } else {
      await supabase.from('programa_asignaciones').insert(payload)
    }

    refreshPrograma()
  }

  async function handleConfirmar(parteId, principal, ayudante) {
    if (!principal?.clave) return

    const parte = partes.find(p => p.id === parteId)
    if (!parte) return

    if (parte.tipo_asignacion === 'ORACION' || parte.tipo_asignacion === 'CONCLU') return
    if (principal.rol === 'ayudante') return

    const semana = semanas.find(s => s.id === parte.semana_id)
    if (!semana) return

    const impacto = getImpactoEventoSemana(
      semana,
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) {
      showToast('No se pueden confirmar asignaciones en una semana sin reunión ordinaria.')
      return
    }

    const persona = personas.find(p => p.clave === principal.clave)
    if (!persona) return

    const tipoParticipacion = TIPO_PARTICIPACION[parte.tipo_asignacion] || 'X'

    const principalPartRecord = principal.participacion_id
      ? historial.find(h => h.id === principal.participacion_id)
      : null
    const ayudantePartRecord = ayudante?.participacion_id
      ? historial.find(h => h.id === ayudante.participacion_id)
      : null

    const principalCambiado =
      !!principal.participacion_id &&
      principalPartRecord &&
      principalPartRecord.clave !== principal.clave
    const ayudanteCambiado =
      !!ayudante?.participacion_id &&
      ayudantePartRecord &&
      ayudantePartRecord.clave !== ayudante?.clave
    const ayudanteNuevo =
      parte.requiere_ayudante &&
      ayudante?.clave &&
      principal.participacion_id &&
      !ayudante?.participacion_id
    const ayudanteRemovido = parte.requiere_ayudante && !ayudante?.clave && ayudantePartRecord

    const esReconfirmacion =
      principalCambiado || ayudanteCambiado || ayudanteNuevo || ayudanteRemovido

    if (esReconfirmacion) {
      if (principal.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', principal.participacion_id)
      }
      if (ayudante?.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', ayudante.participacion_id)
      }

      const { data: partData } = await supabase
        .from('participaciones')
        .insert({
          clave: persona.clave,
          nombre: persona.nombre,
          lista: persona.lista,
          fecha: semana.fecha_inicio,
          mes: semana.mes,
          tipo: tipoParticipacion,
          peso: PESO_TIPO[tipoParticipacion] ?? 1,
          observaciones: null,
        })
        .select()
        .single()

      await supabase
        .from('programa_asignaciones')
        .update({
          confirmado: true,
          participacion_id: partData?.id || null,
        })
        .eq('id', principal.id)

      if (ayudante?.clave && ayudante?.id) {
        const personaAyu = personas.find(p => p.clave === ayudante.clave)
        if (personaAyu) {
          const { data: ayuData } = await supabase
            .from('participaciones')
            .insert({
              clave: personaAyu.clave,
              nombre: personaAyu.nombre,
              lista: personaAyu.lista,
              fecha: semana.fecha_inicio,
              mes: semana.mes,
              tipo: 'A',
              peso: 1,
              observaciones: 'Ayudante SMT',
            })
            .select()
            .single()

          await supabase
            .from('programa_asignaciones')
            .update({
              confirmado: true,
              participacion_id: ayuData?.id || null,
            })
            .eq('id', ayudante.id)
        }
      }

      success('Asignación reconfirmada')
      refreshPrograma()
      return
    }

    if (principal.confirmado) {
      if (principal.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', principal.participacion_id)
      }
      if (ayudante?.participacion_id) {
        await supabase.from('participaciones').delete().eq('id', ayudante.participacion_id)
      }

      await supabase
        .from('programa_asignaciones')
        .update({
          confirmado: false,
          participacion_id: null,
        })
        .eq('id', principal.id)

      if (ayudante?.id) {
        await supabase
          .from('programa_asignaciones')
          .update({
            confirmado: false,
            participacion_id: null,
          })
          .eq('id', ayudante.id)
      }

      showToast('Asignación desconfirmada')
      refreshPrograma()
      return
    }

    const { data: partData } = await supabase
      .from('participaciones')
      .insert({
        clave: persona.clave,
        nombre: persona.nombre,
        lista: persona.lista,
        fecha: semana.fecha_inicio,
        mes: semana.mes,
        tipo: tipoParticipacion,
        peso: PESO_TIPO[tipoParticipacion] ?? 1,
        observaciones: null,
      })
      .select()
      .single()

    await supabase
      .from('programa_asignaciones')
      .update({
        confirmado: true,
        participacion_id: partData?.id || null,
      })
      .eq('id', principal.id)

    if (ayudante?.clave && ayudante?.id) {
      const personaAyu = personas.find(p => p.clave === ayudante.clave)
      if (personaAyu) {
        const { data: ayuData } = await supabase
          .from('participaciones')
          .insert({
            clave: personaAyu.clave,
            nombre: personaAyu.nombre,
            lista: personaAyu.lista,
            fecha: semana.fecha_inicio,
            mes: semana.mes,
            tipo: 'A',
            peso: 1,
            observaciones: 'Ayudante SMT',
          })
          .select()
          .single()

        await supabase
          .from('programa_asignaciones')
          .update({
            confirmado: true,
            participacion_id: ayuData?.id || null,
          })
          .eq('id', ayudante.id)
      }
    }

    success('Asignación confirmada')
    refreshPrograma()
  }

  async function handleLimpiarAsignacionesSemana(semanaId) {
    const semana = semanas.find(s => s.id === semanaId)
    const impacto = semana
      ? getImpactoEventoSemana(semana, eventos, config?.diaReunionEntreSemana, config?.diaReunionFinSemana)
      : null

    const ok = await confirm({
      title: '¿Limpiar asignaciones de esta semana?',
      message: impacto?.tituloEvento
        ? `Debido a "${impacto.tituloEvento}", no se celebrará la reunión entre semana. Se eliminarán todas las asignaciones de esta semana y sus registros vinculados en el historial.`
        : 'Se eliminarán todas las asignaciones registradas para esta semana y sus registros vinculados en el historial.',
      danger: true,
      confirmText: 'Limpiar asignaciones',
    })
    if (!ok) return

    try {
      const partesSemana = partes.filter(p => p.semana_id === semanaId)
      const parteIds = partesSemana.map(p => p.id)
      const asigSemana = asignaciones.filter(a => parteIds.includes(a.parte_id))

      const participacionIds = asigSemana.map(a => a.participacion_id).filter(Boolean)
      if (participacionIds.length > 0) {
        await supabase.from('participaciones').delete().in('id', participacionIds)
      }

      const asigIds = asigSemana.map(a => a.id)
      if (asigIds.length > 0) {
        await supabase.from('programa_asignaciones').delete().in('id', asigIds)
      }

      showToast('Asignaciones de la semana descartadas correctamente.')
      refreshPrograma()
    } catch (err) {
      console.error('Error al limpiar asignaciones de la semana:', err)
      toastError('Error al limpiar asignaciones: ' + (err.message || 'Error de conexión'))
    }
  }

  async function handleConfirmarTodo(semanaId, partesSemana, asignacionesSemana) {
    const semana = semanas.find(s => s.id === semanaId)
    if (!semana) return

    const impacto = getImpactoEventoSemana(
      semana,
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) {
      showToast('No se pueden confirmar asignaciones en una semana sin reunión ordinaria.')
      return
    }

    let confirmadas = 0

    for (const parte of partesSemana) {
      if (
        parte.tipo_asignacion === 'ORACION' ||
        parte.tipo_asignacion === 'CONCLU' ||
        parte.tipo_asignacion === 'SMT_VACIO'
      ) {
        continue
      }

      const asigP = asignacionesSemana.find(a => a.parte_id === parte.id && a.rol === 'principal')
      const asigA = asignacionesSemana.find(a => a.parte_id === parte.id && a.rol === 'ayudante')

      if (!asigP?.clave) continue

      const persona = personas.find(p => p.clave === asigP.clave)
      if (!persona) continue

      const tipoParticipacion = TIPO_PARTICIPACION[parte.tipo_asignacion] || 'X'

      const pr = asigP.participacion_id
        ? historial.find(h => h.id === asigP.participacion_id)
        : null
      const ar = asigA?.participacion_id
        ? historial.find(h => h.id === asigA.participacion_id)
        : null
      const pCambio = !!asigP.participacion_id && pr && pr.clave !== asigP.clave
      const aCambio = !!asigA?.participacion_id && ar && ar.clave !== asigA?.clave
      const aNuevo =
        parte.requiere_ayudante && asigA?.clave && asigP.participacion_id && !asigA?.participacion_id
      const aRem = parte.requiere_ayudante && !asigA?.clave && ar

      const esReconfirmacion = pCambio || aCambio || aNuevo || aRem

      if (asigP.confirmado && !esReconfirmacion) continue

      if (esReconfirmacion) {
        if (asigP.participacion_id) {
          await supabase.from('participaciones').delete().eq('id', asigP.participacion_id)
        }
        if (asigA?.participacion_id) {
          await supabase.from('participaciones').delete().eq('id', asigA.participacion_id)
        }
      }

      const { data: partData } = await supabase
        .from('participaciones')
        .insert({
          clave: persona.clave,
          nombre: persona.nombre,
          lista: persona.lista,
          fecha: semana.fecha_inicio,
          mes: semana.mes,
          tipo: tipoParticipacion,
          peso: PESO_TIPO[tipoParticipacion] ?? 1,
          observaciones: null,
        })
        .select()
        .single()

      await supabase
        .from('programa_asignaciones')
        .update({
          confirmado: true,
          participacion_id: partData?.id || null,
        })
        .eq('id', asigP.id)

      if (asigA?.clave && asigA?.id) {
        const personaAyu = personas.find(p => p.clave === asigA.clave)
        if (personaAyu) {
          const { data: ayuData } = await supabase
            .from('participaciones')
            .insert({
              clave: personaAyu.clave,
              nombre: personaAyu.nombre,
              lista: personaAyu.lista,
              fecha: semana.fecha_inicio,
              mes: semana.mes,
              tipo: 'A',
              peso: 1,
              observaciones: 'Ayudante SMT',
            })
            .select()
            .single()

          await supabase
            .from('programa_asignaciones')
            .update({
              confirmado: true,
              participacion_id: ayuData?.id || null,
            })
            .eq('id', asigA.id)
        }
      }

      confirmadas++
    }

    if (confirmadas > 0) {
      success(`${confirmadas} asignaciones confirmadas en la semana`)
    }
    refreshPrograma()
  }

  const handleAsignarManual = useCallback(
    parteId => {
      if (!semanaParaRevisar) return
      const semanaId = semanaParaRevisar.id
      setSemanaParaRevisar(null)
      setExpandedWeeks(prev => ({ ...prev, [semanaId]: true }))
      setTimeout(() => {
        const el = document.getElementById(`parte-${parteId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('ring-2', 'ring-emerald-500', 'rounded-lg')
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-emerald-500', 'rounded-lg')
          }, 2500)
        }
      }, 100)
    },
    [semanaParaRevisar]
  )

  async function handleBatchConfirmar(semana, partesSeleccionadasIds) {
    if (!semana || !partesSeleccionadasIds.length) return

    const impacto = getImpactoEventoSemana(
      semana,
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) {
      showToast('No se pueden confirmar asignaciones en una semana sin reunión ordinaria.')
      return
    }

    setIsBatchSaving(true)

    try {
      const partesSemana = partes.filter(
        p => p.semana_id === semana.id && partesSeleccionadasIds.includes(p.id)
      )

      const participacionesAInsertar = []
      const asignacionesMap = []

      for (const parte of partesSemana) {
        const asigP = asignaciones.find(a => a.parte_id === parte.id && a.rol === 'principal')
        const asigA = asignaciones.find(a => a.parte_id === parte.id && a.rol === 'ayudante')

        if (!asigP?.clave) continue
        const personaP = personas.find(p => p.clave === asigP.clave)
        if (!personaP) continue

        const tipoParticipacion = TIPO_PARTICIPACION[parte.tipo_asignacion] || 'X'

        const pIdx = participacionesAInsertar.length
        participacionesAInsertar.push({
          clave: personaP.clave,
          nombre: personaP.nombre,
          lista: personaP.lista,
          fecha: semana.fecha_inicio,
          mes: semana.mes,
          tipo: tipoParticipacion,
          peso: PESO_TIPO[tipoParticipacion] ?? 1,
          observaciones: null,
        })
        asignacionesMap.push({ asigId: asigP.id, partInsertIdx: pIdx })

        if (parte.requiere_ayudante && asigA?.clave) {
          const personaA = personas.find(p => p.clave === asigA.clave)
          if (personaA) {
            const aIdx = participacionesAInsertar.length
            participacionesAInsertar.push({
              clave: personaA.clave,
              nombre: personaA.nombre,
              lista: personaA.lista,
              fecha: semana.fecha_inicio,
              mes: semana.mes,
              tipo: 'A',
              peso: 1,
              observaciones: 'Ayudante SMT',
            })
            asignacionesMap.push({ asigId: asigA.id, partInsertIdx: aIdx })
          }
        }
      }

      if (participacionesAInsertar.length === 0) {
        setIsBatchSaving(false)
        return
      }

      const { data: insertedParts, error: insertError } = await supabase
        .from('participaciones')
        .insert(participacionesAInsertar)
        .select()

      if (insertError) throw insertError

      const asignacionesUpdates = asignacionesMap.map(item => ({
        id: item.asigId,
        confirmado: true,
        participacion_id: insertedParts[item.partInsertIdx]?.id || null,
      }))

      const { error: updateError } = await supabase
        .from('programa_asignaciones')
        .upsert(asignacionesUpdates)

      if (updateError) throw updateError

      setSemanaParaRevisar(null)
      const totalConfirmadas = partesSeleccionadasIds.length
      success(`${totalConfirmadas} partes confirmadas`)

      const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']
      const partesContablesSemana = partes.filter(
        p => p.semana_id === semana.id && !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion)
      )
      const todasQuedanConfirmadas = partesContablesSemana.every(p => {
        const asig = asignaciones.find(a => a.parte_id === p.id && a.rol === 'principal')
        return partesSeleccionadasIds.includes(p.id) || asig?.confirmado
      })
      if (todasQuedanConfirmadas) {
        success('¡Semana completada al 100%!')
      }

      refreshPrograma()
    } catch (err) {
      console.error('[handleBatchConfirmar]', err)
      toastError('Error al confirmar asignaciones en lote: ' + err.message)
    } finally {
      setIsBatchSaving(false)
    }
  }

  async function handleCompletarConSugerencias(semanaId) {
    const semana = semanas.find(s => s.id === semanaId)
    if (!semana) return

    const impacto = getImpactoEventoSemana(
      semana,
      eventos,
      config?.diaReunionEntreSemana,
      config?.diaReunionFinSemana
    )
    if (impacto.cancelaEntreSemana) {
      showToast('No se pueden generar sugerencias para una semana sin reunión ordinaria.')
      return
    }

    const esVisita = impacto.esVisita

    const TIPOS_SOLO_VISUAL = [
      'SMT_VACIO',
      'ORACION',
      'CONCLU',
      ...(esVisita ? ['EBC_CON', 'LEBC'] : []),
      ...(esVisita && impacto.oracionVisitante !== false ? ['ORACION_C'] : []),
    ]
    const partesSemana = partes
      .filter(p => p.semana_id === semanaId && !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
      .sort((a, b) => (a.numero_parte || 0) - (b.numero_parte || 0))

    if (!partesSemana.length) {
      toastError('No hay partes asignables en esta semana')
      return
    }

    const asigSemana = asignaciones.filter(a => partesSemana.some(p => p.id === a.parte_id))
    const hayAsignadasNoConfirmadas = asigSemana.some(a => a.clave && !a.confirmado)

    if (hayAsignadasNoConfirmadas) {
      const ok = await confirm({
        title: '¿Completar semana con sugerencias?',
        message:
          'El motor asignará automáticamente candidatos para las partes pendientes. Las partes ya confirmadas se mantendrán intactas.',
        danger: false,
      })
      if (!ok) return
    }

    showToast('Generando sugerencias para la semana...')

    try {
      const historialSem = buildHistorialParaSemana(
        semanaId,
        semanas,
        partes,
        asignaciones,
        historial
      )
      const opcionesSem = { fechaSemana: semana.fecha_inicio }
      const yaAsignadosSemana = []

      partesSemana.forEach(p => {
        const asigP = asigSemana.find(a => a.parte_id === p.id && a.rol === 'principal')
        const asigA = asigSemana.find(a => a.parte_id === p.id && a.rol === 'ayudante')
        if (asigP?.confirmado && asigP.clave) {
          yaAsignadosSemana.push({ clave: asigP.clave, tipo: p.tipo_asignacion })
        }
        if (asigA?.confirmado && asigA.clave) {
          yaAsignadosSemana.push({ clave: asigA.clave, tipo: 'SMT_AYU' })
        }
      })

      const parteP = partesSemana.find(p => p.tipo_asignacion === 'P')
      let clavePresidente = null
      if (parteP) {
        const asigExistenteP = asigSemana.find(
          a => a.parte_id === parteP.id && a.rol === 'principal'
        )
        if (asigExistenteP?.confirmado && asigExistenteP.clave) {
          clavePresidente = asigExistenteP.clave
        }
      }

      const partesOrdenadas = [...partesSemana].sort((a, b) => {
        if (a.tipo_asignacion === 'P') return -1
        if (b.tipo_asignacion === 'P') return 1
        if (a.tipo_asignacion === 'ORACION_C') return 1
        if (b.tipo_asignacion === 'ORACION_C') return -1
        return (a.numero_parte || 0) - (b.numero_parte || 0)
      })

      const nuevasAsignaciones = []

      for (const parte of partesOrdenadas) {
        const asigP = asigSemana.find(a => a.parte_id === parte.id && a.rol === 'principal')
        const asigA = asigSemana.find(a => a.parte_id === parte.id && a.rol === 'ayudante')

        if (asigP?.confirmado) continue

        const tipo = parte.tipo_asignacion

        if (tipo === 'P') {
          const candidatos = sugerirCandidatos(
            'P',
            personas,
            historialSem,
            semana.mes,
            yaAsignadosSemana,
            opcionesSem
          )
          const elegido = candidatos[0]
          if (elegido) {
            clavePresidente = elegido.clave
            yaAsignadosSemana.push({ clave: elegido.clave, tipo: 'P' })
            nuevasAsignaciones.push({
              parte_id: parte.id,
              clave: elegido.clave,
              rol: 'principal',
              sugerido_por_app: true,
              confirmado: false,
            })
          }
        } else if (tipo === 'ORACION_C') {
          const exclude = [...yaAsignadosSemana]
          if (
            clavePresidente &&
            !exclude.some(item => (typeof item === 'string' ? item === clavePresidente : item.clave === clavePresidente && item.tipo === 'P'))
          ) {
            exclude.push({ clave: clavePresidente, tipo: 'P' })
          }
          const candidatos = sugerirCandidatos(
            'ORACION_C',
            personas,
            historialSem,
            semana.mes,
            exclude,
            opcionesSem
          )
          const elegido = candidatos[0]
          if (elegido) {
            yaAsignadosSemana.push({ clave: elegido.clave, tipo: 'ORACION_C' })
            nuevasAsignaciones.push({
              parte_id: parte.id,
              clave: elegido.clave,
              rol: 'principal',
              sugerido_por_app: true,
              confirmado: false,
            })
          }
        } else if (tipo === 'SMT_EST') {
          const candidatosTit = sugerirCandidatos(
            'SMT_EST',
            personas,
            historialSem,
            semana.mes,
            yaAsignadosSemana,
            opcionesSem
          )
          const titular = candidatosTit[0]
          if (titular) {
            yaAsignadosSemana.push({ clave: titular.clave, tipo: 'SMT_EST' })
            nuevasAsignaciones.push({
              parte_id: parte.id,
              clave: titular.clave,
              rol: 'principal',
              sugerido_por_app: true,
              confirmado: false,
            })

            if (parte.requiere_ayudante && !asigA?.confirmado) {
              const candidatosAyu = sugerirAyudante(
                titular.clave,
                personas,
                historialSem,
                semana.mes,
                yaAsignadosSemana,
                opcionesSem
              )
              const ayudante = candidatosAyu[0]
              if (ayudante) {
                yaAsignadosSemana.push({ clave: ayudante.clave, tipo: 'SMT_AYU' })
                nuevasAsignaciones.push({
                  parte_id: parte.id,
                  clave: ayudante.clave,
                  rol: 'ayudante',
                  sugerido_por_app: true,
                  confirmado: false,
                })
              }
            }
          }
        } else if (tipo === 'SMT_EXP') {
          const candidatosTit = sugerirCandidatos(
            'SMT_EXP',
            personas,
            historialSem,
            semana.mes,
            yaAsignadosSemana,
            opcionesSem
          )
          const titular = candidatosTit[0]
          if (titular) {
            yaAsignadosSemana.push({ clave: titular.clave, tipo: 'SMT_EXP' })
            nuevasAsignaciones.push({
              parte_id: parte.id,
              clave: titular.clave,
              rol: 'principal',
              sugerido_por_app: true,
              confirmado: false,
            })

            if (parte.requiere_ayudante && !asigA?.confirmado) {
              const tipoAyu = titular.sexo === 'M' ? 'SMT_EXP_M' : 'SMT_EXP_F'
              const candidatosAyu = sugerirCandidatos(
                tipoAyu,
                personas,
                historialSem,
                semana.mes,
                [
                  ...yaAsignadosSemana,
                  { clave: titular.clave, tipo: 'SMT_EXP', esTitularMismaParte: true },
                ],
                opcionesSem
              )
              const ayudante = candidatosAyu[0]
              if (ayudante) {
                yaAsignadosSemana.push({ clave: ayudante.clave, tipo: 'SMT_AYU' })
                nuevasAsignaciones.push({
                  parte_id: parte.id,
                  clave: ayudante.clave,
                  rol: 'ayudante',
                  sugerido_por_app: true,
                  confirmado: false,
                })
              }
            }
          }
        } else {
          const candidatos = sugerirCandidatos(
            tipo,
            personas,
            historialSem,
            semana.mes,
            yaAsignadosSemana,
            opcionesSem
          )
          const elegido = candidatos[0]
          if (elegido) {
            yaAsignadosSemana.push({ clave: elegido.clave, tipo })
            nuevasAsignaciones.push({
              parte_id: parte.id,
              clave: elegido.clave,
              rol: 'principal',
              sugerido_por_app: true,
              confirmado: false,
            })
          }
        }
      }

      if (!nuevasAsignaciones.length) {
        success('No hay nuevas sugerencias que aplicar')
        return
      }

      const updates = []
      const inserts = []

      for (const asig of nuevasAsignaciones) {
        const existing = asigSemana.find(
          a => a.parte_id === asig.parte_id && a.rol === asig.rol
        )
        if (existing) {
          if (!existing.confirmado) {
            updates.push({
              id: existing.id,
              parte_id: asig.parte_id,
              clave: asig.clave,
              rol: asig.rol,
              sugerido_por_app: true,
              confirmado: false,
            })
          }
        } else {
          inserts.push({
            parte_id: asig.parte_id,
            clave: asig.clave,
            rol: asig.rol,
            sugerido_por_app: true,
            confirmado: false,
          })
        }
      }

      if (updates.length > 0) {
        const { error: updErr } = await supabase.from('programa_asignaciones').upsert(updates)
        if (updErr) throw updErr
      }
      if (inserts.length > 0) {
        const { error: insErr } = await supabase.from('programa_asignaciones').insert(inserts)
        if (insErr) throw insErr
      }

      success('Sugerencias generadas para la semana')
      refreshPrograma()
    } catch (err) {
      console.error('[handleCompletarConSugerencias]', err)
      toastError('Error al generar sugerencias: ' + err.message)
    }
  }

  // Generar documento S-140 bajo demanda (Dynamic Import)
  async function handleGenerarDocx(modo = 'auto') {
    if (!semanas || semanas.length === 0) {
      toastError('No hay semanas en el programa para generar el documento S-140.')
      return
    }
    try {
      showToast(
        modo === 'clasico'
          ? 'Generando documento S-140 (Plantilla clásica)...'
          : 'Generando documento S-140...'
      )
      const { generarYDescargarS140, buildDatosDesdeSupabase } = await import('../lib/generarS140')
      const semanasData = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas, eventos, config)
      await generarYDescargarS140({
        congregacion,
        semanas: semanasData,
        config,
        modo,
      })
      success('S-140 descargado exitosamente')
    } catch (err) {
      console.error(err)
      toastError('Error al generar el S-140: ' + err.message)
    }
  }

  async function handleAbrirVistaS140() {
    setMenuS140TopOpen(false)
    setMenuS140FabOpen(false)
    const { buildDatosDesdeSupabase } = await import('../lib/generarS140')
    const semanasData = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas, eventos, config)
    navigate('/s140-preview', {
      state: {
        semanas: semanasData,
        congregacion,
        config,
      },
    })
  }

  async function handleEliminarSemana(semanaId) {
    const ok = await confirm({
      title: '¿Eliminar esta semana?',
      message: 'Se borrarán todas sus partes y asignaciones. Esta acción no se puede deshacer.',
      danger: true,
    })
    if (!ok) return

    try {
      const partesSem = partes.filter(p => p.semana_id === semanaId)
      const partesIds = partesSem.map(p => p.id)
      if (partesIds.length > 0) {
        await supabase.from('programa_asignaciones').delete().in('parte_id', partesIds)
        await supabase.from('programa_partes').delete().eq('semana_id', semanaId)
      }
      const { error: delSemErr } = await supabase.from('programa_semanas').delete().eq('id', semanaId)
      if (delSemErr) throw delSemErr

      setExpandedWeeks(prev => {
        const next = { ...prev }
        delete next[semanaId]
        return next
      })
      showToast('Semana eliminada')
      refreshPrograma()
    } catch (err) {
      console.error('Error al eliminar semana:', err)
      toastError('Error al eliminar semana: ' + (err?.message || 'Error de conexión'))
    }
  }

  if (loading && semanas.length === 0) {
    return (
      <div className="py-6">
        <SkeletonPrograma cards={4} />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <h3 className="text-base font-semibold text-text1">Error de carga</h3>
        <p className="text-xs text-text3 font-mono">{fetchError}</p>
        <Button variant="outline" size="sm" icon={RotateCcw} onClick={retryFetch}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* BANNER PERSISTENTE NUEVO EPUB DISPONIBLE */}
      {nuevoEpubDisponible && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 p-3.5 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/90 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600/10 dark:bg-blue-400/20 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-100">
                Nuevo EPUB disponible — Guía de Actividades {formatearIssueLegible(nuevoEpubDisponible.issue)}
              </p>
              <p className="text-[11px] text-blue-700/90 dark:text-blue-300/80">
                Obtenido automáticamente desde JW.org. Puedes aplicarlo directamente a la planificación o ignorarlo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="accent"
              size="sm"
              loading={uploading}
              onClick={async () => {
                const fn = nuevoEpubDisponible?.filename
                setNuevoEpubDisponible(null)
                if (fn) await handleSeleccionarEpubStorage(fn)
              }}
            >
              Usar este
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNuevoEpubDisponible(null)}
            >
              Ignorar
            </Button>
          </div>
        </div>
      )}

      {/* HEADER Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Programa S-140
            </h1>
            <Badge variant="neutral" size="sm">
              {semanas.length} semanas
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Planificación y asignaciones de la Guía de Actividades Vida y Ministerio Cristianos.
          </p>
        </div>

        {/* Toolbar de Acciones */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
            <button
              type="button"
              onClick={() => setVistaTab('semanas')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                vistaTab === 'semanas'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Por semana
            </button>
            <button
              type="button"
              onClick={() => setVistaTab('resumen')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                vistaTab === 'resumen'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Resumen
            </button>
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
            <button
              type="button"
              onClick={() => setModoLectura(false)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                !modoLectura
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Pencil className="w-3 h-3" />
              <span>Edición</span>
            </button>
            <button
              type="button"
              onClick={() => setModoLectura(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                modoLectura
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Lectura</span>
            </button>
          </div>

          {!modoLectura && (
            <div className="relative" ref={menuGuiasRef}>
              <input
                type="file"
                id="epubInput"
                accept=".epub"
                className="hidden"
                onChange={handleEPUB}
              />

              <Button
                variant="outline"
                size="md"
                disabled={uploading}
                onClick={() => setMenuGuiasOpen(prev => !prev)}
                className="flex items-center gap-1.5"
                title="Ver guías disponibles y opciones de carga"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Guías de actividades</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-text3 transition-transform duration-200 ${
                    menuGuiasOpen ? 'rotate-180' : ''
                  }`}
                />
              </Button>

              {menuGuiasOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-surface border border-zinc-200/90 dark:border-zinc-800/90 shadow-xl py-1.5 z-50 animate-fade-in text-xs">
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                    <span className="font-semibold text-text1 text-[11px] uppercase tracking-wider">
                      Guías disponibles
                    </span>
                    <button
                      type="button"
                      disabled={isSyncingEpubs}
                      onClick={e => {
                        e.stopPropagation()
                        sincronizarGuiaEpub(true)
                      }}
                      className="text-text3 hover:text-text1 p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Sincronizar desde JW.org"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isSyncingEpubs ? 'animate-spin text-emerald-600' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto px-1 space-y-0.5">
                    {epubsDisponibles.length === 0 ? (
                      <div className="px-3 py-3 text-center text-text3 text-[11px]">
                        No hay guías sincronizadas todavía
                      </div>
                    ) : (
                      epubsDisponibles.map(item => {
                        const esActiva =
                          semanas.length > 0 &&
                          semanas.some(s => s.epub_filename === item.filename)
                        return (
                          <button
                            key={item.id || item.issue}
                            type="button"
                            disabled={uploading}
                            onClick={async () => {
                              setMenuGuiasOpen(false)
                              await handleSeleccionarEpubStorage(item.filename)
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              esActiva
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-medium'
                                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70 text-text1'
                            }`}
                          >
                            <span className="truncate pr-2">
                              {formatearIssueLegible(item.issue)}
                            </span>
                            {esActiva ? (
                              <span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded-full">
                                <Check className="w-3 h-3" />
                                Activa
                              </span>
                            ) : null}
                          </button>
                        )
                      })
                    )}
                  </div>

                  <div className="mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 px-1 space-y-0.5">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => {
                        setMenuGuiasOpen(false)
                        document.getElementById('epubInput').click()
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-text2 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-text3" />
                      <span>Subir EPUB manualmente</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSyncingEpubs}
                      onClick={() => sincronizarGuiaEpub(true)}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-text2 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-text3 ${isSyncingEpubs ? 'animate-spin text-emerald-600' : ''}`}
                      />
                      <span>
                        {isSyncingEpubs
                          ? 'Buscando en JW.org...'
                          : 'Buscar actualizaciones en JW.org'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón Generar S-140 con menú desplegable */}
          <div className="relative" ref={menuS140TopRef}>
            <div className="inline-flex rounded-lg shadow-sm">
              <Button
                ref={botonS140TopRef}
                variant="accent"
                size="md"
                icon={Printer}
                disabled={!semanas.length}
                onClick={handleAbrirVistaS140}
                className="rounded-r-none border-r border-emerald-600/30"
                title="Abrir vista nativa y generar PDF"
              >
                Vista S-140 / PDF
              </Button>
              <Button
                variant="accent"
                size="md"
                disabled={!semanas.length}
                onClick={() => setMenuS140TopOpen(prev => !prev)}
                className="rounded-l-none px-2"
                title="Opciones de exportación S-140"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {menuS140TopOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1.5 z-50 animate-fade-in">
                <button
                  type="button"
                  onClick={handleAbrirVistaS140}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-text1">Vista PDF nativa</span>
                    <span className="text-[10px] text-text3 font-normal">Vectorial, 2 semanas por página</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuS140TopOpen(false)
                    handleGenerarDocx('auto')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left text-text2 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer mt-0.5"
                >
                  <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-text1">Descargar Word (.docx)</span>
                    <span className="text-[10px] text-text3 font-normal">Formato dinámico (2 sem. por pág.)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMenuS140TopOpen(false)
                    handleGenerarDocx('clasico')
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg text-left text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer mt-0.5"
                >
                  <FileDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-text2 text-[11px]">Plantilla clásica (Respaldo)</span>
                    <span className="text-[9.5px] text-text3 font-normal">Plantilla fija de 9 semanas</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VISTA POR SEMANAS */}
      {vistaTab === 'semanas' && (
        <div
          className={`space-y-4 relative transition-all duration-300 ${
            uploading ? 'pointer-events-none select-none' : ''
          }`}
        >
          {uploading && (
            <div className="absolute inset-0 z-30 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in min-h-[260px]">
              <div className="bg-surface/95 dark:bg-zinc-900/95 border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3.5 max-w-sm">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-emerald-600 dark:border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-text1">
                    Eliminando semanas anteriores y cargando las nuevas
                  </h4>
                  <p className="text-[11px] text-text3 leading-relaxed">
                    Preparando la base de datos y procesando la nueva Guía de Actividades...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className={`space-y-4 transition-opacity duration-200 ${
              uploading ? 'opacity-30 filter grayscale-[50%]' : ''
            }`}
          >
            {semanas.length === 0 ? (
              <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl py-12 px-6 shadow-2xs">
                <EmptyState
                  icon={Calendar}
                  title="Sin semanas del programa"
                  description="Aún no has importado el calendario de reuniones. Selecciona una Guía de Actividades disponible o sube el archivo EPUB (mwb) manualmente para comenzar."
                  action={
                    epubsDisponibles.length > 0 ? (
                      <Button
                        variant="accent"
                        size="md"
                        icon={BookOpen}
                        loading={uploading}
                        onClick={() => handleSeleccionarEpubStorage(epubsDisponibles[0].filename)}
                      >
                        Cargar {formatearIssueLegible(epubsDisponibles[0].issue)}
                      </Button>
                    ) : null
                  }
                  secondaryAction={
                    <Button
                      variant={epubsDisponibles.length > 0 ? 'outline' : 'accent'}
                      size="md"
                      icon={Upload}
                      loading={uploading}
                      onClick={() => document.getElementById('epubInput').click()}
                    >
                      Subir archivo EPUB mwb
                    </Button>
                  }
                />
              </div>
            ) : (
              semanas.map(s => {
                const partesSemana = partes.filter(p => p.semana_id === s.id)
                const asigSemana = asignaciones.filter(a =>
                  partesSemana.some(p => p.id === a.parte_id)
                )
                return (
                  <TarjetaSemanaDesktop
                    key={s.id}
                    semana={s}
                    partes={partesSemana}
                    asignaciones={asigSemana}
                    personas={personas}
                    historial={buildHistorialParaSemana(s.id, semanas, partes, asignaciones, historial)}
                    onAsignar={handleAsignar}
                    onConfirmar={handleConfirmar}
                    onConfirmarTodo={handleConfirmarTodo}
                    onEliminarSemana={handleEliminarSemana}
                    onLimpiarAsignaciones={handleLimpiarAsignacionesSemana}
                    expandida={!!expandedWeeks[s.id]}
                    onToggleExpand={() => handleToggleExpand(s.id)}
                    modoLectura={modoLectura}
                    onRevisarSemana={setSemanaParaRevisar}
                    onSugerirSemana={handleCompletarConSugerencias}
                    evento={getEventoParaSemana(s, eventos)}
                    impacto={getImpactoEventoSemana(s, eventos, config?.diaReunionEntreSemana, config?.diaReunionFinSemana)}
                    config={config}
                  />
                )
              })
            )}
          </div>
        </div>
      )}

      {/* VISTA RESUMEN MENSUAL */}
      {vistaTab === 'resumen' && (
        <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-max">
              <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-900/95 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 select-none">
                <tr>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider">
                    Semana
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider">
                    Lectura Bíblica
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    <span className="inline-flex items-center gap-1 justify-center">
                      <Music className="w-3 h-3 text-text3" /> Apertura
                    </span>
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    <span className="inline-flex items-center gap-1 justify-center">
                      <Music className="w-3 h-3 text-text3" /> Vida Cristiana
                    </span>
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    <span className="inline-flex items-center gap-1 justify-center">
                      <Music className="w-3 h-3 text-text3" /> Cierre
                    </span>
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    Partes
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-center">
                    Confirmadas
                  </th>
                  <th className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {semanas.map(s => {
                  const impacto = getImpactoEventoSemana(s, eventos, config?.diaReunionEntreSemana, config?.diaReunionFinSemana)
                  const partesSemana = partes.filter(p => p.semana_id === s.id)
                  const asigConf = asignaciones.filter(
                    a => partesSemana.some(p => p.id === a.parte_id) && a.confirmado
                  )
                  const completada =
                    impacto.cancelaEntreSemana ||
                    (asigConf.length === partesSemana.length && partesSemana.length > 0)

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text1 text-xs">
                          {formatRangoSemanaPrograma(s.fecha_inicio, s.fecha_fin)}
                        </div>
                        {impacto.cancelaEntreSemana ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                              <Calendar className="w-2.5 h-2.5" />
                              {impacto.tituloEvento}
                            </span>
                          </div>
                        ) : impacto.esVisita ? (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                              <Briefcase className="w-2.5 h-2.5" />
                              {impacto.esVisitaSC ? 'Visita SC' : 'Visita Sucursal'}
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-text2">{s.capitulo_biblico}</td>
                      <td className="px-3 py-3 font-mono text-center text-text3">
                        {s.cancion_apertura || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-text3">
                        {s.cancion_vc || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-text3">
                        {s.cancion_cierre || '—'}
                      </td>
                      <td className="px-3 py-3 font-mono text-center text-text2">
                        {partesSemana.length}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {impacto.cancelaEntreSemana ? (
                          <Badge variant="purple" size="xs">
                            Sin reunión
                          </Badge>
                        ) : (
                          <Badge variant={completada ? 'success' : 'neutral'} size="xs">
                            {asigConf.length}/{partesSemana.length}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="dangerGhost"
                          size="iconXs"
                          onClick={() => handleEliminarSemana(s.id)}
                          aria-label="Eliminar semana"
                          title="Eliminar semana"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TOAST PERSISTENTE AL COMPLETAR EL PROGRAMA AL 100% */}
      {toastProgramaCompleto && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-slide-up select-none">
          <div className="bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-surface/95 dark:to-zinc-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/25 rounded-2xl p-4 shadow-xl shadow-emerald-500/10 dark:shadow-emerald-950/30 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-text1">
                      Programa completado
                    </h4>
                    <Badge variant="success" size="xs">
                      100%
                    </Badge>
                  </div>
                  <p className="text-xs text-text2 font-medium mt-0.5 truncate">
                    {toastProgramaCompleto.totalSemanas} semanas programadas al 100%
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setToastProgramaCompleto(null)}
                className="text-text3 hover:text-text1 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                aria-label="Cerrar notificación"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium px-3 py-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">
                {toastProgramaCompleto.totalAsignaciones} asignaciones confirmadas en total
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setToastProgramaCompleto(null)}
                className="text-text3 hover:text-text1"
              >
                Cerrar
              </Button>
              <Button
                variant="accent"
                size="xs"
                icon={Printer}
                onClick={() => {
                  setToastProgramaCompleto(null)
                  handleAbrirVistaS140()
                }}
              >
                Ver S-140 / PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REVISIÓN Y APROBACIÓN DE SEMANA */}
      <RevisarSemanaModal
        isOpen={!!semanaParaRevisar}
        onClose={() => setSemanaParaRevisar(null)}
        semana={semanaParaRevisar}
        evento={getEventoParaSemana(semanaParaRevisar, eventos)}
        partes={partes}
        asignaciones={asignaciones}
        personas={personas}
        historial={
          semanaParaRevisar
            ? buildHistorialParaSemana(semanaParaRevisar.id, semanas, partes, asignaciones, historial)
            : historial
        }
        onConfirmarBatch={handleBatchConfirmar}
        onAsignarManual={handleAsignarManual}
        isBatchSaving={isBatchSaving}
      />

      {/* BOTÓN FLOTANTE S-140 AL HACER SCROLL */}
      {mostrarFabS140 && semanas.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-fade-in" ref={menuS140FabRef}>
          {menuS140FabOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-60 bg-surface dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 animate-fade-in">
              <button
                type="button"
                onClick={handleAbrirVistaS140}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-text1">Vista PDF nativa</span>
                  <span className="text-[10px] text-text3 font-normal">Vectorial, 2 semanas por pág.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuS140FabOpen(false)
                  handleGenerarDocx('auto')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left text-text2 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer mt-0.5"
              >
                <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-semibold text-text1">Descargar Word (.docx)</span>
                  <span className="text-[10px] text-text3 font-normal">Formato dinámico (2 sem. por pág.)</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuS140FabOpen(false)
                  handleGenerarDocx('clasico')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg text-left text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer mt-0.5"
              >
                <FileDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-text2 text-[11px]">Plantilla clásica (Respaldo)</span>
                  <span className="text-[9.5px] text-text3 font-normal">Plantilla fija de 9 semanas</span>
                </div>
              </button>
            </div>
          )}

          <div className="inline-flex items-center shadow-2xl rounded-full overflow-hidden">
            <button
              type="button"
              onClick={handleAbrirVistaS140}
              title="Abrir vista nativa S-140 y generar PDF"
              className="flex items-center gap-2 px-4 py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white text-xs font-semibold transition-all duration-200 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Vista S-140 / PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuS140FabOpen(prev => !prev)}
              title="Opciones de exportación S-140"
              className="px-2.5 py-3 bg-emerald-800 hover:bg-emerald-900 border-l border-emerald-600/50 text-white transition-all duration-200 cursor-pointer"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
