import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ───────────────────────────────────────────────
const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]
const MES_ABBR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MES_CODE = ['01','02','03','04','05','06','07','08','09','10','11','12']

const TIPOS_MAT_F  = ['T','A']
const TIPOS_MAT_M  = ['X']
const TIPOS_SM     = ['X','P','TB','PE','EBC']
const TIPOS_ANC    = ['X','P','TB','PE','EBC','VC','NC']

const TIPO_LABEL = {
  T:'Titular', A:'Asistente', X:'Participación',
  P:'Presidente', TB:'Tesoros', PE:'Perlas',
  EBC:'Est. Bíblico', VC:'Vida Cristiana', NC:'Nec. Congr.'
}
const PESO_MAP = { T:2, A:1, X:1, P:1, TB:1, PE:1, EBC:1, VC:1, NC:1 }

const BADGE_CLASS = {
  T:   'bg-accent-bg   text-accent',
  A:   'bg-blue-bg     text-blue',
  X:   'bg-amber-bg    text-amber',
  P:   'bg-purple-bg   text-purple',
  TB:  'bg-teal-bg     text-teal',
  PE:  'bg-rose-bg     text-rose',
  EBC: 'bg-orange-100  text-orange-700',
  VC:  'bg-green-100   text-green-800',
  NC:  'bg-red-100     text-red-800',
}

const CHIP_CLASS = {
  T:   'bg-accent-bg   text-accent',
  A:   'bg-blue-bg     text-blue',
  X:   'bg-amber-bg    text-amber',
  P:   'bg-purple-bg   text-purple',
  TB:  'bg-teal-bg     text-teal',
  PE:  'bg-rose-bg     text-rose',
  EBC: 'bg-orange-100  text-orange-700',
  VC:  'bg-green-100   text-green-800',
  NC:  'bg-red-100     text-red-800',
}

// Intensidad del mapa de calor por cantidad de registros
function heatColor(count, max) {
  if (!count || !max) return ''
  const ratio = count / max
  if (ratio <= 0)    return ''
  if (ratio <= 0.25) return 'bg-green-100'
  if (ratio <= 0.5)  return 'bg-green-200'
  if (ratio <= 0.75) return 'bg-green-300'
  return 'bg-green-400'
}

function getTiposPermitidos(persona) {
  if (!persona) return []
  if (persona.lista === 'Mat') return persona.sexo === 'F' ? TIPOS_MAT_F : TIPOS_MAT_M
  return persona.estatus === 'Anciano' ? TIPOS_ANC : TIPOS_SM
}

function initials(nombre) {
  return (nombre || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

/** Primeros 10 chars YYYY-MM-DD de una fecha ISO o timestamp (para inputs type="date"). */
function toYyyyMmDd(fecha) {
  if (fecha == null || fecha === '') return ''
  const m = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

/** Dia del mes (1-31); no usar slice(8) con strings tipo 2026-03-15T00:00:00. */
function assignmentDayOfMonth(fecha) {
  const ymd = toYyyyMmDd(fecha)
  if (!ymd) return ''
  return String(parseInt(ymd.slice(8, 10), 10))
}

// ─── Badge ────────────────────────────────────────────────────
function Badge({ tipo, onClick, title }) {
  if (!tipo) return (
    <span
      onClick={onClick}
      title={title || 'Click para editar'}
      className="inline-flex items-center justify-center w-7 h-5 text-border2 text-xs cursor-pointer hover:text-text3"
    >·</span>
  )
  return (
    <span
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-xs font-medium font-mono cursor-pointer hover:opacity-75 ${BADGE_CLASS[tipo] || 'bg-bg text-text2'}`}
    >{tipo}</span>
  )
}

// ─── Chips de tipo ────────────────────────────────────────────
function TipoChips({ tipos, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {tipos.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t === selected ? '' : t)}
          className={`px-2 py-0.5 rounded text-xs font-mono font-medium border-2 transition-none
            ${CHIP_CLASS[t] || 'bg-bg text-text2'}
            ${selected === t ? 'border-current opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
        >
          {t} <span className="font-sans font-light text-xs">{TIPO_LABEL[t]}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Modal base ───────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`bg-surface border border-border2 rounded-xl p-5 shadow-xl ${wide ? 'w-full max-w-lg' : 'w-full max-w-sm'}`}>
        <div className="text-sm font-medium text-text1 mb-4 pb-3 border-b border-border">{title}</div>
        {children}
      </div>
    </div>
  )
}

// ─── Modal Matriculados ───────────────────────────────────────
function MatCellModal({ open, onClose, persona, mesIdx, registros, onSave, onDelete }) {
  const tipos = getTiposPermitidos(persona)
  const [tipo, setTipo]     = useState('')
  const [fecha, setFecha]   = useState('')
  const [obs, setObs]       = useState('')
  const [recId, setRecId]   = useState(null)   // id del registro existente, null si es nuevo
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    // Buscar rec aquí dentro para garantizar que usamos la fecha ya en formato ISO
    // que viene de Supabase, y toYyyyMmDd la normaliza correctamente
    const rec = registros.find(r => r.clave === persona?.clave && r.mes === MESES[mesIdx])
    setRecId(rec?.id ?? null)
    setTipo(rec?.tipo || '')
    setFecha(toYyyyMmDd(rec?.fecha) || `2026-${MES_CODE[mesIdx]}-01`)
    setObs(rec?.observaciones || '')
  }, [open, mesIdx, persona, registros])

  async function handleSave() {
    if (!tipo) { onClose(); return }
    setSaving(true)
    await onSave({ persona, mesIdx, tipo, fecha, obs, existingId: recId })
    setSaving(false)
    onClose()
  }

  async function handleDelete() {
    if (!recId) return
    setSaving(true)
    await onDelete(recId)
    setSaving(false)
    onClose()
  }

  if (!persona) return null
  return (
    <Modal open={open} onClose={onClose} title={`${persona.nombre} — ${MESES[mesIdx]}`}>
      <div className="flex flex-col gap-3">
        <div>
          <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Tipo</div>
          <TipoChips tipos={tipos} selected={tipo} onSelect={setTipo} />
        </div>
        <div>
          <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Fecha</div>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
          />
        </div>
        <div>
          <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Observaciones</div>
          <textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={2}
            placeholder="Opcional..."
            className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent resize-none"
          />
        </div>
        <div className="flex gap-2 mt-1">
          <button onClick={onClose} className="flex-1 px-3 py-1.5 text-sm border border-border2 rounded-lg text-text2 hover:bg-bg">
            Cancelar
          </button>
          {recId && (
            <button onClick={handleDelete} disabled={saving} className="px-3 py-1.5 text-sm bg-danger-bg text-danger border border-danger/30 rounded-lg hover:bg-red-100 disabled:opacity-50">
              Eliminar
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="flex-1 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal Ancianos/SM ────────────────────────────────────────
function AncCellModal({ open, onClose, persona, mesIdx, registros, onAdd, onDelete }) {
  const tipos = getTiposPermitidos(persona)
  const [nuevoTipo, setNuevoTipo]   = useState('')
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [nuevaObs, setNuevaObs]     = useState('')
  const [saving, setSaving] = useState(false)

  const recsDelMes = registros
    .filter(r => r.clave === persona?.clave && r.mes === MESES[mesIdx])
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  useEffect(() => {
    if (!open) return
    setNuevoTipo('')
    setNuevaFecha(`2026-${MES_CODE[mesIdx]}-01`)
    setNuevaObs('')
  }, [open, mesIdx])

  async function handleAdd() {
    if (!nuevoTipo) return
    setSaving(true)
    await onAdd({ persona, mesIdx, tipo: nuevoTipo, fecha: nuevaFecha, obs: nuevaObs })
    setNuevoTipo('')
    setNuevaObs('')
    setSaving(false)
  }

  if (!persona) return null
  return (
    <Modal open={open} onClose={onClose} title={`${persona.nombre} — ${MESES[mesIdx]}`} wide>
      {/* Lista de asignaciones existentes */}
      <div className="mb-4 max-h-48 overflow-y-auto">
        {recsDelMes.length === 0 ? (
          <div className="text-xs text-text3 py-2">Sin asignaciones este mes.</div>
        ) : (
          recsDelMes.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
              <span
                className="font-mono text-xs text-text3 w-10 shrink-0 text-right"
                title={r.fecha != null ? String(r.fecha) : undefined}
              >
                {assignmentDayOfMonth(r.fecha) || '—'}
              </span>
              <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-xs font-medium font-mono ${BADGE_CLASS[r.tipo] || ''}`}>
                {r.tipo}
              </span>
              <span className="flex-1 text-xs text-text2 italic truncate">{r.observaciones || ''}</span>
              <button
                onClick={async () => { setSaving(true); await onDelete(r.id); setSaving(false) }}
                className="text-text3 hover:text-danger text-xs px-1"
              >✕</button>
            </div>
          ))
        )}
      </div>

      {/* Nueva asignación */}
      <div className="border-t border-border pt-4">
        <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-2">Nueva asignación</div>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Fecha</div>
            <input
              type="date"
              value={nuevaFecha}
              onChange={e => setNuevaFecha(e.target.value)}
              className="w-full px-3 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text1 outline-none focus:border-accent"
            />
          </div>
          <div>
            <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Tipo</div>
            <TipoChips tipos={tipos} selected={nuevoTipo} onSelect={setNuevoTipo} />
          </div>
        </div>
        <div className="mb-3">
          <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Observaciones</div>
          <input
            type="text"
            value={nuevaObs}
            onChange={e => setNuevaObs(e.target.value)}
            placeholder="Opcional..."
            className="w-full px-3 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text1 outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={saving || !nuevoTipo}
          className="px-4 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : '+ Agregar'}
        </button>
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={onClose} className="px-4 py-1.5 text-sm border border-border2 rounded-lg text-text2 hover:bg-bg">
          Cerrar
        </button>
      </div>
    </Modal>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function VistaEditable() {
  const [tab, setTab]               = useState('mat')
  const [personas, setPersonas]     = useState([])
  const [registros, setRegistros]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [heatMap, setHeatMap]       = useState(false)
  const [searchMat, setSearchMat]   = useState('')
  const [sexoFil, setSexoFil]       = useState('')
  const [estatusFil, setEstatusFil] = useState('')
  const [searchAnc, setSearchAnc]   = useState('')
  const [ancEstatusFil, setAncEstatusFil] = useState('')

  // Modal Matriculados
  const [matModal, setMatModal] = useState({ open: false, persona: null, mesIdx: 0 })
  // Modal Ancianos
  const [ancModal, setAncModal] = useState({ open: false, persona: null, mesIdx: 0 })

  // Scroll horizontal en tablas (fade junto a columna nombre)
  const [matScrollLeft, setMatScrollLeft] = useState(0)
  const [ancScrollLeft, setAncScrollLeft] = useState(0)

  // ── Fetch datos ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from('personas').select('*').eq('activo', true).order('nombre'),
      supabase.from('participaciones').select('*').order('fecha'),
    ])
    setPersonas(ps || [])
    setRegistros(rs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Realtime — actualiza sin recargar
  useEffect(() => {
    const canal = supabase
      .channel('participaciones-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'personas' }, () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  // ── Cálculo mapa de calor ──
  const maxRegistros = (() => {
    const conteos = personas.map(p => registros.filter(r => r.clave === p.clave).length)
    return Math.max(...conteos, 1)
  })()

  // ── Guardar celda Matriculados ──
  async function handleMatSave({ persona, mesIdx, tipo, fecha, obs, existingId }) {
    const mes = MESES[mesIdx]
    const payload = {
      clave: persona.clave,
      nombre: persona.nombre,
      lista: persona.lista,
      fecha,
      mes,
      tipo,
      peso: PESO_MAP[tipo] || 1,
      observaciones: obs || null,
    }
    if (existingId) {
      await supabase.from('participaciones').update(payload).eq('id', existingId)
    } else {
      await supabase.from('participaciones').insert(payload)
    }
    await fetchData()
  }

  // ── Eliminar registro ──
  async function handleDelete(id) {
    await supabase.from('participaciones').delete().eq('id', id)
    await fetchData()
  }

  // ── Agregar asignación Ancianos ──
  async function handleAncAdd({ persona, mesIdx, tipo, fecha, obs }) {
    await supabase.from('participaciones').insert({
      clave: persona.clave,
      nombre: persona.nombre,
      lista: persona.lista,
      fecha,
      mes: MESES[mesIdx],
      tipo,
      peso: PESO_MAP[tipo] || 1,
      observaciones: obs || null,
    })
    await fetchData()
  }

  // ── Filtros ──
  const matPersonas = personas.filter(p => {
    if (p.lista !== 'Mat') return false
    if (searchMat && !p.nombre.toLowerCase().includes(searchMat.toLowerCase())) return false
    if (sexoFil && p.sexo !== sexoFil) return false
    if (estatusFil && p.estatus !== estatusFil) return false
    return true
  })

  const ancPersonas = personas.filter(p => {
    if (p.lista !== 'Anc/SM') return false
    if (searchAnc && !p.nombre.toLowerCase().includes(searchAnc.toLowerCase())) return false
    if (ancEstatusFil && p.estatus !== ancEstatusFil) return false
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-text3 font-mono text-sm">
      Cargando datos...
    </div>
  )

  return (
    <div>
      {/* Tabs + controles globales */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex border-b border-border">
          {[['mat', 'Matriculados'], ['anc', 'Ancianos y SM']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-none
                ${tab === id
                  ? 'text-accent border-accent font-medium'
                  : 'text-text3 border-transparent hover:text-text2'}`}
            >{label}</button>
          ))}
        </div>

        {/* Switch mapa de calor */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-text3 font-mono">Mapa de calor</span>
          <div
            onClick={() => setHeatMap(h => !h)}
            className={`relative w-9 h-5 rounded-full transition-colors ${heatMap ? 'bg-accent' : 'bg-border2'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${heatMap ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {/* ── PESTAÑA MATRICULADOS ── */}
      {tab === 'mat' && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              value={searchMat}
              onChange={e => setSearchMat(e.target.value)}
              placeholder="Buscar nombre..."
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent min-w-44"
            />
            <select
              value={sexoFil}
              onChange={e => setSexoFil(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none"
            >
              <option value="">Todos</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
            <select
              value={estatusFil}
              onChange={e => setEstatusFil(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none"
            >
              <option value="">Todos los estatus</option>
              <option>Matriculado</option>
              <option>Matriculada</option>
              <option>Matriculado bautizado</option>
              <option>Matriculada bautizada</option>
            </select>
            {/* Leyenda */}
            <div className="ml-auto flex items-center gap-3">
              {['T','A','X'].map(t => (
                <div key={t} className="flex items-center gap-1">
                  <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-xs font-medium font-mono ${BADGE_CLASS[t]}`}>{t}</span>
                  <span className="text-xs text-text3">{TIPO_LABEL[t]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla: el fade va en el padre (no scrollea en X); el scroll solo en el hijo para que el gradiente quede fijo en el borde derecho de la columna nombre */}
          <div className="relative isolate overflow-hidden rounded-xl border border-border bg-surface">
            <div
              className="relative z-0 overflow-auto"
              onScroll={e => setMatScrollLeft(e.currentTarget.scrollLeft)}
            >
            <table className="w-full border-collapse min-w-max">
              <thead className="sticky top-0 z-30">
                <tr>
                  <th className="sticky left-0 top-0 z-40 min-w-44 bg-bg px-3 py-2 text-left text-xs font-medium text-text3 font-mono tracking-wider border-b border-border shadow-[6px_0_14px_-6px_rgba(28,27,25,0.12)]">
                    Nombre
                  </th>
                  {MES_ABBR.map(m => (
                    <th key={m} className="sticky top-0 z-30 min-w-14 bg-bg px-2 py-2 text-center text-xs font-medium text-text3 font-mono tracking-wider border-b border-border">
                      {m}
                    </th>
                  ))}
                  <th className="sticky top-0 z-30 bg-bg px-2 py-2 text-center text-xs font-medium text-text3 font-mono border-b border-border">
                    Tot
                  </th>
                </tr>
              </thead>
              <tbody>
                {matPersonas.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-8 text-sm text-text3">Sin resultados</td></tr>
                ) : matPersonas.map(p => {
                  const total = registros.filter(r => r.clave === p.clave).length
                  const heatBg = heatMap ? heatColor(total, maxRegistros) : ''
                  const nameCellBg = heatBg || 'bg-surface'
                  return (
                    <tr key={p.clave} className={`border-b border-border last:border-0 hover:bg-bg/50 ${heatBg}`}>
                      <td className={`sticky left-0 z-30 border-r border-border px-3 py-2 shadow-[6px_0_14px_-6px_rgba(28,27,25,0.12)] ${nameCellBg}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${p.sexo === 'F' ? 'bg-purple-100 text-purple' : 'bg-blue-bg text-blue'}`}>
                            {initials(p.nombre)}
                          </div>
                          <div>
                            <div className="text-sm text-text1">{p.nombre}</div>
                            <div className="font-mono text-xs text-text3">{p.clave} · {p.estatus}</div>
                          </div>
                        </div>
                      </td>
                      {MESES.map((mes, mi) => {
                        const rec = registros.find(r => r.clave === p.clave && r.mes === mes)
                        const cellHeat = heatMap && rec ? 'bg-green-100' : ''
                        return (
                          <td key={mes} className={`py-2 text-center ${cellHeat}`}>
                            <Badge
                              tipo={rec?.tipo}
                              onClick={() => setMatModal({ open: true, persona: p, mesIdx: mi })}
                              title={rec?.observaciones || 'Click para editar'}
                            />
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-mono font-medium bg-bg text-text2">
                          {total || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            {matScrollLeft > 6 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-44 z-20 w-12 bg-linear-to-r from-surface from-15% to-transparent to-100%"
              />
            )}
          </div>
        </>
      )}

      {/* ── PESTAÑA ANCIANOS/SM ── */}
      {tab === 'anc' && (
        <>
          {/* Filtros */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              value={searchAnc}
              onChange={e => setSearchAnc(e.target.value)}
              placeholder="Buscar nombre..."
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent min-w-44"
            />
            <select
              value={ancEstatusFil}
              onChange={e => setAncEstatusFil(e.target.value)}
              className="px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text2 outline-none"
            >
              <option value="">Todos</option>
              <option>Anciano</option>
              <option>Siervo Ministerial</option>
            </select>
            {/* Leyenda */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {['P','TB','PE','EBC','VC','NC','X'].map(t => (
                <div key={t} className="flex items-center gap-1">
                  <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1 rounded text-xs font-medium font-mono ${BADGE_CLASS[t]}`}>{t}</span>
                  <span className="text-xs text-text3 hidden lg:inline">{TIPO_LABEL[t]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative isolate overflow-hidden rounded-xl border border-border bg-surface">
            <div
              className="relative z-0 overflow-auto"
              onScroll={e => setAncScrollLeft(e.currentTarget.scrollLeft)}
            >
            <table className="w-full border-collapse min-w-max">
              <thead className="sticky top-0 z-30">
                <tr>
                  <th className="sticky left-0 top-0 z-40 min-w-44 bg-bg px-3 py-2 text-left text-xs font-medium text-text3 font-mono tracking-wider border-b border-border shadow-[6px_0_14px_-6px_rgba(28,27,25,0.12)]">
                    Nombre
                  </th>
                  {MES_ABBR.map(m => (
                    <th key={m} className="sticky top-0 z-30 min-w-24 bg-bg px-2 py-2 text-center text-xs font-medium text-text3 font-mono tracking-wider border-b border-border">
                      {m}
                    </th>
                  ))}
                  <th className="sticky top-0 z-30 bg-bg px-2 py-2 text-center text-xs font-medium text-text3 font-mono border-b border-border">
                    Tot
                  </th>
                </tr>
              </thead>
              <tbody>
                {ancPersonas.length === 0 ? (
                  <tr><td colSpan={14} className="text-center py-8 text-sm text-text3">Sin resultados</td></tr>
                ) : ancPersonas.map(p => {
                  const total = registros.filter(r => r.clave === p.clave).length
                  const heatBg = heatMap ? heatColor(total, maxRegistros) : ''
                  const nameCellBg = heatBg || 'bg-surface'
                  return (
                    <tr key={p.clave} className={`border-b border-border last:border-0 hover:bg-bg/50 ${heatBg}`}>
                      <td className={`sticky left-0 z-30 border-r border-border px-3 py-2 shadow-[6px_0_14px_-6px_rgba(28,27,25,0.12)] ${nameCellBg}`}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-blue-bg text-blue shrink-0">
                            {initials(p.nombre)}
                          </div>
                          <div>
                            <div className="text-sm text-text1">{p.nombre}</div>
                            <div className="font-mono text-xs text-text3">{p.clave} · {p.estatus}</div>
                          </div>
                        </div>
                      </td>
                      {MESES.map((mes, mi) => {
                        const recs = registros
                          .filter(r => r.clave === p.clave && r.mes === mes)
                          .sort((a, b) => a.fecha.localeCompare(b.fecha))
                        const cellHeat = heatMap && recs.length ? heatColor(recs.length, 3) : ''
                        return (
                          <td
                            key={mes}
                            className={`py-1.5 text-center cursor-pointer hover:bg-bg/50 ${cellHeat}`}
                            onClick={() => setAncModal({ open: true, persona: p, mesIdx: mi })}
                          >
                            {recs.length === 0 ? (
                              <span className="text-border2 text-xs">·</span>
                            ) : (
                              <div className="flex flex-col items-center gap-0.5">
                                {recs.map(r => (
                                  <div key={r.id} className="flex items-center gap-1">
                                    <span className="font-mono text-xs text-text3">{assignmentDayOfMonth(r.fecha)}</span>
                                    <span className={`inline-flex items-center justify-center min-w-7 h-4 px-1 rounded text-xs font-medium font-mono ${BADGE_CLASS[r.tipo] || ''}`}>
                                      {r.tipo}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center">
                        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-mono font-medium bg-bg text-text2">
                          {total || '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
            {ancScrollLeft > 6 && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-44 z-20 w-12 bg-linear-to-r from-surface from-15% to-transparent to-100%"
              />
            )}
          </div>
        </>
      )}

      {/* Modales */}
      <MatCellModal
        open={matModal.open}
        onClose={() => setMatModal(m => ({ ...m, open: false }))}
        persona={matModal.persona}
        mesIdx={matModal.mesIdx}
        registros={registros}
        onSave={handleMatSave}
        onDelete={handleDelete}
      />
      <AncCellModal
        open={ancModal.open}
        onClose={() => setAncModal(m => ({ ...m, open: false }))}
        persona={ancModal.persona}
        mesIdx={ancModal.mesIdx}
        registros={registros}
        onAdd={handleAncAdd}
        onDelete={handleDelete}
      />
    </div>
  )
}