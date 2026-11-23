import { useState } from 'react'
import { AlertTriangle, UserMinus, Users } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

/**
 * Modal interactivo al quitar el titular de una parte SMT que ya tiene ayudante asignado.
 * Permite elegir entre quitar solo al titular o a ambos, con opción de recordar la elección
 * (configurable posteriormente en Perfil → Preferencias).
 */
export default function QuitarTitularSmtModal({
  isOpen,
  onClose,
  parteTitulo,
  nombreTitular,
  nombreAyudante,
  titularConfirmado,
  ayudanteConfirmado,
  loading = false,
  onConfirmChoice,
}) {
  const [recordar, setRecordar] = useState(false)

  if (!isOpen) return null

  const hayConfirmados = Boolean(titularConfirmado || ayudanteConfirmado)

  function handleElegir(modo) {
    onConfirmChoice?.({ modo, recordar })
    setRecordar(false)
  }

  function handleCerrar() {
    setRecordar(false)
    onClose?.()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleCerrar}
      title="Quitar titular de asignación SMT"
      description={parteTitulo || 'Esta parte tiene un ayudante asignado'}
      size="md"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCerrar}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={UserMinus}
            disabled={loading}
            onClick={() => handleElegir('solo_titular')}
          >
            Solo titular
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={Users}
            loading={loading}
            onClick={() => handleElegir('ambos')}
          >
            Quitar a ambos
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-text2 leading-relaxed">
          Esta parte tiene asignado a{' '}
          <strong className="text-text1">{nombreTitular || 'Titular'}</strong> como titular y a{' '}
          <strong className="text-text1">{nombreAyudante || 'Ayudante'}</strong> como ayudante.
          ¿Cómo deseas proceder?
        </p>

        {hayConfirmados && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/35 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold">Asignación ya confirmada:</strong>{' '}
              Al quitar {titularConfirmado && ayudanteConfirmado ? 'participantes confirmados' : 'un participante confirmado'},
              también se eliminará su registro correspondiente del historial de participaciones.
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-surface-alt/50 border border-border space-y-1">
            <div className="font-semibold text-text1 flex items-center gap-1.5">
              <UserMinus className="w-3.5 h-3.5 text-text2" />
              Solo titular
            </div>
            <p className="text-[11px] text-text3 leading-snug">
              Quita únicamente a {nombreTitular || 'el titular'}. El ayudante permanece visible y desbloqueado para conservarlo o quitarlo aparte.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-danger-bg/40 border border-danger/20 space-y-1">
            <div className="font-semibold text-text1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-danger" />
              Quitar a ambos
            </div>
            <p className="text-[11px] text-text3 leading-snug">
              Deja la parte completamente vacía quitando tanto al titular como a {nombreAyudante || 'el ayudante'}.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2.5 pt-2 border-t border-border/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={recordar}
            onChange={e => setRecordar(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-border2 text-accent focus:ring-accent bg-surface cursor-pointer"
          />
          <span className="text-xs text-text2 leading-snug">
            <span className="font-medium text-text1 block">
              Recordar mi elección y no volver a preguntar
            </span>
            <span className="text-[11px] text-text3">
              Puedes cambiar este comportamiento en cualquier momento desde Perfil → Preferencias.
            </span>
          </span>
        </label>
      </div>
    </Dialog>
  )
}
