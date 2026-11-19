// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  HOME_WIDGETS_STORAGE_KEY,
  WIDGET_CATALOG,
  DEFAULT_HOME_LAYOUT,
  getWidgetMeta,
  clampWidgetSize,
  rectsOverlap,
  resizeWidgetWithNeighbors,
  moveWidgetInGrid,
  addWidgetToLayout,
  loadHomeLayout,
  saveHomeLayout,
  resetHomeLayout,
  getColSpanClass,
  getRowSpanClass,
  getColStartClass,
  getRowStartClass,
} from './homeWidgetsConfig'

function assertNoOverlaps(layout) {
  const visible = layout.filter(item => item.visible !== false)
  for (let i = 0; i < visible.length; i++) {
    expect(visible[i].x).toBeGreaterThanOrEqual(0)
    expect(visible[i].y).toBeGreaterThanOrEqual(0)
    expect(visible[i].x + visible[i].w).toBeLessThanOrEqual(12)
    for (let j = i + 1; j < visible.length; j++) {
      expect(rectsOverlap(visible[i], visible[j])).toBe(false)
    }
  }
}

describe('homeWidgetsConfig', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('DEFAULT_HOME_LAYOUT', () => {
    it('asigna coordenadas (x, y, w, h) válidas sin solapamientos para todos los widgets visibles', () => {
      expect(DEFAULT_HOME_LAYOUT).toHaveLength(WIDGET_CATALOG.length)
      assertNoOverlaps(DEFAULT_HOME_LAYOUT)
    })
  })

  describe('clampWidgetSize', () => {
    it('impide reducir widgets complejos por debajo de sus límites mínimos (ej. evita 1×1)', () => {
      expect(clampWidgetSize('hero_reunion', 1, 1)).toEqual({ w: 6, h: 2 })
      expect(clampWidgetSize('programa_semana', 1, 1)).toEqual({ w: 6, h: 3 })
      expect(clampWidgetSize('por_resolver', 2, 1)).toEqual({ w: 4, h: 2 })
      expect(clampWidgetSize('kpi_participantes', 1, 1)).toEqual({ w: 3, h: 1 })
      expect(clampWidgetSize('accesos_rapidos', 1, 0)).toEqual({ w: 3, h: 1 })
    })

    it('restringe dimensiones que exceden los máximos permitidos por widget', () => {
      expect(clampWidgetSize('hero_reunion', 20, 10)).toEqual({ w: 12, h: 3 })
      expect(clampWidgetSize('por_resolver', 12, 8)).toEqual({ w: 6, h: 4 })
      expect(clampWidgetSize('programa_semana', 15, 9)).toEqual({ w: 12, h: 5 })
      expect(clampWidgetSize('kpi_participantes', 12, 5)).toEqual({ w: 6, h: 2 })
      expect(clampWidgetSize('accesos_rapidos', 16, 4)).toEqual({ w: 12, h: 2 })
    })

    it('conserva tamaños válidos dentro de [minW..maxW] × [minH..maxH] y usa defaults si hay NaN', () => {
      expect(clampWidgetSize('hero_reunion', 10, 3)).toEqual({ w: 10, h: 3 })
      expect(clampWidgetSize('programa_semana', 8, 4)).toEqual({ w: 8, h: 4 })

      const heroMeta = getWidgetMeta('hero_reunion')
      expect(clampWidgetSize('hero_reunion', 'abc', undefined)).toEqual({
        w: heroMeta.defaultW,
        h: heroMeta.defaultH,
      })
    })
  })

  describe('resizeWidgetWithNeighbors (ajuste elástico y empuje)', () => {
    it('reduce automáticamente el ancho del vecino contiguo cuando tiene margen sobre su minW', () => {
      const next = resizeWidgetWithNeighbors(
        DEFAULT_HOME_LAYOUT,
        'kpi_participantes',
        { x: 0, y: 2, w: 5, h: 1 },
        'e'
      )

      const kpi1 = next.find(w => w.id === 'kpi_participantes')
      const kpi2 = next.find(w => w.id === 'kpi_confirmadas')
      expect(kpi1).toMatchObject({ x: 0, y: 2, w: 5, h: 1 })
      expect(kpi2).toMatchObject({ x: 5, y: 2, w: 3, h: 1 })
      assertNoOverlaps(next)
    })

    it('encoge al vecino izquierdo al expandir desde el borde izquierdo (handle w)', () => {
      const next = resizeWidgetWithNeighbors(
        DEFAULT_HOME_LAYOUT,
        'por_resolver',
        { x: 6, y: 0, w: 6, h: 2 },
        'w'
      )

      const hero = next.find(w => w.id === 'hero_reunion')
      const resolver = next.find(w => w.id === 'por_resolver')
      expect(hero).toMatchObject({ x: 0, y: 0, w: 6, h: 2 })
      expect(resolver).toMatchObject({ x: 6, y: 0, w: 6, h: 2 })
      assertNoOverlaps(next)
    })

    it('empuja al vecino hacia abajo cuando ya alcanzó su minW y garantiza cero solapamientos', () => {
      const next = resizeWidgetWithNeighbors(
        DEFAULT_HOME_LAYOUT,
        'hero_reunion',
        { x: 0, y: 0, w: 10, h: 2 },
        'e'
      )

      const hero = next.find(w => w.id === 'hero_reunion')
      const resolver = next.find(w => w.id === 'por_resolver')
      expect(hero).toMatchObject({ x: 0, y: 0, w: 10, h: 2 })
      expect(resolver.y).toBeGreaterThanOrEqual(2)
      assertNoOverlaps(next)
    })

    it('empuja filas inferiores al expandir alto hacia abajo y compacta sin colisiones', () => {
      const next = resizeWidgetWithNeighbors(
        DEFAULT_HOME_LAYOUT,
        'hero_reunion',
        { x: 0, y: 0, w: 8, h: 3 },
        's'
      )

      const hero = next.find(w => w.id === 'hero_reunion')
      expect(hero).toMatchObject({ x: 0, y: 0, w: 8, h: 3 })
      assertNoOverlaps(next)
    })

    it('al expandir programa_semana a la derecha (8×4) con e/se encoge mas_adelante y actividad_reciente sin alterar accesos_rapidos', () => {
      for (const handle of ['e', 'se']) {
        const next = resizeWidgetWithNeighbors(
          DEFAULT_HOME_LAYOUT,
          'programa_semana',
          { x: 0, y: 3, w: 8, h: 4 },
          handle
        )

        const programa = next.find(w => w.id === 'programa_semana')
        const masAdelante = next.find(w => w.id === 'mas_adelante')
        const actividad = next.find(w => w.id === 'actividad_reciente')
        const accesos = next.find(w => w.id === 'accesos_rapidos')

        expect(programa).toMatchObject({ x: 0, y: 3, w: 8, h: 4 })
        expect(masAdelante).toMatchObject({ x: 8, y: 3, w: 4, h: 2 })
        expect(actividad).toMatchObject({ x: 8, y: 5, w: 4, h: 2 })
        expect(accesos).toMatchObject({ x: 6, y: 7, w: 6, h: 2 })
        assertNoOverlaps(next)
      }
    })

    it('al expandir programa_semana hacia abajo (7×5) con s/se empuja rezago_rotacion y accesos_rapidos verticalmente sin encoger accesos_rapidos en ancho', () => {
      for (const handle of ['s', 'se']) {
        const next = resizeWidgetWithNeighbors(
          DEFAULT_HOME_LAYOUT,
          'programa_semana',
          { x: 0, y: 3, w: 7, h: 5 },
          handle
        )

        const programa = next.find(w => w.id === 'programa_semana')
        const rezago = next.find(w => w.id === 'rezago_rotacion')
        const accesos = next.find(w => w.id === 'accesos_rapidos')

        expect(programa).toMatchObject({ x: 0, y: 3, w: 7, h: 5 })
        expect(rezago.y).toBeGreaterThanOrEqual(8)
        expect(accesos.y).toBeGreaterThanOrEqual(8)
        expect(accesos.w).toBe(6)
        assertNoOverlaps(next)
      }
    })

    it('al intentar expandir programa_semana hacia arriba (n) contra KPIs en minH redirige el crecimiento a y: 3, h: 5 sin desplazar KPIs debajo', () => {
      const next = resizeWidgetWithNeighbors(
        DEFAULT_HOME_LAYOUT,
        'programa_semana',
        { x: 0, y: 2, w: 7, h: 5 },
        'n'
      )

      const programa = next.find(w => w.id === 'programa_semana')
      const kpi1 = next.find(w => w.id === 'kpi_participantes')
      const kpi2 = next.find(w => w.id === 'kpi_confirmadas')

      expect(programa).toMatchObject({ x: 0, y: 3, w: 7, h: 5 })
      expect(kpi1).toMatchObject({ x: 0, y: 2, w: 4, h: 1 })
      expect(kpi2).toMatchObject({ x: 4, y: 2, w: 4, h: 1 })
      assertNoOverlaps(next)
    })
  })

  describe('moveWidgetInGrid / addWidgetToLayout', () => {
    it('intercambia o desliza vecinos al mover un widget a una celda ocupada sin solapamientos', () => {
      const swappedKpis = moveWidgetInGrid(DEFAULT_HOME_LAYOUT, 'kpi_confirmadas', 8, 2)
      const kpi2 = swappedKpis.find(w => w.id === 'kpi_confirmadas')
      const kpi3 = swappedKpis.find(w => w.id === 'kpi_sin_asignar')
      expect(kpi2).toMatchObject({ x: 8, y: 2, w: 4, h: 1 })
      expect(kpi3).toMatchObject({ x: 4, y: 2, w: 4, h: 1 })
      assertNoOverlaps(swappedKpis)

      const slidTopRow = moveWidgetInGrid(DEFAULT_HOME_LAYOUT, 'por_resolver', 0, 0)
      const resolver = slidTopRow.find(w => w.id === 'por_resolver')
      const hero = slidTopRow.find(w => w.id === 'hero_reunion')
      expect(resolver).toMatchObject({ x: 0, y: 0, w: 4, h: 2 })
      expect(hero).toMatchObject({ x: 4, y: 0, w: 8, h: 2 })
      assertNoOverlaps(slidTopRow)
    })

    it('coloca nuevamente un widget oculto en el primer hueco libre disponible', () => {
      const withoutKpi = DEFAULT_HOME_LAYOUT.map(w =>
        w.id === 'kpi_confirmadas' ? { ...w, visible: false } : w
      )
      const restored = addWidgetToLayout(withoutKpi, 'kpi_confirmadas')
      const kpi = restored.find(w => w.id === 'kpi_confirmadas')
      expect(kpi.visible).toBe(true)
      expect(kpi).toMatchObject({ x: 4, y: 2 })
      assertNoOverlaps(restored)
    })
  })

  describe('loadHomeLayout / saveHomeLayout / resetHomeLayout', () => {
    it('devuelve DEFAULT_HOME_LAYOUT cuando localStorage está vacío o tiene JSON inválido', () => {
      expect(loadHomeLayout()).toEqual(DEFAULT_HOME_LAYOUT)

      window.localStorage.setItem(HOME_WIDGETS_STORAGE_KEY, '{invalid json')
      expect(loadHomeLayout()).toEqual(DEFAULT_HOME_LAYOUT)

      window.localStorage.setItem(HOME_WIDGETS_STORAGE_KEY, JSON.stringify({ not: 'an-array' }))
      expect(loadHomeLayout()).toEqual(DEFAULT_HOME_LAYOUT)
    })

    it('migra layouts sin coordenadas x/y, normaliza límites y elimina duplicados', () => {
      const savedLegacy = [
        { id: 'programa_semana', w: 1, h: 1, visible: true },
        { id: 'programa_semana', w: 9, h: 5, visible: false },
        { id: 'widget_inexistente', w: 4, h: 2, visible: true },
        { id: 'kpi_participantes', w: 5, h: 2, visible: false },
      ]
      window.localStorage.setItem(HOME_WIDGETS_STORAGE_KEY, JSON.stringify(savedLegacy))

      const loaded = loadHomeLayout()
      expect(loaded).toHaveLength(WIDGET_CATALOG.length)
      expect(loaded[0]).toMatchObject({ id: 'programa_semana', w: 6, h: 3, visible: true })
      expect(loaded[1]).toMatchObject({ id: 'kpi_participantes', w: 5, h: 2, visible: false })

      const ids = loaded.map(i => i.id)
      expect(new Set(ids).size).toBe(WIDGET_CATALOG.length)
      assertNoOverlaps(loaded)
    })

    it('persiste cambios con saveHomeLayout y los restablece con resetHomeLayout', () => {
      const custom = DEFAULT_HOME_LAYOUT.map(item =>
        item.id === 'hero_reunion' ? { ...item, w: 12, h: 3, visible: false } : item
      )
      saveHomeLayout(custom)

      expect(window.localStorage.getItem(HOME_WIDGETS_STORAGE_KEY)).toBeTruthy()
      const reloaded = loadHomeLayout()
      expect(reloaded.find(w => w.id === 'hero_reunion')).toMatchObject({
        id: 'hero_reunion',
        w: 12,
        h: 3,
        visible: false,
      })

      const reset = resetHomeLayout()
      expect(reset).toEqual(DEFAULT_HOME_LAYOUT)
      expect(loadHomeLayout()).toEqual(DEFAULT_HOME_LAYOUT)
    })
  })

  describe('clases estáticas de Tailwind v4', () => {
    it('devuelve col-span, row-span, col-start y row-start acotados y estáticos', () => {
      expect(getColSpanClass(8)).toBe('md:col-span-6 xl:col-span-8')
      expect(getColSpanClass(4)).toBe('md:col-span-2 xl:col-span-4')
      expect(getColSpanClass(99)).toBe('md:col-span-6 xl:col-span-12')
      expect(getColSpanClass(0)).toBe('md:col-span-2 xl:col-span-1')

      expect(getRowSpanClass(2)).toBe('md:row-span-2 xl:row-span-2')
      expect(getRowSpanClass(4)).toBe('md:row-span-4 xl:row-span-4')
      expect(getRowSpanClass(9)).toBe('md:row-span-6 xl:row-span-6')
      expect(getRowSpanClass(-2)).toBe('md:row-span-1 xl:row-span-1')

      expect(getColStartClass(0)).toBe('xl:col-start-1')
      expect(getColStartClass(8)).toBe('xl:col-start-9')
      expect(getColStartClass(99)).toBe('xl:col-start-12')

      expect(getRowStartClass(0)).toBe('xl:row-start-1')
      expect(getRowStartClass(6)).toBe('xl:row-start-7')
      expect(getRowStartClass(50)).toBe('xl:row-start-30')
    })
  })
})
