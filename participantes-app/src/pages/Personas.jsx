import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const ESTATUS_POR_SEXO_LISTA = {
  'Mat-F': ['Matriculada', 'Matriculada bautizada'],
  'Mat-M': ['Matriculado', 'Matriculado bautizado'],
  'Anc/SM-M': ['Anciano', 'Siervo Ministerial'],
}

function getEstatusOpts(lista, sexo) {
  return ESTATUS_POR_SEXO_LISTA[`${lista}-${sexo}`] || []
}

function getNextClave(personas, lista) {
  const prefix = lista === 'Mat' ? 'M' : 'A'
  const nums = personas
    .filter(p => p.clave.startsWith(prefix + '-'))
    .map(p => parseInt(p.clave.split('-')[1] || 0))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(3, '0')}`
}

function initials(nombre) {
  return (nombre || '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const FORM_EMPTY = { lista: 'Mat', sexo: 'F', nombre: '', estatus: '' }

export default function Personas() {
  const [personas, setPersonas]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterLista, setFilterLista] = useState('')
  const [filterActivo, setFilterActivo] = useState('true')
  const [form, setForm]               = useState(FORM_EMPTY)
  const [editClave, setEditClave]     = useState(null)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')
  const nombreRef = useRef(null)

  const fetchPersonas = useCallback(async () => {
    const { data } = await supabase.from('personas').select('*').order('nombre')
    setPersonas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPersonas() }, [fetchPersonas])

  useEffect(() => {
    const canal = supabase.channel('personas-mgmt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'personas' },
        () => fetchPersonas(),
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchPersonas])

  // Auto-seleccionar primer estatus disponible cuando cambia lista o sexo
  useEffect(() => {
    const opts = getEstatusOpts(form.lista, form.sexo)
    if (opts.length && !opts.includes(form.estatus)) {
      setForm(f => ({ ...f, estatus: opts[0] }))
    }
  }, [form.lista, form.sexo])

  // Clave preview
  const clavePreview = editClave || getNextClave(personas, form.lista)
  const estatusOpts = getEstatusOpts(form.lista, form.sexo)

  // Filtros
  const filtered = personas.filter(p => {
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase()) && !p.clave.toLowerCase().includes(search.toLowerCase())) return false
    if (filterLista && p.lista !== filterLista) return false
    if (filterActivo === 'true'  && !p.activo)  return false
    if (filterActivo === 'false' && p.activo)   return false
    return true
  })

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function startEdit(p) {
    setEditClave(p.clave)
    setForm({ lista: p.lista, sexo: p.sexo, nombre: p.nombre, estatus: p.estatus })
  }

  function clearForm() {
    setEditClave(null)
    setForm(FORM_EMPTY)
    if (nombreRef.current) nombreRef.current.value = ''
  }

  async function handleSave() {
    const nombreDOM = nombreRef.current?.value?.trim() || form.nombre.trim()
    if (!nombreDOM)    { showToast('Ingresa el nombre'); return }
    if (!form.estatus) { showToast('Selecciona el estatus'); return }
    setSaving(true)

    if (editClave) {
      await supabase.from('personas').update({
        lista: form.lista, nombre: nombreDOM,
        sexo: form.sexo, estatus: form.estatus,
      }).eq('clave', editClave)
      showToast('Persona actualizada')
    } else {
      const clave = getNextClave(personas, form.lista)
      await supabase.from('personas').insert({
        clave, lista: form.lista, nombre: nombreDOM,
        sexo: form.sexo, estatus: form.estatus, activo: true,
      })
      showToast(`Persona agregada: ${clave}`)
    }

    clearForm()
    setSaving(false)
  }

  async function toggleActivo(p) {
    const msg = p.activo
      ? `¿Deshabilitar a ${p.nombre}? Sus registros históricos se conservan.`
      : `¿Habilitar a ${p.nombre}?`
    if (!confirm(msg)) return
    await supabase.from('personas').update({ activo: !p.activo }).eq('clave', p.clave)
    showToast(p.activo ? 'Persona deshabilitada' : 'Persona habilitada')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* ── FORMULARIO ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">
            {editClave ? `Editando: ${editClave}` : 'Agregar persona'}
          </span>
          {editClave && (
            <button onClick={clearForm} className="text-xs text-text3 hover:text-danger border border-border2 rounded px-2 py-1">
              ✕ Cancelar
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* Lista + Clave */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Lista</label>
              <select
                value={form.lista}
                onChange={e => setForm(f => ({ ...f, lista: e.target.value }))}
                disabled={!!editClave}
                className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent disabled:opacity-50"
              >
                <option value="Mat">Matriculados</option>
                <option value="Anc/SM">Ancianos / SM</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Clave</label>
              <input
                value={clavePreview}
                readOnly
                className="w-full px-3 py-1.5 border border-border rounded-lg text-sm font-mono bg-bg text-text3 outline-none"
              />
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Nombre completo</label>
            <input
              ref={nombreRef}
              type="text"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onInput={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              autoComplete="off"
              placeholder="Ej: Ana María Flores"
              className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            />
          </div>

          {/* Sexo + Estatus */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Sexo</label>
              <select
                value={form.sexo}
                onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))}
                disabled={form.lista === 'Anc/SM'}
                className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent disabled:opacity-50"
              >
                <option value="F">F — Femenino</option>
                <option value="M">M — Masculino</option>
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Estatus</label>
              <select
                value={form.estatus}
                onChange={e => setForm(f => ({ ...f, estatus: e.target.value }))}
                className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
              >
                {estatusOpts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : editClave ? 'Actualizar →' : 'Agregar →'}
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Personas registradas</span>
          <span className="font-mono text-xs text-text3">{personas.length} total</span>
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
          <select value={filterActivo} onChange={e => setFilterActivo(e.target.value)}
            className="px-2 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text2 outline-none">
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
            <option value="">Todos</option>
          </select>
        </div>

        <div className="max-h-96 overflow-y-auto flex flex-col gap-1">
          {loading ? (
            <div className="text-center py-6 text-sm text-text3 font-mono">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 text-sm text-text3">Sin resultados</div>
          ) : filtered.map(p => (
            <div
              key={p.clave}
              onClick={() => startEdit(p)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-none
                ${editClave === p.clave
                  ? 'border-accent bg-accent-bg'
                  : 'border-transparent hover:border-border hover:bg-bg'}
                ${!p.activo ? 'opacity-50' : ''}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0
                ${p.sexo === 'F' ? 'bg-purple-100 text-purple' : 'bg-blue-bg text-blue'}`}>
                {initials(p.nombre)}
              </div>
              <span className="font-mono text-xs text-text3 w-12 shrink-0">{p.clave}</span>
              <span className="flex-1 text-sm text-text1 truncate">{p.nombre}</span>
              <span className="text-xs text-text3 hidden sm:block">{p.estatus}</span>
              <button
                onClick={e => { e.stopPropagation(); toggleActivo(p) }}
                title={p.activo ? 'Deshabilitar' : 'Habilitar'}
                className={`ml-1 text-xs px-1.5 py-0.5 rounded shrink-0
                  ${p.activo
                    ? 'text-text3 hover:text-danger hover:bg-danger-bg'
                    : 'text-accent hover:bg-accent-bg'}`}
              >
                {p.activo ? '⏸' : '▶'}
              </button>
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