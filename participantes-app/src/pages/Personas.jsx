import { lazy, Suspense } from 'react'
import {
  Search,
  UserPlus,
  RotateCcw,
  X,
  Clock,
  Calendar,
  History,
  PowerOff,
  Trash2,
} from 'lucide-react'
import { formatFechaLegible, formatFechaConDia } from '../lib/fechas'
import { TIPO_LABEL, TIPO_COLOR } from '../lib/conflictosRotacion'
import { usePersonasController } from '../hooks/controllers/usePersonasController'
import { useEnvironment } from '../hooks/useEnvironment'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonBlock, SkeletonList } from '../components/Skeleton'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Sheet } from '../components/ui/Sheet'

const PersonasDesktop = lazy(() => import('../environments/desktop/personas/PersonasDesktop'))
const PersonasMobile = lazy(() => import('../environments/mobile/personas/PersonasMobile'))

export default function Personas(props) {
  const { isDesktop } = useEnvironment()
  const {
    toast,
    confirmProps,
    nombreInputRef,
    loading,
    fetchError,
    retryFetch,
    searchVal,
    setSearchVal,
    filterLista,
    setFilterLista,
    filterActivo,
    setFilterActivo,
    sortField,
    sortDirection,
    handleSort,
    filtered,
    totalCount,
    activeCount,
    inactiveCount,
    currentYear,
    conteosAnio,
    sheetOpen,
    editClave,
    form,
    setForm,
    updateFormLista,
    updateFormSexo,
    saving,
    activeSheetTab,
    setActiveSheetTab,
    proximas,
    historial,
    loadingHistorial,
    historialFetchedFor,
    fetchHistorialPersona,
    clavePreview,
    estatusOpts,
    startCreate,
    startEdit,
    closeSheet,
    handleSave,
    handleDeletePersona,
    toggleActivo,
  } = usePersonasController(props)

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 bg-surface border border-zinc-200 dark:border-zinc-800 rounded-xl max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
          <PowerOff className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text1">Error de conexión</h3>
          <p className="text-xs text-text3 font-mono mt-1">{fetchError}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RotateCcw}
          onClick={retryFetch}
        >
          Reintentar conexión
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* HEADER Y MÉTRICAS DE LA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Participantes
            </h1>
            <Badge variant="neutral" size="sm">
              {totalCount} registrados
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Directorio y administración de participantes activos e historial de registro.
          </p>
        </div>

        {/* Métricas rápidas & Botón Crear */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 text-xs">
            <span className="flex items-center gap-1.5 text-text2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
              <strong className="text-text1">{activeCount}</strong> activos
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <span className="flex items-center gap-1.5 text-text2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />
              <strong className="text-text1">{inactiveCount}</strong> inactivos
            </span>
          </div>

          <Button
            variant="accent"
            size="md"
            icon={UserPlus}
            onClick={startCreate}
          >
            Nuevo participante
          </Button>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        {/* Buscador en vivo */}
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Buscar por nombre o clave (ej. M-010)..."
            icon={Search}
            size="sm"
            className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-600"
          />
          {searchVal && (
            <button
              type="button"
              onClick={() => setSearchVal('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros segmentados */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs shrink-0">
            {[
              { id: '', label: 'Todas las listas' },
              { id: 'Mat', label: 'Matriculados' },
              { id: 'Anc/SM', label: 'Ancianos / SM' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterLista(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  filterLista === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs shrink-0">
            {[
              { id: 'true', label: 'Activos' },
              { id: 'false', label: 'Inactivos' },
              { id: '', label: 'Todos' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterActivo(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  filterActivo === tab.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VISTA BIFURCADA POR ENTORNO: TABLA (ESCRITORIO) vs TARJETAS (MÓVIL) */}
      <Suspense fallback={<SkeletonList rows={8} cols={5} />}>
        {isDesktop ? (
          <PersonasDesktop
            loading={loading}
            filtered={filtered}
            totalCount={totalCount}
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            sortField={sortField}
            sortDirection={sortDirection}
            handleSort={handleSort}
            currentYear={currentYear}
            conteosAnio={conteosAnio}
            startEdit={startEdit}
            toggleActivo={toggleActivo}
          />
        ) : (
          <PersonasMobile
            loading={loading}
            filtered={filtered}
            totalCount={totalCount}
            searchVal={searchVal}
            setSearchVal={setSearchVal}
            currentYear={currentYear}
            conteosAnio={conteosAnio}
            startEdit={startEdit}
            toggleActivo={toggleActivo}
          />
        )}
      </Suspense>

      {/* SLIDE-OVER SHEET LATERAL (DRAWER) */}
      <Sheet
        isOpen={sheetOpen}
        onClose={closeSheet}
        title={
          editClave
            ? activeSheetTab === 'historial'
              ? `${form.nombre || editClave}`
              : `Editar: ${editClave}`
            : 'Nuevo Participante'
        }
        description={
          editClave
            ? activeSheetTab === 'historial'
              ? 'Línea de tiempo de participaciones pasadas y próximas asignaciones.'
              : 'Modifica los datos del participante y guarda los cambios.'
            : 'Completa la información básica para registrar al participante en el sistema.'
        }
        width="md"
        footer={
          activeSheetTab === 'historial' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={closeSheet}
            >
              Cerrar
            </Button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div>
                {editClave && (
                  <Button
                    variant="dangerGhost"
                    size="sm"
                    icon={Trash2}
                    disabled={saving}
                    onClick={() => handleDeletePersona(editClave)}
                    title="Eliminar permanentemente si no tiene registros"
                  >
                    Eliminar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeSheet}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  loading={saving}
                  onClick={handleSave}
                >
                  {editClave ? 'Guardar cambios' : 'Registrar participante'}
                </Button>
              </div>
            </div>
          )
        }
      >
        {editClave && (
          <div className="flex border-b border-zinc-200/80 dark:border-zinc-800 -mx-5 -mt-5 mb-5 px-5 bg-zinc-50/70 dark:bg-zinc-900/40">
            <button
              type="button"
              onClick={() => setActiveSheetTab('perfil')}
              className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeSheetTab === 'perfil'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text3 hover:text-text1'
              }`}
            >
              Perfil
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSheetTab('historial')
                if (historialFetchedFor !== editClave) {
                  fetchHistorialPersona(editClave)
                }
              }}
              className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSheetTab === 'historial'
                  ? 'border-accent text-accent font-semibold'
                  : 'border-transparent text-text3 hover:text-text1'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Historial</span>
              {historialFetchedFor === editClave && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[10px] font-mono text-text2">
                  {historial.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* PESTAÑA PERFIL */}
        {activeSheetTab === 'perfil' && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {editClave ? 'Clave asignada' : 'Clave generada automática'}
                </span>
                <span className="font-mono text-sm font-semibold text-text1 mt-0.5">
                  {clavePreview}
                </span>
              </div>
              <Badge variant={form.lista === 'Mat' ? 'info' : 'warning'} size="xs">
                {form.lista === 'Mat' ? 'Matriculados' : 'Ancianos / SM'}
              </Badge>
            </div>

            <div>
              <label className="block text-xs font-medium text-text2 mb-1.5">
                Nombre completo *
              </label>
              <Input
                ref={nombreInputRef}
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Ana María Flores"
                required
                size="md"
              />
              <p className="text-[11px] text-text3 mt-1">
                Nombre visible que aparecerá en el programa semanal y registros de participaciones.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text2 mb-1.5">
                  Lista *
                </label>
                <Select
                  value={form.lista}
                  disabled={Boolean(editClave)}
                  onChange={e => updateFormLista(e.target.value)}
                  size="md"
                >
                  <option value="Mat">Matriculados</option>
                  <option value="Anc/SM">Ancianos / SM</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text2 mb-1.5">
                  Sexo *
                </label>
                <Select
                  value={form.sexo}
                  disabled={form.lista === 'Anc/SM'}
                  onChange={e => updateFormSexo(e.target.value)}
                  size="md"
                >
                  <option value="F">F — Femenino</option>
                  <option value="M">M — Masculino</option>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text2 mb-1.5">
                Estatus de asignación *
              </label>
              <Select
                value={form.estatus}
                onChange={e => setForm(f => ({ ...f, estatus: e.target.value }))}
                size="md"
              >
                {estatusOpts.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
              <p className="text-[11px] text-text3 mt-1">
                Determina los tipos de partes bíblicas y roles en los que puede participar.
              </p>
            </div>
          </form>
        )}

        {/* PESTAÑA HISTORIAL (TIMELINE) */}
        {activeSheetTab === 'historial' && (
          <div className="space-y-6">
            {loadingHistorial ? (
              <div className="space-y-4 py-2">
                <SkeletonBlock className="h-4 w-40 rounded-md" />
                <SkeletonBlock className="h-20 rounded-xl" />
                <SkeletonBlock className="h-4 w-48 rounded-md mt-4" />
                <SkeletonBlock className="h-12 rounded-lg" />
                <SkeletonBlock className="h-12 rounded-lg" />
                <SkeletonBlock className="h-12 rounded-lg" />
              </div>
            ) : (
              <>
                {proximas.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-xs font-mono font-semibold text-text1 uppercase tracking-wider">
                        Próximas Asignaciones ({proximas.length})
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {proximas.map(asig => {
                        const parte = asig.programa_partes
                        const sem = parte?.programa_semanas
                        const tipo = parte?.tipo_asignacion || 'T'
                        const tipoColor =
                          TIPO_COLOR[tipo] ||
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200'
                        const tipoLabel = TIPO_LABEL[tipo] || tipo

                        return (
                          <div
                            key={asig.id}
                            className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex flex-col gap-1.5 text-xs shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-text1">
                                {sem?.fecha_inicio
                                  ? formatFechaConDia(sem.fecha_inicio)
                                  : 'Semana programada'}
                              </span>
                              <Badge variant={asig.confirmado ? 'success' : 'warning'} size="xs" dot>
                                {asig.confirmado ? 'Confirmada' : 'Pendiente'}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0 ${tipoColor}`}>
                                {tipo}
                              </span>
                              <span className="font-medium text-text1 truncate">
                                {parte?.titulo || tipoLabel}
                              </span>
                              {asig.rol === 'ayudante' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 font-mono shrink-0">
                                  Ayudante
                                </span>
                              )}
                              {parte?.seccion === 'maestros' && (
                                <span className="text-[10px] text-text3 font-mono shrink-0 hidden sm:inline">
                                  · Escuela
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-xs font-mono font-semibold text-text1 uppercase tracking-wider">
                        Historial de Participaciones
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-text3">
                      {historial.length} {historial.length === 1 ? 'participación registrada' : 'participaciones registradas'}
                    </span>
                  </div>

                  {historial.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-zinc-50/60 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60 flex flex-col items-center justify-center space-y-2">
                      <History className="w-7 h-7 text-text3/60" />
                      <p className="text-xs text-text3 font-medium">
                        Sin participaciones registradas aún
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl overflow-hidden bg-surface">
                      {historial.map(p => {
                        const tipo = p.tipo || 'T'
                        const tipoColor =
                          TIPO_COLOR[tipo] ||
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200'
                        const tipoLabel = TIPO_LABEL[tipo] || tipo

                        return (
                          <div
                            key={p.id}
                            className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-xs text-text2 font-medium shrink-0">
                                {formatFechaLegible(p.fecha)}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0 ${tipoColor}`}>
                                {tipo}
                              </span>
                              <span className="text-xs text-text1 truncate">
                                {tipoLabel}
                              </span>
                            </div>

                            {p.observaciones && (
                              <span className="text-[11px] text-text3 italic truncate max-w-[150px] text-right shrink-0">
                                {p.observaciones}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
