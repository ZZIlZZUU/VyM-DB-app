import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

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

const CHIP_CLASS = {
  T:'bg-accent-bg text-accent', A:'bg-blue-bg text-blue', X:'bg-amber-bg text-amber',
  P:'bg-purple-bg text-purple', TB:'bg-teal-bg text-teal', PE:'bg-rose-bg text-rose',
  EBC:'bg-orange-100 text-orange-700', VC:'bg-green-100 text-green-800', NC:'bg-red-100 text-red-800',
}

const BADGE_CLASS = { ...CHIP_CLASS }

function getTipos(persona) {
  if (!persona) return []
  if (persona.lista === 'Mat') return persona.sexo === 'F' ? TIPOS_MAT_F : TIPOS_MAT_M
  return persona.estatus === 'Anciano' ? TIPOS_ANC : TIPOS_SM
}

function TipoChips({ tipos, selected, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {tipos.map(t => (
        <button
          key={t} type="button"
          onClick={() => onSelect(t === selected ? '' : t)}
          className={`px-2 py-0.5 rounded text-xs font-mono font-medium border-2 transition-none
            ${CHIP_CLASS[t] || 'bg-bg text-text2'}
            ${selected === t ? 'border-current opacity-100' : 'border-transparent opacity-50 hover:opacity-80'}`}
        >
          {t} <span className="font-sans font-light">{TIPO_LABEL[t]}</span>
        </button>
      ))}
    </div>
  )
}

const FORM_EMPTY = { clave: '', fecha: '', tipo: '', observaciones: '' }

export default function Registros() {
  const [personas, setPersonas]           = useState([])
  const [participaciones, setParticipaciones] = useState([])
  const [loading, setLoading]             = useState(true)
  const [form, setForm]                   = useState(FORM_EMPTY)
  const [editId, setEditId]               = useState(null)
  const [saving, setSaving]               = useState(false)
  const [toast, setToast]                 = useState('')
  const [search, setSearch]               = useState('')
  const [filterMes, setFilterMes]         = useState('')
  const [filterLista, setFilterLista]     = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from('personas').select('*').eq('activo', true).order('nombre'),
      supabase.from('participaciones').select('*').order('fecha', { ascending: false }).limit(100),
    ])
    setPersonas(ps || [])
    setParticipaciones(rs || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const canal = supabase.channel('registros-mgmt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  const personaSeleccionada = personas.find(p => p.clave === form.clave)
  const tiposPermitidos = getTipos(personaSeleccionada)

  // Al cambiar persona, limpiar tipo si ya no es válido
  function handlePersonaChange(clave) {
    const p = personas.find(x => x.clave === clave)
    const tipos = getTipos(p)
    setForm(f => ({
      ...f,
      clave,
      tipo: tipos.includes(f.tipo) ? f.tipo : '',
    }))
  }

  function getMes(fecha) {
    if (!fecha) return ''
    const mi = parseInt(fecha.split('-')[1] || 0) - 1
    return MESES[mi] || ''
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function startEdit(r) {
    setEditId(r.id)
    setForm({ clave: r.clave, fecha: r.fecha, tipo: r.tipo, observaciones: r.observaciones || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function clearForm() {
    setEditId(null)
    setForm(FORM_EMPTY)
  }

  async function handleSave() {
    if (!form.clave || !form.fecha || !form.tipo) {
      showToast('Completa persona, fecha y tipo')
      return
    }
    setSaving(true)
    const p = personaSeleccionada
    const mes = getMes(form.fecha)
    const payload = {
      clave: form.clave,
      nombre: p.nombre,
      lista: p.lista,
      fecha: form.fecha,
      mes,
      tipo: form.tipo,
      peso: PESO_MAP[form.tipo] || 1,
      observaciones: form.observaciones.trim() || null,
    }

    if (editId) {
      await supabase.from('participaciones').update(payload).eq('id', editId)
      showToast('Registro actualizado')
    } else {
      await supabase.from('participaciones').insert(payload)
      showToast('Registro guardado')
    }

    clearForm()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('participaciones').delete().eq('id', id)
    showToast('Registro eliminado')
    if (editId === id) clearForm()
  }

  // Filtros lista
  const filtered = participaciones.filter(r => {
    if (search && !r.nombre.toLowerCase().includes(search.toLowerCase()) && !r.clave.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMes   && r.mes   !== filterMes)   return false
    if (filterLista && r.lista !== filterLista)  return false
    return true
  })

  // Preview
  const previewMes = getMes(form.fecha)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* ── FORMULARIO ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">
            {editId ? `Editando registro #${editId}` : 'Agregar registro'}
          </span>
          {editId && (
            <button onClick={clearForm} className="text-xs text-text3 hover:text-danger border border-border2 rounded px-2 py-1">
              ✕ Cancelar
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* Persona */}
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Persona</label>
            <select
              value={form.clave}
              onChange={e => handlePersonaChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            >
              <option value="">— Seleccionar —</option>
              {['Mat','Anc/SM'].map(lista => (
                <optgroup key={lista} label={lista === 'Mat' ? 'Matriculados' : 'Ancianos y SM'}>
                  {personas.filter(p => p.lista === lista).map(p => (
                    <option key={p.clave} value={p.clave}>{p.clave} — {p.nombre}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Info persona */}
          {personaSeleccionada && (
            <div className="flex items-center gap-2 px-3 py-2 bg-bg rounded-lg">
              <span className="font-mono text-xs text-text3">{personaSeleccionada.lista}</span>
              <span className="text-xs text-text2">·</span>
              <span className="text-xs text-text2">{personaSeleccionada.estatus}</span>
              <span className="text-xs text-text2">·</span>
              <span className="text-xs text-text3">Sexo: {personaSeleccionada.sexo}</span>
            </div>
          )}

          {/* Fecha */}
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
              className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            />
            {previewMes && (
              <span className="text-xs text-text3 font-mono mt-1 inline-block">→ {previewMes}</span>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Tipo de participación</label>
            {tiposPermitidos.length > 0 ? (
              <TipoChips tipos={tiposPermitidos} selected={form.tipo} onSelect={t => setForm(f => ({ ...f, tipo: t }))} />
            ) : (
              <div className="text-xs text-text3 mt-1">Selecciona una persona primero</div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">
              Observaciones <span className="text-border2 normal-case">(opcional)</span>
            </label>
            <textarea
              value={form.observaciones}
              onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))}
              rows={2}
              placeholder="Ej: Cubrió turno, llegó tarde..."
              className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Preview */}
          {form.clave && form.fecha && form.tipo && (
            <div className="bg-bg border border-border rounded-lg px-3 py-2">
              <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-1">Vista previa</div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  ['clave', form.clave],
                  ['fecha', form.fecha],
                  ['mes', previewMes],
                  ['tipo', form.tipo],
                  ['peso', PESO_MAP[form.tipo] || 1],
                ].map(([k, v]) => (
                  <div key={k} className="bg-surface rounded px-1.5 py-1">
                    <div className="font-mono text-xs text-text3">{k}</div>
                    <div className="font-mono text-xs text-text1 truncate">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : editId ? 'Actualizar →' : 'Guardar →'}
          </button>
        </div>
      </div>

      {/* ── LISTA REGISTROS ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Registros recientes</span>
          <span className="font-mono text-xs text-text3">{participaciones.length} total</span>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex-1 px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent min-w-0"
          />
          <select value={filterLista} onChange={e => setFilterLista(e.target.value)}
            className="px-2 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text2 outline-none">
            <option value="">Todas</option>
            <option value="Mat">Mat</option>
            <option value="Anc/SM">Anc/SM</option>
          </select>
          <select value={filterMes} onChange={e => setFilterMes(e.target.value)}
            className="px-2 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text2 outline-none">
            <option value="">Todos los meses</option>
            {MESES.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className="max-h-[480px] overflow-y-auto flex flex-col gap-1">
          {loading ? (
            <div className="text-center py-6 text-sm text-text3 font-mono">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-sm text-text3">Sin resultados</div>
          ) : filtered.map(r => (
            <div
              key={r.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-none
                ${editId === r.id
                  ? 'border-accent bg-accent-bg'
                  : 'border-transparent hover:border-border hover:bg-bg'}`}
              onClick={() => startEdit(r)}
            >
              <span className="font-mono text-xs text-text3 w-8 flex-shrink-0">#{r.id}</span>
              <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-xs font-mono font-medium flex-shrink-0 ${BADGE_CLASS[r.tipo] || 'bg-bg text-text2'}`}>
                {r.tipo}
              </span>
              <span className="flex-1 text-sm text-text1 truncate">{r.nombre}</span>
              <span className="font-mono text-xs text-text3 flex-shrink-0">{r.fecha}</span>
              <button
                onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                className="text-text3 hover:text-danger text-xs px-1 flex-shrink-0"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-text1 text-white text-xs font-mono px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}