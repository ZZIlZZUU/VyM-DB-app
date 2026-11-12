/**
 * Prefetching inteligente de módulos y vistas lazy.
 * Permite precargar el chunk JavaScript de una vista en segundo plano cuando el
 * usuario hace hover o focus sobre un botón del menú, eliminando cualquier delay
 * visible de carga al hacer clic.
 */

const PREFETCH_MAP = {
  home: () => import('../pages/Home'),
  semanal: () => import('../pages/VistaSemanal'),
  calendario: () => import('../components/CalendarioEventos'),
  editable: () => import('../pages/VistaEditable'),
  personas: () => import('../pages/Personas'),
  registros: () => import('../pages/Registros'),
  programa: () => import('../pages/Programa'),
  usuarios: () => import('../pages/Usuarios'),
  configuracion: () => import('../pages/Configuracion'),
  exportar: () => import('../pages/Exportar'),
  estadisticas: () => import('../pages/Estadisticas'),
  historial: () => import('../pages/HistorialCambios'),
  perfil: () => import('../components/PerfilDrawer'),
  palette: () => import('../components/CommandPalette'),
  atajos: () => import('../components/AyudaAtajosModal'),
}

const prefetched = new Set()

export function prefetchView(viewId) {
  if (!viewId || prefetched.has(viewId)) return
  const loader = PREFETCH_MAP[viewId]
  if (loader) {
    prefetched.add(viewId)
    // Usar requestIdleCallback cuando esté disponible para no competir con renders activos
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loader().catch(() => prefetched.delete(viewId))
      }, { timeout: 1500 })
    } else {
      setTimeout(() => {
        loader().catch(() => prefetched.delete(viewId))
      }, 50)
    }
  }
}
