import { useState, useMemo } from 'react'
import { Trash2, ArrowRight, Plus, AlertTriangle } from 'lucide-react'
import { formatFechaLegible, getImpactoEventoSemana, MESES } from '../../lib/fechas'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Dialog } from '../ui/Dialog'
import {
  MES_CODE,
  TIPO_LABEL,
  BADGE_STYLES,
  getTiposPermitidos,
} from './matrizUtils'

export function TypeBadge({ tipo, onClick, title, className = '' }) {
  if (!tipo) {
    return (
      <span
        onClick={onClick}
        title={title || 'Click para ver/editar'}
        className="inline-flex items-center justify-center w-6 h-4 text-zinc-300 dark:text-zinc-700 text-[10px] cursor-pointer hover:text-text3 transition-colors"
      >
        ·
      </span>
    )
  }
  const style = BADGE_STYLES[tipo] || 'bg-zinc-100 dark:bg-zinc-800 text-text2 border-zinc-200 dark:border-zinc-700'

  return (
    <span
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center min-w-5 h-4 px-1 rounded text-[10px] font-semibold font-mono border select-none cursor-pointer transition-all duration-100 hover:scale-105 active:scale-95 ${style} ${className}`}
    >
      {tipo}
    </span>
  )
}

export function TipoChips({ tipos, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {tipos.map(t => {
        const style = BADGE_STYLES[t] || 'bg-zinc-100 dark:bg-zinc-800 text-text2'
        const isSelected = selected === t

        return (
          <button
            key={t}
            type="button"
            onClick={() => onSelect(isSelected ? '' : t)}
            className={`px-2 py-1 rounded-lg text-xs font-mono font-medium border transition-all cursor-pointer ${
              isSelected
                ? `${style} ring-1 ring-emerald-500/40 font-bold shadow-2xs`
                : 'bg-zinc-100/60 dark:bg-zinc-900/60 text-text3 border-zinc-200/80 dark:border-zinc-800 hover:text-text1 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {t} <span className="font-sans font-normal text-[11px] opacity-80">{TIPO_LABEL[t]}</span>
          </button>
        )
      })}
    </div>
  )
}

export function MatCellModal({ open, onClose, persona, mesIdx, registros, onNavigate }) {
  if (!persona) return null

  const mes = MESES[mesIdx]
  const recs = registros
    .filter(r => r.clave === persona.clave && r.mes === mes)
    .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))

  function handleIrAPrograma() {
    onClose()
    onNavigate?.('programa')
  }

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={`${persona.nombre} — ${mes}`}
      description="Historial de participaciones registradas en este mes."
      size="sm"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="accent"
            size="sm"
            iconRight={ArrowRight}
            onClick={handleIrAPrograma}
          >
            Ver en Programa
          </Button>
        </>
      }
    >
      <div className="space-y-3 py-1">
        {recs.length === 0 ? (
          <div className="text-center py-6 text-xs text-text3">
            Sin participación registrada en este mes.
          </div>
        ) : (
          recs.map(r => (
            <div
              key={r.id}
              className="p-3 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <TypeBadge tipo={r.tipo} />
                <span className="text-xs font-medium text-text1">
                  {TIPO_LABEL[r.tipo] || r.tipo}
                </span>
              </div>
              {r.fecha && (
                <span className="text-xs text-text3 bg-surface dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60 font-medium">
                  {formatFechaLegible(r.fecha)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </Dialog>
  )
}

function AncCellModalBody({ persona, mesIdx, registros, onAdd, onDelete, eventos, config }) {
  const tipos = getTiposPermitidos(persona)
  const defaultYear = new Date().getFullYear()
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(`${defaultYear}-${MES_CODE[mesIdx]}-01`)
  const [nuevaObs, setNuevaObs] = useState('')
  const [saving, setSaving] = useState(false)

  const recsDelMes = registros
    .filter(r => r.clave === persona?.clave && r.mes === MESES[mesIdx])
    .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')))

  const impactoFecha = useMemo(() => {
    if (!nuevaFecha || !eventos?.length) return null
    const evt = eventos.find(
      e => e.fecha_original === nuevaFecha || e.fecha_efectiva === nuevaFecha
    )
    if (!evt) return null
    return getImpactoEventoSemana(
      evt,
      config?.dia_reunion_entre_semana || 'jueves',
      config?.dia_reunion_fin_semana || 'sabado'
    )
  }, [nuevaFecha, eventos, config])

  async function handleAdd() {
    if (!nuevoTipo || !nuevaFecha) return
    setSaving(true)
    try {
      await onAdd({
        persona,
        mesIdx,
        tipo: nuevoTipo,
        fecha: nuevaFecha,
        obs: nuevaObs.trim() || null,
      })
      setNuevoTipo('')
      setNuevaObs('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 py-1">
      {/* Asignaciones existentes */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
          Asignaciones del mes ({recsDelMes.length})
        </span>
        {recsDelMes.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-text3">
            No hay asignaciones registradas en {MESES[mesIdx]}.
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recsDelMes.map(r => (
              <div
                key={r.id}
                className="p-2.5 rounded-lg bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <TypeBadge tipo={r.tipo} />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-text1 truncate">
                      {TIPO_LABEL[r.tipo] || r.tipo}
                    </div>
                    {r.observaciones && (
                      <div className="text-[11px] text-text3 truncate">
                        {r.observaciones}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.fecha && (
                    <span className="text-xs font-mono text-text3 bg-surface dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700/60">
                      {formatFechaLegible(r.fecha)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    className="p-1.5 rounded-md text-text3 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    title="Eliminar participación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario para nueva asignación */}
      <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
          Agregar nueva asignación
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-text2 mb-1">
              Fecha
            </label>
            <Input
              type="date"
              value={nuevaFecha}
              onChange={e => setNuevaFecha(e.target.value)}
              size="sm"
            />
            {impactoFecha?.cancelaEntreSemana && (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>En esta fecha se celebra: {impactoFecha.tituloEvento} (sin reunión ordinaria).</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-text2 mb-1">
              Observaciones
            </label>
            <Input
              type="text"
              value={nuevaObs}
              onChange={e => setNuevaObs(e.target.value)}
              placeholder="Opcional..."
              size="sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text2 mb-1">
            Tipo de asignación *
          </label>
          <TipoChips tipos={tipos} selected={nuevoTipo} onSelect={setNuevoTipo} />
        </div>

        <div className="pt-1 flex justify-end">
          <Button
            variant="accent"
            size="sm"
            icon={Plus}
            loading={saving}
            disabled={!nuevoTipo}
            onClick={handleAdd}
          >
            Agregar al mes
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AncCellModal({ open, onClose, persona, mesIdx, registros, onAdd, onDelete, eventos, config }) {
  if (!persona) return null

  const mes = MESES[mesIdx]

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title={`${persona.nombre} — ${mes}`}
      description={`${persona.estatus} · Clave ${persona.clave}`}
      size="md"
      footer={
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <AncCellModalBody
        key={`${persona.clave}-${mesIdx}-${open}`}
        persona={persona}
        mesIdx={mesIdx}
        registros={registros}
        onAdd={onAdd}
        onDelete={onDelete}
        eventos={eventos}
        config={config}
      />
    </Dialog>
  )
}
