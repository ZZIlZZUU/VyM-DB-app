// ============================================================
// generarS140.js — Generador S-140 para navegador (React)
// Usa docx.js que se instala via: pnpm add docx
// ============================================================

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageOrientation, UnderlineType,
} from 'docx'

// ── Layout (landscape carta) ──────────────────────────────────
const PAGE_W    = 15840
const PAGE_H    = 12240
const MARGIN    = 720
const CONTENT_W = PAGE_W - MARGIN * 2

const COL_HORA   = 650
const COL_DESC   = 7500
const COL_ROL    = 1800
const COL_NOMBRE = CONTENT_W - COL_HORA - COL_DESC - COL_ROL

// Colores
const C_HEADER   = '1F497D'
const C_FECHA    = 'D6E4F0'
const C_TESOROS  = '00B0F0'
const C_SMT      = 'FFC000'
const C_VC       = '92D050'
const C_WHITE    = 'FFFFFF'
const C_BLACK    = '000000'

// Bordes
const BN = { style: BorderStyle.NONE,   size: 0, color: 'FFFFFF' }
const BT = { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' }
const BNONE = { top: BN, bottom: BN, left: BN, right: BN }
const BALL  = { top: BT, bottom: BT, left: BT, right: BT }
const BBTM  = { top: BN, bottom: BT, left: BN, right: BN }
const PAD   = { top: 50, bottom: 50, left: 90, right: 90 }

// ── Helpers ───────────────────────────────────────────────────
function r(text, opts = {}) {
  return new TextRun({
    text: String(text ?? ''),
    font: 'Arial',
    size: opts.size || 18,
    bold: opts.bold || false,
    color: opts.color || C_BLACK,
    italics: opts.italic || false,
  })
}

function makeCell(runs, opts = {}) {
  const isMultiLine = Array.isArray(runs[0])
  const paragraphs = isMultiLine
    ? runs.map(line => new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: line,
      }))
    : [new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: runs,
      })]

  return new TableCell({
    width:         { size: opts.w || COL_NOMBRE, type: WidthType.DXA },
    columnSpan:    opts.span || 1,
    verticalAlign: opts.vAlign || VerticalAlign.CENTER,
    shading:       opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
    borders:       opts.borders || BALL,
    margins:       opts.pad || PAD,
    children:      paragraphs,
  })
}

function emptyRow(height = 80) {
  return new TableRow({
    height: { value: height, rule: 'exact' },
    children: [new TableCell({
      columnSpan: 4,
      width: { size: CONTENT_W, type: WidthType.DXA },
      borders: BNONE,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [new Paragraph({ children: [], spacing: { before: 0, after: 0 } })],
    })]
  })
}

function secRow(label, bg, color) {
  return new TableRow({
    height: { value: 300, rule: 'atLeast' },
    children: [
      makeCell([r('')], { w: COL_HORA, bg, borders: BNONE }),
      makeCell([r(label, { bold: true, color, size: 18 })],
        { w: COL_DESC + COL_ROL + COL_NOMBRE, span: 3, bg, borders: BNONE }),
    ]
  })
}

function parteRow(hora, titulo, rolLabel, nombre) {
  return new TableRow({
    height: { value: 280, rule: 'atLeast' },
    children: [
      makeCell([r(hora, { size: 16 })], { w: COL_HORA, borders: BBTM }),
      makeCell([r(titulo, { size: 17 })], { w: COL_DESC, borders: BBTM }),
      makeCell(rolLabel ? [r(rolLabel + ':', { bold: true, size: 17 })] : [r('')],
        { w: COL_ROL, borders: BBTM, align: AlignmentType.RIGHT }),
      makeCell([r(nombre || '', { size: 17 })], { w: COL_NOMBRE, borders: BBTM }),
    ]
  })
}

function smtRow(hora, titulo, estudiante, ayudante) {
  return new TableRow({
    height: { value: 320, rule: 'atLeast' },
    children: [
      makeCell([r(hora, { size: 16 })], { w: COL_HORA, borders: BBTM }),
      makeCell([r(titulo, { size: 17 })], { w: COL_DESC, borders: BBTM }),
      makeCell([[r('Estudiante/', { bold: true, size: 17 })], [r('Ayudante:', { bold: true, size: 17 })]],
        { w: COL_ROL, borders: BBTM, align: AlignmentType.RIGHT }),
      makeCell([[r((estudiante || '___') + '/', { size: 17 })], [r(ayudante || '___', { size: 17 })]],
        { w: COL_NOMBRE, borders: BBTM }),
    ]
  })
}

function ebcRow(hora, titulo, conductor, lector) {
  return new TableRow({
    height: { value: 320, rule: 'atLeast' },
    children: [
      makeCell([r(hora, { size: 16 })], { w: COL_HORA, borders: BBTM }),
      makeCell([r(titulo, { size: 17 })], { w: COL_DESC, borders: BBTM }),
      makeCell([[r('Conductor/', { bold: true, size: 17 })], [r('Lector:', { bold: true, size: 17 })]],
        { w: COL_ROL, borders: BBTM, align: AlignmentType.RIGHT }),
      makeCell([[r((conductor || '___') + '/', { size: 17 })], [r(lector || '___', { size: 17 })]],
        { w: COL_NOMBRE, borders: BBTM }),
    ]
  })
}

// ── Tabla de una semana ───────────────────────────────────────
function buildSemana(semana) {
  const a    = semana.asignaciones || {}
  const rows = []

  const tbPartes  = semana.partes.filter(p => p.seccion === 'TB')
  const smtPartes = semana.partes.filter(p => p.seccion === 'SMT')
  const vcPartes  = semana.partes.filter(p => p.seccion === 'VC')

  // ── Encabezado ──
  rows.push(new TableRow({
    height: { value: 340, rule: 'atLeast' },
    children: [
      makeCell([
        r(`${semana.fecha_inicio} — ${semana.fecha_fin}  `, { bold: true, size: 19 }),
        r(semana.capitulo_biblico || '', { bold: true, size: 19 }),
      ], { w: COL_HORA + COL_DESC, span: 2, bg: C_FECHA, borders: BNONE,
           pad: { top: 70, bottom: 70, left: 100, right: 100 } }),
      makeCell([r('Presidente:', { bold: true, size: 17 })],
        { w: COL_ROL, bg: C_FECHA, borders: BNONE, align: AlignmentType.RIGHT }),
      makeCell([r(a.P?.nombre || '', { bold: true, size: 17 })],
        { w: COL_NOMBRE, bg: C_FECHA, borders: BNONE }),
    ]
  }))

  // Canción apertura + oración (mismo Presidente)
  rows.push(new TableRow({
    height: { value: 270, rule: 'atLeast' },
    children: [
      makeCell([r('19:00', { size: 16 })], { w: COL_HORA, borders: BBTM }),
      makeCell([
        r('Canción ', { bold: true, size: 17 }),
        r(String(semana.cancion_apertura || '___'), { bold: true, size: 17 }),
        r('  y oración', { size: 17 }),
      ], { w: COL_DESC, borders: BBTM }),
      makeCell([r('Oración:', { bold: true, size: 17 })],
        { w: COL_ROL, borders: BBTM, align: AlignmentType.RIGHT }),
      makeCell([r(a.P?.nombre || '', { size: 17 })], { w: COL_NOMBRE, borders: BBTM }),
    ]
  }))

  // Palabras de introducción (mismo Presidente, sin etiqueta)
  rows.push(parteRow('', 'Palabras de introducción (1 min.)', null, ''))
  rows.push(emptyRow())

  // ── TESOROS ──
  rows.push(secRow('TESOROS DE LA BIBLIA', C_TESOROS, C_WHITE))

  const tb1 = tbPartes.find(p => p.tipo === 'TB')
  const pe  = tbPartes.find(p => p.tipo === 'PE')
  const lb  = tbPartes.find(p => p.tipo === 'LB')

  rows.push(parteRow(
    tb1?.hora_inicio || '',
    `1. ${tb1?.titulo || '[Título]'} (${tb1?.duracion_min || 10} mins.)`,
    'Conductor', a.TB?.nombre || ''
  ))
  rows.push(parteRow(
    pe?.hora_inicio || '',
    `2. ${pe?.titulo || 'Busquemos perlas escondidas'} (${pe?.duracion_min || 10} mins.)`,
    'Conductor', a.PE?.nombre || ''
  ))
  rows.push(parteRow(
    lb?.hora_inicio || '',
    `3. ${lb?.titulo || 'Lectura de la Biblia'} (${lb?.duracion_min || 4} mins.)`,
    'Estudiante', a.LB?.nombre || ''
  ))

  rows.push(emptyRow())

  // ── SMT ──
  rows.push(secRow('SEAMOS MEJORES MAESTROS', C_SMT, C_BLACK))

  let numParte = 4
  let smtIdx   = 0

  for (const parte of smtPartes) {
    const titulo = `${numParte}. ${parte.titulo} (${parte.duracion_min || 'X'} mins.)`
    if (parte.tipo === 'SMT_DSC') {
      rows.push(parteRow(parte.hora_inicio || '', titulo, 'Discursante', a.SMT_DSC?.nombre || ''))
    } else {
      rows.push(smtRow(
        parte.hora_inicio || '', titulo,
        a[`SMT_${smtIdx}`]?.estudiante || '',
        a[`SMT_${smtIdx}`]?.ayudante   || ''
      ))
      smtIdx++
    }
    numParte++
  }

  rows.push(emptyRow())

  // ── VC ──
  rows.push(secRow('NUESTRA VIDA CRISTIANA', C_VC, C_BLACK))

  // Canción VC
  rows.push(new TableRow({
    height: { value: 270, rule: 'atLeast' },
    children: [
      makeCell([r('19:45', { size: 16 })], { w: COL_HORA, borders: BBTM }),
      makeCell([
        r('Canción ', { bold: true, size: 17 }),
        r(String(semana.cancion_vc || '___'), { bold: true, size: 17 }),
      ], { w: COL_DESC + COL_ROL + COL_NOMBRE, span: 3, borders: BBTM }),
    ]
  }))

  let vcIdx = 0
  for (const parte of vcPartes) {
    const titulo = `${numParte}. ${parte.titulo} (${parte.duracion_min || 'XX'} mins.)`
    if (parte.tipo === 'EBC_CON') {
      rows.push(ebcRow(
        parte.hora_inicio || '',
        `${numParte}. Estudio bíblico de la congregación (${parte.duracion_min || 30} mins.)`,
        a.EBC_CON?.conductor || '',
        a.EBC_CON?.lector    || ''
      ))
    } else {
      const nombre = a[`VC_${vcIdx}`]?.nombre || a.NC?.nombre || ''
      rows.push(parteRow(parte.hora_inicio || '', titulo, 'Conductor', nombre))
      vcIdx++
    }
    numParte++
  }

  // Conclusión (mismo Presidente, sin etiqueta)
  rows.push(parteRow('20:37', 'Palabras de conclusión (3 mins.)', null, ''))

  // Canción cierre + oración (persona diferente)
  rows.push(new TableRow({
    height: { value: 270, rule: 'atLeast' },
    children: [
      makeCell([r('20:40', { size: 16 })], { w: COL_HORA, borders: BBTM }),
      makeCell([
        r('Canción ', { bold: true, size: 17 }),
        r(String(semana.cancion_cierre || '___'), { bold: true, size: 17 }),
        r('  y oración', { size: 17 }),
      ], { w: COL_DESC, borders: BBTM }),
      makeCell([r('Oración:', { bold: true, size: 17 })],
        { w: COL_ROL, borders: BBTM, align: AlignmentType.RIGHT }),
      makeCell([r(a.ORACION_C?.nombre || '', { size: 17 })],
        { w: COL_NOMBRE, borders: BBTM }),
    ]
  }))

  return new Table({
    width:        { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL_HORA, COL_DESC, COL_ROL, COL_NOMBRE],
    rows,
  })
}

// ── Página (2 semanas) ────────────────────────────────────────
function buildPagina(congregacion, s1, s2) {
  const children = []

  // Header
  children.push(new Table({
    width:        { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W / 2, CONTENT_W / 2],
    rows: [new TableRow({
      height: { value: 460, rule: 'atLeast' },
      children: [
        makeCell([r(congregacion.toUpperCase(), { bold: true, size: 20, color: C_WHITE })],
          { w: CONTENT_W / 2, bg: C_HEADER, borders: BNONE,
            pad: { top: 80, bottom: 80, left: 120, right: 120 } }),
        makeCell([r('Programa para la reunión de entre semana', { bold: true, size: 18, color: C_WHITE })],
          { w: CONTENT_W / 2, bg: C_HEADER, borders: BNONE,
            align: AlignmentType.RIGHT,
            pad: { top: 80, bottom: 80, left: 120, right: 120 } }),
      ]
    })]
  }))

  children.push(new Paragraph({ children: [], spacing: { before: 100, after: 0 } }))
  children.push(buildSemana(s1))

  if (s2) {
    children.push(new Paragraph({ children: [], spacing: { before: 140, after: 0 } }))
    children.push(buildSemana(s2))
  }

  return children
}

// ── Construir asignaciones desde datos de Supabase ────────────
export function buildAsignaciones(partes, asignaciones, personas) {
  const a = {}

  // Helper: obtener nombre por clave
  const nombre = clave => personas.find(p => p.clave === clave)?.nombre || ''

  // Presidente
  const asigP = asignaciones.find(x =>
    partes.some(p => p.id === x.parte_id && p.tipo_asignacion === 'P') && x.rol === 'principal'
  )
  if (asigP) a.P = { nombre: nombre(asigP.clave) }

  // TB, PE, LB
  for (const tipo of ['TB', 'PE', 'LB']) {
    const parte = partes.find(p => p.tipo_asignacion === tipo)
    const asig  = asignaciones.find(x => x.parte_id === parte?.id && x.rol === 'principal')
    if (asig) a[tipo] = { nombre: nombre(asig.clave) }
  }

  // SMT_DSC
  const parteDsc = partes.find(p => p.tipo_asignacion === 'SMT_DSC')
  const asigDsc  = asignaciones.find(x => x.parte_id === parteDsc?.id && x.rol === 'principal')
  if (asigDsc) a.SMT_DSC = { nombre: nombre(asigDsc.clave) }

  // SMT_EST (varias, con ayudante)
  const smtPartes = partes.filter(p => p.tipo_asignacion === 'SMT_EST')
  smtPartes.forEach((parte, i) => {
    const est = asignaciones.find(x => x.parte_id === parte.id && x.rol === 'principal')
    const ayu = asignaciones.find(x => x.parte_id === parte.id && x.rol === 'ayudante')
    a[`SMT_${i}`] = {
      estudiante: est ? nombre(est.clave) : '',
      ayudante:   ayu ? nombre(ayu.clave) : '',
    }
  })

  // VC y NC (varias)
  const vcPartes = partes.filter(p => p.tipo_asignacion === 'VC' || p.tipo_asignacion === 'NC')
  vcPartes.forEach((parte, i) => {
    const asig = asignaciones.find(x => x.parte_id === parte.id && x.rol === 'principal')
    a[`VC_${i}`] = { nombre: asig ? nombre(asig.clave) : '' }
    if (parte.tipo_asignacion === 'NC') a.NC = { nombre: asig ? nombre(asig.clave) : '' }
  })

  // EBC
  const parteEBC = partes.find(p => p.tipo_asignacion === 'EBC_CON')
  const parteLEC = partes.find(p => p.tipo_asignacion === 'EBC_LEC')
  const asigEBC  = asignaciones.find(x => x.parte_id === parteEBC?.id && x.rol === 'principal')
  const asigLEC  = asignaciones.find(x => x.parte_id === parteLEC?.id && x.rol === 'principal')
  if (parteEBC) {
    a.EBC_CON = {
      conductor: asigEBC ? nombre(asigEBC.clave) : '',
      lector:    asigLEC ? nombre(asigLEC.clave) : '',
    }
  }

  // Oración cierre
  const parteOC = partes.find(p => p.tipo_asignacion === 'ORACION_C')
  const asigOC  = asignaciones.find(x => x.parte_id === parteOC?.id && x.rol === 'principal')
  if (asigOC) a.ORACION_C = { nombre: nombre(asigOC.clave) }

  return a
}

// ── Función principal: genera y descarga el .docx ─────────────
export async function generarYDescargarS140({ congregacion, semanas }) {
  const sections = []

  for (let i = 0; i < semanas.length; i += 2) {
    sections.push({
      properties: {
        page: {
          size: {
            width:       PAGE_H,
            height:      PAGE_W,
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: buildPagina(congregacion, semanas[i], semanas[i + 1] || null),
    })
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 18 } } },
    },
    sections,
  })

  const blob = await Packer.toBlob(doc)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `S-140_${new Date().toISOString().slice(0, 7)}.docx`
  a.click()
  URL.revokeObjectURL(url)
}