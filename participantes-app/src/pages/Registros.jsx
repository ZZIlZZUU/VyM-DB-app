import { lazy, Suspense } from 'react'
import {
  Search,
  Plus,
  Trash2,
  X,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react'
import { MESES, formatFechaLegible } from '../lib/fechas'
import { TIPO_LABEL, PESO_MAP } from '../components/matriz/matrizUtils'
import { TipoChips } from '../components/matriz/MatrizModals'
import { useRegistrosController } from '../hooks/controllers/useRegistrosController'
import { useEnvironment } from '../hooks/useEnvironment'
import Toast from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import { SkeletonList } from '../components/Skeleton'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Sheet } from '../components/ui/Sheet'

const RegistrosDesktop = lazy(() => import('../environments/desktop/registros/RegistrosDesktop'))
const RegistrosMobile = lazy(() => import('../environments/mobile/registros/RegistrosMobile'))

export default function Registros(props = {}) {
  const { isDesktop } = useEnvironment()
  const {
    toast,
    confirmProps,
    personas,
    participaciones,
    loading,
    fetchError,
    retryFetch,
    form,
    setForm,
    isSheetOpen,
    editId,
    saving,
    search,
    setSearch,
    filterMes,
    setFilterMes,
    filterLista,
    setFilterLista,
    page,
    setPage,
    pageSize,
    setPageSize,
    modoSeleccion,
    setModoSeleccion,
    seleccionados,
    setSeleccionados,
    bulkTipo,
    setBulkTipo,
    personaSeleccionada,
    tiposPermitidos,
    handlePersonaChange,
    startCreate,
    startEdit,
    closeSheet,
    handleSave,
    handleDelete,
    handleBulkEliminar,
    handleBulkCambiarTipo,
    filtered,
    paginated,
    totalRecords,
    totalPages,
    startIndex,
    endIndex,
  } = useRegistrosController(props)

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
      {/* HEADER Y ACCIONES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Historial de Asignaciones
            </h1>
            <Badge variant="neutral" size="sm">
              {participaciones.length} participaciones
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Registro cronológico de participaciones, asignaciones manuales y control de actividad.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={modoSeleccion ? 'accent' : 'secondary'}
            size="md"
            icon={modoSeleccion ? CheckSquare : Square}
            onClick={() => {
              setModoSeleccion(v => !v)
              setSeleccionados(new Set())
              setBulkTipo('')
            }}
          >
            {modoSeleccion ? 'Finalizar selección' : 'Selección en lote'}
          </Button>

          <Button
            variant="accent"
            size="md"
            icon={Plus}
            onClick={startCreate}
          >
            Nuevo registro
          </Button>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por participante o clave..."
            icon={Search}
            size="sm"
            className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
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

          <div className="w-40 shrink-0">
            <Select
              value={filterMes}
              onChange={e => setFilterMes(e.target.value)}
              size="sm"
            >
              <option value="">Todos los meses</option>
              {MESES.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </div>

          {(filterMes || filterLista) && (
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => {
                setFilterMes('')
                setFilterLista('')
              }}
              title="Limpiar filtros"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* BARRA FLOTANTE DE BULK ACTIONS */}
      {modoSeleccion && seleccionados.size > 0 && (
        <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-view-fade">
          <span className="font-semibold text-emerald-900 dark:text-emerald-100">
            {seleccionados.size} registro{seleccionados.size !== 1 ? 's' : ''} seleccionado
            {seleccionados.size !== 1 ? 's' : ''}
          </span>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="w-48">
              <Select
                value={bulkTipo}
                onChange={e => setBulkTipo(e.target.value)}
                size="sm"
              >
                <option value="">— Cambiar tipo en lote —</option>
                {Object.entries(TIPO_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {k} · {v}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              variant="secondary"
              size="sm"
              disabled={!bulkTipo}
              onClick={handleBulkCambiarTipo}
            >
              Aplicar tipo
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={handleBulkEliminar}
            >
              Eliminar ({seleccionados.size})
            </Button>
          </div>
        </div>
      )}

      {/* VISTA BIFURCADA POR ENTORNO: TABLA (ESCRITORIO) vs TARJETAS (MÓVIL) */}
      <Suspense fallback={<SkeletonList rows={8} cols={5} />}>
        {isDesktop ? (
          <RegistrosDesktop
            loading={loading}
            personas={personas}
            filtered={filtered}
            paginated={paginated}
            search={search}
            setSearch={setSearch}
            filterMes={filterMes}
            setFilterMes={setFilterMes}
            filterLista={filterLista}
            setFilterLista={setFilterLista}
            modoSeleccion={modoSeleccion}
            seleccionados={seleccionados}
            setSeleccionados={setSeleccionados}
            startEdit={startEdit}
            handleDelete={handleDelete}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        ) : (
          <RegistrosMobile
            loading={loading}
            personas={personas}
            filtered={filtered}
            paginated={paginated}
            search={search}
            setSearch={setSearch}
            filterMes={filterMes}
            setFilterMes={setFilterMes}
            filterLista={filterLista}
            setFilterLista={setFilterLista}
            modoSeleccion={modoSeleccion}
            seleccionados={seleccionados}
            setSeleccionados={setSeleccionados}
            startEdit={startEdit}
            handleDelete={handleDelete}
            page={page}
            setPage={setPage}
            totalRecords={totalRecords}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        )}
      </Suspense>

      {/* SLIDE-OVER SHEET: AGREGAR / EDITAR REGISTRO */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={closeSheet}
        title={editId ? `Editar registro #${editId}` : 'Nuevo registro de participación'}
        description={
          editId
            ? 'Modifica los datos de la participación registrada.'
            : 'Agrega una asignación directa al historial anual.'
        }
        width="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {editId ? (
              <Button
                variant="dangerGhost"
                size="sm"
                icon={Trash2}
                onClick={() => {
                  handleDelete(editId)
                  closeSheet()
                }}
              >
                Eliminar
              </Button>
            ) : <div />}
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
                disabled={!form.clave || !form.fecha || !form.tipo}
              >
                {editId ? 'Actualizar cambios' : 'Guardar registro'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Participante *
            </label>
            <Select
              value={form.clave}
              onChange={e => handlePersonaChange(e.target.value)}
              size="md"
            >
              <option value="">— Seleccionar participante —</option>
              {['Mat', 'Anc/SM'].map(lista => (
                <optgroup
                  key={lista}
                  label={lista === 'Mat' ? 'Matriculados' : 'Ancianos y Siervos Ministeriales'}
                >
                  {personas
                    .filter(p => p.lista === lista)
                    .map(p => (
                      <option key={p.clave} value={p.clave}>
                        {p.clave} — {p.nombre}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </div>

          {personaSeleccionada && (
            <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Badge variant="neutral" size="xs">
                  {personaSeleccionada.lista}
                </Badge>
                <span className="font-medium text-text1">
                  {personaSeleccionada.estatus}
                </span>
              </div>
              <span className="font-mono text-text3">
                Sexo: {personaSeleccionada.sexo === 'F' ? 'Femenino' : 'Masculino'}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Fecha de participación *
            </label>
            <Input
              type="date"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              size="md"
            />
            {form.fecha && (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                {formatFechaLegible(form.fecha)}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Tipo de participación *
            </label>
            {tiposPermitidos.length > 0 ? (
              <TipoChips
                tipos={tiposPermitidos}
                selected={form.tipo}
                onSelect={t => setForm(f => ({ ...f, tipo: t }))}
              />
            ) : (
              <div className="p-3 text-center text-xs text-text3 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/60 dark:border-zinc-800/60">
                Selecciona un participante primero para ver los roles permitidos.
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-text2 mb-1.5">
              Observaciones <span className="text-text3 text-[11px]">(opcional)</span>
            </label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              placeholder="Ej: Cubrió turno, parte especial..."
              className="w-full px-3 py-2 border border-zinc-200/80 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 resize-none"
            />
          </div>

          {form.clave && form.fecha && form.tipo && (
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5">
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                Resumen de la asignación
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">CLAVE</span>
                  <strong className="font-mono text-text1">{form.clave}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">FECHA</span>
                  <strong className="font-mono text-text1">{form.fecha}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">TIPO</span>
                  <strong className="font-mono text-text1">{form.tipo}</strong>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80">
                  <span className="text-[10px] text-text3 block font-mono">PESO</span>
                  <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                    {PESO_MAP[form.tipo] ?? 1}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </Sheet>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
