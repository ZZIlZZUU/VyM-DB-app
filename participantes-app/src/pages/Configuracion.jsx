import { useState, useEffect } from 'react'
import {
  Building2,
  Calendar,
  Clock,
  Save,
  Check,
  RotateCcw,
  Sparkles,
  FileText,
  Shield,
  Layers,
  MapPin,
  FileSpreadsheet,
  Info,
} from 'lucide-react'
import { useConfiguracion, CONFIG_DEFAULTS } from '../hooks/useConfiguracion'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { formatHora12 } from '../lib/horarios'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

const DIAS_ENTRE_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const DIAS_FIN_SEMANA = ['Sábado', 'Domingo']

const HORAS_ENTRE_SEMANA = [
  '18:00', '18:15', '18:30', '18:45',
  '19:00', '19:15', '19:30', '19:45',
  '20:00', '20:15', '20:30',
]

const HORAS_FIN_SEMANA = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00',
]

const ANIOS_DISPONIBLES = ['2025', '2026', '2027', '2028', '2029', '2030']

export default function Configuracion({ onNavigate }) {
  const { config, loading, saving, guardarConfiguracion } = useConfiguracion()
  const { toast, success, error: toastError } = useToast()

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
  })

  const [hasChanges, setHasChanges] = useState(false)

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
      success('Ajustes de la congregación guardados exitosamente.')
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
      })
      setHasChanges(false)
    }
  }

  const cleanCongNombre = form.nombreCongregacion.trim() || 'Congregación'
  const cleanNombreArchivo = cleanCongNombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_')

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
            Personaliza el nombre oficial, días y horarios de reunión y parámetros de documentos oficiales.
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* ── TARJETA 1: IDENTIDAD INSTITUCIONAL ── */}
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

          {/* ── TARJETA 2: REUNIÓN DE ENTRE SEMANA ── */}
          <div className="p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text1">Reunión de Entre Semana</h3>
                <p className="text-[11px] text-text3">Vida y Ministerio Cristianos (Guía mensual)</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text1 mb-1">
                    Día de la reunión
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
                    Hora de inicio
                  </label>
                  <Select
                    value={form.horaReunionEntreSemana}
                    onChange={e => handleChange('horaReunionEntreSemana', e.target.value)}
                  >
                    {HORAS_ENTRE_SEMANA.map(h => (
                      <option key={h} value={h}>
                        {h} ({formatHora12(h)})
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
                    <span className="font-medium text-text1 block">
                      Habilitar Sala Auxiliar (Sala B)
                    </span>
                    <p className="text-[11px] text-text3 leading-relaxed">
                      Activa esta opción si la congregación conduce una segunda clase para las asignaciones de estudiantes en *Seamos Mejores Maestros*.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* ── TARJETA 3: REUNIÓN DE FIN DE SEMANA ── */}
          <div className="p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text1">Reunión de Fin de Semana</h3>
                <p className="text-[11px] text-text3">Discurso Público y Estudio de La Atalaya</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text1 mb-1">
                    Día de la reunión
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

                <div>
                  <label className="block text-xs font-medium text-text1 mb-1">
                    Hora de inicio
                  </label>
                  <Select
                    value={form.horaReunionFinSemana}
                    onChange={e => handleChange('horaReunionFinSemana', e.target.value)}
                  >
                    {HORAS_FIN_SEMANA.map(h => (
                      <option key={h} value={h}>
                        {h} ({formatHora12(h)})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/30 text-[11px] text-amber-900 dark:text-amber-300">
                El Dashboard calcula automáticamente la reunión más cercana rotando dinámicamente entre la reunión de entre semana ({form.diaReunionEntreSemana}) y la de fin de semana ({form.diaReunionFinSemana}).
              </div>
            </div>
          </div>

          {/* ── TARJETA 4: PREVISUALIZACIÓN DE INTEGRACIÓN Y DOCUMENTOS ── */}
          <div className="p-5 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text1">Previsualización de Documentos</h3>
                <p className="text-[11px] text-text3">Cómo se aplicarán estos ajustes en el sistema</p>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-text3 block font-sans font-semibold">
                  Nombre de archivo exportado (.docx S-140)
                </span>
                <span className="text-text1 text-xs block truncate">
                  S-140_{cleanNombreArchivo}_2026-09.docx
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-text3 block font-sans font-semibold">
                  Encabezado impreso en S-140 y PDF
                </span>
                <span className="text-text1 text-xs block truncate font-sans font-medium">
                  {cleanCongNombre} {form.circuito ? `· ${form.circuito}` : ''}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider text-text3 block font-sans font-semibold">
                  Horarios relativos de reunión entre semana
                </span>
                <span className="text-text2 text-[11px] block font-sans">
                  Inicio: <strong className="text-text1">{formatHora12(form.horaReunionEntreSemana)}</strong> · SMT: <strong className="text-text1">+30 min</strong> · VC: <strong className="text-text1">+50 min</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barra inferior de guardado rápido */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-text3">
            <Info className="w-4 h-4 text-text3 shrink-0" />
            <span>Los cambios se sincronizan en tiempo real para todos los hermanos conectados.</span>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={Save}
            loading={saving}
            onClick={handleSubmit}
          >
            Guardar configuración
          </Button>
        </div>
      </form>
    </div>
  )
}
