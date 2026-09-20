// src/lib/nombres.test.js — Pruebas unitarias para acotación inteligente de nombres
import { describe, it, expect } from 'vitest'
import { abreviarNombre, formatearParParticipantes } from './nombres'

describe('abreviarNombre', () => {
  it('deja intactos nombres cortos', () => {
    expect(abreviarNombre('Ana Torres', 24)).toBe('Ana Torres')
    expect(abreviarNombre('Pedro López', 24)).toBe('Pedro López')
  })

  it('abrevia el segundo apellido en nombres de 3 palabras que exceden el límite', () => {
    // 'Roberto Rosemberg Navarro' = 25 chars > 20
    expect(abreviarNombre('Roberto Rosemberg Navarro', 20)).toBe('Roberto Rosemberg N.')
  })

  it('abrevia aún más si el espacio es muy reducido', () => {
    // Si el límite es 15, 'Roberto Rosemberg N.' (20) se acorta a 'Roberto R. N.'
    expect(abreviarNombre('Roberto Rosemberg Navarro', 15)).toBe('Roberto R. N.')
  })

  it('abrevia segundo nombre y segundo apellido en nombres de 4 palabras', () => {
    // 'Juan Carlos Mora Vega' = 21 chars > 18
    expect(abreviarNombre('Juan Carlos Mora Vega', 18)).toBe('Juan C. Mora V.')
  })

  it('maneja partículas compuestas de apellidos correctamente', () => {
    expect(abreviarNombre('María del Carmen Soto Perez', 22)).toBe('María C. Soto P.')
  })

  it('maneja valores vacíos o nulos sin romper', () => {
    expect(abreviarNombre('')).toBe('')
    expect(abreviarNombre(null)).toBe('')
    expect(abreviarNombre(undefined)).toBe('')
  })
})

describe('formatearParParticipantes', () => {
  it('no abrevia si la combinación cabe en el límite', () => {
    expect(formatearParParticipantes('Ana Torres', 'María Soto', 28)).toBe('Ana Torres / María Soto')
  })

  it('maneja participante único sin ayudante', () => {
    expect(formatearParParticipantes('Roberto Rosemberg', '')).toBe('Roberto Rosemberg')
    expect(formatearParParticipantes('', 'Angel Zintzun')).toBe('Angel Zintzun')
    expect(formatearParParticipantes('', '')).toBe(' / ')
  })

  it('acota inteligentemente parejas que exceden los 28 caracteres', () => {
    // 'Paulina Arteaga / Angelica Rosemberg' = 36 chars > 28
    const res = formatearParParticipantes('Paulina Arteaga', 'Angelica Rosemberg', 28)
    expect(res.length).toBeLessThanOrEqual(28)
    expect(res).toContain('/')
  })

  it('acota parejas con nombres largos de 3 palabras', () => {
    const res = formatearParParticipantes('Francisco Vazquez', 'Roberto Rosemberg Navarro', 28)
    expect(res.length).toBeLessThanOrEqual(28)
    expect(res).toContain('Francisco')
    expect(res).toContain('Roberto')
  })
})
