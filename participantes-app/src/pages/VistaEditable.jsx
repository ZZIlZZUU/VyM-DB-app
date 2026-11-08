import { lazy, Suspense } from 'react'
import { Search, Flame, X, RotateCcw } from 'lucide-react'
import Toast from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Tooltip } from '../components/ui/Tooltip'
import {
  TIPOS_BARRA_MAT,
  TIPOS_BARRA_ANC,
  TIPO_LABEL,
  BADGE_STYLES,
} from '../components/matriz/matrizUtils'
import { MatCellModal, AncCellModal } from '../components/matriz/MatrizModals'
import { useMatrizController } from '../hooks/controllers/useMatrizController'
import { useEnvironment } from '../hooks/useEnvironment'

const MatrizDesktop = lazy(() => import('../environments/desktop/matriz/MatrizDesktop'))
const MatrizMobile = lazy(() => import('../environments/mobile/matriz/MatrizMobile'))

export default function VistaEditable({ onNavigate }) {
  const { isDesktop } = useEnvironment()
  const {
    config,
    eventos,
    toast,
    personas,
    registros,
    fetchError,
    retryFetch,
    tab,
    setTab,
    heatMap,
    setHeatMap,
    searchMat,
    setSearchMat,
    sexoFil,
    setSexoFil,
    searchAnc,
    setSearchAnc,
    ancEstatusFil,
    setAncEstatusFil,
    filtroActividad,
    setFiltroActividad,
    tiposDesactivados,
    toggleTipo,
    currentMonthIdx,
    matPersonas,
    ancPersonas,
    activePersonas,
    countSinPartMat,
    countSinPartAnc,
    hasActiveFilters,
    handleResetFilters,
    maxRegistros,
    getCeldaRegistros,
    getTotalPersona,
    matModal,
    setMatModal,
    ancModal,
    setAncModal,
    openCellModal,
    handleDelete,
    handleAncAdd,
  } = useMatrizController()

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
      {/* ── HEADER Y TABS DE LA PÁGINA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Matriz Anual
            </h1>
            <Badge variant="neutral" size="sm">
              {personas.length} activos
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Cuadrícula interactiva anual de participaciones por mes con mapa de rotación.
          </p>
        </div>

        {/* Pestañas de Lista */}
        <div className="flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/90 text-xs">
          <button
            type="button"
            onClick={() => setTab('mat')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              tab === 'mat'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Matriculados ({matPersonas.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('anc')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              tab === 'anc'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-200/50 dark:border-zinc-700/60'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Ancianos y SM ({ancPersonas.length})
          </button>
        </div>
      </div>

      {/* ── BARRA DE HERRAMIENTAS Y FILTROS ── */}
      <div className="space-y-2.5 p-3 rounded-xl bg-surface/80 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Input
              value={tab === 'mat' ? searchMat : searchAnc}
              onChange={e =>
                tab === 'mat' ? setSearchMat(e.target.value) : setSearchAnc(e.target.value)
              }
              placeholder={`Buscar en ${tab === 'mat' ? 'Matriculados' : 'Ancianos'}...`}
              icon={Search}
              size="sm"
              className="border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 text-text1 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            {(tab === 'mat' ? searchMat : searchAnc) && (
              <button
                type="button"
                onClick={() => (tab === 'mat' ? setSearchMat('') : setSearchAnc(''))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Barra de tipos de asignaciones interactiva */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1 hidden sm:inline select-none">
              Tipos:
            </span>
            {(tab === 'mat' ? TIPOS_BARRA_MAT : TIPOS_BARRA_ANC).map(t => {
              const isDeactivated = tiposDesactivados.has(t)
              const label = TIPO_LABEL[t] || t
              const style = BADGE_STYLES[t] || 'bg-zinc-100 dark:bg-zinc-800 text-text2'
              const tooltipContent = isDeactivated
                ? `${label} (${t}) — Desactivado (clic para activar)`
                : `${label} (${t}) — Activo (clic para desactivar)`

              return (
                <Tooltip key={t} content={tooltipContent} side="bottom">
                  <button
                    type="button"
                    onClick={() => toggleTipo(t)}
                    aria-label={tooltipContent}
                    className={`inline-flex items-center justify-center min-w-5 h-4.5 px-1.5 rounded text-[10px] font-semibold font-mono border select-none cursor-pointer transition-all duration-150 ${
                      isDeactivated
                        ? 'opacity-25 grayscale line-through border-dashed border-zinc-400 dark:border-zinc-600 bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 hover:opacity-60'
                        : `${style} hover:scale-105 active:scale-95 shadow-2xs`
                    }`}
                  >
                    {t}
                  </button>
                </Tooltip>
              )
            })}
          </div>
        </div>

        {/* Chips de filtro rápido e integración de Mapa de calor */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
              Filtro rápido:
            </span>
            <button
              type="button"
              onClick={() => {
                setFiltroActividad('todos')
                if (tab === 'mat') {
                  setSexoFil('')
                } else {
                  setAncEstatusFil('')
                }
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                filtroActividad === 'todos' && (tab === 'mat' ? !sexoFil : !ancEstatusFil)
                  ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900 border-zinc-700 dark:border-zinc-300 shadow-2xs'
                  : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() =>
                setFiltroActividad(f =>
                  f === 'sin_participacion' ? 'todos' : 'sin_participacion'
                )
              }
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1.5 ${
                filtroActividad === 'sin_participacion'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-semibold shadow-2xs'
                  : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
              }`}
            >
              <span>Sin participaciones</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80">
                {tab === 'mat' ? countSinPartMat : countSinPartAnc}
              </span>
            </button>

            {tab === 'mat' ? (
              <>
                <button
                  type="button"
                  onClick={() => setSexoFil(s => (s === 'M' ? '' : 'M'))}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    sexoFil === 'M'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Varones
                </button>
                <button
                  type="button"
                  onClick={() => setSexoFil(s => (s === 'F' ? '' : 'F'))}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    sexoFil === 'F'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Mujeres
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAncEstatusFil(e => (e === 'Anciano' ? '' : 'Anciano'))}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    ancEstatusFil === 'Anciano'
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Ancianos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setAncEstatusFil(e =>
                      e === 'Siervo Ministerial' ? '' : 'Siervo Ministerial'
                    )
                  }
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    ancEstatusFil === 'Siervo Ministerial'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold shadow-2xs'
                      : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                  }`}
                >
                  Siervos Ministeriales
                </button>
              </>
            )}

            {/* Separador */}
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />

            {/* Toggle Mapa de calor integrado con escala visual suave */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHeatMap(h => !h)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none ${
                  heatMap
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-semibold shadow-2xs'
                    : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-text3 border-zinc-200/80 dark:border-zinc-700/60 hover:text-text1'
                }`}
                title="Alternar resaltado suave de intensidad por cantidad de participaciones"
              >
                <Flame
                  className={`w-3.5 h-3.5 ${
                    heatMap
                      ? 'text-emerald-600 dark:text-emerald-400 fill-emerald-500/20'
                      : 'text-text3'
                  }`}
                />
                <span>Mapa de calor</span>
              </button>

              {heatMap && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-text3 pl-0.5 animate-in fade-in duration-200 select-none">
                  <span className="text-[10px] font-mono text-zinc-400">1</span>
                  <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60">
                    <Tooltip content="1 asignación en el mes" side="bottom">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/15 dark:bg-emerald-500/20 cursor-help" />
                    </Tooltip>
                    <Tooltip content="2 asignaciones en el mes" side="bottom">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/35 dark:bg-emerald-500/40 cursor-help" />
                    </Tooltip>
                    <Tooltip content="3 o más asignaciones en el mes" side="bottom">
                      <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/65 dark:bg-emerald-500/70 cursor-help" />
                    </Tooltip>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">3+</span>
                </div>
              )}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="ml-auto text-xs text-text3 hover:text-text1 flex items-center gap-1 cursor-pointer transition-colors"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* ── VISTA BIFURCADA POR ENTORNO: CUADRÍCULA (ESCRITORIO) vs MINI-BARRAS (MÓVIL) ── */}
      <Suspense fallback={<SkeletonList rows={8} cols={6} />}>
        {isDesktop ? (
          <MatrizDesktop
            activePersonas={activePersonas}
            currentMonthIdx={currentMonthIdx}
            heatMap={heatMap}
            maxRegistros={maxRegistros}
            hasActiveFilters={hasActiveFilters}
            handleResetFilters={handleResetFilters}
            getCeldaRegistros={getCeldaRegistros}
            getTotalPersona={getTotalPersona}
            openCellModal={openCellModal}
          />
        ) : (
          <MatrizMobile
            activePersonas={activePersonas}
            currentMonthIdx={currentMonthIdx}
            heatMap={heatMap}
            hasActiveFilters={hasActiveFilters}
            handleResetFilters={handleResetFilters}
            getCeldaRegistros={getCeldaRegistros}
            getTotalPersona={getTotalPersona}
            openCellModal={openCellModal}
          />
        )}
      </Suspense>

      {/* ── MODALES DE CELDA ── */}
      <MatCellModal
        open={matModal.open}
        onClose={() => setMatModal(m => ({ ...m, open: false }))}
        persona={matModal.persona}
        mesIdx={matModal.mesIdx}
        registros={registros}
        onNavigate={onNavigate}
      />

      <AncCellModal
        open={ancModal.open}
        onClose={() => setAncModal(m => ({ ...m, open: false }))}
        persona={ancModal.persona}
        mesIdx={ancModal.mesIdx}
        registros={registros}
        onAdd={handleAncAdd}
        onDelete={handleDelete}
        eventos={eventos}
        config={config}
      />

      <Toast toast={toast} />
    </div>
  )
}
