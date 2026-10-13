// src/lib/generadorS140Xml.test.js — Pruebas unitarias para el generador S-140 nativo y fallback
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import {
  xmlEscape,
  formatearFechaReunionMartes,
  formatearCapituloBiblico,
  formatearEncabezadoFechaS140,
  generarFilasSemanaXml,
  generarDocumentoXml,
  crearDocxNativo,
} from './generadorS140Xml'

describe('generadorS140Xml — Escapado y formato de texto', () => {
  it('xmlEscape maneja valores nulos, vacíos y caracteres especiales XML', () => {
    expect(xmlEscape(null)).toBe('')
    expect(xmlEscape(undefined)).toBe('')
    expect(xmlEscape('Texto regular')).toBe('Texto regular')
    expect(xmlEscape('Tomás & Pedro <1> "comillas"')).toBe(
      'Tomás &amp; Pedro &lt;1&gt; &quot;comillas&quot;'
    )
    expect(xmlEscape('A & B < C > D "E" \'F\'')).toBe('A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;')
  })

  it('formatearFechaReunionMartes calcula el martes y el mes', () => {
    expect(formatearFechaReunionMartes('2026-11-02')).toBe('3 de Noviembre')
    expect(formatearFechaReunionMartes('2026-11-02', '2026-11-05')).toBe('5 de Noviembre')
  })

  it('formatearCapituloBiblico normaliza mayúsculas preservando conectores', () => {
    expect(formatearCapituloBiblico('JEREMÍAS 49, 50')).toBe('Jeremías 49, 50')
    expect(formatearCapituloBiblico('1 CRÓNICAS 1-3')).toBe('1 Crónicas 1-3')
  })

  it('formatearEncabezadoFechaS140 combina fecha y capítulos con sangría NBSP', () => {
    const res = formatearEncabezadoFechaS140('2026-11-02', 'JEREMÍAS 49, 50')
    expect(res).toContain('3 de Noviembre')
    expect(res).toContain('Jeremías 49, 50')
    expect(res).toContain('\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0')
  })
})

describe('generadorS140Xml — Generación de filas por semana', () => {
  const semanaBase = {
    fecha_inicio: '2026-11-02',
    fecha_fin: '2026-11-08',
    capitulo_biblico: 'JEREMÍAS 49, 50',
    presidente: 'Juan Pérez González',
    can_ap: '145',
    oracion_ap: 'Juan Pérez González',
    tb_titulo: 'La justicia divina',
    tb_cond: 'Pedro López Méndez',
    pe_cond: 'Carlos Ruiz Díaz',
    lb_est: 'Mario García Luna',
    smt: [
      { titulo: 'Empecemos conversaciones', est: 'Ana Torres', ayu: 'María Soto', duracion_min: 3 },
      { titulo: 'Hagamos revisitas', est: 'Lucía Vega', ayu: 'Rosa Díaz', duracion_min: 4 },
      { titulo: 'Expliquemos nuestras creencias', est: 'Sofia Luna', ayu: '', duracion_min: 5 },
    ],
    can_vc: '100',
    vc: [
      { titulo: 'Cómo aplicar los principios', cond: 'Roberto Mora', duracion_min: 15 },
    ],
    ebc_cond: 'Andrés Vega Cruz',
    ebc_lect: 'Tomás Ríos Ramos',
    can_ci: '60',
    oracion_ci: 'Felipe Castro Morales',
  }

  it('genera numeración continua sin huecos y omite partes inexistentes', () => {
    const xml = generarFilasSemanaXml(semanaBase, '19:00')

    // 3 partes en SMT numeradas 4, 5, 6
    expect(xml).toContain('4. Empecemos conversaciones')
    expect(xml).toContain('5. Hagamos revisitas')
    expect(xml).toContain('6. Expliquemos nuestras creencias')

    // 1 parte en VC numerada 7
    expect(xml).toContain('7. Cómo aplicar los principios')

    // EBC numerado correlativamente como 8 (no 10 como la plantilla fija)
    expect(xml).toContain('8. Estudio bíblico de la congregación')
    expect(xml).not.toContain('9. ')
    expect(xml).not.toContain('10. ')

    // Single participant en SMT (Sofia Luna sin ayudante) usa 'Estudiante:'
    expect(xml).toContain('Estudiante:')
    expect(xml).toContain('Sofia Luna')
    expect(xml).not.toContain('Sofia Luna / ')
  })

  it('adapta la semana de Visita del Superintendente de Circuito', () => {
    const semanaSC = {
      ...semanaBase,
      esVisitaSC: true,
      ebc_cond: 'Superintendente de Circuito',
      ebc_lect: '',
    }
    const xml = generarFilasSemanaXml(semanaSC, '19:00')

    expect(xml).toContain('Discurso de servicio')
    expect(xml).toContain('Discursante:')
    expect(xml).toContain('Superintendente C.')
    expect(xml).not.toContain('Estudio bíblico de la congregación')
  })

  it('genera tarjeta de aviso en caso de Asamblea o Reunión Cancelada', () => {
    const semanaAsamblea = {
      ...semanaBase,
      esAsamblea: true,
      tb_titulo: 'ASAMBLEA DE CIRCUITO',
      evento: { descripcion: 'Asamblea en el Salón de Asambleas' },
    }
    const xml = generarFilasSemanaXml(semanaAsamblea, '19:00')

    expect(xml).toContain('ASAMBLEA DE CIRCUITO')
    expect(xml).toContain('EVENTO ESPECIAL')
    expect(xml).toContain('Asamblea en el Salón de Asambleas')
    // No debe contener partes regulares
    expect(xml).not.toContain('TESOROS DE LA BIBLIA')
    expect(xml).not.toContain('SEAMOS MEJORES MAESTROS')
  })
})

describe('generadorS140Xml — Paginación y ensamblado de documento', () => {
  const semanaMock = {
    fecha_inicio: '2026-11-02',
    fecha_fin: '2026-11-08',
    capitulo_biblico: 'JEREMÍAS 49, 50',
    presidente: 'Juan Pérez',
    can_ap: '145',
    oracion_ap: 'Juan Pérez',
    tb_titulo: 'Tema TB',
    tb_cond: 'Pedro López',
    pe_cond: 'Carlos Ruiz',
    lb_est: 'Mario García',
    smt: [{ titulo: 'Conversaciones', est: 'Ana Torres', ayu: 'María Soto', duracion_min: 4 }],
    can_vc: '100',
    vc: [{ titulo: 'Sección VC', cond: 'Roberto Mora', duracion_min: 15 }],
    ebc_cond: 'Andrés Vega',
    ebc_lect: 'Tomás Ríos',
    can_ci: '60',
    oracion_ci: 'Felipe Castro',
  }

  it('organiza 4 semanas en exactamente 2 páginas con 1 salto de página', () => {
    const semanas = [
      { ...semanaMock, fecha_inicio: '2026-11-02' },
      { ...semanaMock, fecha_inicio: '2026-11-09' },
      { ...semanaMock, fecha_inicio: '2026-11-16' },
      { ...semanaMock, fecha_inicio: '2026-11-23' },
    ]

    const xml = generarDocumentoXml(semanas, 'Congregación El Recreo', '19:00')
    const tablas = xml.match(/<w:tbl\b/g) || []
    const saltos = xml.match(/<w:pageBreakBefore\/>/g) || []

    expect(tablas.length).toBe(2)
    expect(saltos.length).toBe(1)
  })

  it('organiza 5 semanas en exactamente 3 páginas con 2 saltos de página', () => {
    const semanas = [
      { ...semanaMock, fecha_inicio: '2026-11-02' },
      { ...semanaMock, fecha_inicio: '2026-11-09' },
      { ...semanaMock, fecha_inicio: '2026-11-16' },
      { ...semanaMock, fecha_inicio: '2026-11-23' },
      { ...semanaMock, fecha_inicio: '2026-11-30' },
    ]

    const xml = generarDocumentoXml(semanas, 'Congregación El Recreo', '19:00')
    const tablas = xml.match(/<w:tbl\b/g) || []
    const saltos = xml.match(/<w:pageBreakBefore\/>/g) || []

    expect(tablas.length).toBe(3)
    expect(saltos.length).toBe(2)
  })

  it('crearDocxNativo inyecta el XML dinámico en la plantilla base sin errores', () => {
    const rutaPlantilla = path.resolve(__dirname, '../../public/S-140_plantilla.docx')
    const buffer = fs.readFileSync(rutaPlantilla)

    const zip = crearDocxNativo({
      PizZip,
      templateArrayBuffer: buffer,
      congregacion: 'Congregación El Recreo',
      semanas: [semanaMock, { ...semanaMock, fecha_inicio: '2026-11-09' }],
      config: '19:00',
    })

    const docXml = zip.file('word/document.xml').asText()
    expect(docXml).toContain('Congregación El Recreo')
    expect(docXml).toContain('Programa para la reunión de entre semana')
    expect(docXml).toContain('Times New Roman')
    expect(docXml).toContain('cantSplit')
  })
})

describe('generarS140 — buildDatosDesdeSupabase', () => {
  it('ejecuta buildDatosDesdeSupabase correctamente usando formatearCapituloBiblico', async () => {
    const { buildDatosDesdeSupabase } = await import('./generarS140.js')
    const semanasSupabase = [
      {
        id: 'sem-1',
        fecha_inicio: '2026-11-02',
        fecha_fin: '2026-11-08',
        capitulo_biblico: 'JEREMÍAS 49, 50',
      },
    ]
    const partesSupabase = [
      { id: 'part-1', semana_id: 'sem-1', tipo_asignacion: 'TB', titulo: 'Tema Tesoros' },
    ]
    const asignacionesSupabase = [
      { id: 'asig-1', parte_id: 'part-1', clave: 'P1', rol: 'principal' },
    ]
    const personas = [{ clave: 'P1', nombre: 'Juan Pérez' }]

    const res = buildDatosDesdeSupabase(semanasSupabase, partesSupabase, asignacionesSupabase, personas)
    expect(res).toHaveLength(1)
    expect(res[0].capitulo_biblico).toBe('Jeremías 49, 50')
    expect(res[0].fecha_reunion).toBe('3 de Noviembre')
    expect(res[0].tb_cond).toBe('Juan Pérez')
  })
})
