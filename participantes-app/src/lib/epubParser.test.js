// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import PizZip from 'pizzip'
import { parsearFechas, inferirTipoParteSMT, parsearEPUB } from './epubParser'

describe('parsearFechas — Extracción de fechas de la Guía de Actividades', () => {
  describe('Formato mismo mes', () => {
    it('parsea rango simple "2-8 DE NOVIEMBRE"', () => {
      const res = parsearFechas('2-8 DE NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-02', fin: '2026-11-08' })
    })

    it('parsea con guión en-dash "2–8 DE NOVIEMBRE"', () => {
      const res = parsearFechas('2–8 DE NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-02', fin: '2026-11-08' })
    })

    it('parsea con espacios alrededor del guión "9 - 15 DE NOVIEMBRE"', () => {
      const res = parsearFechas('9 - 15 DE NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-09', fin: '2026-11-15' })
    })

    it('parsea con año explícito "6-12 DE JULIO DE 2026"', () => {
      const res = parsearFechas('6-12 DE JULIO DE 2026', 2024)
      expect(res).toEqual({ inicio: '2026-07-06', fin: '2026-07-12' })
    })

    it('soporta non-breaking spaces (NBSP)', () => {
      const res = parsearFechas('16\u00A0-\u00A022\u00A0DE\u00A0NOVIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-16', fin: '2026-11-22' })
    })
  })

  describe('Formato entre dos meses (mismo año)', () => {
    it('parsea con "A": "30 DE NOVIEMBRE A 6 DE DICIEMBRE"', () => {
      const res = parsearFechas('30 DE NOVIEMBRE A 6 DE DICIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-30', fin: '2026-12-06' })
    })

    it('parsea con "AL": "27 DE JULIO AL 2 DE AGOSTO"', () => {
      const res = parsearFechas('27 DE JULIO AL 2 DE AGOSTO', 2026)
      expect(res).toEqual({ inicio: '2026-07-27', fin: '2026-08-02' })
    })

    it('parsea con guión: "30 DE NOVIEMBRE - 6 DE DICIEMBRE"', () => {
      const res = parsearFechas('30 DE NOVIEMBRE - 6 DE DICIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-11-30', fin: '2026-12-06' })
    })

    it('parsea "31 DE AGOSTO A 6 DE SEPTIEMBRE"', () => {
      const res = parsearFechas('31 DE AGOSTO A 6 DE SEPTIEMBRE', 2026)
      expect(res).toEqual({ inicio: '2026-08-31', fin: '2026-09-06' })
    })
  })

  describe('Formato entre dos meses (cruce de año)', () => {
    it('parsea cruce de año con años explícitos: "28 DE DICIEMBRE DE 2026 A 3 DE ENERO DE 2027"', () => {
      const res = parsearFechas('28 DE DICIEMBRE DE 2026 A 3 DE ENERO DE 2027', 2026)
      expect(res).toEqual({ inicio: '2026-12-28', fin: '2027-01-03' })
    })

    it('parsea cruce de año con "AL": "28 DE DICIEMBRE DE 2026 AL 3 DE ENERO DE 2027"', () => {
      const res = parsearFechas('28 DE DICIEMBRE DE 2026 AL 3 DE ENERO DE 2027', 2026)
      expect(res).toEqual({ inicio: '2026-12-28', fin: '2027-01-03' })
    })

    it('parsea año anterior: "29 DE DICIEMBRE DE 2025 A 4 DE ENERO DE 2026"', () => {
      const res = parsearFechas('29 DE DICIEMBRE DE 2025 A 4 DE ENERO DE 2026', 2025)
      expect(res).toEqual({ inicio: '2025-12-29', fin: '2026-01-04' })
    })

    it('infiere año siguiente si no hay año explícito: "29 DE DICIEMBRE A 4 DE ENERO"', () => {
      const res = parsearFechas('29 DE DICIEMBRE A 4 DE ENERO', 2026)
      expect(res).toEqual({ inicio: '2026-12-29', fin: '2027-01-04' })
    })
  })

  describe('Casos inválidos o vacíos', () => {
    it('retorna null para strings vacíos o no relacionados', () => {
      expect(parsearFechas('')).toEqual({ inicio: null, fin: null })
      expect(parsearFechas(null)).toEqual({ inicio: null, fin: null })
      expect(parsearFechas('Guía de actividades para la reunión')).toEqual({ inicio: null, fin: null })
      expect(parsearFechas('Lectura bíblica para la Conmemoración')).toEqual({ inicio: null, fin: null })
    })
  })
})

describe('inferirTipoParteSMT — Clasificación de partes de Seamos Mejores Maestros', () => {
  it('clasifica variantes plurales ("Empecemos conversaciones", "Hagamos revisitas", "Hagamos discípulos") como SMT_EST con ayudante', () => {
    expect(inferirTipoParteSMT('Empecemos conversaciones')).toEqual({
      tipo: 'SMT_EST',
      requiere_ayudante: true,
    })
    expect(inferirTipoParteSMT('Hagamos revisitas')).toEqual({
      tipo: 'SMT_EST',
      requiere_ayudante: true,
    })
    expect(inferirTipoParteSMT('Hagamos discípulos')).toEqual({
      tipo: 'SMT_EST',
      requiere_ayudante: true,
    })
  })

  it('clasifica variantes singulares ("Empiece conversaciones", "Haga revisitas", "Haga discípulos") como SMT_EST con ayudante', () => {
    expect(inferirTipoParteSMT('Empiece conversaciones')).toEqual({
      tipo: 'SMT_EST',
      requiere_ayudante: true,
    })
    expect(inferirTipoParteSMT('Haga revisitas')).toEqual({
      tipo: 'SMT_EST',
      requiere_ayudante: true,
    })
    expect(inferirTipoParteSMT('Haga discípulos')).toEqual({
      tipo: 'SMT_EST',
      requiere_ayudante: true,
    })
  })

  it('clasifica "Expliquemos nuestras creencias" y "Explique sus creencias" como SMT_EXP o SMT_DSC según descripción', () => {
    expect(
      inferirTipoParteSMT('Expliquemos nuestras creencias', '(4 mins.) Escenificación.')
    ).toEqual({
      tipo: 'SMT_EXP',
      requiere_ayudante: true,
    })
    expect(
      inferirTipoParteSMT('Explique sus creencias', '(4 mins.) DE CASA EN CASA.')
    ).toEqual({
      tipo: 'SMT_EXP',
      requiere_ayudante: true,
    })
    expect(
      inferirTipoParteSMT('Expliquemos nuestras creencias', '(5 mins.) Discurso. Tema...')
    ).toEqual({
      tipo: 'SMT_DSC',
      requiere_ayudante: false,
    })
  })

  it('clasifica "Discurso" como SMT_DSC sin ayudante', () => {
    expect(inferirTipoParteSMT('Discurso')).toEqual({
      tipo: 'SMT_DSC',
      requiere_ayudante: false,
    })
  })
})

describe('parsearEPUB — Descompresión y lectura con PizZip', () => {
  it('extrae correctamente una semana desde un EPUB en memoria construido con PizZip', async () => {
    const zip = new PizZip()
    zip.file(
      'OEBPS/content.opf',
      `<?xml version="1.0" encoding="utf-8"?>
      <package xmlns="http://www.idpf.org/2007/opf">
        <metadata><title>Guía de actividades 2026</title></metadata>
        <manifest><item id="sem1" href="semana1.xhtml" media-type="application/xhtml+xml"/></manifest>
        <spine><itemref idref="sem1"/></spine>
      </package>`
    )
    zip.file(
      'OEBPS/semana1.xhtml',
      `<!DOCTYPE html><html><body>
        <h1>2-8 DE NOVIEMBRE</h1>
        <h2>PROVERBIOS 25</h2>
        <h3>Canción 10 y oración</h3>
        <h3 class="du-color--teal-700">1. La sabiduría divina (10 mins.)</h3>
        <h3 class="du-color--teal-700">2. Busquemos perlas escondidas (10 mins.)</h3>
        <h3 class="du-color--teal-700">3. Lectura de la Biblia (4 mins.)</h3>
        <h3 class="du-color--gold-700">4. Empiece conversaciones (3 mins.)</h3>
        <h3>Canción 25</h3>
        <h3 class="du-color--maroon-600">5. Necesidades de la congregación (15 mins.)</h3>
        <h3 class="du-color--maroon-600">6. Estudio bíblico de la congregación (30 mins.)</h3>
        <h3>Canción 30 y oración</h3>
      </body></html>`
    )

    const buffer = zip.generate({ type: 'uint8array' })
    const semanas = await parsearEPUB(buffer)

    expect(semanas).toHaveLength(1)
    expect(semanas[0].fecha_inicio).toBe('2026-11-02')
    expect(semanas[0].fecha_fin).toBe('2026-11-08')
    expect(semanas[0].capitulo_biblico).toBe('PROVERBIOS 25')
    expect(semanas[0].partes.length).toBeGreaterThan(0)
  })
})


