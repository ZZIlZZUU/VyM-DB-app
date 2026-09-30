import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Building2,
  Calendar,
  Clock,
  Save,
  RotateCcw,
  Sparkles,
  FileText,
  Shield,
  Layers,
  MapPin,
  FileSpreadsheet,
  Info,
  Sliders,
  Plus,
  Trash2,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  X,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useConfiguracion, CONFIG_DEFAULTS } from '../hooks/useConfiguracion'
import { useEventosReunion } from '../hooks/useEventosReunion'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { formatHora12, timeToMinutes, simularCronogramaReunion } from '../lib/horarios'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Dialog } from '../components/ui/Dialog'

const DIAS_ENTRE_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DIAS_FIN_SEMANA = ['Sábado', 'Domingo']

const HORAS_AM_PM = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:15',
  '18:30', '18:45', '19:00', '19:15', '19:30', '19:45', '20:00', '20:15', '20:30',
]

const ANIOS_DISPONIBLES = ['2025', '2026', '2027', '2028', '2029', '2030']

const TIPOS_EVENTO = [
  { id: 'asamblea_circuito', label: 'Asamblea de Circuito', color: 'purple', desc: '1 día de asamblea (sustituye reunión de fin de semana)' },
  { id: 'asamblea_regional', label: 'Asamblea Regional', color: 'blue', desc: '3 días de asamblea (sin reunión de fin de semana)' },
  { id: 'visita_sc', label: 'Visita del Superintendente de Circuito', color: 'emerald', desc: 'Discurso de servicio sustituye el EBC de 30m' },
  { id: 'reunion_desplazada', label: 'Reunión Desplazada de Día/Hora', color: 'amber', desc: 'Por feriado o evento, la reunión se traslada de fecha' },
  { id: 'reunion_cancelada', label: 'Reunión Cancelada', color: 'red', desc: 'Semana sin reunión ordinaria' },
]

/**
 * Fila interactiva del lienzo S-140 compacto con selector de badge [ESTÁTICO]/[DINÁMICO]
 * y campo de hora editable directamente.
 */
function FilaHorarioS140({
  fila,
  onToggleModo,
  onHoraChange,
  dotColor = null,
}) {
  const [localHora, setLocalHora] = useState(fila.hora12)
  const isEditing = useRef(false)

  useEffect(() => {
    if (!isEditing.current) {
      setLocalHora(fila.hora12)
    }
  }, [fila.hora12])

  const esEstatico = fila.modo === 'estatico'

  return (
    <div className="flex items-center gap-2 sm:gap-2.5 py-1 px-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
      {/* 1. Selector Badge [ESTÁTICO] / [DINÁMICO] */}
      <button
        type="button"
        onClick={() => onToggleModo(fila.id)}
        className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold rounded cursor-pointer select-none transition-all shadow-2xs shrink-0 ${
          esEstatico
            ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900'
            : 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900'
        }`}
        title={`Modo: ${esEstatico ? 'ESTÁTICO (fijo al reloj)' : 'DINÁMICO (calculado en cascada)'}. Haz clic para alternar.`}
      >
        ({esEstatico ? 'ESTÁTICO' : 'DINÁMICO'})
      </button>

      {/* 2. Hora modificable */}
      <div className="relative shrink-0">
        <input
          type="text"
          value={localHora}
          onFocus={() => {
            isEditing.current = true
          }}
          onChange={e => {
            setLocalHora(e.target.value)
          }}
          onBlur={() => {
            isEditing.current = false
            const trimmed = localHora.trim()
            if (trimmed && trimmed !== fila.hora12) {
              onHoraChange(fila.id, trimmed)
            } else {
              setLocalHora(fila.hora12)
            }
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          className={`w-14 sm:w-16 font-mono font-bold text-xs text-center rounded px-1 py-0.5 border transition-all ${
            esEstatico
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs'
              : 'bg-zinc-100/70 dark:bg-zinc-800/40 text-zinc-600 dark:text-zinc-400 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 cursor-pointer'
          }`}
          title={
            esEstatico
              ? 'Hora estática editable. Escribe la hora deseada (ej: 7:05 o 19:05)'
              : 'Hora dinámica calculada. Escribe cualquier hora para fijarla en ESTÁTICO'
          }
        />
      </div>

      {/* 3. Título de la parte */}
      <span className="text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 min-w-0 flex-1 truncate text-xs">
        {dotColor && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span className="truncate">{fila.titulo}</span>
      </span>
    </div>
  )
}

export default function Configuracion({ onNavigate }) {
  const { config, loading, saving, guardarConfiguracion } = useConfiguracion()
  const {
    eventos,
    loading: loadingEventos,
    saving: savingEventos,
    guardarEvento,
    eliminarEvento,
  } = useEventosReunion()
  const { toast, success, error: toastError } = useToast()

  const [activeTab, setActiveTab] = useState('general') // 'general' | 'horarios' | 'eventos'
  const [semanas, setSemanas] = useState([])

  const [form, setForm] = useState({
    nombreCongregacion: '',
    diaReunionEntreSemana: 'Martes',
    horaReunionEntreSemana: '19:30',
    diaReunionFinSemana: 'Sábado',
    horaReunionFinSemana: '18:00',
    anioEnCurso: new Date().getFullYear().toString(),
    circuito: '',
    salaAuxiliarHabilitada: false,
    direccionSalon: '',
    horarioModoTb: 'estatico',
    horarioOffsetSmt: 30,
    horarioModoSmt: 'dinamico',
    horarioOffsetCancionVc: 45,
    horarioOffsetVc: 50,
    horarioModoVc: 'estatico',
    margenTransicionMin: 1,
    duracionCierreMin: 8,
    horarioPersonalizadoFilas: null,
  })

  const [hasChanges, setHasChanges] = useState(false)

  // Estado para el modal de eventos
  const [modalEventoOpen, setModalEventoOpen] = useState(false)
  const [editingEvento, setEditingEvento] = useState(null)
  const [eventoForm, setEventoForm] = useState({
    semana_id: '',
    tipo_evento: 'asamblea_circuito',
    titulo_evento: '',
    fecha_original: '',
    fecha_efectiva: '',
    hora_efectiva: '',
    afecta_reunion: 'entre_semana',
    descripcion: '',
  })

  // Cargar semanas de la BD para asociar eventos
  useEffect(() => {
    async function loadSemanas() {
      try {
        const { data } = await supabase
          .from('programa_semanas')
          .select('id, fecha_inicio, fecha_fin, mes, anio')
          .order('fecha_inicio', { ascending: true })
        if (data) setSemanas(data)
      } catch (err) {
        console.warn('Error cargando semanas:', err)
      }
    }
    loadSemanas()
  }, [])

  // Sincronizar formulario cuando config cargue o cambie en BD
  useEffect(() => {
    if (config) {
      setForm({
        nombreCongregacion: config.nombreCongregacion || '',
        diaReunionEntreSemana: config.diaReunionEntreSemana || 'Martes',
        horaReunionEntreSemana: config.horaReunionEntreSemana || '19:30',
        diaReunionFinSemana: config.diaReunionFinSemana || 'Sábado',
        horaReunionFinSemana: config.horaReunionFinSemana || '18:00',
        anioEnCurso: config.anioEnCurso || new Date().getFullYear().toString(),
        circuito: config.circuito || '',
        salaAuxiliarHabilitada: !!config.salaAuxiliarHabilitada,
        direccionSalon: config.direccionSalon || '',
        horarioModoTb: config.horarioModoTb || 'estatico',
        horarioOffsetSmt: config.horarioOffsetSmt != null ? config.horarioOffsetSmt : 30,
        horarioModoSmt: config.horarioModoSmt || 'dinamico',
        horarioOffsetCancionVc: config.horarioOffsetCancionVc != null ? config.horarioOffsetCancionVc : 45,
        horarioOffsetVc: config.horarioOffsetVc != null ? config.horarioOffsetVc : 50,
        horarioModoVc: config.horarioModoVc || 'estatico',
        margenTransicionMin: config.margenTransicionMin != null ? config.margenTransicionMin : 1,
        duracionCierreMin: config.duracionCierreMin != null ? config.duracionCierreMin : 8,
        horarioPersonalizadoFilas: config.horarioPersonalizadoFilas || null,
      })
      setHasChanges(false)
    }
  }, [config])

  function handleChange(campo, valor) {
    setForm(prev => {
      const next = { ...prev, [campo]: valor }
      setHasChanges(true)
      return next
    })
  }

  // Presets rápidos
  function aplicarPreset(tipo) {
    if (tipo === 'estandar') {
      setForm(prev => ({
        ...prev,
        horarioModoTb: 'estatico',
        horarioOffsetSmt: 30,
        horarioModoSmt: 'dinamico',
        horarioOffsetCancionVc: 45,
        horarioOffsetVc: 50,
        horarioModoVc: 'estatico',
        margenTransicionMin: 1,
        duracionCierreMin: 8,
        horarioPersonalizadoFilas: null,
      }))
      setHasChanges(true)
      success('Preset "Estándar / Recreo" cargado en el simulador.')
    } else if (tipo === 'cascada') {
      setForm(prev => ({
        ...prev,
        horarioModoTb: 'dinamico',
        horarioModoSmt: 'dinamico',
        horarioModoVc: 'dinamico',
        margenTransicionMin: 1,
        duracionCierreMin: 8,
        horarioPersonalizadoFilas: null,
      }))
      setHasChanges(true)
      success('Preset "Cascada Pura" cargado en el simulador.')
    } else if (tipo === 'matutino') {
      setForm(prev => ({
        ...prev,
        horaReunionEntreSemana: '09:30',
        horarioModoTb: 'estatico',
        horarioOffsetSmt: 30,
        horarioModoSmt: 'dinamico',
        horarioOffsetCancionVc: 45,
        horarioOffsetVc: 50,
        horarioModoVc: 'estatico',
        margenTransicionMin: 1,
        duracionCierreMin: 8,
        horarioPersonalizadoFilas: null,
      }))
      setHasChanges(true)
      success('Preset "Matutino (09:30 AM)" cargado.')
    }
  }

  async function handleSubmit(e) {
    e?.preventDefault?.()
    const trimmedNombre = form.nombreCongregacion.trim()
    if (!trimmedNombre) {
      toastError('El nombre de la congregación no puede estar vacío.')
      return
    }

    const res = await guardarConfiguracion({
      ...form,
      nombreCongregacion: trimmedNombre,
    })

    if (res.ok) {
      setHasChanges(false)
      success('Ajustes guardados exitosamente.')
    } else {
      const isRls = res.error?.message?.toLowerCase().includes('row-level security')
      const msg = isRls
        ? 'Error de permisos RLS en Supabase: la tabla "configuracion" requiere la política de escritura para administradores.'
        : (res.error?.message || 'Error desconocido')
      toastError('No se pudo guardar la configuración: ' + msg)
    }
  }

  function handleReset() {
    if (config) {
      setForm({
        nombreCongregacion: config.nombreCongregacion || '',
        diaReunionEntreSemana: config.diaReunionEntreSemana || 'Martes',
        horaReunionEntreSemana: config.horaReunionEntreSemana || '19:30',
        diaReunionFinSemana: config.diaReunionFinSemana || 'Sábado',
        horaReunionFinSemana: config.horaReunionFinSemana || '18:00',
        anioEnCurso: config.anioEnCurso || new Date().getFullYear().toString(),
        circuito: config.circuito || '',
        salaAuxiliarHabilitada: !!config.salaAuxiliarHabilitada,
        direccionSalon: config.direccionSalon || '',
        horarioModoTb: config.horarioModoTb || 'estatico',
        horarioOffsetSmt: config.horarioOffsetSmt != null ? config.horarioOffsetSmt : 30,
        horarioModoSmt: config.horarioModoSmt || 'dinamico',
        horarioOffsetCancionVc: config.horarioOffsetCancionVc != null ? config.horarioOffsetCancionVc : 45,
        horarioOffsetVc: config.horarioOffsetVc != null ? config.horarioOffsetVc : 50,
        horarioModoVc: config.horarioModoVc || 'estatico',
        margenTransicionMin: config.margenTransicionMin != null ? config.margenTransicionMin : 1,
        duracionCierreMin: config.duracionCierreMin != null ? config.duracionCierreMin : 8,
        horarioPersonalizadoFilas: config?.horarioPersonalizadoFilas || null,
      })
      setHasChanges(false)
    }
  }

  // Simulación en tiempo real del cronograma S-140 compacto
  const simulacion = useMemo(() => {
    return simularCronogramaReunion(form)
  }, [form])

  // Handlers para personalización fina por fila del lienzo S-140
  function handleToggleModoFila(filaId) {
    const fila = simulacion?.filasDetalladas?.find(f => f.id === filaId)
    if (!fila) return

    const nuevoModo = fila.modo === 'estatico' ? 'dinamico' : 'estatico'

    setForm(prev => {
      const prevCustom = { ...(prev.horarioPersonalizadoFilas || {}) }
      if (nuevoModo === 'dinamico') {
        prevCustom[filaId] = { modo: 'dinamico' }
      } else {
        prevCustom[filaId] = { modo: 'estatico', hora: fila.hora12 }
      }
      return {
        ...prev,
        horarioPersonalizadoFilas: prevCustom,
      }
    })
    setHasChanges(true)
  }

  function handleHoraFilaChange(filaId, nuevaHoraStr) {
    if (!nuevaHoraStr || !nuevaHoraStr.trim()) return

    setForm(prev => {
      const prevCustom = { ...(prev.horarioPersonalizadoFilas || {}) }
      prevCustom[filaId] = {
        modo: 'estatico',
        hora: nuevaHoraStr.trim(),
      }
      return {
        ...prev,
        horarioPersonalizadoFilas: prevCustom,
      }
    })
    setHasChanges(true)
  }

  function handleToggleSeccionModo(seccion) {
    const esEstaticoActual =
      seccion === 'TB'
        ? form.horarioModoTb === 'estatico'
        : seccion === 'SMT'
        ? form.horarioModoSmt === 'estatico'
        : form.horarioModoVc === 'estatico'

    const nuevoModo = esEstaticoActual ? 'dinamico' : 'estatico'
    const campoSeccion =
      seccion === 'TB' ? 'horarioModoTb' : seccion === 'SMT' ? 'horarioModoSmt' : 'horarioModoVc'

    setForm(prev => {
      const prevCustom = { ...(prev.horarioPersonalizadoFilas || {}) }
      const filasDeSeccion = simulacion?.filasDetalladas?.filter(f => f.seccion === seccion) || []

      filasDeSeccion.forEach(f => {
        if (nuevoModo === 'estatico') {
          prevCustom[f.id] = { modo: 'estatico', hora: f.hora12 }
        } else {
          prevCustom[f.id] = { modo: 'dinamico' }
        }
      })

      return {
        ...prev,
        [campoSeccion]: nuevoModo,
        horarioPersonalizadoFilas: prevCustom,
      }
    })
    setHasChanges(true)
  }

  function handleResetFilasCustom() {
    setForm(prev => ({
      ...prev,
      horarioPersonalizadoFilas: null,
    }))
    setHasChanges(true)
    success('Marcas de tiempo restablecidas al cálculo automático estándar.')
  }

  // Manejo de Modal de Eventos
  function openCrearEvento() {
    setEditingEvento(null)
    setEventoForm({
      semana_id: semanas[0]?.id || '',
      tipo_evento: 'asamblea_circuito',
      titulo_evento: 'Asamblea de Circuito',
      fecha_original: semanas[0]?.fecha_inicio || '',
      fecha_efectiva: '',
      hora_efectiva: '',
      afecta_reunion: 'entre_semana',
      descripcion: '',
    })
    setModalEventoOpen(true)
  }

  async function handleSaveEvento(e) {
    e?.preventDefault?.()
    if (!eventoForm.titulo_evento.trim()) {
      toastError('Debes indicar un título para el evento.')
      return
    }

    const res = await guardarEvento({
      ...eventoForm,
      id: editingEvento?.id,
    })

    if (res.ok) {
      success('Evento registrado correctamente.')
      setModalEventoOpen(false)
    } else {
      toastError('Error al guardar evento: ' + (res.error?.message || 'Error desconocido'))
    }
  }

  async function handleDeleteEvento(id, titulo) {
    if (!confirm(`¿Eliminar el evento "${titulo}"?`)) return
    const res = await eliminarEvento(id)
    if (res.ok) {
      success('Evento eliminado.')
    } else {
      toastError('No se pudo eliminar: ' + res.error?.message)
    }
  }

  const cleanCongNombre = form.nombreCongregacion.trim() || 'Congregación'
  const cleanNombreArchivo = cleanCongNombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-14">
      <Toast toast={toast} />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Ajustes de la Congregación
            </h1>
            <Badge variant="purple" size="sm" icon={Shield}>
              Solo Administradores
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-1">
            Personaliza el nombre oficial, horarios de reunión con marcas estáticas/dinámicas y calendario de excepciones.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasChanges && (
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={handleReset}
              disabled={saving}
            >
              Descartar
            </Button>
          )}
          <Button
            variant="accent"
            size="sm"
            icon={Save}
            loading={saving}
            onClick={handleSubmit}
          >
            Guardar cambios
          </Button>
        </div>
      </div>

      {/* ── NAVEGACIÓN POR PESTAÑAS ── */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          General e Identidad
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('horarios')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'horarios'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Horarios y Tiempos S-140
          {simulacion?.meta?.esExceso105Min && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Excede 105 min" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('eventos')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
            activeTab === 'eventos'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-text3 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Eventos y Excepciones
          {eventos.length > 0 && (
            <Badge variant="neutral" size="xs">
              {eventos.length}
            </Badge>
          )}
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── PESTAÑA 1: GENERAL E IDENTIDAD                          ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Identidad */}
            <div className="p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text1">Identidad de la Congregación</h3>
                  <p className="text-[11px] text-text3">Datos oficiales impresos en el S-140 y reportes</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-xs font-medium text-text1 mb-1">
                    Nombre oficial de la congregación <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form.nombreCongregacion}
                    onChange={e => handleChange('nombreCongregacion', e.target.value)}
                    placeholder="Ej. Congregación del Recreo"
                    required
                  />
                  <span className="text-[11px] text-text3 mt-1 block">
                    Aparecerá en el encabezado de los programas y documentos descargados.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text1 mb-1">
                      Circuito <span className="text-text3 font-normal">(opcional)</span>
                    </label>
                    <Input
                      value={form.circuito}
                      onChange={e => handleChange('circuito', e.target.value)}
                      placeholder="Ej. Circuito 12"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text1 mb-1">
                      Año de servicio activo
                    </label>
                    <Select
                      value={form.anioEnCurso}
                      onChange={e => handleChange('anioEnCurso', e.target.value)}
                    >
                      {ANIOS_DISPONIBLES.map(a => (
                        <option key={a} value={a}>
                          Año {a}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text1 mb-1">
                    Dirección del Salón del Reino <span className="text-text3 font-normal">(opcional)</span>
                  </label>
                  <Input
                    value={form.direccionSalon}
                    onChange={e => handleChange('direccionSalon', e.target.value)}
                    placeholder="Ej. Calle Principal #123, Col. Centro"
                  />
                </div>
              </div>
            </div>

            {/* Días y Salón */}
            <div className="space-y-5">
              {/* Días base */}
              <div className="p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text1">Días de Reunión Base</h3>
                    <p className="text-[11px] text-text3">Agenda semanal ordinaria de la congregación</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-xs font-medium text-text1 mb-1">
                      Entre semana (Vida y Ministerio)
                    </label>
                    <Select
                      value={form.diaReunionEntreSemana}
                      onChange={e => handleChange('diaReunionEntreSemana', e.target.value)}
                    >
                      {DIAS_ENTRE_SEMANA.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-text1 mb-1">
                      Fin de semana (Pública y Atalaya)
                    </label>
                    <Select
                      value={form.diaReunionFinSemana}
                      onChange={e => handleChange('diaReunionFinSemana', e.target.value)}
                    >
                      {DIAS_FIN_SEMANA.map(d => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={form.salaAuxiliarHabilitada}
                      onChange={e => handleChange('salaAuxiliarHabilitada', e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <span className="font-medium text-text1 block text-xs">
                        Habilitar Sala Auxiliar (Sala B)
                      </span>
                      <p className="text-[11px] text-text3 leading-relaxed">
                        Activa una segunda clase para las asignaciones de estudiantes en *Seamos Mejores Maestros*.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Previsualización rápida */}
              <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 text-xs font-mono space-y-1">
                <span className="text-[10px] text-text3 font-sans uppercase font-semibold">
                  Nombre de archivo Word S-140 generado:
                </span>
                <span className="text-text1 block text-xs font-medium truncate">
                  S-140_{cleanNombreArchivo}_2026-09.docx
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── PESTAÑA 2: HORARIOS Y MÁRGENES (LIENZO S-140 COMPACTO)  ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'horarios' && (
        <div className="space-y-6">
          {/* Barra de Presets y Hora Base */}
          <div className="p-4 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-text3 uppercase tracking-wider mb-1">
                  Hora de inicio (Entre semana)
                </label>
                <Select
                  value={form.horaReunionEntreSemana}
                  onChange={e => handleChange('horaReunionEntreSemana', e.target.value)}
                  className="font-semibold text-text1"
                >
                  {HORAS_AM_PM.map(h => (
                    <option key={h} value={h}>
                      {h} ({formatHora12(h)})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-text3 uppercase tracking-wider mb-1">
                  Margen entre partes
                </label>
                <Select
                  value={String(form.margenTransicionMin)}
                  onChange={e => handleChange('margenTransicionMin', Number(e.target.value))}
                >
                  <option value="0">0 min (Sin margen)</option>
                  <option value="1">+1 min (Estándar oficial)</option>
                  <option value="2">+2 min (Holgado)</option>
                </Select>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div className="flex items-center gap-1.5 self-start md:self-auto">
              <span className="text-[11px] text-text3 font-medium mr-1 hidden sm:inline">Presets:</span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => aplicarPreset('estandar')}
                title="Bloques anclados con Tesoros fijos (25 min)"
              >
                Estándar Recreo
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => aplicarPreset('cascada')}
                title="Todo calculado en cascada según duración de partes"
              >
                Cascada Pura
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => aplicarPreset('matutino')}
                title="Configuración matutina 09:30 AM"
              >
                09:30 AM
              </Button>
              {form.horarioPersonalizadoFilas && Object.keys(form.horarioPersonalizadoFilas).length > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={handleResetFilasCustom}
                  className="text-text3 hover:text-red-500 text-[11px]"
                  title="Restablecer todas las marcas personalizadas por fila al cálculo automático"
                >
                  Restablecer filas
                </Button>
              )}
            </div>
          </div>

          {/* LIENZO COMPACTO ESTILO S-140 */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs max-w-2xl mx-auto space-y-4 font-sans">
            {/* Encabezado del lienzo */}
            <div className="border-b-2 border-black dark:border-zinc-600 pb-2 flex items-baseline justify-between">
              <div>
                <span className="font-serif font-bold text-base text-zinc-900 dark:text-white">
                  {cleanCongNombre}
                </span>
                <span className="font-serif text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-3">
                  Programa para la reunión de entre semana
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Vista compacta</span>
            </div>

            {/* Subtítulo fecha de ejemplo */}
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
              7 - 13 de Septiembre (Semana de ejemplo)
            </div>

            {/* ── APERTURA ── */}
            <div className="space-y-1 text-xs py-1">
              {(simulacion?.filasDetalladas?.filter(f => f.seccion === 'APERTURA') || []).map(f => (
                <FilaHorarioS140
                  key={f.id}
                  fila={f}
                  onToggleModo={handleToggleModoFila}
                  onHoraChange={handleHoraFilaChange}
                  dotColor="#9ca3af"
                />
              ))}
            </div>

            {/* ── BLOQUE TEAL: TESOROS DE LA BIBLIA ── */}
            <div className="rounded-lg overflow-hidden border border-[#367588]/30">
              <div className="bg-[#367588] text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>💎 TESOROS DE LA BIBLIA</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSeccionModo('TB')}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    form.horarioModoTb === 'estatico'
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-black/20 text-white/80'
                  }`}
                  title="Haz clic para alternar toda la sección entre Estático y Dinámico"
                >
                  {form.horarioModoTb === 'estatico' ? 'ESTÁTICO (25 min)' : 'DINÁMICO'}
                </button>
              </div>

              <div className="p-3 bg-[#367588]/5 dark:bg-[#367588]/10 space-y-1 text-xs">
                {(simulacion?.filasDetalladas?.filter(f => f.seccion === 'TB') || []).map(f => (
                  <FilaHorarioS140
                    key={f.id}
                    fila={f}
                    onToggleModo={handleToggleModoFila}
                    onHoraChange={handleHoraFilaChange}
                  />
                ))}
              </div>
            </div>

            {/* ── BLOQUE DORADO: SEAMOS MEJORES MAESTROS ── */}
            <div className="rounded-lg overflow-hidden border border-[#d9822b]/30">
              <div className="bg-[#d9822b] text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>🌾 SEAMOS MEJORES MAESTROS</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSeccionModo('SMT')}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    form.horarioModoSmt === 'estatico'
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-black/20 text-white/80'
                  }`}
                  title="Alternar toda la sección SMT entre Estático y Dinámico"
                >
                  {form.horarioModoSmt === 'estatico' ? `ESTÁTICO (+${form.horarioOffsetSmt}m)` : 'DINÁMICO'}
                </button>
              </div>

              <div className="p-3 bg-[#d9822b]/5 dark:bg-[#d9822b]/10 space-y-1 text-xs">
                {(simulacion?.filasDetalladas?.filter(f => f.seccion === 'SMT') || []).map(f => (
                  <FilaHorarioS140
                    key={f.id}
                    fila={f}
                    onToggleModo={handleToggleModoFila}
                    onHoraChange={handleHoraFilaChange}
                  />
                ))}
              </div>
            </div>

            {/* ── BLOQUE ROJO: NUESTRA VIDA CRISTIANA ── */}
            <div className="rounded-lg overflow-hidden border border-[#a13b28]/30">
              <div className="bg-[#a13b28] text-white px-3 py-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <span>🐑 NUESTRA VIDA CRISTIANA</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleSeccionModo('VC')}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    form.horarioModoVc === 'estatico'
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-black/20 text-white/80'
                  }`}
                  title="Alternar toda la sección VC entre Estático y Dinámico"
                >
                  {form.horarioModoVc === 'estatico' ? `ESTÁTICO (+${form.horarioOffsetVc}m)` : 'DINÁMICO'}
                </button>
              </div>

              <div className="p-3 bg-[#a13b28]/5 dark:bg-[#a13b28]/10 space-y-1 text-xs">
                {(simulacion?.filasDetalladas?.filter(f => f.seccion === 'VC') || []).map(f => (
                  <FilaHorarioS140
                    key={f.id}
                    fila={f}
                    onToggleModo={handleToggleModoFila}
                    onHoraChange={handleHoraFilaChange}
                    dotColor={f.id === 'vc_cancion' ? '#9ca3af' : null}
                  />
                ))}
              </div>
            </div>

            {/* ── CIERRE ── */}
            <div className="space-y-1 text-xs py-1 border-t border-zinc-200 dark:border-zinc-800">
              {(simulacion?.filasDetalladas?.filter(f => f.seccion === 'CIERRE') || []).map(f => (
                <FilaHorarioS140
                  key={f.id}
                  fila={f}
                  onToggleModo={handleToggleModoFila}
                  onHoraChange={handleHoraFilaChange}
                  dotColor="#9ca3af"
                />
              ))}
            </div>

            {/* ── MEDIDOR DE LOS 105 MINUTOS (SEMÁFORO) ── */}
            <div className="mt-4 pt-3 border-t border-dashed border-zinc-300 dark:border-zinc-700 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text1">Duración total estimada:</span>
                  <span className="font-mono font-bold text-text1">
                    {simulacion?.meta?.duracionTotalMin} min (~{Math.floor((simulacion?.meta?.duracionTotalMin || 0)/60)}h {(simulacion?.meta?.duracionTotalMin || 0)%60}m)
                  </span>
                  <span className="text-text3 text-[11px]">
                    (Concluye a las {simulacion?.meta?.horaFin})
                  </span>
                </div>

                {!simulacion?.meta?.esExceso105Min ? (
                  <Badge variant="success" size="xs" dot>
                    Dentro de pauta (≤ 105 min)
                  </Badge>
                ) : (
                  <Badge variant="warning" size="xs">
                    Excede +{simulacion?.meta?.diferencia105Min} min
                  </Badge>
                )}
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    !simulacion?.meta?.esExceso105Min
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.round(((simulacion?.meta?.duracionTotalMin || 0) / 105) * 100))}%` }}
                />
              </div>
              <p className="text-[11px] text-text3">
                💡 Haz clic en los badges <strong>(ESTÁTICO)</strong> y <strong>(DINÁMICO)</strong> sobre cada parte para alternar cómo reaccionan las horas en tu congregación. Puedes escribir directamente la hora para fijarla como estática.
              </p>

              {hasChanges && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    onClick={handleReset}
                    disabled={saving}
                  >
                    Descartar cambios
                  </Button>
                  <Button
                    variant="accent"
                    size="sm"
                    icon={Save}
                    loading={saving}
                    onClick={handleSubmit}
                  >
                    Guardar horarios
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ── PESTAÑA 3: CALENDARIO Y EXCEPCIONES                      ── */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'eventos' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-text1">Calendario de Eventos y Excepciones</h3>
                <p className="text-[11px] text-text3">
                  Programa asambleas, visitas del superintendente de circuito o reuniones desplazadas con semanas de anticipación.
                </p>
              </div>

              <Button
                variant="accent"
                size="sm"
                icon={Plus}
                onClick={openCrearEvento}
              >
                Nuevo Evento o Excepción
              </Button>
            </div>

            {/* Listado de eventos */}
            {eventos.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-text3 flex items-center justify-center mx-auto">
                  <Calendar className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-text1">No hay eventos o excepciones programadas</p>
                <p className="text-[11px] text-text3 max-w-sm mx-auto">
                  Si tu congregación tiene una Asamblea de Circuito, Asamblea Regional o necesita desplazar una reunión por día feriado, regístrala aquí.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                {eventos.map(evt => {
                  const metaTipo = TIPOS_EVENTO.find(t => t.id === evt.tipo_evento) || {
                    label: evt.tipo_evento,
                    color: 'neutral',
                  }
                  return (
                    <div
                      key={evt.id}
                      className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={metaTipo.color} size="xs">
                            {metaTipo.label}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvento(evt.id, evt.titulo_evento)}
                            className="text-text3 hover:text-red-500 transition-colors cursor-pointer p-1"
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <h4 className="text-xs font-semibold text-text1">{evt.titulo_evento}</h4>

                        {evt.tipo_evento === 'reunion_desplazada' ? (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            Desplazada al: {evt.fecha_efectiva} {evt.hora_efectiva ? `a las ${evt.hora_efectiva}` : ''}
                          </p>
                        ) : (
                          <p className="text-[11px] text-text3">
                            Semana programada: {evt.fecha_original || 'Fecha por confirmar'}
                          </p>
                        )}

                        {evt.descripcion && (
                          <p className="text-[11px] text-text3 italic leading-relaxed">
                            "{evt.descripcion}"
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
        </div>
      )}

      {/* ── MODAL: REGISTRAR EVENTO O EXCEPCIÓN ── */}
      <Dialog
        open={modalEventoOpen}
        onClose={() => setModalEventoOpen(false)}
        title="Registrar Evento o Excepción de Reunión"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalEventoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="accent"
              size="sm"
              loading={savingEventos}
              onClick={handleSaveEvento}
            >
              Guardar Evento
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEvento} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-medium text-text1 mb-1">
              Tipo de Evento o Excepción <span className="text-red-500">*</span>
            </label>
            <Select
              value={eventoForm.tipo_evento}
              onChange={e => {
                const tipo = e.target.value
                const opt = TIPOS_EVENTO.find(t => t.id === tipo)
                setEventoForm(prev => ({
                  ...prev,
                  tipo_evento: tipo,
                  titulo_evento: opt?.label || prev.titulo_evento,
                }))
              }}
            >
              {TIPOS_EVENTO.map(t => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text1 mb-1">
              Título del evento para el S-140 <span className="text-red-500">*</span>
            </label>
            <Input
              value={eventoForm.titulo_evento}
              onChange={e => setEventoForm(prev => ({ ...prev, titulo_evento: e.target.value }))}
              placeholder="Ej. Asamblea de Circuito con SC"
              required
            />
          </div>

          {/* Selector de semana */}
          <div>
            <label className="block text-xs font-medium text-text1 mb-1">
              Semana del Programa afectada
            </label>
            <Select
              value={eventoForm.semana_id}
              onChange={e => {
                const sId = e.target.value
                const sem = semanas.find(s => s.id === sId)
                setEventoForm(prev => ({
                  ...prev,
                  semana_id: sId,
                  fecha_original: sem?.fecha_inicio || prev.fecha_original,
                }))
              }}
            >
              {semanas.map(s => (
                <option key={s.id} value={s.id}>
                  {s.fecha_inicio} — {s.fecha_fin} ({s.mes} {s.anio})
                </option>
              ))}
            </Select>
          </div>

          {/* Campos específicos si se desplaza la reunión */}
          {eventoForm.tipo_evento === 'reunion_desplazada' && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <span className="text-amber-700 dark:text-amber-300 font-semibold block">
                Detalles del Desplazamiento
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-text1 mb-1">
                    Nueva fecha efectiva
                  </label>
                  <Input
                    type="date"
                    value={eventoForm.fecha_efectiva}
                    onChange={e => setEventoForm(prev => ({ ...prev, fecha_efectiva: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-text1 mb-1">
                    Nueva hora (opcional)
                  </label>
                  <Input
                    type="time"
                    value={eventoForm.hora_efectiva}
                    onChange={e => setEventoForm(prev => ({ ...prev, hora_efectiva: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text1 mb-1">
              Reunión afectada
            </label>
            <Select
              value={eventoForm.afecta_reunion}
              onChange={e => setEventoForm(prev => ({ ...prev, afecta_reunion: e.target.value }))}
            >
              <option value="entre_semana">Reunión de Entre Semana (Vida y Ministerio)</option>
              <option value="fin_semana">Reunión de Fin de Semana (Pública y Atalaya)</option>
              <option value="ambas">Ambas reuniones de la semana</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text1 mb-1">
              Notas o descripción interna <span className="text-text3 font-normal">(opcional)</span>
            </label>
            <Input
              value={eventoForm.descripcion}
              onChange={e => setEventoForm(prev => ({ ...prev, descripcion: e.target.value }))}
              placeholder="Ej. La reunión se traslada al miércoles por el feriado del martes."
            />
          </div>
        </form>
      </Dialog>
    </div>
  )
}
