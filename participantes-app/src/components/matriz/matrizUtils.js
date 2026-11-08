export const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
export const MES_CODE = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

export const TIPOS_MAT_F = ['T', 'A']
export const TIPOS_MAT_M = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'LEBC', 'ORACION_C']
export const TIPOS_SM = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'P', 'TB', 'PE', 'EBC', 'LEBC', 'ORACION_C']
export const TIPOS_ANC = ['T', 'A', 'X', 'LB', 'SMT_DSC', 'P', 'TB', 'PE', 'EBC', 'VC', 'NC', 'LEBC', 'ORACION_C']

export const TIPOS_BARRA_MAT = ['T', 'A', 'LB', 'SMT_DSC', 'LEBC', 'ORACION_C', 'X']
export const TIPOS_BARRA_ANC = ['P', 'TB', 'PE', 'EBC', 'LEBC', 'VC', 'NC', 'ORACION_C', 'SMT_DSC', 'LB', 'T', 'A', 'X']

export const TIPO_LABEL = {
  T: 'Titular',
  A: 'Asistente',
  X: 'Participación',
  LB: 'Lectura Bíblica',
  P: 'Presidente',
  TB: 'Tesoros',
  PE: 'Perlas',
  SMT_DSC: 'Discurso',
  EBC: 'Est. Bíblico',
  LEBC: 'Lector EBC',
  VC: 'Vida Cristiana',
  NC: 'Nec. Congr.',
  ORACION_C: 'Oración',
}

export const PESO_MAP = {
  T: 2, A: 1, X: 1, LB: 1, SMT_DSC: 1, P: 1, TB: 1, PE: 1, EBC: 1, LEBC: 1, VC: 1, NC: 1, ORACION_C: 0,
}

export const BADGE_STYLES = {
  T: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
  A: 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
  X: 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
  LB: 'bg-cyan-50 text-cyan-800 border-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
  SMT_DSC: 'bg-yellow-50 text-yellow-800 border-yellow-200/80 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800/40',
  P: 'bg-purple-50 text-purple-800 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
  TB: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  PE: 'bg-rose-50 text-rose-800 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
  EBC: 'bg-orange-50 text-orange-800 border-orange-200/80 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/40',
  LEBC: 'bg-pink-50 text-pink-800 border-pink-200/80 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800/40',
  VC: 'bg-teal-50 text-teal-800 border-teal-200/80 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/40',
  NC: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40',
  ORACION_C: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 dark:bg-zinc-800/70 dark:text-zinc-300 dark:border-zinc-700/60',
}

export const EMPTY_RECS = Object.freeze([])

/**
 * Construye un índice Map O(1) para consulta instantánea por [clave][mes] y conteos totales por clave.
 * Evita ejecutar miles de .filter() en cada movimiento del ratón sobre la matriz.
 */
export function buildMatrizIndex(registros = []) {
  const byClaveMes = new Map()
  const totalByClave = new Map()

  for (const r of registros) {
    if (!r?.clave) continue
    totalByClave.set(r.clave, (totalByClave.get(r.clave) || 0) + 1)

    if (!r.mes) continue
    let mesMap = byClaveMes.get(r.clave)
    if (!mesMap) {
      mesMap = new Map()
      byClaveMes.set(r.clave, mesMap)
    }
    let list = mesMap.get(r.mes)
    if (!list) {
      list = []
      mesMap.set(r.mes, list)
    }
    list.push(r)
  }

  for (const mesMap of byClaveMes.values()) {
    for (const list of mesMap.values()) {
      if (list.length > 1) {
        list.sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))
      }
    }
  }

  return { byClaveMes, totalByClave }
}

export function getTiposPermitidos(persona) {
  if (!persona) return []
  if (persona.lista === 'Mat') return persona.sexo === 'F' ? TIPOS_MAT_F : TIPOS_MAT_M
  return persona.estatus === 'Anciano' ? TIPOS_ANC : TIPOS_SM
}

export function initials(nombre) {
  return (nombre || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function toYyyyMmDd(fecha) {
  if (fecha == null || fecha === '') return ''
  const m = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

export function assignmentDayOfMonth(fecha) {
  const ymd = toYyyyMmDd(fecha)
  if (!ymd) return ''
  return String(parseInt(ymd.slice(8, 10), 10))
}
