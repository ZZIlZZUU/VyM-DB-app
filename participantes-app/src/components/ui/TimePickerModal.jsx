import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

/**
 * Convierte un string de hora ('19:30', '7:05', '07:30 PM') a objeto { hour12, minute, ampm }
 */
export function parseInitialTimeToComponents(timeStr, baseHourStr = '19:00') {
  let h = 19
  let m = 0
  let ampm = 'PM'

  if (timeStr != null) {
    const str = String(timeStr).trim()
    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i)
    if (match) {
      h = parseInt(match[1], 10)
      m = parseInt(match[2], 10)
      if (match[3]) {
        ampm = match[3].toUpperCase()
      } else {
        if (h === 0) {
          ampm = 'AM'
          h = 12
        } else if (h === 12) {
          ampm = 'PM'
        } else if (h > 12) {
          ampm = 'PM'
          h -= 12
        } else {
          // Si h está entre 1 y 11 y la reunión base es PM, asumimos PM
          const baseMatch = String(baseHourStr).match(/^(\d{1,2})/)
          const baseH = baseMatch ? parseInt(baseMatch[1], 10) : 19
          ampm = baseH >= 12 ? 'PM' : 'AM'
        }
      }
    }
  }

  // Normalizar hora 12h (1..12)
  let hour12 = h % 12
  if (hour12 === 0) hour12 = 12

  // Normalizar minutos (0..59)
  const minute = Math.max(0, Math.min(59, m))

  return { hour12, minute, ampm }
}

/**
 * Pop-up modal estilo Android (Material Design 3 Time Picker).
 *
 * Características:
 * - Cajas numéricas superiores directamente editables con teclado físico.
 * - Esfera analógica interactiva (dial) con manecilla continua sin saltos disruptivos de 360°.
 * - Hover circular gris en cada número con el diámetro idéntico al círculo azul de la aguja.
 * - Selector vertical AM / PM estilo Material You.
 * - Transición automática fluida de horas a minutos.
 */
export function TimePickerModal({
  isOpen,
  onClose,
  initialTime = '19:00',
  baseHourStr = '19:00',
  title = 'Seleccionar hora',
  subtitle = null,
  onConfirm,
}) {
  const [selectedHour, setSelectedHour] = useState(7)
  const [selectedMinute, setSelectedMinute] = useState(0)
  const [ampm, setAmpm] = useState('PM')
  const [mode, setMode] = useState('hours') // 'hours' | 'minutes'

  // Estados locales para los inputs editables
  const [hourInputStr, setHourInputStr] = useState('07')
  const [minuteInputStr, setMinuteInputStr] = useState('00')

  // Ángulo continuo acumulado para evitar giros de 360° al pasar de 11 a 12 o 59 a 0
  const [continuousAngle, setContinuousAngle] = useState(210) // 7h * 30deg = 210deg

  const [isPointerDragging, setIsPointerDragging] = useState(false)

  const dialRef = useRef(null)
  const hourInputRef = useRef(null)
  const minuteInputRef = useRef(null)

  // Función para actualizar continuousAngle calculando la distancia angular más corta
  const updateContinuousAngle = useCallback((targetAngle) => {
    setContinuousAngle(prev => {
      const currentNorm = ((prev % 360) + 360) % 360
      let diff = targetAngle - currentNorm
      if (diff > 180) diff -= 360
      if (diff < -180) diff += 360
      return prev + diff
    })
  }, [])

  // Sincronizar estado inicial al abrir
  useEffect(() => {
    if (isOpen) {
      const parsed = parseInitialTimeToComponents(initialTime, baseHourStr)
      setSelectedHour(parsed.hour12)
      setSelectedMinute(parsed.minute)
      setHourInputStr(String(parsed.hour12).padStart(2, '0'))
      setMinuteInputStr(String(parsed.minute).padStart(2, '0'))
      setAmpm(parsed.ampm)
      setMode('hours')
      setContinuousAngle((parsed.hour12 % 12) * 30)
      setIsPointerDragging(false)
    }
  }, [isOpen, initialTime, baseHourStr])

  // Al cambiar de modo (horas <-> minutos), sincronizar ángulo base
  const handleSetMode = useCallback((newMode) => {
    setMode(newMode)
    if (newMode === 'hours') {
      updateContinuousAngle((selectedHour % 12) * 30)
    } else {
      updateContinuousAngle(selectedMinute * 6)
    }
  }, [selectedHour, selectedMinute, updateContinuousAngle])

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Cálculo del ángulo según posición del cursor
  const calculateAngleFromEvent = useCallback((e) => {
    if (!dialRef.current) return null
    const rect = dialRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360
  }, [])

  const handlePointerDown = (e) => {
    e.preventDefault()
    setIsPointerDragging(true)
    const angle = calculateAngleFromEvent(e)
    if (angle == null) return

    if (mode === 'hours') {
      let hour = Math.round(angle / 30) % 12
      if (hour === 0) hour = 12
      setSelectedHour(hour)
      setHourInputStr(String(hour).padStart(2, '0'))
      updateContinuousAngle((hour % 12) * 30)
    } else {
      let min = Math.round(angle / 6) % 60
      setSelectedMinute(min)
      setMinuteInputStr(String(min).padStart(2, '0'))
      updateContinuousAngle(min * 6)
    }
  }

  const handlePointerMove = (e) => {
    if (!isPointerDragging) return
    e.preventDefault()
    const angle = calculateAngleFromEvent(e)
    if (angle == null) return

    if (mode === 'hours') {
      let hour = Math.round(angle / 30) % 12
      if (hour === 0) hour = 12
      setSelectedHour(hour)
      setHourInputStr(String(hour).padStart(2, '0'))
      updateContinuousAngle((hour % 12) * 30)
    } else {
      let min = Math.round(angle / 6) % 60
      setSelectedMinute(min)
      setMinuteInputStr(String(min).padStart(2, '0'))
      updateContinuousAngle(min * 6)
    }
  }

  const handlePointerUp = () => {
    if (isPointerDragging) {
      setIsPointerDragging(false)
      // Transición automática suave hacia minutos al soltar la hora
      if (mode === 'hours') {
        setTimeout(() => {
          handleSetMode('minutes')
        }, 220)
      }
    }
  }

  // Selección directa por clic en un número del dial
  const handleSelectHourNumber = (h) => {
    setSelectedHour(h)
    setHourInputStr(String(h).padStart(2, '0'))
    updateContinuousAngle((h % 12) * 30)
    setTimeout(() => {
      handleSetMode('minutes')
    }, 220)
  }

  const handleSelectMinuteNumber = (m) => {
    setSelectedMinute(m)
    setMinuteInputStr(String(m).padStart(2, '0'))
    updateContinuousAngle(m * 6)
  }

  // Manejo de escritura directa en caja de horas
  const handleHourInputChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setHourInputStr(raw)

    if (raw) {
      const val = parseInt(raw, 10)
      if (val >= 1 && val <= 12) {
        setSelectedHour(val)
        updateContinuousAngle((val % 12) * 30)
      }
      // Si escribió 2 dígitos o número >= 2, saltar automáticamente a minutos
      if (raw.length === 2 || val > 1) {
        setTimeout(() => {
          minuteInputRef.current?.focus()
          minuteInputRef.current?.select()
        }, 80)
      }
    }
  }

  const handleHourInputBlur = () => {
    let val = parseInt(hourInputStr, 10)
    if (isNaN(val) || val < 1) val = 12
    if (val > 12) val = 12
    setSelectedHour(val)
    setHourInputStr(String(val).padStart(2, '0'))
    updateContinuousAngle((val % 12) * 30)
  }

  // Manejo de escritura directa en caja de minutos
  const handleMinuteInputChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)
    setMinuteInputStr(raw)

    if (raw) {
      const val = parseInt(raw, 10)
      if (val >= 0 && val <= 59) {
        setSelectedMinute(val)
        updateContinuousAngle(val * 6)
      }
    }
  }

  const handleMinuteInputBlur = () => {
    let val = parseInt(minuteInputStr, 10)
    if (isNaN(val) || val < 0) val = 0
    if (val > 59) val = 59
    setSelectedMinute(val)
    setMinuteInputStr(String(val).padStart(2, '0'))
    updateContinuousAngle(val * 6)
  }

  // Confirmar y entregar resultado estructurado
  const handleConfirm = () => {
    let h24 = selectedHour
    if (ampm === 'PM' && selectedHour < 12) h24 += 12
    if (ampm === 'AM' && selectedHour === 12) h24 = 0

    const minStr = String(selectedMinute).padStart(2, '0')
    const hora12 = `${selectedHour}:${minStr}`
    const hora24 = `${String(h24).padStart(2, '0')}:${minStr}`
    const horaDisplay = `${hora12} ${ampm}`

    onConfirm?.({
      hora12,
      hora24,
      horaDisplay,
      selectedHour,
      selectedMinute,
      ampm,
    })
    onClose?.()
  }

  if (!isOpen) return null

  // Geometría de la esfera de reloj
  const radius = 96
  const dialDiameter = 256

  // 12 posiciones de horas (12 arriba a las 0°, 1 a 30°, etc.)
  const hourNumbers = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  // 12 posiciones de minutos múltiplos de 5 (00..55)
  const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop con desenfoque suave */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tarjeta Modal estilo Android Material 3 */}
      <div
        className="relative z-10 w-full max-w-[340px] sm:max-w-[360px] bg-white dark:bg-[#1E1F22] rounded-[28px] shadow-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col space-y-5 animate-in fade-in zoom-in-95 duration-150 select-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 block tracking-wide">
              {title}
            </span>
            {subtitle && (
              <p className="text-xs font-semibold text-text1 truncate max-w-[240px]" title={subtitle}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cajas de visualización digital MODIFICABLES con teclado numérico */}
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {/* Caja de Hora (Input numérico directo) */}
          <div className="relative">
            <input
              ref={hourInputRef}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={hourInputStr}
              onFocus={() => {
                handleSetMode('hours')
                hourInputRef.current?.select()
              }}
              onChange={handleHourInputChange}
              onBlur={handleHourInputBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirm()
              }}
              className={`w-20 h-16 sm:w-24 sm:h-18 rounded-2xl text-4xl sm:text-5xl font-light font-mono text-center tracking-tight transition-all cursor-text focus:outline-hidden ${
                mode === 'hours'
                  ? 'bg-blue-100 text-blue-900 border-2 border-blue-600 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-400 shadow-sm'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
              title="Haz clic o teclea directamente la hora"
            />
          </div>

          {/* Separador ":" */}
          <span className="text-4xl sm:text-5xl font-normal text-zinc-500 dark:text-zinc-400 select-none">
            :
          </span>

          {/* Caja de Minutos (Input numérico directo) */}
          <div className="relative">
            <input
              ref={minuteInputRef}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={minuteInputStr}
              onFocus={() => {
                handleSetMode('minutes')
                minuteInputRef.current?.select()
              }}
              onChange={handleMinuteInputChange}
              onBlur={handleMinuteInputBlur}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirm()
              }}
              className={`w-20 h-16 sm:w-24 sm:h-18 rounded-2xl text-4xl sm:text-5xl font-light font-mono text-center tracking-tight transition-all cursor-text focus:outline-hidden ${
                mode === 'minutes'
                  ? 'bg-blue-100 text-blue-900 border-2 border-blue-600 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-400 shadow-sm'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
              }`}
              title="Haz clic o teclea directamente los minutos"
            />
          </div>

          {/* Selector Vertical AM / PM estilo Android */}
          <div className="flex flex-col rounded-xl border border-zinc-300 dark:border-zinc-700 overflow-hidden divide-y divide-zinc-300 dark:divide-zinc-700 w-11 sm:w-12 h-16 sm:h-18 shrink-0">
            <button
              type="button"
              onClick={() => setAmpm('AM')}
              className={`flex-1 flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                ampm === 'AM'
                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200'
                  : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => setAmpm('PM')}
              className={`flex-1 flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                ampm === 'PM'
                  ? 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200'
                  : 'bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* ── ESFERA DE RELOJ ANALÓGICO ANDROID (DIAL) ── */}
        <div className="relative mx-auto my-1 flex items-center justify-center">
          <div
            ref={dialRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="w-64 h-64 rounded-full bg-zinc-100/90 dark:bg-zinc-800/80 relative touch-none select-none border border-zinc-200/60 dark:border-zinc-700/50 shadow-inner"
            style={{ width: dialDiameter, height: dialDiameter }}
          >
            {/* Punto central del eje */}
            <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none shadow-xs" />

            {/* Manecilla radial continua sin salto de 360° */}
            <div
              className={`absolute top-1/2 left-1/2 origin-top z-10 pointer-events-none ${
                isPointerDragging ? 'transition-none' : 'transition-transform duration-150 ease-out'
              }`}
              style={{
                height: radius,
                transform: `translate(-50%, 0) rotate(${continuousAngle + 180}deg)`,
              }}
            >
              {/* Línea de la manecilla */}
              <div className="w-0.5 h-full bg-blue-600 dark:bg-blue-400 mx-auto" />

              {/* Perilla circular en la punta de la manecilla (diámetro w-10 h-10) */}
              <div className="w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center justify-center text-white font-bold text-sm shadow-md" />
            </div>

            {/* Números en la esfera (Horas) con hover circular gris de w-10 h-10 */}
            {mode === 'hours' &&
              hourNumbers.map(h => {
                const angle = (h % 12) * 30
                const rad = (angle * Math.PI) / 180
                const x = dialDiameter / 2 + radius * Math.sin(rad)
                const y = dialDiameter / 2 - radius * Math.cos(rad)
                const isSelected = selectedHour === h

                return (
                  <button
                    key={`h-${h}`}
                    type="button"
                    onClick={() => handleSelectHourNumber(h)}
                    className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'text-white z-20 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/90 dark:hover:bg-zinc-700/80 active:bg-zinc-300 dark:active:bg-zinc-600'
                    }`}
                    style={{
                      left: x,
                      top: y,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`Hora ${h}`}
                  >
                    {h}
                  </button>
                )
              })}

            {/* Números en la esfera (Minutos múltiplos de 5) con hover circular gris de w-10 h-10 */}
            {mode === 'minutes' &&
              minuteNumbers.map(m => {
                const angle = m * 6
                const rad = (angle * Math.PI) / 180
                const x = dialDiameter / 2 + radius * Math.sin(rad)
                const y = dialDiameter / 2 - radius * Math.cos(rad)
                const isSelected = selectedMinute === m

                return (
                  <button
                    key={`m-${m}`}
                    type="button"
                    onClick={() => handleSelectMinuteNumber(m)}
                    className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'text-white z-20 font-bold'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/90 dark:hover:bg-zinc-700/80 active:bg-zinc-300 dark:active:bg-zinc-600'
                    }`}
                    style={{
                      left: x,
                      top: y,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`${m} minutos`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                )
              })}

            {/* Si el minuto seleccionado no es múltiplo de 5, mostrar su número dentro de la perilla */}
            {mode === 'minutes' && selectedMinute % 5 !== 0 && (
              <div
                className="absolute z-20 pointer-events-none text-white font-bold text-xs"
                style={{
                  left: dialDiameter / 2 + radius * Math.sin((continuousAngle * Math.PI) / 180),
                  top: dialDiameter / 2 - radius * Math.cos((continuousAngle * Math.PI) / 180),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {String(selectedMinute).padStart(2, '0')}
              </div>
            )}
          </div>
        </div>

        {/* Barra inferior de acciones (Teclado eliminado, alineación limpia con Cancelar y Aceptar) */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-blue-600 dark:text-blue-400 font-semibold"
          >
            Cancelar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConfirm}
            className="text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TimePickerModal
