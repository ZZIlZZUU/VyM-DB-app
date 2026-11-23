import { useState, useEffect, useMemo, useRef } from 'react'
import {
  User,
  Shield,
  ClipboardList,
  History,
  Palette,
  SlidersHorizontal,
  Bell,
  Keyboard,
  Sun,
  Moon,
  Monitor,
  X,
  Check,
  LogOut,
  RotateCcw,
  ExternalLink,
  Users,
  Camera,
  Trash2,
  Copy,
  CalendarPlus,
  ArrowRight,
  Download,
  Upload,
  Database,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatFechaLegible, formatRangoSemanaLegible, getHoyLocalIso } from '../lib/fechas'
import { loadDismissedAlertIds, saveDismissedAlertIds, buildLogResumenCorto } from '../lib/homeAlertas'
import {
  getTablaLabel,
  sugerirPersonaParaUsuario,
  clasificarAsignacionesUsuario,
  getFechaReunionSemana,
  formatProximidadDias,
  loadDismissedPastAsignacionIds,
  saveDismissedPastAsignacionIds,
  buildAsignacionTextoRecordatorio,
  buildAsignacionIcs,
} from '../lib/auditoria'
import { uploadUserAvatar, removeUserAvatar } from '../lib/avatarUpload'
import { saveIdleTimeoutMinutes } from '../lib/seguridad'
import {
  KEYBIND_DEFINITIONS,
  loadKeybinds,
  saveKeybinds,
  resetKeybinds,
  getBindingKeysArray,
  parseSequenceBinding,
  captureEventToBinding,
  findKeybindConflict,
} from '../lib/keybinds'
import { HOME_WIDGETS_STORAGE_KEY, resetHomeLayout } from './home/homeWidgetsConfig'
import { invalidateAppQueries, QUERY_KEYS } from '../core/queryClient'
import {
  THEME_PRESETS,
  LIGHT_THEME_IDS,
  DARK_THEME_IDS,
  AVATAR_COLORS,
  getAvatarColorClasses,
  loadHomeAlertPrefs,
  saveHomeAlertPrefs,
  loadQuitarTitularSmtPref,
  saveQuitarTitularSmtPref,
  PROGRAMA_QUITAR_TITULAR_SMT_KEY,
  dispatchPreferencesUpdated,
} from '../lib/themes'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import { Select } from './ui/Select'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { EmptyState } from './ui/EmptyState'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'
import SeguridadPanel from './SeguridadPanel'

const SECTIONS = [
  {
    id: 'perfil',
    group: 'Mi Cuenta',
    label: 'Mi Perfil',
    icon: User,
    desc: 'Identidad visible, avatar, rol y ficha vinculada en el catálogo.',
  },
  {
    id: 'seguridad',
    group: 'Mi Cuenta',
    label: 'Seguridad y Acceso',
    icon: Shield,
    desc: '2FA TOTP, contraseña segura, cambio de correo, sesiones y auditoría.',
  },
  {
    id: 'asignaciones',
    group: 'Mi Cuenta',
    label: 'Mis Asignaciones',
    icon: ClipboardList,
    desc: 'Tus próximas partes programadas en el formulario S-140.',
  },
  {
    id: 'actividad',
    group: 'Mi Cuenta',
    label: 'Mi Actividad',
    icon: History,
    desc: 'Historial reciente de cambios realizados con tu cuenta.',
  },
  {
    id: 'apariencia',
    group: 'Preferencias de la App',
    label: 'Apariencia y Temas',
    icon: Palette,
    desc: 'Galería de 6 temas, densidad de interfaz y accesibilidad visual.',
  },
  {
    id: 'general',
    group: 'Preferencias de la App',
    label: 'General y Regional',
    icon: SlidersHorizontal,
    desc: 'Pantalla inicial, formato de fechas y comportamiento predeterminado.',
  },
  {
    id: 'notificaciones',
    group: 'Preferencias de la App',
    label: 'Notificaciones y Avisos',
    icon: Bell,
    desc: 'Controla qué alertas proactivas se muestran en tu Inicio.',
  },
  {
    id: 'atajos',
    group: 'Preferencias de la App',
    label: 'Atajos y Datos Locales',
    icon: Keyboard,
    desc: 'Combinaciones de teclado rápidas y mantenimiento del navegador.',
  },
]

const SECCION_DOT = {
  APERTURA: 'bg-accent',
  CIERRE: 'bg-accent',
  TB: 'bg-teal',
  SMT: 'bg-amber',
  VC: 'bg-rose',
}

function initials(email, nombre) {
  if (nombre && nombre.trim()) {
    return nombre
      .trim()
      .split(/\s+/)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }
  return (email || 'U').slice(0, 2).toUpperCase()
}

function ToggleSwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10.5 shrink-0 cursor-pointer rounded-full border transition-colors duration-150 ${
        checked
          ? 'bg-accent border-accent'
          : 'bg-surface-alt border-border2'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4.5 w-4.5 rounded-full shadow-xs transition-transform duration-150 mt-0.5 ${
          checked
            ? 'translate-x-5 bg-accent-fg'
            : 'translate-x-0.5 bg-surface'
        }`}
      />
    </button>
  )
}

function AvatarVisual({
  src,
  alt,
  fallbackText,
  boxClass,
  textClass = 'text-xs',
  avatarClasses,
  onError,
}) {
  if (src) {
    return (
      <div className={`${boxClass} border overflow-hidden shrink-0 ${avatarClasses}`}>
        <img src={src} alt={alt} onError={onError} className="w-full h-full object-cover" />
      </div>
    )
  }
  return (
    <div
      className={`${boxClass} border font-semibold flex items-center justify-center ${textClass} shrink-0 ${avatarClasses}`}
    >
      {fallbackText}
    </div>
  )
}

export default function PerfilDrawer({
  open,
  onClose,
  initialTab = 'perfil',
  user,
  rol,
  avatarUrl = null,
  config = {},
  eventos = [],
  onLogout,
  onUserUpdated,
  themeState,
  isCollapsed = false,
  onSetSidebarCollapsed,
  onNavigate,
  onOpenShortcutsHelp,
}) {
  const [activeTab, setActiveTab] = useState(() =>
    SECTIONS.some(s => s.id === initialTab) ? initialTab : 'perfil'
  )

  const [nombre, setNombre] = useState('')
  const [uaAvatarUrl, setUaAvatarUrl] = useState(null)
  const [avatarOverride, setAvatarOverride] = useState(undefined)
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  const [personasList, setPersonasList] = useState([])
  const [personaClaveGuardada, setPersonaClaveGuardada] = useState('')
  const [selectedPersonaClave, setSelectedPersonaClave] = useState('')
  const [savingVinculo, setSavingVinculo] = useState(false)
  const [savingPerfil, setSavingPerfil] = useState(false)

  const [asignaciones, setAsignaciones] = useState([])
  const [asigSubTab, setAsigSubTab] = useState('proximas')
  const [dismissedPastIds, setDismissedPastIds] = useState(() =>
    loadDismissedPastAsignacionIds(user?.email)
  )

  const [historial, setHistorial] = useState([])
  const [loadedEmail, setLoadedEmail] = useState(null)
  const [refreshingActivity, setRefreshingActivity] = useState(false)
  const [activityFilter, setActivityFilter] = useState('ALL')

  const [prefVistaDefault, setPrefVistaDefault] = useState(
    () => localStorage.getItem('pref_vista_default') || 'home'
  )
  const [prefFormatoFecha, setPrefFormatoFecha] = useState(
    () => localStorage.getItem('pref_formato_fecha') || 'dd/mm/yyyy'
  )
  const [programaModoLectura, setProgramaModoLectura] = useState(
    () => localStorage.getItem('programa_modoLectura') === 'true'
  )
  const [programaQuitarTitularSmt, setProgramaQuitarTitularSmt] = useState(
    () => loadQuitarTitularSmtPref()
  )
  useEffect(() => {
    function handleExternalPrefs(e) {
      if (e?.detail?.programa_quitarTitularSmt) {
        setProgramaQuitarTitularSmt(e.detail.programa_quitarTitularSmt)
      } else if (e?.detail?.reset_all) {
        setProgramaQuitarTitularSmt('preguntar')
      }
    }
    window.addEventListener('preferences-updated', handleExternalPrefs)
    return () => window.removeEventListener('preferences-updated', handleExternalPrefs)
  }, [])
  const [registrosPageSize, setRegistrosPageSize] = useState(
    () => localStorage.getItem('registros_pageSize') || '50'
  )
  const [alertPrefs, setAlertPrefs] = useState(() => loadHomeAlertPrefs())
  const [dismissedCount, setDismissedCount] = useState(() => loadDismissedAlertIds().length)

  const [keybinds, setKeybinds] = useState(() => loadKeybinds())
  const [recordingActionId, setRecordingActionId] = useState(null)
  const [keybindError, setKeybindError] = useState('')
  const importPrefsInputRef = useRef(null)

  const { toast, showToast, success, error } = useToast()
  const { confirm, confirmProps } = useConfirm()

  const {
    themeId = 'light-calido',
    polarityPref = 'light',
    selectTheme,
    setPolarity,
    density = 'comfortable',
    setDensity,
    fontSize = 'normal',
    setFontSize,
    reduceMotion = false,
    setReduceMotion,
    avatarColor = 'accent',
    setAvatarColor,
    resetVisualPrefs,
  } = themeState || {}

  const loadingRemote = Boolean(open && user?.email && loadedEmail !== user.email)

  // Cargar datos de cuenta, catálogo personas, asignaciones e historial al abrir
  useEffect(() => {
    if (!open || !user?.email) return undefined
    let ignore = false

    async function loadUserContext() {
      const email = user.email
      try {
        const [uaRes, histRes, persRes] = await Promise.all([
          supabase
            .from('usuarios_autorizados')
            .select('*')
            .eq('email', email)
            .single(),
          supabase
            .from('historial_cambios')
            .select('*')
            .ilike('usuario_email', email)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('personas')
            .select('clave, nombre, lista, estatus, activo')
            .order('nombre'),
        ])

        if (ignore) return
        const resolvedName = uaRes.data?.nombre || ''
        const explicitClave = uaRes.data?.persona_clave || ''
        const catalogoPersonas = persRes.data || []

        if (resolvedName) setNombre(resolvedName)
        setUaAvatarUrl(uaRes.data?.avatar_url || null)
        setDismissedPastIds(loadDismissedPastAsignacionIds(email))
        setPersonasList(catalogoPersonas)
        setPersonaClaveGuardada(explicitClave)
        setHistorial(histRes.data || [])

        const explicita = explicitClave
          ? catalogoPersonas.find(p => p.clave === explicitClave) || null
          : null
        const sugerida = !explicita
          ? sugerirPersonaParaUsuario(catalogoPersonas, resolvedName, email)
          : null
        const targetPersona = explicita || sugerida
        setSelectedPersonaClave(explicita ? explicita.clave : '')

        if (targetPersona?.clave) {
          const { data: asig } = await supabase
            .from('programa_asignaciones')
            .select(`
              id, rol, confirmado,
              programa_partes (
                seccion, titulo, tipo_asignacion, duracion_min,
                programa_semanas ( id, fecha_inicio, fecha_fin, capitulo_biblico )
              )
            `)
            .eq('clave', targetPersona.clave)
            .order('id', { ascending: false })
            .limit(50)

          if (ignore) return
          const validas = (asig || []).filter(
            a => a.programa_partes && a.programa_partes.programa_semanas
          )
          setAsignaciones(validas)
        } else {
          setAsignaciones([])
        }
      } catch {
        if (!ignore) {
          setAsignaciones([])
          setHistorial([])
        }
      } finally {
        if (!ignore) {
          setLoadedEmail(email)
        }
      }
    }

    loadUserContext()
    return () => {
      ignore = true
    }
  }, [open, user?.email])

  // Grabación de atajo personalizado en fase capture mientras esté activo
  useEffect(() => {
    if (!open || !recordingActionId || activeTab !== 'atajos') return undefined
    const def = KEYBIND_DEFINITIONS.find(d => d.id === recordingActionId)
    if (!def) return undefined

    document.body.dataset.recordingKeybind = 'true'

    function onCaptureKey(e) {
      e.preventDefault()
      e.stopPropagation()

      const res = captureEventToBinding(e, { group: def.group })
      if (res.cancel) {
        setRecordingActionId(null)
        setKeybindError('')
        return
      }
      if (res.ignore) return
      if (res.error) {
        setKeybindError(res.error)
        return
      }

      const conflict = findKeybindConflict(res.binding, recordingActionId, keybinds)
      if (conflict) {
        setKeybindError(`Combinación en uso por "${conflict.label}". Elige otra.`)
        return
      }

      const saved = saveKeybinds({ ...keybinds, [recordingActionId]: res.binding })
      setKeybinds(saved)
      setRecordingActionId(null)
      setKeybindError('')
      success(`Atajo para "${def.label}" actualizado`)
    }

    window.addEventListener('keydown', onCaptureKey, true)
    return () => {
      delete document.body.dataset.recordingKeybind
      window.removeEventListener('keydown', onCaptureKey, true)
    }
  }, [open, activeTab, recordingActionId, keybinds, success])

  // Bloquear scroll de fondo y cerrar con Escape cuando no hay ConfirmDialog ni grabador encima
  useEffect(() => {
    if (!open) return undefined
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(e) {
      if (e.key === 'Escape' && !confirmProps.open && !recordingActionId) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose, confirmProps.open, recordingActionId])

  const filteredHistorial = useMemo(() => {
    if (activityFilter === 'ALL') return historial
    return historial.filter(h => h.operacion === activityFilter)
  }, [historial, activityFilter])

  const personaExplicita = useMemo(
    () => (personaClaveGuardada ? personasList.find(p => p.clave === personaClaveGuardada) || null : null),
    [personaClaveGuardada, personasList]
  )

  const personaSugerida = useMemo(
    () => (personaExplicita ? null : sugerirPersonaParaUsuario(personasList, nombre, user?.email)),
    [personaExplicita, personasList, nombre, user?.email]
  )

  const personaVinculada = personaExplicita || personaSugerida

  const horarioOpts = useMemo(
    () => ({
      diaReunionEntreSemana: config?.diaReunionEntreSemana || 'Martes',
      eventos: Array.isArray(eventos) ? eventos : [],
    }),
    [config?.diaReunionEntreSemana, eventos]
  )

  const { proximas: asignacionesProximas, pasadas: asignacionesPasadas } = useMemo(
    () => clasificarAsignacionesUsuario(asignaciones, getHoyLocalIso(), horarioOpts),
    [asignaciones, horarioOpts]
  )

  const dismissedSet = useMemo(() => new Set(dismissedPastIds), [dismissedPastIds])
  const asignacionesPasadasVisibles = useMemo(
    () => asignacionesPasadas.filter(a => !dismissedSet.has(String(a.id))),
    [asignacionesPasadas, dismissedSet]
  )
  const dismissedPasadasCount = asignacionesPasadas.length - asignacionesPasadasVisibles.length

  const effectiveAvatarUrl =
    avatarOverride !== undefined
      ? avatarOverride
      : avatarUrl || user?.user_metadata?.avatar_url || uaAvatarUrl || null
  const showAvatarPhoto = Boolean(effectiveAvatarUrl && failedAvatarUrl !== effectiveAvatarUrl)

  if (!open) return null

  const currentSection = SECTIONS.find(s => s.id === activeTab) || SECTIONS[0]
  const avatarClasses = getAvatarColorClasses(avatarColor)
  const displayName = nombre || user?.email?.split('@')[0] || 'Usuario'
  const modifiedKeybindsCount = KEYBIND_DEFINITIONS.filter(
    def => keybinds[def.id] && keybinds[def.id] !== def.defaultBinding
  ).length

  async function handleAvatarFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploadingAvatar(true)
    try {
      const res = await uploadUserAvatar({ supabase, user, file })
      setFailedAvatarUrl(null)
      setAvatarOverride(res.avatarUrl)
      await onUserUpdated?.()
      success(
        res.storageFallback
          ? 'Foto de perfil guardada en tu sesión'
          : 'Foto de perfil actualizada correctamente'
      )
    } catch (err) {
      error(err?.message || 'No se pudo actualizar la foto de perfil.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleRemoveAvatar() {
    const ok = await confirm({
      title: '¿Quitar foto de perfil?',
      message: 'Se volverán a mostrar tus iniciales con el color de avatar seleccionado.',
    })
    if (!ok) return

    setUploadingAvatar(true)
    try {
      await removeUserAvatar({ supabase, user })
      setFailedAvatarUrl(null)
      setAvatarOverride(null)
      await onUserUpdated?.()
      success('Foto de perfil eliminada')
    } catch (err) {
      error(err?.message || 'No se pudo eliminar la foto de perfil.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  function handleDismissPastAsig(id) {
    const strId = String(id)
    if (dismissedSet.has(strId)) return
    const next = saveDismissedPastAsignacionIds(user?.email, [...dismissedPastIds, strId])
    setDismissedPastIds(next)
    success('Asignación pasada descartada de la lista')
  }

  function handleDismissAllPastAsig() {
    const allIds = [...dismissedPastIds, ...asignacionesPasadas.map(a => String(a.id))]
    const next = saveDismissedPastAsignacionIds(user?.email, allIds)
    setDismissedPastIds(next)
    success('Asignaciones pasadas descartadas')
  }

  function handleRestorePastAsigs() {
    const next = saveDismissedPastAsignacionIds(user?.email, [])
    setDismissedPastIds(next)
    success('Asignaciones pasadas restauradas')
  }

  async function handleCopyAsigTexto(asig, fechaReunion) {
    const texto = buildAsignacionTextoRecordatorio(asig, fechaReunion)
    try {
      await navigator.clipboard.writeText(texto)
      success('Detalles de asignación copiados al portapapeles')
    } catch {
      error('No se pudo copiar automáticamente al portapapeles')
    }
  }

  function handleDownloadAsigIcs(asig, fechaReunion) {
    const ics = buildAsignacionIcs(asig, fechaReunion, {
      horaReunion: config?.horaReunionEntreSemana || '19:30',
    })
    if (!ics) {
      error('No se pudo generar el evento de calendario')
      return
    }
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `asignacion-${fechaReunion || 'reunion'}.ics`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    success('Evento .ics descargado para tu calendario')
  }

  function handleResetSingleKeybind(id) {
    const next = resetKeybinds(id)
    setKeybinds(next)
    if (recordingActionId === id) {
      setRecordingActionId(null)
      setKeybindError('')
    }
    success('Atajo restablecido a su valor predeterminado')
  }

  function handleResetAllKeybinds() {
    const next = resetKeybinds()
    setKeybinds(next)
    setRecordingActionId(null)
    setKeybindError('')
    success('Todos los atajos fueron restablecidos')
  }

  function handleExportPrefs() {
    let widgetsLayout = null
    try {
      const rawLayout = localStorage.getItem(HOME_WIDGETS_STORAGE_KEY)
      if (rawLayout) widgetsLayout = JSON.parse(rawLayout)
    } catch {
      widgetsLayout = null
    }

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'VyM-DB-app',
      preferences: {
        themeId,
        polarityPref,
        density,
        fontSize,
        reduceMotion,
        avatarColor,
        prefVistaDefault,
        prefFormatoFecha,
        programaModoLectura,
        programaQuitarTitularSmt,
        registrosPageSize,
        alertPrefs,
        sidebarCollapsed: isCollapsed,
        keybinds,
        widgetsLayout,
      },
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vym-preferencias-${getHoyLocalIso()}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    success('Preferencias exportadas a archivo JSON')
  }

  async function handleImportPrefsFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const rawText = await file.text()
      const parsed = JSON.parse(rawText)
      const p = parsed?.preferences
      if (!p || typeof p !== 'object') {
        throw new Error('Archivo de preferencias inválido.')
      }

      if (typeof p.polarityPref === 'string') setPolarity?.(p.polarityPref)
      if (typeof p.themeId === 'string' && THEME_PRESETS[p.themeId]) selectTheme?.(p.themeId)
      if (p.density === 'compact' || p.density === 'comfortable') setDensity?.(p.density)
      if (p.fontSize === 'normal' || p.fontSize === 'large') setFontSize?.(p.fontSize)
      if (typeof p.reduceMotion === 'boolean') setReduceMotion?.(p.reduceMotion)
      if (typeof p.avatarColor === 'string') setAvatarColor?.(p.avatarColor)

      if (typeof p.prefVistaDefault === 'string') {
        setPrefVistaDefault(p.prefVistaDefault)
        localStorage.setItem('pref_vista_default', p.prefVistaDefault)
      }
      if (typeof p.prefFormatoFecha === 'string') {
        setPrefFormatoFecha(p.prefFormatoFecha)
        localStorage.setItem('pref_formato_fecha', p.prefFormatoFecha)
      }
      if (typeof p.programaModoLectura === 'boolean') {
        setProgramaModoLectura(p.programaModoLectura)
        localStorage.setItem('programa_modoLectura', String(p.programaModoLectura))
      }
      if (typeof p.programaQuitarTitularSmt === 'string') {
        const normalized = saveQuitarTitularSmtPref(p.programaQuitarTitularSmt)
        setProgramaQuitarTitularSmt(normalized)
      }
      if (p.registrosPageSize) {
        setRegistrosPageSize(String(p.registrosPageSize))
        localStorage.setItem('registros_pageSize', String(p.registrosPageSize))
      }
      if (p.alertPrefs && typeof p.alertPrefs === 'object') {
        setAlertPrefs(saveHomeAlertPrefs(p.alertPrefs))
      }
      if (typeof p.sidebarCollapsed === 'boolean') {
        onSetSidebarCollapsed?.(p.sidebarCollapsed)
      }
      if (p.keybinds && typeof p.keybinds === 'object') {
        setKeybinds(saveKeybinds(p.keybinds))
      }
      if (p.widgetsLayout) {
        localStorage.setItem(HOME_WIDGETS_STORAGE_KEY, JSON.stringify(p.widgetsLayout))
      }

      dispatchPreferencesUpdated({ imported_prefs: true })
      success('Preferencias importadas y aplicadas correctamente')
    } catch (err) {
      error(err?.message || 'No se pudo leer el archivo JSON de preferencias.')
    }
  }

  function handleClearLocalCache() {
    localStorage.removeItem('app_config_cache')
    localStorage.removeItem('app_eventos_cache')
    invalidateAppQueries([QUERY_KEYS.configuracion, QUERY_KEYS.eventosReunion])
    success('Caché local limpia. Datos sincronizados nuevamente.')
  }

  function handleVistaDefaultChange(val) {
    setPrefVistaDefault(val)
    localStorage.setItem('pref_vista_default', val)
    dispatchPreferencesUpdated({ pref_vista_default: val })
    success('Vista inicial por defecto guardada')
  }

  function handleFormatoFechaChange(val) {
    setPrefFormatoFecha(val)
    localStorage.setItem('pref_formato_fecha', val)
    dispatchPreferencesUpdated({ pref_formato_fecha: val })
    success('Formato de fecha actualizado')
  }

  function handleProgramaModoLecturaToggle(next) {
    setProgramaModoLectura(next)
    localStorage.setItem('programa_modoLectura', String(next))
    dispatchPreferencesUpdated({ programa_modoLectura: next })
    success(next ? 'Programa S-140 abrirá en modo lectura' : 'Programa S-140 abrirá en modo edición')
  }

  function handleProgramaQuitarTitularSmtChange(val) {
    const normalized = saveQuitarTitularSmtPref(val)
    setProgramaQuitarTitularSmt(normalized)
    dispatchPreferencesUpdated({ programa_quitarTitularSmt: normalized })
    const msgMap = {
      preguntar: 'Se preguntará qué quitar al desasignar un titular SMT',
      ambos: 'Al quitar un titular SMT se quitará también su ayudante',
      solo_titular: 'Al quitar un titular SMT se conservará su ayudante',
    }
    success(msgMap[normalized] || 'Preferencia actualizada')
  }

  function handleRegistrosPageSizeChange(val) {
    setRegistrosPageSize(val)
    localStorage.setItem('registros_pageSize', String(val))
    dispatchPreferencesUpdated({ registros_pageSize: Number(val) })
    success(`Historial configurado a ${val} registros por página`)
  }

  function handleAlertPrefChange(key, nextVal) {
    const next = saveHomeAlertPrefs({ ...alertPrefs, [key]: nextVal })
    setAlertPrefs(next)
    dispatchPreferencesUpdated({ pref_home_alerts: next })
  }

  function handleRestoreAlerts() {
    saveDismissedAlertIds([])
    setDismissedCount(0)
    dispatchPreferencesUpdated({ dismissed_alerts_reset: true })
    success('Avisos descartados restaurados en Inicio')
  }

  async function handleResetWidgetsLayout() {
    const ok = await confirm({
      title: '¿Restablecer diseño del Inicio?',
      message: 'Los widgets de la pantalla principal volverán a su posición y tamaño originales.',
    })
    if (!ok) return
    resetHomeLayout()
    dispatchPreferencesUpdated({ home_layout_reset: true })
    success('Diseño de widgets restablecido')
  }

  async function handleResetAllPrefs() {
    const ok = await confirm({
      title: '¿Restablecer todas las preferencias?',
      message: 'Se restaurará el tema Cálido, la densidad cómoda y los ajustes locales de este navegador.',
      danger: true,
    })
    if (!ok) return
    resetVisualPrefs?.()
    localStorage.removeItem('pref_vista_default')
    localStorage.removeItem('pref_formato_fecha')
    localStorage.removeItem('programa_modoLectura')
    localStorage.removeItem(PROGRAMA_QUITAR_TITULAR_SMT_KEY)
    localStorage.removeItem('registros_pageSize')
    localStorage.removeItem('pref_home_alerts')
    setPrefVistaDefault('home')
    setPrefFormatoFecha('dd/mm/yyyy')
    setProgramaModoLectura(false)
    setProgramaQuitarTitularSmt('preguntar')
    setRegistrosPageSize('50')
    setAlertPrefs(saveHomeAlertPrefs({ semanasIncompletas: true, personasInactivas: true, epubDisponible: true }))
    setKeybinds(resetKeybinds())
    saveIdleTimeoutMinutes(0)
    setRecordingActionId(null)
    setKeybindError('')
    onSetSidebarCollapsed?.(false)
    dispatchPreferencesUpdated({ reset_all: true })
    success('Preferencias restablecidas a valores de fábrica')
  }

  async function loadAsignacionesForClave(clave) {
    if (!clave) {
      setAsignaciones([])
      return
    }
    const { data: asig } = await supabase
      .from('programa_asignaciones')
      .select(`
        id, rol, confirmado,
        programa_partes (
          seccion, titulo, tipo_asignacion, duracion_min,
          programa_semanas ( id, fecha_inicio, fecha_fin, capitulo_biblico )
        )
      `)
      .eq('clave', clave)
      .order('id', { ascending: false })
      .limit(50)

    const validas = (asig || []).filter(
      a => a.programa_partes && a.programa_partes.programa_semanas
    )
    setAsignaciones(validas)
  }

  async function handleSaveNombre(e) {
    if (e) e.preventDefault()
    if (!user?.email) return
    const trimmed = nombre.trim()
    if (!trimmed) {
      error('El nombre visible no puede estar vacío.')
      return
    }
    setSavingPerfil(true)
    const { error: err } = await supabase
      .from('usuarios_autorizados')
      .update({ nombre: trimmed })
      .eq('email', user.email)

    setSavingPerfil(false)
    if (err) {
      error(err.message || 'Error al guardar el nombre')
    } else {
      setNombre(trimmed)
      invalidateAppQueries([QUERY_KEYS.usuarios])
      success('Nombre visible actualizado')
      onUserUpdated?.()
    }
  }

  async function handleSaveVinculoPersona(claveOverride) {
    if (!user?.email) return
    const claveTarget = (claveOverride !== undefined ? claveOverride : selectedPersonaClave) || null
    setSavingVinculo(true)

    const { error: err } = await supabase
      .from('usuarios_autorizados')
      .update({ persona_clave: claveTarget })
      .eq('email', user.email)

    setSavingVinculo(false)
    if (err) {
      if (err.code === '42703' || /persona_clave/i.test(err.message || '')) {
        showToast(
          'Aplica la migración SQL 20261119_auditoria_usuario_real.sql para guardar el vínculo permanente.',
          'warning',
          5500
        )
      } else {
        error(err.message || 'Error al actualizar el vínculo con participante')
      }
      return
    }

    setPersonaClaveGuardada(claveTarget || '')
    setSelectedPersonaClave(claveTarget || '')
    invalidateAppQueries([QUERY_KEYS.usuarios])
    await loadAsignacionesForClave(claveTarget)
    success(claveTarget ? 'Ficha de participante vinculada' : 'Vínculo de participante removido')
  }

  async function handleRefreshActividad() {
    if (!user?.email) return
    setRefreshingActivity(true)
    try {
      const { data } = await supabase
        .from('historial_cambios')
        .select('*')
        .ilike('usuario_email', user.email)
        .order('created_at', { ascending: false })
        .limit(20)
      setHistorial(data || [])
    } finally {
      setRefreshingActivity(false)
    }
  }

  function renderThemeCards(ids) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {ids.map(id => {
          const preset = THEME_PRESETS[id]
          if (!preset) return null
          const isActive = themeId === preset.id
          const p = preset.preview

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => selectTheme?.(preset.id)}
              className={`p-2.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer bg-surface ${
                isActive
                  ? 'border-accent ring-2 ring-accent-muted-bg shadow-xs'
                  : 'border-border hover:border-border2'
              }`}
            >
              {/* Mini preview swatch */}
              <div
                className="h-12 rounded-lg p-1.5 flex flex-col justify-between border"
                style={{ backgroundColor: p.bg, borderColor: p.border }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.text1 }} />
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.text3 }} />
                  </div>
                  <span className="w-5 h-1.5 rounded-full" style={{ backgroundColor: p.accent }} />
                </div>
                <div
                  className="h-4 rounded px-1.5 flex items-center justify-between border"
                  style={{ backgroundColor: p.surface, borderColor: p.border }}
                >
                  <span className="w-2/5 h-1 rounded-full" style={{ backgroundColor: p.text2 }} />
                  <span className="w-3 h-1.5 rounded-xs" style={{ backgroundColor: p.surfaceAlt }} />
                </div>
              </div>

              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-semibold text-text1 truncate">{preset.name}</span>
                {isActive ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent-muted-bg text-accent border border-accent-muted-border shrink-0">
                    <Check className="w-2.5 h-2.5" />
                    Activo
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-surface-alt text-text3 border border-border shrink-0">
                    {preset.tag}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-text3 leading-snug">{preset.desc}</p>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 select-none">
      <ConfirmDialog {...confirmProps} />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Two-Pane Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Centro de Perfil y Preferencias"
        data-perfil-modal="true"
        className="relative z-10 w-full h-[100dvh] md:h-[min(84vh,690px)] md:max-w-[920px] bg-surface border-0 md:border md:border-border2 md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* ── LEFT NAVIGATION RAIL (Desktop) / TOP STRIP (Mobile) ── */}
        <aside className="md:w-58 shrink-0 bg-surface-alt/45 border-b md:border-b-0 md:border-r border-border flex flex-col">
          {/* Desktop User Mini-Header */}
          <div className="hidden md:flex items-center gap-2.5 p-3.5 border-b border-border">
            <AvatarVisual
              src={showAvatarPhoto ? effectiveAvatarUrl : null}
              alt={displayName}
              fallbackText={initials(user?.email, nombre)}
              boxClass="w-9 h-9 rounded-lg"
              avatarClasses={avatarClasses}
              onError={() => setFailedAvatarUrl(effectiveAvatarUrl)}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-text1 truncate">{displayName}</div>
              <div className="text-[10px] font-mono text-text3 truncate">
                {rol === 'admin' ? 'Administrador' : 'Editor'} · Activa
              </div>
            </div>
          </div>

          {/* Mobile Header inside Rail */}
          <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2.5 min-w-0">
              <AvatarVisual
                src={showAvatarPhoto ? effectiveAvatarUrl : null}
                alt={displayName}
                fallbackText={initials(user?.email, nombre)}
                boxClass="w-8 h-8 rounded-lg"
                avatarClasses={avatarClasses}
                onError={() => setFailedAvatarUrl(effectiveAvatarUrl)}
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-text1 truncate">{displayName}</div>
                <div className="text-[10px] font-mono text-text3 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-surface-alt transition-colors cursor-pointer"
              aria-label="Cerrar configuración de perfil"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Groups */}
          <nav className="flex md:flex-col overflow-x-auto md:overflow-y-auto px-2 py-2 md:p-2.5 gap-1 md:gap-0.5 flex-1">
            {['Mi Cuenta', 'Preferencias de la App'].map((group, gIdx) => (
              <div key={group} className={`flex md:flex-col gap-1 md:gap-0.5 ${gIdx > 0 ? 'md:mt-3' : ''}`}>
                <div className="hidden md:block px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-text3">
                  {group}
                </div>
                {SECTIONS.filter(s => s.group === group).map(sec => {
                  const Icon = sec.icon
                  const isActive = activeTab === sec.id
                  const badgeCount = sec.id === 'asignaciones' ? asignacionesProximas.length : 0

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setActiveTab(sec.id)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-accent-muted-bg text-text1 font-semibold'
                          : 'text-text2 hover:text-text1 hover:bg-surface-alt/70 font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-accent' : 'text-text3'}`} />
                        <span className="truncate">{sec.label}</span>
                      </span>
                      {badgeCount > 0 && (
                        <Badge variant="warning" size="xs">
                          {badgeCount}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </nav>

          {/* Desktop Rail Footer */}
          <div className="hidden md:block p-2.5 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onClose?.()
                onLogout?.()
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-danger hover:bg-danger-bg transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5" />
                Cerrar sesión
              </span>
            </button>
          </div>
        </aside>

        {/* ── RIGHT CONTENT PANE ── */}
        <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-surface">
          {/* Section Header */}
          <div className="px-5 py-3.5 md:px-6 md:py-4 border-b border-border flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider text-text3">
                {currentSection.group}
              </div>
              <h2 className="font-display text-lg font-semibold text-text1 tracking-tight leading-snug">
                {currentSection.label}
              </h2>
              <p className="text-[11px] text-text3 mt-0.5 truncate">
                {currentSection.desc}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-surface-alt transition-colors cursor-pointer shrink-0"
              title="Cerrar (Esc)"
              aria-label="Cerrar panel de perfil"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
            {/* ── 1. MI PERFIL ── */}
            {activeTab === 'perfil' && (
              <div className="space-y-5 animate-fade-in">
                {/* Identity, Profile Photo & Avatar Color Swatches */}
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="relative group shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="relative block rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer disabled:opacity-60"
                      title="Cambiar foto de perfil"
                      aria-label="Cambiar foto de perfil"
                    >
                      <AvatarVisual
                        src={showAvatarPhoto ? effectiveAvatarUrl : null}
                        alt={displayName}
                        fallbackText={initials(user?.email, nombre)}
                        boxClass="w-16 h-16 rounded-2xl shadow-2xs"
                        textClass="text-lg"
                        avatarClasses={avatarClasses}
                        onError={() => setFailedAvatarUrl(effectiveAvatarUrl)}
                      />
                      <span className="absolute inset-0 rounded-2xl bg-black/45 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </span>
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarFileSelected}
                      className="hidden"
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text1 truncate">{displayName}</span>
                      <Badge variant={rol === 'admin' ? 'purple' : 'info'} size="xs">
                        {rol === 'admin' ? 'Administrador' : 'Editor'}
                      </Badge>
                      <Badge variant="success" size="xs" dot>
                        Activa
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-text3 truncate">{user?.email}</div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        icon={Camera}
                        loading={uploadingAvatar}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {showAvatarPhoto ? 'Cambiar foto' : 'Subir foto'}
                      </Button>
                      {showAvatarPhoto && (
                        <Button
                          type="button"
                          variant="dangerGhost"
                          size="xs"
                          icon={Trash2}
                          disabled={uploadingAvatar}
                          onClick={handleRemoveAvatar}
                        >
                          Quitar foto
                        </Button>
                      )}
                      <span className="text-[10px] text-text3">
                        JPG, PNG, WebP o GIF (máx. 5 MB · recorte 1:1)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      <span className="text-[11px] text-text3">
                        {showAvatarPhoto ? 'Color de acento / respaldo:' : 'Color de avatar:'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {AVATAR_COLORS.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setAvatarColor?.(c.id)}
                            title={c.label}
                            aria-label={`Avatar color ${c.label}`}
                            className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                              avatarColor === c.id
                                ? 'border-text1 scale-110'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.dotColor }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable Nombre Visible */}
                <form
                  onSubmit={handleSaveNombre}
                  className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3"
                >
                  <div>
                    <label className="block text-xs font-semibold text-text1">
                      Nombre visible
                    </label>
                    <p className="text-[11px] text-text3 mt-0.5">
                      Este nombre se muestra en el saludo del Inicio, listas de usuarios e historial de cambios.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="flex-1 h-9 px-3 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                    />
                    <Button type="submit" variant="accent" size="md" loading={savingPerfil}>
                      {savingPerfil ? 'Guardando...' : 'Guardar nombre'}
                    </Button>
                  </div>
                </form>

                {/* Linked Participant Lookup & Selector */}
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-text1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>Ficha vinculada en catálogo de participantes</span>
                      </div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Vincula tu cuenta a tu registro en <code className="font-mono">personas</code> para ver tus asignaciones S-140.
                      </p>
                    </div>
                    <Badge
                      variant={personaExplicita ? 'success' : personaSugerida ? 'info' : 'neutral'}
                      size="xs"
                      dot={Boolean(personaVinculada)}
                    >
                      {personaExplicita
                        ? 'Vinculada'
                        : personaSugerida
                        ? 'Sugerida'
                        : 'Sin vincular'}
                    </Badge>
                  </div>

                  {loadingRemote ? (
                    <div className="text-xs text-text3 py-2">Consultando catálogo...</div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          <Select
                            size="sm"
                            value={selectedPersonaClave}
                            onChange={e => setSelectedPersonaClave(e.target.value)}
                            aria-label="Seleccionar participante vinculado"
                          >
                            <option value="">— Sin ficha vinculada manualmente —</option>
                            {personasList.map(p => (
                              <option key={p.clave} value={p.clave}>
                                {p.nombre} ({p.clave} · {p.lista}){p.activo ? '' : ' [Inactivo]'}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          loading={savingVinculo}
                          disabled={savingVinculo || selectedPersonaClave === (personaClaveGuardada || '')}
                          onClick={() => handleSaveVinculoPersona()}
                        >
                          Guardar vínculo
                        </Button>
                      </div>

                      {!personaExplicita && personaSugerida && (
                        <div className="p-2.5 rounded-lg bg-blue-bg border border-blue/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <span className="text-text1">
                            Coincidencia sugerida: <strong>{personaSugerida.nombre}</strong> ({personaSugerida.clave})
                          </span>
                          <Button
                            type="button"
                            variant="accent"
                            size="xs"
                            loading={savingVinculo}
                            onClick={() => handleSaveVinculoPersona(personaSugerida.clave)}
                          >
                            Vincular sugerencia
                          </Button>
                        </div>
                      )}

                      {personaVinculada ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-surface border border-border">
                              <div className="text-[10px] font-mono text-text3 uppercase">Clave</div>
                              <div className="text-xs font-mono font-semibold text-text1 mt-0.5">
                                {personaVinculada.clave}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface border border-border">
                              <div className="text-[10px] font-mono text-text3 uppercase">Lista</div>
                              <div className="text-xs font-semibold text-text1 mt-0.5">
                                {personaVinculada.lista}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-surface border border-border">
                              <div className="text-[10px] font-mono text-text3 uppercase">Estatus</div>
                              <div className="text-xs font-semibold text-text1 mt-0.5 truncate">
                                {personaVinculada.estatus || (personaVinculada.activo ? 'Activo' : 'Inactivo')}
                              </div>
                            </div>
                          </div>
                          {onNavigate && (
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                iconRight={ArrowRight}
                                onClick={() => {
                                  onNavigate('personas', {
                                    personaClave: personaVinculada.clave,
                                    personaTab: 'historial',
                                  })
                                  onClose?.()
                                }}
                              >
                                Ver historial completo de participaciones
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-text3 bg-surface border border-border rounded-lg p-3">
                          Selecciona tu nombre en la lista de arriba para vincular tus participaciones futuras.
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Account Details */}
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-2.5">
                  <div className="text-xs font-semibold text-text1">Detalles de cuenta</div>
                  <div className="bg-surface border border-border rounded-lg divide-y divide-border text-xs">
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-text3">Correo registrado</span>
                      <span className="font-mono text-text1 truncate ml-2">{user?.email}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-text3">Nivel de permiso</span>
                      <span className="font-medium text-text1 capitalize">{rol}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2">
                      <span className="text-text3">Último inicio de sesión</span>
                      <span className="font-mono text-text2">
                        {user?.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleString('es-MX', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Sesión activa'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. SEGURIDAD Y ACCESO ── */}
            {activeTab === 'seguridad' && (
              <SeguridadPanel
                user={user}
                rol={rol}
                displayName={displayName}
                onClose={onClose}
                onLogout={onLogout}
                onUserUpdated={onUserUpdated}
                confirm={confirm}
                success={success}
                error={error}
                showToast={showToast}
              />
            )}

            {/* ── 3. MIS ASIGNACIONES ── */}
            {activeTab === 'asignaciones' && (
              <div className="space-y-4 animate-fade-in">
                {/* Encabezado con dos badges interactivos: Próximas y Pasadas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-text1">Participaciones del Programa S-140</div>
                    <p className="text-[11px] text-text3 mt-0.5">
                      {personaVinculada
                        ? `Vinculadas a ${personaVinculada.nombre} (${personaVinculada.clave}) · Reunión: ${config?.diaReunionEntreSemana || 'Martes'}.`
                        : 'Vincula tu ficha en "Mi Perfil" para consultar tus asignaciones.'}
                    </p>
                  </div>

                  <div
                    role="tablist"
                    aria-label="Filtrar asignaciones por estado temporal"
                    className="inline-flex items-center p-1 rounded-xl bg-surface-alt/70 border border-border self-start shrink-0 gap-1"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={asigSubTab === 'proximas'}
                      onClick={() => setAsigSubTab('proximas')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        asigSubTab === 'proximas'
                          ? 'bg-surface text-text1 shadow-2xs font-semibold border border-border'
                          : 'text-text2 hover:text-text1'
                      }`}
                    >
                      <span>Próximas</span>
                      <span
                        className={`inline-flex items-center justify-center min-w-5 h-4 px-1.5 rounded-full text-[10px] font-mono font-semibold ${
                          asigSubTab === 'proximas'
                            ? 'bg-accent-muted-bg text-accent'
                            : 'bg-surface text-text3'
                        }`}
                      >
                        {asignacionesProximas.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={asigSubTab === 'pasadas'}
                      onClick={() => setAsigSubTab('pasadas')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        asigSubTab === 'pasadas'
                          ? 'bg-surface text-text1 shadow-2xs font-semibold border border-border'
                          : 'text-text2 hover:text-text1'
                      }`}
                    >
                      <span>Pasadas</span>
                      <span
                        className={`inline-flex items-center justify-center min-w-5 h-4 px-1.5 rounded-full text-[10px] font-mono font-semibold ${
                          asigSubTab === 'pasadas'
                            ? 'bg-surface-alt text-text1'
                            : 'bg-surface text-text3'
                        }`}
                      >
                        {asignacionesPasadasVisibles.length}
                      </span>
                    </button>
                  </div>
                </div>

                {loadingRemote ? (
                  <div className="text-center py-10 text-xs text-text3">Buscando asignaciones...</div>
                ) : asigSubTab === 'proximas' ? (
                  asignacionesProximas.length === 0 ? (
                    <div className="bg-surface-alt/35 border border-border rounded-xl p-6">
                      <EmptyState
                        icon={ClipboardList}
                        compact
                        title="Sin asignaciones próximas"
                        description={
                          personaVinculada
                            ? 'No tienes partes pendientes ni próximas para las siguientes reuniones.'
                            : 'Aún no has vinculado tu cuenta con una ficha de participante.'
                        }
                        action={
                          !personaVinculada ? (
                            <Button variant="outline" size="xs" onClick={() => setActiveTab('perfil')}>
                              Vincular en Mi Perfil →
                            </Button>
                          ) : null
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {asignacionesProximas.map(a => {
                        const parte = a.programa_partes
                        const sem = parte?.programa_semanas
                        const dotColor = SECCION_DOT[parte?.seccion] || 'bg-accent'
                        const fechaReunion = getFechaReunionSemana(sem, horarioOpts)
                        const proximidad = formatProximidadDias(fechaReunion, getHoyLocalIso())

                        return (
                          <div
                            key={a.id}
                            className="p-3.5 rounded-xl bg-surface-alt/35 border border-border flex flex-col gap-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                  <span className="text-xs font-semibold text-accent">
                                    {fechaReunion
                                      ? `Reunión: ${formatFechaLegible(fechaReunion, true)}`
                                      : sem?.fecha_inicio
                                      ? formatRangoSemanaLegible(sem.fecha_inicio, sem.fecha_fin)
                                      : 'Semana programada'}
                                  </span>
                                  {proximidad && (
                                    <Badge
                                      variant={proximidad === 'Hoy' || proximidad === 'Mañana' ? 'warning' : 'info'}
                                      size="xs"
                                    >
                                      {proximidad}
                                    </Badge>
                                  )}
                                </div>
                                {sem?.fecha_inicio && (
                                  <div className="text-[11px] text-text3 flex items-center gap-1.5 flex-wrap">
                                    <span>Semana: {formatRangoSemanaLegible(sem.fecha_inicio, sem.fecha_fin)}</span>
                                    {sem?.capitulo_biblico && <span>· {sem.capitulo_biblico}</span>}
                                  </div>
                                )}
                                <div className="text-sm font-medium text-text1 leading-snug pt-0.5">
                                  {parte?.titulo || 'Parte programada'}
                                </div>
                                <div className="text-[11px] font-mono text-text3 flex items-center gap-2 flex-wrap">
                                  <span>{parte?.tipo_asignacion}</span>
                                  {parte?.duracion_min && <span>· {parte.duracion_min} min</span>}
                                  <span className="capitalize">· Rol: {a.rol}</span>
                                </div>
                              </div>

                              <Badge
                                variant={a.confirmado ? 'success' : 'warning'}
                                size="xs"
                                dot
                                className="self-start shrink-0"
                              >
                                {a.confirmado ? 'Confirmada' : 'Pendiente'}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60 flex-wrap">
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                icon={Copy}
                                onClick={() => handleCopyAsigTexto(a, fechaReunion)}
                              >
                                Copiar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                icon={CalendarPlus}
                                onClick={() => handleDownloadAsigIcs(a, fechaReunion)}
                              >
                                Añadir (.ics)
                              </Button>
                              {sem?.id && onNavigate && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="xs"
                                  iconRight={ExternalLink}
                                  onClick={() => {
                                    onNavigate('semanal', { semanaId: sem.id })
                                    onClose?.()
                                  }}
                                >
                                  Ver semana
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {(asignacionesPasadasVisibles.length > 0 || dismissedPasadasCount > 0) && (
                      <div className="flex items-center justify-between gap-2 flex-wrap px-1">
                        <span className="text-[11px] text-text3">
                          {dismissedPasadasCount > 0
                            ? `${dismissedPasadasCount} descartada${dismissedPasadasCount === 1 ? '' : 's'} oculta${dismissedPasadasCount === 1 ? '' : 's'}.`
                            : 'Historial reciente de reuniones ya celebradas.'}
                        </span>
                        <div className="flex items-center gap-2">
                          {dismissedPasadasCount > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              icon={RotateCcw}
                              onClick={handleRestorePastAsigs}
                            >
                              Restaurar ({dismissedPasadasCount})
                            </Button>
                          )}
                          {asignacionesPasadasVisibles.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              icon={Trash2}
                              onClick={handleDismissAllPastAsig}
                            >
                              Descartar todas
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {asignacionesPasadasVisibles.length === 0 ? (
                      <div className="bg-surface-alt/35 border border-border rounded-xl p-6">
                        <EmptyState
                          icon={ClipboardList}
                          compact
                          title={
                            dismissedPasadasCount > 0
                              ? 'Todas las asignaciones pasadas están descartadas'
                              : 'Sin asignaciones pasadas registradas'
                          }
                          description={
                            dismissedPasadasCount > 0
                              ? 'Puedes restaurarlas cuando necesites consultarlas de nuevo.'
                              : 'Aquí aparecerán tus participaciones conforme pasen las fechas de reunión.'
                          }
                          action={
                            dismissedPasadasCount > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                icon={RotateCcw}
                                onClick={handleRestorePastAsigs}
                              >
                                Restaurar descartadas ({dismissedPasadasCount})
                              </Button>
                            ) : null
                          }
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {asignacionesPasadasVisibles.map(a => {
                          const parte = a.programa_partes
                          const sem = parte?.programa_semanas
                          const fechaReunion = getFechaReunionSemana(sem, horarioOpts)
                          const haceText = formatProximidadDias(fechaReunion, getHoyLocalIso())

                          return (
                            <div
                              key={a.id}
                              className="p-3 rounded-xl bg-surface-alt/25 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[11px] font-mono text-text3">
                                    {fechaReunion
                                      ? formatFechaLegible(fechaReunion, true)
                                      : sem?.fecha_inicio
                                      ? formatRangoSemanaLegible(sem.fecha_inicio, sem.fecha_fin)
                                      : 'Reunión anterior'}
                                  </span>
                                  {haceText && (
                                    <Badge variant="neutral" size="xs">
                                      {haceText}
                                    </Badge>
                                  )}
                                  <Badge variant="neutral" size="xs" className="capitalize">
                                    {a.rol}
                                  </Badge>
                                </div>
                                <div className="font-medium text-text1 truncate">
                                  {parte?.titulo || parte?.tipo_asignacion}
                                </div>
                                {sem?.fecha_inicio && (
                                  <div className="text-[11px] text-text3 truncate">
                                    Semana: {formatRangoSemanaLegible(sem.fecha_inicio, sem.fecha_fin)}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                {sem?.id && onNavigate && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="xs"
                                    iconRight={ExternalLink}
                                    onClick={() => {
                                      onNavigate('semanal', { semanaId: sem.id })
                                      onClose?.()
                                    }}
                                  >
                                    Ver
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="dangerGhost"
                                  size="xs"
                                  icon={X}
                                  onClick={() => handleDismissPastAsig(a.id)}
                                  aria-label="Descartar asignación pasada"
                                >
                                  Descartar
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── 4. MI ACTIVIDAD ── */}
            {activeTab === 'actividad' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-text1">Historial de actividad reciente</div>
                    <p className="text-[11px] text-text3 mt-0.5">
                      Operaciones registradas en auditoría bajo <span className="font-mono">{user?.email}</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="iconSm"
                      onClick={handleRefreshActividad}
                      disabled={refreshingActivity}
                      title="Actualizar actividad"
                      aria-label="Actualizar mi actividad"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${refreshingActivity ? 'animate-spin' : ''}`} />
                    </Button>

                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-alt border border-border">
                      {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'INSERT', label: 'Altas' },
                        { id: 'UPDATE', label: 'Ediciones' },
                        { id: 'DELETE', label: 'Bajas' },
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setActivityFilter(f.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            activityFilter === f.id
                              ? 'bg-surface text-text1 shadow-2xs font-semibold'
                              : 'text-text2 hover:text-text1'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {loadingRemote ? (
                  <div className="text-center py-10 text-xs text-text3">Cargando auditoría...</div>
                ) : filteredHistorial.length === 0 ? (
                  <div className="bg-surface-alt/35 border border-border rounded-xl p-6 text-center space-y-2">
                    <div className="text-sm font-medium text-text1">
                      {historial.length === 0
                        ? 'Aún no hay movimientos registrados con tu cuenta'
                        : 'Sin movimientos para este filtro'}
                    </div>
                    <p className="text-xs text-text3 max-w-md mx-auto leading-relaxed">
                      {historial.length === 0
                        ? 'Las altas, ediciones y bajas que realices tras activar la migración de auditoría por usuario aparecerán aquí automáticamente.'
                        : 'Prueba cambiando el filtro superior o consulta la bitácora general.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredHistorial.map(h => {
                      const resumen = buildLogResumenCorto(h)
                      const tablaLabel = getTablaLabel(h.tabla)
                      const badgeVar =
                        h.operacion === 'INSERT'
                          ? 'success'
                          : h.operacion === 'UPDATE'
                          ? 'warning'
                          : 'danger'
                      const opLabel =
                        h.operacion === 'INSERT'
                          ? 'Alta'
                          : h.operacion === 'UPDATE'
                          ? 'Edición'
                          : 'Baja'

                      return (
                        <div
                          key={h.id || h.created_at}
                          className="p-3 rounded-xl bg-surface-alt/35 border border-border flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={badgeVar} size="xs">
                                {opLabel}
                              </Badge>
                              <span className="font-semibold text-text1">{tablaLabel}</span>
                            </div>
                            <div className="text-[11px] text-text2 truncate">
                              {resumen || `Registro modificado en ${tablaLabel}`}
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-text3 shrink-0">
                            {h.created_at || h.fecha
                              ? new Date(h.created_at || h.fecha).toLocaleString('es-MX', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : 'Reciente'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {onNavigate && (
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        onNavigate('historial')
                        onClose?.()
                      }}
                    >
                      Ver toda la bitácora
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      iconRight={ExternalLink}
                      onClick={() => {
                        onNavigate('historial', { filterUserEmail: user?.email })
                        onClose?.()
                      }}
                    >
                      Ver mis cambios en Bitácora
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── 5. APARIENCIA Y TEMAS (MINI GALERÍA) ── */}
            {activeTab === 'apariencia' && (
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">Mini Galería de Temas</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Elige entre 3 variantes claras y 3 oscuras. Se aplican al instante en toda la app.
                      </p>
                    </div>

                    {/* Polarity Segmented Control */}
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-alt border border-border self-start">
                      {[
                        { id: 'light', label: 'Claro', icon: Sun },
                        { id: 'dark', label: 'Oscuro', icon: Moon },
                        { id: 'system', label: 'Sistema', icon: Monitor },
                      ].map(opt => {
                        const Icon = opt.icon
                        const active = polarityPref === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPolarity?.(opt.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                              active
                                ? 'bg-surface text-text1 shadow-2xs font-semibold'
                                : 'text-text2 hover:text-text1'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text3">
                      Temas Claros
                    </div>
                    {renderThemeCards(LIGHT_THEME_IDS)}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text3">
                      Temas Oscuros
                    </div>
                    {renderThemeCards(DARK_THEME_IDS)}
                  </div>
                </div>

                {/* Density & Accessibility */}
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border divide-y divide-border">
                  <div className="pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-text1">Densidad de interfaz</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        El modo compacto ajusta todas las secciones de la app (barra lateral, cabecera, tablas y tarjetas). El modal de Perfil conserva su tamaño cómodo.
                      </p>
                    </div>
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-alt border border-border self-start">
                      {[
                        { id: 'comfortable', label: 'Cómoda' },
                        { id: 'compact', label: 'Compacta' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDensity?.(opt.id)}
                          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            density === opt.id
                              ? 'bg-surface text-text1 shadow-2xs font-semibold'
                              : 'text-text2 hover:text-text1'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-text1">Escala de texto</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Aumenta ligeramente el tamaño de lectura en toda la interfaz.
                      </p>
                    </div>
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-surface-alt border border-border self-start">
                      {[
                        { id: 'normal', label: 'Normal' },
                        { id: 'large', label: 'Grande' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFontSize?.(opt.id)}
                          className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                            fontSize === opt.id
                              ? 'bg-surface text-text1 shadow-2xs font-semibold'
                              : 'text-text2 hover:text-text1'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-text1">Reducir animaciones</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Desactiva transiciones suaves de modales, barras y tarjetas.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={reduceMotion}
                      onChange={next => setReduceMotion?.(next)}
                      label="Reducir animaciones"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── 6. GENERAL Y REGIONAL ── */}
            {activeTab === 'general' && (
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border divide-y divide-border">
                  <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-text1">Vista por defecto al entrar</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Pantalla que se abrirá automáticamente al iniciar sesión o recargar.
                      </p>
                    </div>
                    <div className="sm:w-56">
                      <Select
                        value={prefVistaDefault}
                        onChange={e => handleVistaDefaultChange(e.target.value)}
                        size="sm"
                      >
                        <option value="home">Inicio</option>
                        <option value="programa">Programa Semanal (S-140)</option>
                        <option value="semanal">Vista Semanal</option>
                        <option value="editable">Matriz Anual</option>
                        <option value="personas">Participantes</option>
                        <option value="registros">Historial de Asignaciones</option>
                        <option value="estadisticas">Estadísticas</option>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-text1">Formato de fecha</div>
                      <p className="text-[11px] text-text3 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>Vista previa:</span>
                        <Badge variant="info" size="xs" className="font-mono">
                          {prefFormatoFecha === 'dd/mm/yyyy' ? '26/10/2026' : '26 oct 2026'}
                        </Badge>
                      </p>
                    </div>
                    <div className="sm:w-56">
                      <Select
                        value={prefFormatoFecha}
                        onChange={e => handleFormatoFechaChange(e.target.value)}
                        size="sm"
                      >
                        <option value="dd/mm/yyyy">dd/mm/yyyy (Estándar)</option>
                        <option value="dd mmm yyyy">dd mmm yyyy (Legible)</option>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border divide-y divide-border">
                  <div className="pb-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-text1">Barra lateral colapsada por defecto</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Maximiza el ancho disponible para tablas de Matriz Anual y Programa.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={isCollapsed}
                      onChange={next => {
                        onSetSidebarCollapsed?.(next)
                        success(next ? 'Barra lateral colapsada' : 'Barra lateral fijada')
                      }}
                      label="Barra lateral colapsada"
                    />
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-text1">Abrir Programa S-140 en modo lectura</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Muestra el programa limpio sin selectores editables al entrar.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={programaModoLectura}
                      onChange={handleProgramaModoLecturaToggle}
                      label="Abrir Programa en modo lectura"
                    />
                  </div>

                  <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">Al quitar titular SMT con ayudante</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Define si preguntar, quitar ambos o conservar al ayudante en Programa S-140.
                      </p>
                    </div>
                    <div className="sm:w-48">
                      <Select
                        value={programaQuitarTitularSmt}
                        onChange={e => handleProgramaQuitarTitularSmtChange(e.target.value)}
                        size="sm"
                        aria-label="Comportamiento al quitar titular SMT con ayudante"
                      >
                        <option value="preguntar">Preguntar cada vez</option>
                        <option value="ambos">Quitar titular y ayudante</option>
                        <option value="solo_titular">Quitar solo al titular</option>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">Registros por página en Historial</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Cantidad de filas visibles por página en Historial de Asignaciones.
                      </p>
                    </div>
                    <div className="sm:w-36">
                      <Select
                        value={registrosPageSize}
                        onChange={e => handleRegistrosPageSizeChange(e.target.value)}
                        size="sm"
                      >
                        <option value="25">25 filas</option>
                        <option value="50">50 filas</option>
                        <option value="100">100 filas</option>
                        <option value="250">250 filas</option>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── 7. NOTIFICACIONES Y AVISOS ── */}
            {activeTab === 'notificaciones' && (
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border divide-y divide-border">
                  <div className="pb-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-text1">Semanas pendientes de confirmar</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Muestra un aviso en &ldquo;Por resolver hoy&rdquo; cuando faltan confirmaciones en el mes.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={alertPrefs.semanasIncompletas}
                      onChange={v => handleAlertPrefChange('semanasIncompletas', v)}
                      label="Alertas de semanas incompletas"
                    />
                  </div>

                  <div className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-text1">Participantes con más de 2 meses sin asignar</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Sugerencia proactiva para mantener equilibrada la rotación de hermanos.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={alertPrefs.personasInactivas}
                      onChange={v => handleAlertPrefChange('personasInactivas', v)}
                      label="Alertas de participantes inactivos"
                    />
                  </div>

                  <div className="pt-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-text1">Aviso de programa del próximo mes</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Alerta cuando aún no se ha importado el archivo EPUB del mes siguiente.
                      </p>
                    </div>
                    <ToggleSwitch
                      checked={alertPrefs.epubDisponible}
                      onChange={v => handleAlertPrefChange('epubDisponible', v)}
                      label="Alertas de EPUB próximo mes"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-text1">Avisos descartados en este dispositivo</div>
                    <p className="text-[11px] text-text3 mt-0.5">
                      {dismissedCount > 0
                        ? `Tienes ${dismissedCount} aviso(s) ocultado(s) manualmente del widget Inicio.`
                        : 'No hay avisos ocultados manualmente en este momento.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    disabled={dismissedCount === 0}
                    onClick={handleRestoreAlerts}
                  >
                    Restaurar avisos
                  </Button>
                </div>
              </div>
            )}

            {/* ── 8. ATAJOS Y DATOS LOCALES ── */}
            {activeTab === 'atajos' && (
              <div className="space-y-5 animate-fade-in">
                {/* Mapeo interactivo de atajos de teclado */}
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-text1">
                        Mapeo de atajos de teclado
                      </div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Haz clic en «Editar» y pulsa la nueva combinación. Los cambios se aplican al instante.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {modifiedKeybindsCount > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          icon={RotateCcw}
                          onClick={handleResetAllKeybinds}
                        >
                          Restablecer atajos ({modifiedKeybindsCount})
                        </Button>
                      )}
                      {onOpenShortcutsHelp && (
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={onOpenShortcutsHelp}
                        >
                          Abrir guía completa
                        </Button>
                      )}
                    </div>
                  </div>

                  {[
                    {
                      title: 'Acciones globales',
                      items: KEYBIND_DEFINITIONS.filter(d => d.group === 'global'),
                    },
                    {
                      title: 'Navegación rápida',
                      items: KEYBIND_DEFINITIONS.filter(
                        d => d.group === 'nav' && (d.navId !== 'usuarios' || rol === 'admin')
                      ),
                    },
                  ].map(groupBlock => (
                    <div key={groupBlock.title} className="space-y-2">
                      <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text3 px-0.5">
                        {groupBlock.title}
                      </div>
                      <div className="space-y-1.5">
                        {groupBlock.items.map(def => {
                          const currentBinding = keybinds[def.id] || def.defaultBinding
                          const keys = getBindingKeysArray(currentBinding)
                          const isSequence = Boolean(parseSequenceBinding(currentBinding))
                          const separator = isSequence ? '→' : '+'
                          const isRecording = recordingActionId === def.id
                          const isCustom = currentBinding !== def.defaultBinding

                          return (
                            <div
                              key={def.id}
                              className={`p-2.5 rounded-lg border transition-colors ${
                                isRecording
                                  ? 'bg-accent-muted-bg/40 border-accent ring-1 ring-accent/30'
                                  : 'bg-surface border-border'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-text1 flex items-center gap-1.5 flex-wrap">
                                    <span>{def.label}</span>
                                    {isCustom && (
                                      <Badge variant="info" size="xs">
                                        Personalizado
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-text3 truncate">
                                    {def.description}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                                  {isRecording ? (
                                    <>
                                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-mono bg-accent-muted-bg text-accent border border-accent-muted-border animate-pulse">
                                        Pulsa combinación (Esc cancela)...
                                      </span>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => {
                                          setRecordingActionId(null)
                                          setKeybindError('')
                                        }}
                                      >
                                        Cancelar
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-1 mr-1">
                                        {keys.map((k, idx) => (
                                          <span key={`${def.id}-${idx}`} className="flex items-center gap-1">
                                            <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-[10px] font-mono rounded bg-surface-alt border border-border text-text1">
                                              {k}
                                            </kbd>
                                            {idx < keys.length - 1 && (
                                              <span className="text-[10px] text-text3">{separator}</span>
                                            )}
                                          </span>
                                        ))}
                                      </div>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="xs"
                                        onClick={() => {
                                          setKeybindError('')
                                          setRecordingActionId(def.id)
                                        }}
                                      >
                                        Editar
                                      </Button>

                                      {isCustom && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="xs"
                                          icon={RotateCcw}
                                          onClick={() => handleResetSingleKeybind(def.id)}
                                          title="Restablecer al predeterminado"
                                          aria-label={`Restablecer atajo ${def.label}`}
                                        />
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {isRecording && def.group === 'nav' && (
                                <div className="mt-1.5 text-[10px] text-text3 font-mono">
                                  Tecla simple = G + tecla · Ctrl/Alt + tecla = acceso directo
                                </div>
                              )}

                              {isRecording && keybindError && (
                                <div className="mt-1.5 text-[11px] text-danger font-medium">
                                  {keybindError}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Datos locales, respaldo personal y restablecimiento */}
                <div className="p-4 rounded-xl bg-surface-alt/35 border border-border divide-y divide-border">
                  <div className="pb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">
                        Respaldo de preferencias personales
                      </div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Exporta o importa tus temas, densidad, avisos y atajos en formato JSON.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Download}
                        onClick={handleExportPrefs}
                      >
                        Exportar (.json)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        icon={Upload}
                        onClick={() => importPrefsInputRef.current?.click()}
                      >
                        Importar (.json)
                      </Button>
                      <input
                        ref={importPrefsInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportPrefsFile}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">Caché temporal de datos</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Limpia la caché local de configuración y eventos para forzar lectura fresca del servidor.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={Database}
                      onClick={handleClearLocalCache}
                    >
                      Limpiar caché local
                    </Button>
                  </div>

                  <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">Diseño de widgets del Inicio</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Devuelve los bloques configurables del Home a su distribución original.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      icon={RotateCcw}
                      onClick={handleResetWidgetsLayout}
                    >
                      Restablecer widgets
                    </Button>
                  </div>

                  <div className="pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-text1">Restablecer todas las preferencias</div>
                      <p className="text-[11px] text-text3 mt-0.5">
                        Vuelve al tema Cálido claro, densidad cómoda, atajos de fábrica y ajustes por defecto.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="dangerGhost"
                      size="sm"
                      onClick={handleResetAllPrefs}
                      className="border border-danger/25"
                    >
                      Restablecer todo
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <Toast toast={toast} />
    </div>
  )
}
