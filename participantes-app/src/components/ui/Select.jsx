import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { extractText, parseSelectChildren } from './selectUtils'

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

const SIZE_CLASSES = {
  xs: 'h-7 pl-2 pr-7 text-[11px] rounded-md',
  sm: 'h-8 pl-2.5 pr-8 text-xs rounded-lg',
  md: 'h-9 pl-3 pr-8 text-sm rounded-lg',
  lg: 'h-10 pl-3.5 pr-9 text-sm rounded-lg',
}

const OPTION_TEXT_CLASSES = {
  xs: 'text-[11px] py-1.5 px-2',
  sm: 'text-xs py-1.5 px-2.5',
  md: 'text-xs py-2 px-2.5',
  lg: 'text-sm py-2 px-3',
}

const ICON_SIZE_CLASSES = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-4 h-4',
}

export const Select = forwardRef(function Select(
  {
    className = '',
    menuClassName = '',
    children,
    options: optionsProp = null,
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    error = null,
    size = 'md',
    variant = 'default',
    disabled = false,
    placeholder = 'Seleccionar...',
    name,
    id,
    required,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    title,
    ...restProps
  },
  forwardedRef
) {
  const listboxId = useId()
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const optionRefs = useRef([])
  const typeaheadRef = useRef({ buffer: '', timer: null })

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [menuStyle, setMenuStyle] = useState(null)

  const parsed = useMemo(() => {
    if (Array.isArray(optionsProp)) {
      const flatOptions = optionsProp.map((opt, index) => ({
        value: String(opt.value ?? ''),
        label: opt.label ?? String(opt.value ?? ''),
        textLabel:
          typeof opt.label === 'string'
            ? opt.label
            : extractText(opt.label) || String(opt.value ?? ''),
        disabled: Boolean(opt.disabled),
        index,
      }))
      return {
        groups:
          flatOptions.length > 0
            ? [{ label: null, disabled: false, options: flatOptions }]
            : [],
        flatOptions,
      }
    }
    return parseSelectChildren(children)
  }, [children, optionsProp])

  const { groups, flatOptions } = parsed

  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = useState(() => {
    if (defaultValue !== undefined && defaultValue !== null) {
      return String(defaultValue)
    }
    return flatOptions[0]?.value ?? ''
  })

  const currentValue = isControlled
    ? value === null
      ? ''
      : String(value)
    : internalValue

  const selectedOption = useMemo(
    () => flatOptions.find(opt => opt.value === currentValue) || null,
    [flatOptions, currentValue]
  )

  const setMergedRef = useCallback(
    node => {
      triggerRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef && typeof forwardedRef === 'object') {
        forwardedRef.current = node
      }
    },
    [forwardedRef]
  )

  const updateMenuPosition = useCallback(() => {
    if (typeof window === 'undefined' || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewportW = window.innerWidth
    const viewportH = window.innerHeight
    const margin = 8
    const gap = 6
    const maxDesiredHeight = 260

    const spaceBelow = viewportH - rect.bottom - margin - gap
    const spaceAbove = rect.top - margin - gap
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow

    const availableHeight = Math.max(
      110,
      Math.min(maxDesiredHeight, openUpward ? spaceAbove : spaceBelow)
    )

    const minWidth = Math.min(rect.width, viewportW - margin * 2)
    const maxWidth = Math.min(Math.max(rect.width, 220), viewportW - margin * 2)

    let left = rect.left
    if (left + minWidth > viewportW - margin) {
      left = Math.max(margin, viewportW - margin - minWidth)
    }
    if (left < margin) left = margin

    const style = {
      position: 'fixed',
      left: `${Math.round(left)}px`,
      minWidth: `${Math.round(minWidth)}px`,
      maxWidth: `${Math.round(maxWidth)}px`,
      maxHeight: `${Math.round(availableHeight)}px`,
    }

    if (openUpward) {
      style.bottom = `${Math.round(viewportH - rect.top + gap)}px`
    } else {
      style.top = `${Math.round(rect.bottom + gap)}px`
    }

    setMenuStyle(style)
  }, [])

  const findNextEnabledIndex = useCallback(
    (startIndex, direction) => {
      if (flatOptions.length === 0) return -1
      const len = flatOptions.length
      let idx = startIndex
      for (let step = 0; step < len; step++) {
        idx = (idx + direction + len) % len
        if (!flatOptions[idx].disabled) return idx
      }
      return -1
    },
    [flatOptions]
  )

  const openMenu = useCallback(() => {
    if (disabled) return
    const selectedIdx = flatOptions.findIndex(
      opt => opt.value === currentValue && !opt.disabled
    )
    const initialIdx =
      selectedIdx >= 0
        ? selectedIdx
        : flatOptions.findIndex(opt => !opt.disabled)
    setActiveIndex(initialIdx)
    setOpen(true)
  }, [disabled, flatOptions, currentValue])

  const closeMenu = useCallback((returnFocus = false) => {
    setOpen(false)
    if (returnFocus) {
      triggerRef.current?.focus()
    }
  }, [])

  const selectValue = useCallback(
    nextVal => {
      if (!isControlled) {
        setInternalValue(nextVal)
      }
      if (onChange) {
        const syntheticEvent = {
          target: { value: nextVal, name: name ?? '' },
          currentTarget: { value: nextVal, name: name ?? '' },
        }
        onChange(syntheticEvent)
      }
      closeMenu(true)
    },
    [isControlled, onChange, name, closeMenu]
  )

  useIsomorphicLayoutEffect(() => {
    if (!open) return undefined
    updateMenuPosition()
    return undefined
  }, [open, updateMenuPosition, flatOptions.length])

  // Cerrar en click externo, reposicionar en resize/scroll y capturar Escape
  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined

    function handlePointerDown(e) {
      const target = e.target
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      closeMenu(false)
    }

    function handleKeyDownCapture(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (typeof e.stopImmediatePropagation === 'function') {
          e.stopImmediatePropagation()
        }
        closeMenu(true)
      }
    }

    function handleScrollOrResize(e) {
      if (e?.target && menuRef.current?.contains(e.target)) return
      updateMenuPosition()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDownCapture, true)
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDownCapture, true)
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open, closeMenu, updateMenuPosition])

  // Mantener visible la opción activa al navegar con teclado
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const el = optionRefs.current[activeIndex]
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex])

  // Limpiar timer de búsqueda por teclado al desmontar
  useEffect(() => {
    const typeahead = typeaheadRef.current
    return () => {
      if (typeahead.timer) clearTimeout(typeahead.timer)
    }
  }, [])

  function handleTriggerKeyDown(e) {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        openMenu()
      } else {
        setActiveIndex(prev => findNextEnabledIndex(prev, 1))
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        openMenu()
      } else {
        setActiveIndex(prev =>
          findNextEnabledIndex(prev < 0 ? 0 : prev, -1)
        )
      }
      return
    }

    if (e.key === 'Home' && open) {
      e.preventDefault()
      setActiveIndex(flatOptions.findIndex(opt => !opt.disabled))
      return
    }

    if (e.key === 'End' && open) {
      e.preventDefault()
      for (let i = flatOptions.length - 1; i >= 0; i--) {
        if (!flatOptions[i].disabled) {
          setActiveIndex(i)
          break
        }
      }
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!open) {
        openMenu()
      } else if (
        activeIndex >= 0 &&
        flatOptions[activeIndex] &&
        !flatOptions[activeIndex].disabled
      ) {
        selectValue(flatOptions[activeIndex].value)
      }
      return
    }

    if (e.key === 'Tab' && open) {
      closeMenu(false)
      return
    }

    // Type-ahead rápido por caracteres
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const ta = typeaheadRef.current
      if (ta.timer) clearTimeout(ta.timer)
      ta.buffer = `${ta.buffer}${e.key.toLowerCase()}`
      ta.timer = setTimeout(() => {
        ta.buffer = ''
      }, 500)

      const match = flatOptions.find(
        opt =>
          !opt.disabled &&
          opt.textLabel.toLowerCase().startsWith(ta.buffer)
      )
      if (match) {
        if (open) {
          setActiveIndex(match.index)
        } else {
          selectValue(match.value)
        }
      }
    }
  }

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md
  const optionTextClass = OPTION_TEXT_CLASSES[size] || OPTION_TEXT_CLASSES.md
  const iconSizeClass = ICON_SIZE_CLASSES[size] || ICON_SIZE_CLASSES.md

  const variantClass =
    variant === 'ghost'
      ? 'border border-transparent bg-transparent text-text1 hover:bg-surface-alt/70 focus-visible:border-border2 focus-visible:ring-1 focus-visible:ring-accent/25'
      : error
        ? 'border border-red-500/80 bg-surface text-text1 focus-visible:border-red-500 focus-visible:ring-1 focus-visible:ring-red-500/40'
        : open
          ? 'border border-accent bg-surface text-text1 ring-1 ring-accent/20'
          : 'border border-border2 bg-surface text-text1 hover:border-text3/50 focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent/20'

  const displayLabel = selectedOption ? selectedOption.label : placeholder
  const isPlaceholder = !selectedOption

  const menuPortal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            style={menuStyle || { position: 'fixed', visibility: 'hidden' }}
            onPointerDown={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className={`z-[120] pointer-events-auto overflow-y-auto rounded-xl bg-surface border border-border shadow-xl py-1.5 px-1 animate-fade-in ${menuClassName}`}
          >
            {flatOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text3 text-center">
                Sin opciones disponibles
              </div>
            ) : (
              groups.map((group, groupIdx) => (
                <div
                  key={group.label ?? `group-${groupIdx}`}
                  className={
                    groupIdx > 0 && group.label
                      ? 'mt-1 pt-1 border-t border-border/70'
                      : ''
                  }
                >
                  {group.label && (
                    <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text3 select-none">
                      {group.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.options.map(opt => {
                      const isSelected = opt.value === currentValue
                      const isActive = opt.index === activeIndex
                      return (
                        <button
                          key={`${opt.index}-${opt.value}`}
                          ref={el => {
                            optionRefs.current[opt.index] = el
                          }}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={opt.disabled || undefined}
                          disabled={opt.disabled}
                          onMouseEnter={() => {
                            if (!opt.disabled) setActiveIndex(opt.index)
                          }}
                          onClick={e => {
                            e.stopPropagation()
                            if (!opt.disabled) selectValue(opt.value)
                          }}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg text-left transition-colors ${optionTextClass} ${
                            opt.disabled
                              ? 'opacity-45 cursor-not-allowed text-text3'
                              : isSelected
                                ? 'bg-accent-bg text-accent font-medium cursor-pointer'
                                : isActive
                                  ? 'bg-surface-alt text-text1 cursor-pointer'
                                  : 'text-text1 hover:bg-surface-alt cursor-pointer'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 shrink-0 text-accent" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>,
          document.body
        )
      : null

  return (
    <div className="relative flex flex-col gap-1 w-full">
      <div className="relative flex items-center w-full">
        <button
          ref={setMergedRef}
          id={id}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-required={required || undefined}
          title={title}
          disabled={disabled}
          onClick={e => {
            e.stopPropagation()
            if (open) closeMenu(false)
            else openMenu()
          }}
          onKeyDown={handleTriggerKeyDown}
          onBlur={onBlur}
          onFocus={onFocus}
          className={`w-full flex items-center justify-between text-left transition-all duration-150 outline-none select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${variantClass} ${className}`}
          {...restProps}
        >
          <span
            className={`truncate ${isPlaceholder ? 'text-text3' : ''}`}
          >
            {displayLabel}
          </span>
          <span
            className={`absolute ${size === 'xs' ? 'right-1.5' : 'right-2.5'} flex items-center pointer-events-none text-text3`}
          >
            <ChevronDown
              className={`${iconSizeClass} transition-transform duration-150 ${
                open ? 'rotate-180 text-accent' : ''
              }`}
            />
          </span>
        </button>

        {name && (
          <input
            type="hidden"
            name={name}
            value={currentValue}
            required={required}
          />
        )}
      </div>

      {error && (
        <span className="text-xs text-red-500 dark:text-red-400 font-medium px-0.5">
          {error}
        </span>
      )}

      {menuPortal}
    </div>
  )
})

export default Select
