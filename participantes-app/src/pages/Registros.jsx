import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const TIPOS_MAT_F  = ['T','A']
const TIPOS_MAT_M  = ['T','A','X','LB','SMT_DSC','LEBC', 'ORACION_C']
const TIPOS_SM     = ['T','A','X','LB','SMT_DSC','P','TB','PE','EBC', 'LEBC', 'ORACION_C']
const TIPOS_ANC    = ['T','A','X','LB','SMT_DSC','P','TB','PE','EBC','VC','NC', 'LEBC', 'ORACION_C']

const TIPO_LABEL = {
  T:'Titular', 
  A:'Asistente', 
  X:'Participación', 
  LB:'Lectura Biblica', 
  P:'Presidente', 
  TB:'Tesoros', 
  PE:'Perlas', 
  SMT_DSC: 'Discurso',
  EBC:'Est. Bíblico', 
  LEBC: 'Lector EBC', 
  VC:'Vida Cristiana', 
  NC:'Nec. Congr.', 
  ORACION_C: 'Oración conclusión',
}

const PESO_MAP = { T:2, A:1, X:1, LB:1, SMT_DSC:1, P:1, TB:1, PE:1, EBC:1, LEBC:1, VC:1, NC:1, ORACION_C:0 }

const CHIP_CLASS = {
  T:'bg-accent-bg           text-accent', 
  A:'bg-blue-bg             text-blue', 
  X:'bg-amber-bg            text-amber', 
  LB:'bg-cyan-bg            text-cyan', 
  SMT_DSC: 'bg-yellow-100   text-yellow-800', 
  P:'bg-purple-bg           text-purple', 
  TB:'bg-teal-bg            text-teal', 
  PE:'bg-rose-bg            text-rose',
  EBC:'bg-orange-100        text-orange-700', 
  LEBC: 'bg-maroon/20       text-maroon', 
  VC:'bg-green-100          text-green-800', 
  NC:'bg-red-100            text-red-800',
  ORACION_C: 'bg-bg text-text2 border-border2',
}

const BADGE_CLASS = { ...CHIP_CLASS }

function getTipos(persona) {
  if (!persona) return []
  if (persona.lista === 'Mat') return persona.sexo === 'F' ? TIPOS_MAT_F : TIPOS_MAT_M
  return persona.estatus === 'Anciano' ? TIPOS_ANC : TIPOS_SM
}

function getMes(fecha) {
  if (!fecha) return ''
  const mi = parseInt(fecha.split('-')[1] || 0) - 1
  return MESES[mi] || ''
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

function RowForm({ registro, personas, onSave, onDelete, onCancel }) {
  const [fecha, setFecha]                 = useState(registro.fecha || '')
  const [tipo, setTipo]                   = useState(registro.tipo || '')
  const [observaciones, setObservaciones] = useState(registro.observaciones || '')
  const [saving, setSaving]               = useState(false)

  const persona = personas.find(p => p.clave === registro.clave)
  const tiposPermitidos = getTipos(persona)
  const previewMes = getMes(fecha)

  async function handleSaveSubmit() {
    if (!fecha || !tipo) return
    setSaving(true)
    await onSave(registro.id, { fecha, tipo, observaciones })
    setSaving(false)
  }

  return (
    <div className="p-3 bg-bg/50 flex flex-col gap-3 text-left">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Fecha */}
        <div>
          <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text1 outline-none focus:border-accent"
          />
          {previewMes && (
            <span className="text-[10px] text-text3 font-mono mt-0.5 inline-block">→ {previewMes}</span>
          )}
        </div>

        {/* Observaciones */}
        <div>
          <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">
            Observaciones <span className="text-border2 normal-case">(opcional)</span>
          </label>
          <input
            type="text"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder="Ej: Cubrió turno..."
            className="w-full px-2.5 py-1.5 border border-border2 rounded-lg text-xs bg-surface text-text1 outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Tipo */}
      <div>
        <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Tipo de participación</label>
        {tiposPermitidos.length > 0 ? (
          <TipoChips tipos={tiposPermitidos} selected={tipo} onSelect={setTipo} />
        ) : (
          <div className="text-xs text-text3">Sin tipos disponibles</div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
        <button
          type="button"
          onClick={() => onDelete(registro.id)}
          className="text-xs text-danger hover:underline font-medium"
        >
          Eliminar registro
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs border border-border2 rounded-lg text-text2 hover:bg-surface transition-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveSubmit}
            disabled={saving || !fecha || !tipo}
            className="px-3 py-1 text-xs bg-accent text-white font-medium rounded-lg hover:bg-green-800 disabled:opacity-50 transition-none"
          >
            {saving ? 'Guardando...' : 'Actualizar →'}
          </button>
        </div>
      </div>
    </div>
  )
}

const FORM_EMPTY = { clave: '', fecha: '', tipo: '', observaciones: '' }

export default function Registros() {
  const [personas, setPersonas]               = useState([])
  const [participaciones, setParticipaciones] = useState([])
  const [loading, setLoading]                 = useState(true)
  const [fetchError, setFetchError]           = useState(null)
  const [form, setForm]                       = useState(FORM_EMPTY)
  const [editId, setEditId]                   = useState(null)
  const [saving, setSaving]                   = useState(false)
  const { toast, success, error: toastError } = useToast()
  const { confirm, confirmProps }             = useConfirm()
  const [search, setSearch]                   = useState('')
  const [filterMes, setFilterMes]             = useState(() => localStorage.getItem('registros_filterMes')   ?? '')
  const [filterLista, setFilterLista]         = useState(() => localStorage.getItem('registros_filterLista') ?? '')
  const [page, setPage]                       = useState(1)
  const [pageSize, setPageSize]               = useState(() => Number(localStorage.getItem('registros_pageSize')) || 50)

  useEffect(() => { localStorage.setItem('registros_filterMes',   filterMes)   }, [filterMes])
  useEffect(() => { localStorage.setItem('registros_filterLista', filterLista) }, [filterLista])
  useEffect(() => { localStorage.setItem('registros_pageSize',    String(pageSize)) }, [pageSize])
  useEffect(() => { setPage(1) }, [search, filterMes, filterLista, pageSize])

  const fetchData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true)
      setFetchError(null)
    }
    try {
      const [{ data: ps, error: psErr }, { data: rs, error: rsErr }] = await Promise.all([
        supabase.from('personas').select('*').eq('activo', true).order('nombre'),
        supabase.from('participaciones').select('*').order('id', { ascending: false }),
      ])
      if (psErr) throw psErr
      if (rsErr) throw rsErr
      setPersonas(ps || [])
      setParticipaciones(rs || [])
    } catch (err) {
      console.error('[fetchData]', err)
      if (isInitial) {
        setFetchError(err?.message || 'Error al conectar con la base de datos')
      } else {
        toastError('Error al sincronizar datos: ' + (err?.message || 'Error de conexión'))
      }
    } finally {
      if (isInitial) {
        setLoading(false)
      }
    }
  }, [toastError])

  useEffect(() => { fetchData(true) }, [fetchData])

  useEffect(() => {
    const canal = supabase.channel('registros-mgmt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participaciones' }, () => fetchData())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  const personaSeleccionada = personas.find(p => p.clave === form.clave)
  const tiposPermitidos = getTipos(personaSeleccionada)

  function handlePersonaChange(clave) {
    const p = personas.find(x => x.clave === clave)
    const tipos = getTipos(p)
    setForm(f => ({
      ...f,
      clave,
      tipo: tipos.includes(f.tipo) ? f.tipo : '',
    }))
  }

  async function handleAddSave() {
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

    await supabase.from('participaciones').insert(payload)
    success('Registro guardado')
    setForm(FORM_EMPTY)
    setSaving(false)
  }

  async function handleInlineSave(id, data) {
    if (!data.fecha || !data.tipo) {
      toastError('Completa fecha y tipo')
      return
    }
    const mes = getMes(data.fecha)
    const payload = {
      fecha: data.fecha,
      mes,
      tipo: data.tipo,
      peso: PESO_MAP[data.tipo] || 1,
      observaciones: data.observaciones.trim() || null,
    }

    await supabase.from('participaciones').update(payload).eq('id', id)
    success('Registro actualizado')
    setEditId(null)
  }

  async function handleDelete(id) {
    const ok = await confirm({
      title:   '¿Eliminar este registro?',
      message: 'Esta acción no se puede deshacer.',
      danger:  true,
    })
    if (!ok) return
    await supabase.from('participaciones').delete().eq('id', id)
    success('Registro eliminado')
    if (editId === id) setEditId(null)
  }

  // Filtros lista
  const filtered = participaciones.filter(r => {
    if (search && !r.nombre.toLowerCase().includes(search.toLowerCase()) && !r.clave.toLowerCase().includes(search.toLowerCase())) return false
    if (filterMes   && r.mes   !== filterMes)   return false
    if (filterLista && r.lista !== filterLista)  return false
    return true
  })

  // Paginación
  const totalRecords = filtered.length
  const totalPages   = Math.max(1, Math.ceil(totalRecords / (pageSize || 1)))
  const safePage     = Math.min(Math.max(1, page), totalPages)
  const startIndex   = (safePage - 1) * pageSize
  const endIndex     = Math.min(startIndex + pageSize, totalRecords)
  const paginated    = filtered.slice(startIndex, endIndex)

  // Preview
  const previewMes = getMes(form.fecha)

  const validationErrors = {
    clave: !form.clave ? 'Selecciona una persona' : null,
    fecha: !form.fecha ? 'Selecciona una fecha' : null,
    tipo:  form.clave && !form.tipo ? 'Selecciona un tipo de participación' : null,
  }
  const hasErrors = Object.values(validationErrors).some(Boolean)

  if (fetchError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 bg-surface border border-border rounded-xl p-5">
      <p className="text-sm text-danger font-medium">Error al cargar los datos</p>
      <p className="text-xs text-text3 font-mono">{fetchError}</p>
      <button
        onClick={() => fetchData(true)}
        className="px-4 py-1.5 text-xs font-medium border border-border2 rounded-lg hover:bg-bg text-text1"
      >
        Reintentar
      </button>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

      {/* ── FORMULARIO (AGREGAR REGISTRO) ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Agregar registro</span>
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
            {validationErrors.clave && (
              <span className="text-[10px] text-danger font-mono mt-0.5 inline-block">
                ↑ {validationErrors.clave}
              </span>
            )}
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
            {previewMes
              ? <span className="text-[10px] text-text3 font-mono mt-0.5 inline-block">→ {previewMes}</span>
              : validationErrors.fecha && (
                  <span className="text-[10px] text-danger font-mono mt-0.5 inline-block">
                    ↑ {validationErrors.fecha}
                  </span>
                )
            }
          </div>

          {/* Tipo */}
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">Tipo de participación</label>
            {tiposPermitidos.length > 0 ? (
              <>
                <TipoChips tipos={tiposPermitidos} selected={form.tipo} onSelect={t => setForm(f => ({ ...f, tipo: t }))} />
                {validationErrors.tipo && (
                  <span className="text-[10px] text-danger font-mono mt-1 inline-block">
                    ↑ {validationErrors.tipo}
                  </span>
                )}
              </>
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
            onClick={handleAddSave}
            disabled={saving || hasErrors}
            className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar →'}
          </button>
        </div>
      </div>

      {/* ── LISTA REGISTROS CON EDICIÓN INLINE ── */}
      <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Registros</span>
          <span className="font-mono text-xs text-text3">
            {filtered.length !== participaciones.length
              ? `${filtered.length} filtrados (${participaciones.length} total)`
              : `${participaciones.length} total`}
          </span>
        </div>

        <div className="flex gap-2 mb-3 flex-wrap items-center">
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
          {(filterMes || filterLista) && (
            <button
              onClick={() => { setFilterMes(''); setFilterLista('') }}
              className="px-2 py-1.5 text-xs border border-border2 rounded-lg text-text3 hover:text-danger hover:border-danger/30 transition-colors"
              title="Limpiar filtros"
            >
              ✕
            </button>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto flex-1 flex flex-col gap-1">
          {loading ? (
            <SkeletonList rows={8} cols={3} />
          ) : filtered.length === 0 ? (
            <div className="py-12 px-4 text-center max-w-xs mx-auto flex flex-col items-center gap-3 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-accent/5 flex items-center justify-center border border-accent/10">
                <svg
                  className="w-8 h-8 text-accent/60 stroke-current fill-none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <h3 className="text-sm font-medium text-text1">Sin registros</h3>
              <p className="text-xs text-text3">
                No hay registros de participaciones guardados o ninguno coincide con la búsqueda.
              </p>
            </div>
          ) : paginated.map(r => (
            <div key={r.id}>
              {/* Fila del registro */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-none
                  ${editId === r.id
                    ? 'border-accent bg-accent-bg rounded-b-none'
                    : 'border-transparent hover:border-border hover:bg-bg'}`}
                onClick={() => setEditId(editId === r.id ? null : r.id)}
              >
                <span className="font-mono text-xs text-text3 w-8 flex-shrink-0">#{r.id}</span>
                <span className={`inline-flex items-center justify-center min-w-7 h-5 px-1.5 rounded text-xs font-mono font-medium flex-shrink-0 ${BADGE_CLASS[r.tipo] || 'bg-bg text-text2'}`}>
                  {r.tipo}
                </span>
                <span className="flex-1 text-sm text-text1 truncate">{r.nombre}</span>
                <span className="font-mono text-xs text-text3 flex-shrink-0">{r.fecha}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleDelete(r.id) }}
                  className="text-text3 hover:text-danger text-xs px-1 flex-shrink-0"
                  title="Eliminar registro"
                >✕</button>
              </div>

              {/* Panel inline expandible */}
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out border border-t-0 border-accent rounded-b-lg bg-surface"
                style={{ maxHeight: editId === r.id ? '320px' : '0px', opacity: editId === r.id ? 1 : 0 }}
              >
                <RowForm
                  key={r.id}
                  registro={r}
                  personas={personas}
                  onSave={handleInlineSave}
                  onDelete={handleDelete}
                  onCancel={() => setEditId(null)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Barra de paginación estilo Supabase */}
        {filtered.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 select-none">
            {/* Controles de página */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-2.5 py-1 border border-border2 rounded-lg text-xs font-medium text-text2 hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                ←
              </button>
              <span className="text-xs text-text3 font-mono px-1">
                Página <span className="font-medium text-text1">{safePage}</span> de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 py-1 border border-border2 rounded-lg text-xs font-medium text-text2 hover:bg-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Página siguiente"
              >
                →
              </button>
            </div>

            {/* Selector de registros por página y contador */}
            <div className="flex items-center gap-3 ml-auto flex-wrap">
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="px-2.5 py-1 border border-border2 rounded-lg text-xs bg-surface text-text2 outline-none font-mono cursor-pointer hover:border-accent/40"
              >
                {[25, 50, 100, 250, 500].map(n => (
                  <option key={n} value={n}>{n} registros</option>
                ))}
              </select>
              <span className="text-xs text-text3 font-mono">
                {startIndex + 1}–{endIndex} de {totalRecords}
              </span>
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}