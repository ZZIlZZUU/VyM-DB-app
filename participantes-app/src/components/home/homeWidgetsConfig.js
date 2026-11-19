export const HOME_WIDGETS_STORAGE_KEY = 'vym_home_widgets_v1'
export const GRID_COLS = 12

export const WIDGET_CATALOG = [
  {
    id: 'hero_reunion',
    titulo: 'Próxima Reunión y Cobertura',
    descripcion: 'Cuenta regresiva de la reunión, progreso de confirmaciones (donut) y balance por secciones.',
    categoria: 'Reunión',
    defaultX: 0,
    defaultY: 0,
    defaultW: 8,
    defaultH: 2,
    minW: 6,
    minH: 2,
    maxW: 12,
    maxH: 3,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (6×2)', w: 6, h: 2 },
      { label: 'Sugerido (8×2)', w: 8, h: 2 },
      { label: 'Ancho completo (12×2)', w: 12, h: 2 },
      { label: 'Expandido (12×3)', w: 12, h: 3 },
    ],
  },
  {
    id: 'por_resolver',
    titulo: 'Por resolver hoy',
    descripcion: 'Avisos accionables: semanas incompletas, participantes sin actividad y eventos cercanos.',
    categoria: 'Alertas',
    defaultX: 8,
    defaultY: 0,
    defaultW: 4,
    defaultH: 2,
    minW: 4,
    minH: 2,
    maxW: 6,
    maxH: 4,
    defaultVisible: true,
    presets: [
      { label: 'Sugerido (4×2)', w: 4, h: 2 },
      { label: 'Alto (4×3)', w: 4, h: 3 },
      { label: 'Ancho (6×2)', w: 6, h: 2 },
      { label: 'Panel amplio (6×4)', w: 6, h: 4 },
    ],
  },
  {
    id: 'kpi_participantes',
    titulo: 'Participantes activos',
    descripcion: 'Total de participantes habilitados en el catálogo y porcentaje disponible.',
    categoria: 'Métricas',
    defaultX: 0,
    defaultY: 2,
    defaultW: 4,
    defaultH: 1,
    minW: 3,
    minH: 1,
    maxW: 6,
    maxH: 2,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (3×1)', w: 3, h: 1 },
      { label: 'Sugerido (4×1)', w: 4, h: 1 },
      { label: 'Grande (4×2)', w: 4, h: 2 },
      { label: 'Ancho (6×2)', w: 6, h: 2 },
    ],
  },
  {
    id: 'kpi_confirmadas',
    titulo: 'Asignaciones del mes',
    descripcion: 'Participaciones registradas en el mes actual junto con la cobertura semanal.',
    categoria: 'Métricas',
    defaultX: 4,
    defaultY: 2,
    defaultW: 4,
    defaultH: 1,
    minW: 3,
    minH: 1,
    maxW: 6,
    maxH: 2,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (3×1)', w: 3, h: 1 },
      { label: 'Sugerido (4×1)', w: 4, h: 1 },
      { label: 'Grande (4×2)', w: 4, h: 2 },
      { label: 'Ancho (6×2)', w: 6, h: 2 },
    ],
  },
  {
    id: 'kpi_sin_asignar',
    titulo: 'Semanas pendientes',
    descripcion: 'Semanas del mes actual con asignaciones faltantes o sin confirmar.',
    categoria: 'Métricas',
    defaultX: 8,
    defaultY: 2,
    defaultW: 4,
    defaultH: 1,
    minW: 3,
    minH: 1,
    maxW: 6,
    maxH: 2,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (3×1)', w: 3, h: 1 },
      { label: 'Sugerido (4×1)', w: 4, h: 1 },
      { label: 'Grande (4×2)', w: 4, h: 2 },
      { label: 'Ancho (6×2)', w: 6, h: 2 },
    ],
  },
  {
    id: 'programa_semana',
    titulo: 'Agenda de la semana',
    descripcion: 'Vista editorial del programa actual con canciones, secciones TB/SMT/VC y estados.',
    categoria: 'Reunión',
    defaultX: 0,
    defaultY: 3,
    defaultW: 7,
    defaultH: 4,
    minW: 6,
    minH: 3,
    maxW: 12,
    maxH: 5,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (6×3)', w: 6, h: 3 },
      { label: 'Sugerido (7×4)', w: 7, h: 4 },
      { label: 'Ancho (8×4)', w: 8, h: 4 },
      { label: 'Completo (12×5)', w: 12, h: 5 },
    ],
  },
  {
    id: 'mas_adelante',
    titulo: 'Más adelante',
    descripcion: 'Próximas semanas cargadas en el calendario y eventos especiales cercanos.',
    categoria: 'Reunión',
    defaultX: 7,
    defaultY: 3,
    defaultW: 5,
    defaultH: 2,
    minW: 4,
    minH: 2,
    maxW: 8,
    maxH: 3,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (4×2)', w: 4, h: 2 },
      { label: 'Sugerido (5×2)', w: 5, h: 2 },
      { label: 'Alto (5×3)', w: 5, h: 3 },
      { label: 'Amplio (8×3)', w: 8, h: 3 },
    ],
  },
  {
    id: 'actividad_reciente',
    titulo: 'Actividad reciente',
    descripcion: 'Últimos movimientos registrados en la bitácora del sistema en vivo.',
    categoria: 'Sistema',
    defaultX: 7,
    defaultY: 5,
    defaultW: 5,
    defaultH: 2,
    minW: 4,
    minH: 2,
    maxW: 8,
    maxH: 4,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (4×2)', w: 4, h: 2 },
      { label: 'Sugerido (5×2)', w: 5, h: 2 },
      { label: 'Alto (5×4)', w: 5, h: 4 },
      { label: 'Amplio (8×3)', w: 8, h: 3 },
    ],
  },
  {
    id: 'rezago_rotacion',
    titulo: 'Participantes con más espera',
    descripcion: 'Listado rápido de personas activas con más de 2 meses sin asignar.',
    categoria: 'Alertas',
    defaultX: 0,
    defaultY: 7,
    defaultW: 6,
    defaultH: 2,
    minW: 4,
    minH: 2,
    maxW: 12,
    maxH: 3,
    defaultVisible: true,
    presets: [
      { label: 'Compacto (4×2)', w: 4, h: 2 },
      { label: 'Sugerido (6×2)', w: 6, h: 2 },
      { label: 'Alto (6×3)', w: 6, h: 3 },
      { label: 'Ancho completo (12×2)', w: 12, h: 2 },
    ],
  },
  {
    id: 'accesos_rapidos',
    titulo: 'Accesos Rápidos',
    descripcion: 'Atajos directos para nuevo registro, generar Word S-140, personas y estadísticas.',
    categoria: 'Sistema',
    defaultX: 6,
    defaultY: 7,
    defaultW: 6,
    defaultH: 2,
    minW: 3,
    minH: 1,
    maxW: 12,
    maxH: 2,
    defaultVisible: true,
    presets: [
      { label: 'Barra compacta (3×1)', w: 3, h: 1 },
      { label: 'Fila media (6×1)', w: 6, h: 1 },
      { label: 'Cuadrícula 2×2 (6×2)', w: 6, h: 2 },
      { label: 'Tira completa (12×1)', w: 12, h: 1 },
    ],
  },
]

const CATALOG_MAP = new Map(WIDGET_CATALOG.map(w => [w.id, w]))

export const DEFAULT_HOME_LAYOUT = WIDGET_CATALOG.map(w => ({
  id: w.id,
  x: w.defaultX,
  y: w.defaultY,
  w: w.defaultW,
  h: w.defaultH,
  visible: w.defaultVisible !== false,
}))

export function getWidgetMeta(id) {
  return CATALOG_MAP.get(id) || null
}

export function clampWidgetSize(id, w, h) {
  const meta = getWidgetMeta(id)
  if (!meta) {
    return {
      w: Math.max(1, Math.min(GRID_COLS, Math.round(Number(w) || 4))),
      h: Math.max(1, Math.min(5, Math.round(Number(h) || 1))),
    }
  }
  const parsedW = w !== null && w !== '' ? Number(w) : NaN
  const parsedH = h !== null && h !== '' ? Number(h) : NaN
  const numW = Number.isFinite(parsedW) ? Math.round(parsedW) : meta.defaultW
  const numH = Number.isFinite(parsedH) ? Math.round(parsedH) : meta.defaultH
  return {
    w: Math.max(meta.minW, Math.min(meta.maxW, numW)),
    h: Math.max(meta.minH, Math.min(meta.maxH, numH)),
  }
}

export function clampWidgetRect(id, rect) {
  const { w, h } = clampWidgetSize(id, rect?.w, rect?.h)
  const parsedX = rect?.x !== null && rect?.x !== '' ? Number(rect?.x) : NaN
  const parsedY = rect?.y !== null && rect?.y !== '' ? Number(rect?.y) : NaN
  const rawX = Number.isFinite(parsedX) ? Math.round(parsedX) : 0
  const rawY = Number.isFinite(parsedY) ? Math.round(parsedY) : 0
  return {
    x: Math.max(0, Math.min(GRID_COLS - w, rawX)),
    y: Math.max(0, rawY),
    w,
    h,
  }
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

function rowsOverlap(a, b) {
  return a.y < b.y + b.h && a.y + a.h > b.y
}

function colsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x
}

export function findFirstFreeSpot(placedRects, w, h, startY = 0) {
  const safeW = Math.max(1, Math.min(GRID_COLS, w))
  const safeH = Math.max(1, h)
  for (let y = Math.max(0, startY); y < 200; y++) {
    for (let x = 0; x <= GRID_COLS - safeW; x++) {
      const candidate = { x, y, w: safeW, h: safeH }
      if (!placedRects.some(r => rectsOverlap(candidate, r))) {
        return { x, y }
      }
    }
  }
  return { x: 0, y: 0 }
}

export function compactLayoutVertically(items, pinnedId = null) {
  const visible = items.filter(i => i.visible !== false)
  const hidden = items.filter(i => i.visible === false)

  const placed = []
  const pinned = pinnedId ? visible.find(i => i.id === pinnedId) : null
  if (pinned) {
    placed.push({ ...pinned })
  }

  const others = visible
    .filter(i => !pinned || i.id !== pinned.id)
    .sort((a, b) => a.y - b.y || a.x - b.x)

  for (const item of others) {
    let targetY = item.y
    for (let y = 0; y < 200; y++) {
      const candidate = { ...item, y }
      if (!placed.some(p => rectsOverlap(candidate, p))) {
        targetY = y
        break
      }
    }
    placed.push({ ...item, y: targetY })
  }

  const placedMap = new Map(placed.map(p => [p.id, p]))
  const hiddenMap = new Map(hidden.map(h => [h.id, h]))
  return items.map(orig => placedMap.get(orig.id) || hiddenMap.get(orig.id) || orig)
}

function resolveCollisionsAndCompact(items, anchorId = null) {
  const visible = items.filter(i => i.visible !== false)
  const hidden = items.filter(i => i.visible === false)

  const placed = []
  const anchor = anchorId ? visible.find(i => i.id === anchorId) : null
  if (anchor) {
    placed.push({ ...anchor })
  }

  const others = visible
    .filter(i => !anchor || i.id !== anchor.id)
    .sort((a, b) => a.y - b.y || a.x - b.x)

  for (const item of others) {
    const candidate = { ...item }
    let guard = 0
    while (guard < 200) {
      const blocker = placed.find(p => rectsOverlap(candidate, p))
      if (!blocker) break
      candidate.y = blocker.y + blocker.h
      guard++
    }
    placed.push(candidate)
  }

  const resolvedMap = new Map([...placed, ...hidden].map(i => [i.id, i]))
  const updated = items.map(orig => resolvedMap.get(orig.id) || orig)
  return compactLayoutVertically(updated, anchorId)
}

export function packLayout2D(items) {
  const placed = []
  const packed = []

  for (const item of items) {
    const meta = getWidgetMeta(item.id)
    const clampedSize = clampWidgetSize(item.id, item.w, item.h)
    const hasCoords =
      Number.isFinite(Number(item.x)) &&
      Number.isFinite(Number(item.y))

    if (item.visible === false) {
      packed.push({
        id: item.id,
        x: Math.max(0, Math.min(GRID_COLS - clampedSize.w, Math.round(Number(hasCoords ? item.x : meta?.defaultX ?? 0)))),
        y: Math.max(0, Math.round(Number(hasCoords ? item.y : meta?.defaultY ?? 0))),
        w: clampedSize.w,
        h: clampedSize.h,
        visible: false,
      })
      continue
    }

    if (hasCoords) {
      const rect = clampWidgetRect(item.id, {
        x: item.x,
        y: item.y,
        w: clampedSize.w,
        h: clampedSize.h,
      })
      const overlaps = placed.some(r => rectsOverlap(rect, r))
      const finalPos = overlaps
        ? findFirstFreeSpot(placed, clampedSize.w, clampedSize.h, rect.y)
        : { x: rect.x, y: rect.y }

      const finalItem = {
        id: item.id,
        x: finalPos.x,
        y: finalPos.y,
        w: clampedSize.w,
        h: clampedSize.h,
        visible: true,
      }
      placed.push(finalItem)
      packed.push(finalItem)
    } else {
      const pos = findFirstFreeSpot(placed, clampedSize.w, clampedSize.h, 0)
      const finalItem = {
        id: item.id,
        x: pos.x,
        y: pos.y,
        w: clampedSize.w,
        h: clampedSize.h,
        visible: true,
      }
      placed.push(finalItem)
      packed.push(finalItem)
    }
  }

  return compactLayoutVertically(packed)
}

export function resizeWidgetWithNeighbors(layout, id, targetRect, handle = 'se') {
  const orig = layout.find(i => i.id === id)
  if (!orig || orig.visible === false) return layout

  const bounded = clampWidgetRect(id, {
    x: targetRect?.x ?? orig.x,
    y: targetRect?.y ?? orig.y,
    w: targetRect?.w ?? orig.w,
    h: targetRect?.h ?? orig.h,
  })
  let nextTarget = { ...orig, ...bounded }

  // Si se expande hacia arriba ('n') contra vecinos que ya están en su alto mínimo,
  // impedir catapultar los widgets superiores debajo y redirigir el crecimiento hacia abajo.
  if (handle.includes('n') && nextTarget.y < orig.y) {
    let minAllowedY = nextTarget.y
    for (const nb of layout) {
      if (nb.visible === false || nb.id === id) continue
      if (nb.y + nb.h <= orig.y && colsOverlap(nextTarget, nb)) {
        const nbMeta = getWidgetMeta(nb.id)
        const minH = nbMeta?.minH ?? 1
        const availH = nextTarget.y - nb.y
        if (availH < minH) {
          const floorY = Math.min(orig.y, nb.y + minH)
          if (floorY > minAllowedY) minAllowedY = floorY
        }
      }
    }
    if (minAllowedY !== nextTarget.y) {
      nextTarget = { ...nextTarget, y: minAllowedY, h: bounded.h }
    }
  }

  const working = layout.map(i => (i.id === id ? nextTarget : { ...i }))

  // Ajuste elástico de vecinos colindantes (antes de empujar los que ya alcanzaron su mínimo)
  for (let idx = 0; idx < working.length; idx++) {
    const nb = working[idx]
    if (nb.visible === false || nb.id === id) continue
    if (!rectsOverlap(nextTarget, nb)) continue

    const nbMeta = getWidgetMeta(nb.id)
    const minW = nbMeta?.minW ?? 1
    const minH = nbMeta?.minH ?? 1

    // Expansión hacia la derecha ('e') -> vecino estrictamente a la derecha encoge en su franja
    if (
      handle.includes('e') &&
      nb.x >= orig.x + orig.w &&
      nextTarget.x + nextTarget.w > nb.x &&
      rowsOverlap(orig, nb)
    ) {
      const nbRight = nb.x + nb.w
      const nextRight = nextTarget.x + nextTarget.w
      const availW = nbRight - nextRight
      if (availW >= minW && nextRight + availW <= GRID_COLS) {
        working[idx] = { ...nb, x: nextRight, w: availW }
        continue
      }
      if (nb.w > minW) {
        working[idx] = { ...nb, w: minW }
        continue
      }
    }

    // Expansión hacia la izquierda ('w') -> vecino estrictamente a la izquierda encoge en su franja
    if (
      handle.includes('w') &&
      nb.x + nb.w <= orig.x &&
      nb.x < nextTarget.x &&
      rowsOverlap(orig, nb)
    ) {
      const availW = nextTarget.x - nb.x
      if (availW >= minW) {
        working[idx] = { ...nb, w: availW }
        continue
      }
      if (nb.w > minW) {
        working[idx] = { ...nb, w: minW }
        continue
      }
    }

    // Expansión hacia abajo ('s') -> vecino estrictamente inferior encoge alto si tiene margen sobre minH
    if (
      handle.includes('s') &&
      nb.y >= orig.y + orig.h &&
      nextTarget.y + nextTarget.h > nb.y &&
      colsOverlap(orig, nb)
    ) {
      const nbBottom = nb.y + nb.h
      const nextBottom = nextTarget.y + nextTarget.h
      const availH = nbBottom - nextBottom
      if (availH >= minH) {
        working[idx] = { ...nb, y: nextBottom, h: availH }
        continue
      }
    }

    // Expansión hacia arriba ('n') -> vecino estrictamente superior encoge alto si tiene margen sobre minH
    if (
      handle.includes('n') &&
      nb.y + nb.h <= orig.y &&
      nb.y < nextTarget.y &&
      colsOverlap(orig, nb)
    ) {
      const availH = nextTarget.y - nb.y
      if (availH >= minH) {
        working[idx] = { ...nb, h: availH }
      }
    }
  }

  return resolveCollisionsAndCompact(working, id)
}

export function moveWidgetInGrid(layout, id, targetX, targetY) {
  const orig = layout.find(i => i.id === id)
  if (!orig || orig.visible === false) return layout

  const nextRect = clampWidgetRect(id, {
    x: targetX,
    y: targetY,
    w: orig.w,
    h: orig.h,
  })
  if (nextRect.x === orig.x && nextRect.y === orig.y) return layout

  const nextTarget = { ...orig, ...nextRect }
  const working = layout.map(i => (i.id === id ? nextTarget : { ...i }))

  const collided = working.filter(
    i => i.visible !== false && i.id !== id && rectsOverlap(nextTarget, i)
  )

  // Reacomodo inteligente / intercambio cuando colisiona con un único vecino
  if (collided.length === 1) {
    const other = collided[0]
    const otherIdx = working.findIndex(i => i.id === other.id)

    // 1. Intercambio directo al hueco recién liberado (orig) si cabe limpio
    if (orig.w >= other.w && orig.h >= other.h && orig.x + other.w <= GRID_COLS) {
      const swapped = { ...other, x: orig.x, y: orig.y }
      const overlapsRest = working.some(
        i => i.visible !== false && i.id !== other.id && rectsOverlap(swapped, i)
      )
      if (!overlapsRest) {
        working[otherIdx] = swapped
        return compactLayoutVertically(working, id)
      }
    }

    // 2. Deslizamiento horizontal en la misma franja si hay ancho a la derecha o izquierda
    const rightX = nextTarget.x + nextTarget.w
    if (rightX + other.w <= GRID_COLS) {
      const slidRight = { ...other, x: rightX }
      const overlapsRest = working.some(
        i => i.visible !== false && i.id !== other.id && rectsOverlap(slidRight, i)
      )
      if (!overlapsRest) {
        working[otherIdx] = slidRight
        return compactLayoutVertically(working, id)
      }
    }

    const leftX = nextTarget.x - other.w
    if (leftX >= 0) {
      const slidLeft = { ...other, x: leftX }
      const overlapsRest = working.some(
        i => i.visible !== false && i.id !== other.id && rectsOverlap(slidLeft, i)
      )
      if (!overlapsRest) {
        working[otherIdx] = slidLeft
        return compactLayoutVertically(working, id)
      }
    }
  }

  return resolveCollisionsAndCompact(working, id)
}

export function addWidgetToLayout(layout, id) {
  const target = layout.find(i => i.id === id)
  if (!target) return layout
  const placedVisible = layout.filter(i => i.visible !== false && i.id !== id)
  const spot = findFirstFreeSpot(placedVisible, target.w, target.h, 0)
  const updated = layout.map(i =>
    i.id === id ? { ...i, x: spot.x, y: spot.y, visible: true } : i
  )
  return compactLayoutVertically(updated)
}

export function loadHomeLayout() {
  try {
    const raw = window.localStorage.getItem(HOME_WIDGETS_STORAGE_KEY)
    if (!raw) return DEFAULT_HOME_LAYOUT.map(item => ({ ...item }))

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_HOME_LAYOUT.map(item => ({ ...item }))

    const seen = new Set()
    const normalized = []

    for (const item of parsed) {
      if (!item || typeof item.id !== 'string') continue
      if (!CATALOG_MAP.has(item.id) || seen.has(item.id)) continue
      seen.add(item.id)
      const clamped = clampWidgetSize(item.id, item.w, item.h)
      const entry = {
        id: item.id,
        w: clamped.w,
        h: clamped.h,
        visible: typeof item.visible === 'boolean' ? item.visible : true,
      }
      if (Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y))) {
        entry.x = Number(item.x)
        entry.y = Number(item.y)
      }
      normalized.push(entry)
    }

    for (const def of DEFAULT_HOME_LAYOUT) {
      if (!seen.has(def.id)) {
        normalized.push({ ...def })
      }
    }

    return packLayout2D(normalized)
  } catch {
    return DEFAULT_HOME_LAYOUT.map(item => ({ ...item }))
  }
}

export function saveHomeLayout(layout) {
  try {
    if (!Array.isArray(layout)) return
    window.localStorage.setItem(HOME_WIDGETS_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

export function resetHomeLayout() {
  const defaults = DEFAULT_HOME_LAYOUT.map(item => ({ ...item }))
  saveHomeLayout(defaults)
  return defaults
}

const XL_COL_SPAN_CLASSES = {
  1: 'xl:col-span-1',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  6: 'xl:col-span-6',
  7: 'xl:col-span-7',
  8: 'xl:col-span-8',
  9: 'xl:col-span-9',
  10: 'xl:col-span-10',
  11: 'xl:col-span-11',
  12: 'xl:col-span-12',
}

const XL_COL_START_CLASSES = {
  1: 'xl:col-start-1',
  2: 'xl:col-start-2',
  3: 'xl:col-start-3',
  4: 'xl:col-start-4',
  5: 'xl:col-start-5',
  6: 'xl:col-start-6',
  7: 'xl:col-start-7',
  8: 'xl:col-start-8',
  9: 'xl:col-start-9',
  10: 'xl:col-start-10',
  11: 'xl:col-start-11',
  12: 'xl:col-start-12',
}

const MD_COL_SPAN_CLASSES = {
  1: 'md:col-span-2',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-2',
  5: 'md:col-span-6',
  6: 'md:col-span-3',
  7: 'md:col-span-6',
  8: 'md:col-span-6',
  9: 'md:col-span-6',
  10: 'md:col-span-6',
  11: 'md:col-span-6',
  12: 'md:col-span-6',
}

const XL_ROW_SPAN_CLASSES = {
  1: 'xl:row-span-1',
  2: 'xl:row-span-2',
  3: 'xl:row-span-3',
  4: 'xl:row-span-4',
  5: 'xl:row-span-5',
  6: 'xl:row-span-6',
}

const XL_ROW_START_CLASSES = {
  1: 'xl:row-start-1',
  2: 'xl:row-start-2',
  3: 'xl:row-start-3',
  4: 'xl:row-start-4',
  5: 'xl:row-start-5',
  6: 'xl:row-start-6',
  7: 'xl:row-start-7',
  8: 'xl:row-start-8',
  9: 'xl:row-start-9',
  10: 'xl:row-start-10',
  11: 'xl:row-start-11',
  12: 'xl:row-start-12',
  13: 'xl:row-start-13',
  14: 'xl:row-start-14',
  15: 'xl:row-start-15',
  16: 'xl:row-start-16',
  17: 'xl:row-start-17',
  18: 'xl:row-start-18',
  19: 'xl:row-start-19',
  20: 'xl:row-start-20',
  21: 'xl:row-start-21',
  22: 'xl:row-start-22',
  23: 'xl:row-start-23',
  24: 'xl:row-start-24',
  25: 'xl:row-start-25',
  26: 'xl:row-start-26',
  27: 'xl:row-start-27',
  28: 'xl:row-start-28',
  29: 'xl:row-start-29',
  30: 'xl:row-start-30',
}

const MD_ROW_SPAN_CLASSES = {
  1: 'md:row-span-1',
  2: 'md:row-span-2',
  3: 'md:row-span-3',
  4: 'md:row-span-4',
  5: 'md:row-span-5',
  6: 'md:row-span-6',
}

export function getColSpanClass(w) {
  const numW = w !== null && w !== '' && Number.isFinite(Number(w)) ? Number(w) : 4
  const safeW = Math.max(1, Math.min(GRID_COLS, Math.round(numW)))
  const mdClass = MD_COL_SPAN_CLASSES[safeW] || 'md:col-span-6'
  const xlClass = XL_COL_SPAN_CLASSES[safeW] || 'xl:col-span-4'
  return `${mdClass} ${xlClass}`
}

export function getRowSpanClass(h) {
  const numH = h !== null && h !== '' && Number.isFinite(Number(h)) ? Number(h) : 1
  const safeH = Math.max(1, Math.min(6, Math.round(numH)))
  const mdClass = MD_ROW_SPAN_CLASSES[safeH] || 'md:row-span-1'
  const xlClass = XL_ROW_SPAN_CLASSES[safeH] || 'xl:row-span-1'
  return `${mdClass} ${xlClass}`
}

export function getColStartClass(x) {
  const numX = x !== null && x !== '' && Number.isFinite(Number(x)) ? Math.round(Number(x)) : 0
  const start = Math.max(1, Math.min(GRID_COLS, numX + 1))
  return XL_COL_START_CLASSES[start] || 'xl:col-start-1'
}

export function getRowStartClass(y) {
  const numY = y !== null && y !== '' && Number.isFinite(Number(y)) ? Math.round(Number(y)) : 0
  const start = Math.max(1, Math.min(30, numY + 1))
  return XL_ROW_START_CLASSES[start] || 'xl:row-start-1'
}
