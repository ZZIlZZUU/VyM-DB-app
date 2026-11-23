// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { renderToString } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { Select } from './Select'
import { parseSelectChildren } from './selectUtils'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('parseSelectChildren', () => {
  it('extrae opciones planas, arrays y condicionales', () => {
    const showExtra = true
    const hideExtra = false
    const items = ['A', 'B']
    const { groups, flatOptions } = parseSelectChildren([
      <option key="empty" value="">Todos</option>,
      showExtra && <option key="extra" value="x">Extra</option>,
      hideExtra && <option key="hidden" value="h">Oculto</option>,
      ...items.map(i => <option key={i} value={i}>Item {i}</option>),
    ])

    expect(groups).toHaveLength(1)
    expect(flatOptions.map(o => o.value)).toEqual(['', 'x', 'A', 'B'])
    expect(flatOptions.map(o => o.textLabel)).toEqual(['Todos', 'Extra', 'Item A', 'Item B'])
  })

  it('conserva la estructura de optgroup y estado disabled', () => {
    const { groups, flatOptions } = parseSelectChildren(
      <>
        <option value="">— Seleccionar —</option>
        <optgroup label="Matriculados">
          <option value="M-001">Ana</option>
          <option value="M-002" disabled>Luis</option>
        </optgroup>
        <optgroup label="Ancianos" disabled>
          <option value="A-001">Carlos</option>
        </optgroup>
      </>
    )

    expect(groups).toHaveLength(3)
    expect(groups[0].label).toBeNull()
    expect(groups[1].label).toBe('Matriculados')
    expect(groups[2].label).toBe('Ancianos')
    expect(flatOptions[2].disabled).toBe(true)
    expect(flatOptions[3].disabled).toBe(true)
  })
})

describe('Select component', () => {
  let container = null
  let root = null

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount()
      })
      root = null
    }
    if (container) {
      container.remove()
      container = null
    }
  })

  it('renderiza sin errores en SSR (renderToString) mostrando la opción seleccionada y sin <select> nativo', () => {
    const html = renderToString(
      <Select value="Marzo" onChange={() => {}} aria-label="Mes" size="sm">
        <option value="Enero">Enero</option>
        <option value="Marzo">Marzo</option>
      </Select>
    )

    expect(html).toContain('role="combobox"')
    expect(html).toContain('Marzo')
    expect(html).not.toContain('<select')
  })

  it('abre el menú custom en portal, permite seleccionar una opción y dispara onChange con e.target.value', () => {
    const handleChange = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <Select value="25" onChange={handleChange} aria-label="Filas por página" size="sm">
          <option value={25}>25 por pág.</option>
          <option value={50}>50 por pág.</option>
          <option value={100}>100 por pág.</option>
        </Select>
      )
    })

    const trigger = container.querySelector('[role="combobox"]')
    expect(trigger).not.toBeNull()
    expect(trigger.textContent).toContain('25 por pág.')
    expect(document.querySelector('[role="listbox"]')).toBeNull()

    // Abrir el desplegable
    act(() => {
      trigger.click()
    })

    const listbox = document.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    const options = listbox.querySelectorAll('[role="option"]')
    expect(options).toHaveLength(3)
    expect(options[0].getAttribute('aria-selected')).toBe('true')

    // Seleccionar segunda opción
    act(() => {
      options[1].click()
    })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][0].target.value).toBe('50')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })

  it('soporta navegación por teclado (ArrowDown, Enter, Escape) y optgroups', () => {
    const handleChange = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <Select value="" onChange={handleChange} aria-label="Participante">
          <option value="">— Seleccionar —</option>
          <optgroup label="Matriculados">
            <option value="M-001">Ana</option>
            <option value="M-002">Pedro</option>
          </optgroup>
        </Select>
      )
    })

    const trigger = container.querySelector('[role="combobox"]')

    // Abrir con ArrowDown
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    const listbox = document.querySelector('[role="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox.textContent).toContain('Matriculados')

    // Bajar a M-001 y confirmar con Enter
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    })
    act(() => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange.mock.calls[0][0].target.value).toBe('M-001')
    expect(document.querySelector('[role="listbox"]')).toBeNull()

    // Reabrir y cerrar con Escape
    act(() => {
      trigger.click()
    })
    expect(document.querySelector('[role="listbox"]')).not.toBeNull()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })

  it('respeta disabled y no abre el menú', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        <Select value="M" disabled onChange={() => {}} aria-label="Sexo">
          <option value="F">Femenino</option>
          <option value="M">Masculino</option>
        </Select>
      )
    })

    const trigger = container.querySelector('[role="combobox"]')
    expect(trigger.disabled).toBe(true)

    act(() => {
      trigger.click()
    })
    expect(document.querySelector('[role="listbox"]')).toBeNull()
  })
})
