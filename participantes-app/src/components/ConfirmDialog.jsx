import { useEffect, useRef } from 'react'

// ConfirmDialog — reemplaza window.confirm() con personalidad
// Props:
//   open      boolean
//   title     string
//   message   string
//   onConfirm () => void
//   onCancel  () => void
//   danger    boolean — si true, el botón confirmar usa rojo en vez de verde

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = false }) {
  const confirmRef = useRef(null)

  // Enfocar el botón de confirmar al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        confirmRef.current?.focus()
      }, 50)
    }
  }, [open])

  // ESC → cancelar / Enter → confirmar
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleKey, true) // Usar capture mode para interceptar el Enter antes que otros elementos
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [open, onConfirm, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-surface border border-border2 rounded-xl shadow-xl w-full max-w-sm animate-scale-in">

        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="text-sm font-medium text-text1">{title}</div>
          {message && (
            <div className="text-xs text-text2 mt-1 leading-relaxed">{message}</div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-2 px-5 pb-5 pt-2">

          {/* Cancelar — blanco normal, rojo hover */}
          <button
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border2 text-xs font-medium text-text2 bg-surface hover:bg-danger-bg hover:text-danger hover:border-danger transition-colors duration-150"
          >
            <kbd className="font-mono text-[10px] bg-bg border border-border2 rounded px-1 py-0.5 leading-none">ESC</kbd>
            Cancelar
          </button>

          {/* Confirmar — negro normal, verde oscuro/verde hover según `danger` */}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-surface bg-text1 border border-text1 transition-colors duration-150
              ${danger
                ? 'hover:bg-[#06402B] hover:border-[#06402B]'
                : 'hover:bg-accent hover:border-accent'
              }`}
          >
            Confirmar
            <kbd className="font-mono text-[10px] bg-white/20 border border-white/30 rounded px-1 py-0.5 leading-none flex items-center gap-0.5">
              Enter <span className="text-[8px]">↵</span>
            </kbd>
          </button>

        </div>
      </div>
    </div>
  )
}