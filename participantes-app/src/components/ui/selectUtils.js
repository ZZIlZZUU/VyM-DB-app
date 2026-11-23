import { Children, Fragment, isValidElement } from 'react'

/**
 * Extrae el texto plano concatenado de nodos React para etiquetas de opciones.
 */
export function extractText(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (isValidElement(node)) return extractText(node.props?.children)
  return ''
}

/**
 * Parsea hijos <option> y <optgroup> (incluyendo arrays y Fragments)
 * en una estructura uniforme para renderizado custom.
 */
export function parseSelectChildren(children) {
  const groups = []
  const flatOptions = []
  let currentUngrouped = null

  function flushUngrouped() {
    if (currentUngrouped && currentUngrouped.options.length > 0) {
      groups.push(currentUngrouped)
    }
    currentUngrouped = null
  }

  function pushOption(opt, targetList) {
    const index = flatOptions.length
    const item = { ...opt, index }
    flatOptions.push(item)
    targetList.push(item)
  }

  function visit(nodes, groupTarget = null) {
    Children.forEach(nodes, child => {
      if (child == null || typeof child === 'boolean') return
      if (Array.isArray(child)) {
        visit(child, groupTarget)
        return
      }
      if (!isValidElement(child)) return

      if (child.type === Fragment) {
        visit(child.props.children, groupTarget)
        return
      }

      if (child.type === 'optgroup') {
        flushUngrouped()
        const groupOptions = []
        const groupDisabled = Boolean(child.props.disabled)
        visit(child.props.children, {
          options: groupOptions,
          disabled: groupDisabled,
        })
        if (groupOptions.length > 0) {
          groups.push({
            label: child.props.label || '',
            disabled: groupDisabled,
            options: groupOptions,
          })
        }
        return
      }

      if (child.type === 'option') {
        const textLabel = extractText(child.props.children).trim()
        const rawValue =
          child.props.value !== undefined ? child.props.value : textLabel
        const value = String(rawValue)
        const disabled = Boolean(
          child.props.disabled || groupTarget?.disabled
        )
        const opt = {
          value,
          label: child.props.children ?? textLabel,
          textLabel: textLabel || value,
          disabled,
        }

        if (groupTarget) {
          pushOption(opt, groupTarget.options)
        } else {
          if (!currentUngrouped) {
            currentUngrouped = { label: null, disabled: false, options: [] }
          }
          pushOption(opt, currentUngrouped.options)
        }
      }
    })
  }

  visit(children)
  flushUngrouped()

  return { groups, flatOptions }
}
