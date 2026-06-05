import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { parsearEPUB } from '../lib/epubParser'
import { sugerirCandidatos, sugerirAyudante } from '../lib/asignacionesSugeridas'
import { generarYDescargarS140, buildDatosDesdeSupabase } from '../lib/generarS140'

// ── Constantes UI ─────────────────────────────────────────────
const SECCION_LABEL = {
  APERTURA: 'Apertura',
  TB:       'Tesoros de la Biblia',
  SMT:      'Seamos Mejores Maestros',
  VC:       'Nuestra Vida Cristiana',
  CIERRE:   'Cierre',
}

const TIPO_LABEL = {
  P:'Presidente', ORACION:'Oración apertura', ORACION_C:'Oración cierre',
  INTRO:'Palabras de introducción', CONCLU:'Palabras de conclusión',
  TB:'Tesoros de la Biblia', PE:'Perlas escondidas', LB:'Lectura de la Biblia',
  SMT_EST:'Estudiante', SMT_DSC:'Discurso', SMT_AYU:'Ayudante',
  VC:'Vida Cristiana', NC:'Nec. de la congregación',
  EBC_CON:'Conductor EBC', EBC_LEC:'Lector EBC',
}

const TIPO_COLOR = {
  P:'bg-purple-bg text-purple', ORACION:'bg-blue-bg text-blue', ORACION_C:'bg-blue-bg text-blue',
  INTRO:'bg-bg text-text2', CONCLU:'bg-bg text-text2',
  TB:'bg-teal-bg text-teal', PE:'bg-rose-bg text-rose', LB:'bg-amber-bg text-amber',
  SMT_EST:'bg-accent-bg text-accent', SMT_DSC:'bg-amber-bg text-amber', SMT_AYU:'bg-blue-bg text-blue',
  VC:'bg-green-100 text-green-800', NC:'bg-red-100 text-red-800',
  EBC_CON:'bg-orange-100 text-orange-700', EBC_LEC:'bg-bg text-text2',
}

const PESO_TIPO = { T:2, A:1, LB:1, SMT_EST:1, SMT_DSC:1, SMT_AYU:1, TB:1, PE:1, VC:1, NC:1, EBC_CON:1, EBC_LEC:1, P:1, ORACION:1, ORACION_C:1 }

// Mapa tipo_asignacion → campo 'tipo' en tabla participaciones
const TIPO_PARTICIPACION = {
  P:'P', ORACION:'P', ORACION_C:'P', INTRO:'P', CONCLU:'P',
  TB:'TB', PE:'PE', LB:'X', SMT_EST:'A', SMT_DSC:'X', SMT_AYU:'A',
  VC:'VC', NC:'NC', EBC_CON:'EBC', EBC_LEC:'X',
}

// ── Componente selector de persona ───────────────────────────
function PersonaSelector({ tipo, value, onChange, personas, historial, mes, yaAsignados, disabled }) {
  const candidatos = sugerirCandidatos(tipo, personas, historial, mes, yaAsignados)

  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value || null)}
      disabled={disabled}
      className="w-full px-2 py-1 border border-border2 rounded-lg text-xs bg-surface text-text1 outline-none focus:border-accent disabled:opacity-50"
    >
      <option value="">— Sin asignar —</option>
      {candidatos.map(p => {
        const penalizado = p._score < 50
        const advertencia = p._score >= 50 && p._score < 80
        return (
          <option key={p.clave} value={p.clave}>
            {penalizado ? '⚠ ' : advertencia ? '↻ ' : '✓ '}
            {p.clave} — {p.nombre}
          </option>
        )
      })}
    </select>
  )
}

// ── Fila de parte ─────────────────────────────────────────────
function FilaParte({ parte, asignaciones, personas, historial, mes, semanaAsignados, onAsignar, onConfirmar }) {
  const asig = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'principal')
  const asigAyu = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'ayudante')
  const principal = asig[0] || null
  const ayudante  = asigAyu[0] || null

  return (
    <div className="grid gap-2 py-2 border-b border-border last:border-0 items-start grid-cols-[auto_1fr_180px_120px]">
      {/* Hora */}
      <div className="text-xs font-mono text-text3 w-20 pt-1 shrink-0 whitespace-nowrap">
        {parte.hora_inicio || ''}
      </div>

      {/* Título y tipo */}
      <div>
        <div className="text-sm text-text1 leading-tight">{parte.titulo}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${TIPO_COLOR[parte.tipo_asignacion] || 'bg-bg text-text2'}`}>
            {parte.tipo_asignacion}
          </span>
          {parte.duracion_min && (
            <span className="text-xs text-text3">{parte.duracion_min} min</span>
          )}
        </div>
      </div>

      {/* Selector principal + ayudante */}
      {parte.seccion !== 'APERTURA' && parte.seccion !== 'CIERRE' && (
        <div className="flex flex-col gap-1">
          <PersonaSelector
            tipo={parte.tipo_asignacion}
            value={principal?.clave}
            onChange={clave => onAsignar(parte.id, clave, 'principal', principal?.id)}
            personas={personas}
            historial={historial}
            mes={mes}
            yaAsignados={semanaAsignados.filter(c => c !== principal?.clave)}
            disabled={false}
          />
          {parte.requiere_ayudante && (
            <PersonaSelector
              tipo={parte.tipo_asignacion}
              value={ayudante?.clave}
              onChange={clave => onAsignar(parte.id, clave, 'ayudante', ayudante?.id)}
              personas={personas}
              historial={historial}
              mes={mes}
              yaAsignados={[
                ...semanaAsignados.filter(c => c !== ayudante?.clave),
                principal?.clave,
              ].filter(Boolean)}
              disabled={!principal?.clave}
            />
          )}
        </div>
      )}

      {parte.seccion === 'APERTURA' || parte.seccion === 'CIERRE' ? (
        <PersonaSelector
          tipo={parte.tipo_asignacion}
          value={principal?.clave}
          onChange={clave => onAsignar(parte.id, clave, 'principal', principal?.id)}
          personas={personas}
          historial={historial}
          mes={mes}
          yaAsignados={semanaAsignados.filter(c => c !== principal?.clave)}
        />
      ) : null}

      {/* Estado confirmado */}
      <div className="flex items-center justify-end">
        {principal?.clave && (
          <button
            onClick={() => onConfirmar(parte.id, principal, ayudante)}
            className={`text-xs px-2 py-1 rounded-lg border transition-none
              ${principal?.confirmado
                ? 'bg-accent-bg text-accent border-accent/30'
                : 'bg-bg text-text3 border-border2 hover:border-accent hover:text-accent'}`}
          >
            {principal?.confirmado ? '✓ Confirmado' : 'Confirmar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tarjeta de semana ─────────────────────────────────────────
function TarjetaSemana({ semana, partes, asignaciones, personas, historial, onAsignar, onConfirmar, onConfirmarTodo }) {
  const [expandida, setExpandida] = useState(false)
  const mes = semana.mes

  // Claves ya asignadas en esta semana (para evitar dobles)
  const semanaAsignados = asignaciones
    .filter(a => partes.some(p => p.id === a.parte_id))
    .map(a => a.clave)

  const totalPartes      = partes.length
  const confirmadas      = asignaciones.filter(a => partes.some(p => p.id === a.parte_id) && a.confirmado).length
  const pct              = totalPartes > 0 ? Math.round((confirmadas / totalPartes) * 100) : 0

  // Agrupar por sección
  const secciones = ['APERTURA','TB','SMT','VC','CIERRE']

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpandida(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bg/50 text-left"
      >
        <div className="flex-1">
          <div className="text-sm font-medium text-text1">{semana.fecha_inicio} — {semana.fecha_fin}</div>
          <div className="text-xs text-text3 font-mono mt-0.5">{semana.capitulo_biblico}</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Canciones */}
          <div className="flex gap-1">
            {[semana.cancion_apertura, semana.cancion_vc, semana.cancion_cierre].map((c, i) => c ? (
              <span key={i} className="font-mono text-xs bg-bg text-text3 px-1.5 py-0.5 rounded">♪{c}</span>
            ) : null)}
          </div>
          {/* Progreso */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-bg rounded-full overflow-hidden">
              <div className="h-1.5 bg-accent rounded-full" style={{width:`${pct}%`}} />
            </div>
            <span className="text-xs font-mono text-text3">{confirmadas}/{totalPartes}</span>
          </div>
          <span className="text-text3 text-sm">{expandida ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Contenido expandido */}
      {expandida && (
        <div className="border-t border-border px-5 py-3">
          {secciones.map(sec => {
            const partesSeccion = partes.filter(p => p.seccion === sec)
            if (!partesSeccion.length) return null
            return (
              <div key={sec} className="mb-4 last:mb-0">
                <div className="text-xs font-mono font-medium text-text3 uppercase tracking-wider mb-2 pb-1 border-b border-border">
                  {SECCION_LABEL[sec]}
                </div>
                {partesSeccion.map(parte => (
                  <FilaParte
                    key={parte.id}
                    parte={parte}
                    asignaciones={asignaciones}
                    personas={personas}
                    historial={historial}
                    mes={mes}
                    semanaAsignados={semanaAsignados}
                    onAsignar={onAsignar}
                    onConfirmar={onConfirmar}
                  />
                ))}
              </div>
            )
          })}

          <div className="flex justify-end mt-4 pt-3 border-t border-border gap-2">
            <button
              onClick={() => onConfirmarTodo(semana.id, partes, asignaciones)}
              className="px-3 py-1.5 text-xs bg-accent text-white rounded-lg hover:bg-green-800"
            >
              Confirmar todo →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Programa() {
  const [semanas, setSemanas]           = useState([])
  const [partes, setPartes]             = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [personas, setPersonas]         = useState([])
  const [historial, setHistorial]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [uploading, setUploading]       = useState(false)
  const [toast, setToast]               = useState('')
  const [vistaTab, setVistaTab]         = useState('semanas')

  const fetchData = useCallback(async () => {
    const [
      { data: sem },
      { data: par },
      { data: asi },
      { data: per },
      { data: his },
    ] = await Promise.all([
      supabase.from('programa_semanas').select('*').order('fecha_inicio'),
      supabase.from('programa_partes').select('*').order('numero_parte'),
      supabase.from('programa_asignaciones').select('*'),
      supabase.from('personas').select('*').eq('activo', true).order('nombre'),
      supabase.from('participaciones').select('*').order('fecha'),
    ])
    setSemanas(sem || [])
    setPartes(par || [])
    setAsignaciones(asi || [])
    setPersonas(per || [])
    setHistorial(his || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const canal = supabase.channel('programa-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_semanas' },     () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_partes' },      () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'programa_asignaciones' },() => fetchData())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [fetchData])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // ── Subir y parsear EPUB ──────────────────────────────────
  async function handleEPUB(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    showToast('Procesando EPUB...')

    try {
      const semanasParsed = await parsearEPUB(file)
      let insertadas = 0

      for (const s of semanasParsed) {
        const { data: semData, error: semError } = await supabase
          .from('programa_semanas')
          .upsert({
            fecha_inicio:     s.fecha_inicio,
            fecha_fin:        s.fecha_fin,
            capitulo_biblico: s.capitulo_biblico,
            cancion_apertura: s.cancion_apertura,
            cancion_vc:       s.cancion_vc,
            cancion_cierre:   s.cancion_cierre,
            mes:              s.fecha_inicio ? new Date(s.fecha_inicio + 'T12:00:00').toLocaleString('es-MX', { month: 'long' }).replace(/^\w/, c => c.toUpperCase()) : '',
            anio:             s.fecha_inicio ? new Date(s.fecha_inicio + 'T12:00:00').getFullYear() : new Date().getFullYear(),
            epub_filename:    file.name,
          }, { onConflict: 'fecha_inicio,fecha_fin', ignoreDuplicates: false })
          .select()
          .single()

        if (semError || !semData) continue

        await supabase.from('programa_partes').delete().eq('semana_id', semData.id)

        const partesPayload = s.partes.map((p, i) => ({
          semana_id:         semData.id,
          seccion:           p.seccion,
          numero_parte:      Number.isInteger(p.numero_parte) ? p.numero_parte : i + 1,
          titulo:            p.titulo,
          duracion_min:      p.duracion_min || null,
          tipo_asignacion:   p.tipo,
          requiere_ayudante: p.requiere_ayudante || false,
          hora_inicio:       p.hora_inicio || null,
          hora_fin:          p.hora_fin    || null,
        }))

        const { error: partesError } = await supabase.from('programa_partes').insert(partesPayload)
        if (partesError) {
          console.error('Error insertando partes del EPUB:', partesError)
          showToast('Error al guardar partes del EPUB: ' + partesError.message)
          continue
        }

        insertadas++
      }

      showToast(`${insertadas} semanas importadas del EPUB`)
      e.target.value = ''
      await fetchData()
    } catch (err) {
      console.error(err)
      showToast('Error al procesar el EPUB: ' + err.message)
    }

    setUploading(false)
  }

  // ── Asignar persona a una parte ──────────────────────────
  async function handleAsignar(parteId, clave, rol, existingId) {
    if (!clave) {
      if (existingId) {
        await supabase.from('programa_asignaciones').delete().eq('id', existingId)
        await fetchData()
      }
      return
    }

    const payload = { parte_id: parteId, clave, rol, sugerido_por_app: false, confirmado: false }

    if (existingId) {
      await supabase.from('programa_asignaciones').update(payload).eq('id', existingId)
    } else {
      await supabase.from('programa_asignaciones').insert(payload)
    }
    await fetchData()
  }

  // ── Confirmar asignación individual ─────────────────────
  async function handleConfirmar(parteId, principal, ayudante) {
    if (!principal?.clave) return

    const parte = partes.find(p => p.id === parteId)
    if (!parte) return

    const semana = semanas.find(s => s.id === parte.semana_id)
    if (!semana) return

    const persona = personas.find(p => p.clave === principal.clave)
    if (!persona) return

    const tipoParticipacion = TIPO_PARTICIPACION[parte.tipo_asignacion] || 'X'

    let participacionId = principal.participacion_id
    if (!participacionId) {
      const { data: partData } = await supabase.from('participaciones').insert({
        clave:         persona.clave,
        nombre:        persona.nombre,
        lista:         persona.lista,
        fecha:         semana.fecha_inicio,
        mes:           semana.mes,
        tipo:          tipoParticipacion,
        peso:          PESO_TIPO[tipoParticipacion] || 1,
        observaciones: null,
      }).select().single()

      participacionId = partData?.id
    }

    await supabase.from('programa_asignaciones').update({
      confirmado: !principal.confirmado,
      participacion_id: participacionId,
    }).eq('id', principal.id)

    if (ayudante?.clave && ayudante?.id) {
      const personaAyu = personas.find(p => p.clave === ayudante.clave)
      if (personaAyu && !principal.confirmado) {
        const { data: ayuData } = await supabase.from('participaciones').insert({
          clave:         personaAyu.clave,
          nombre:        personaAyu.nombre,
          lista:         personaAyu.lista,
          fecha:         semana.fecha_inicio,
          mes:           semana.mes,
          tipo:          'A',
          peso:          1,
          observaciones: 'Ayudante SMT',
        }).select().single()

        await supabase.from('programa_asignaciones').update({
          confirmado: true,
          participacion_id: ayuData?.id,
        }).eq('id', ayudante.id)
      }
    }

    showToast(principal.confirmado ? 'Asignación desconfirmada' : 'Asignación confirmada ✓')
    await fetchData()
  }

  // ── Confirmar toda la semana ─────────────────────────────
  async function handleConfirmarTodo(semanaId, partesS, asignacionesS) {
    const asigPendientes = asignacionesS.filter(a =>
      partesS.some(p => p.id === a.parte_id) && !a.confirmado && a.clave
    )
    for (const asig of asigPendientes) {
      const parte = partesS.find(p => p.id === asig.parte_id)
      if (parte) {
        const ayudante = asignacionesS.find(a => a.parte_id === parte.id && a.rol === 'ayudante')
        await handleConfirmar(parte.id, asig, ayudante)
      }
    }
    showToast('Semana confirmada completa ✓')
  }

  // ── Generar S-140.docx ──────────────────────────────────
  async function handleGenerarDocx() {
    if (!semanas.length) { showToast('No hay semanas cargadas'); return }
    showToast('Generando S-140...')

    try {
      const semanasConDatos = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas)
      await generarYDescargarS140({
        congregacion: 'Congregacion del Recreo',
        semanas: semanasConDatos,
      })
      showToast('S-140 descargado ✓')
    } catch (err) {
      console.error(err)
      showToast('Error al generar el S-140: ' + err.message)
    }
  }

  // ── Eliminar semana ──────────────────────────────────────
  async function handleEliminarSemana(semanaId) {
    if (!confirm('¿Eliminar esta semana y todas sus partes y asignaciones?')) return
    await supabase.from('programa_semanas').delete().eq('id', semanaId)
    showToast('Semana eliminada')
    await fetchData()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-text3 font-mono text-sm">
      Cargando programa...
    </div>
  )

  return (
    <div>
      {/* Controles superiores */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex border-b border-border flex-1">
          {[['semanas','Por semana'],['resumen','Resumen']].map(([id, label]) => (
            <button key={id} onClick={() => setVistaTab(id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-none
                ${vistaTab === id ? 'text-accent border-accent font-medium' : 'text-text3 border-transparent hover:text-text2'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            id="epubInput"
            accept=".epub"
            className="hidden"
            onChange={handleEPUB}
          />
          <button
            onClick={() => document.getElementById('epubInput').click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-green-800 disabled:opacity-50"
          >
            {uploading ? 'Procesando...' : '↑ Subir EPUB mwb'}
          </button>
          <button
            onClick={handleGenerarDocx}
            disabled={!semanas.length}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border2 rounded-lg text-text2 hover:bg-bg disabled:opacity-50"
          >
            ↓ Generar S-140
          </button>
        </div>
      </div>

      {/* Vista por semanas */}
      {vistaTab === 'semanas' && (
        <div className="flex flex-col gap-3">
          {semanas.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-10 text-center">
              <div className="text-3xl mb-3">📖</div>
              <div className="font-medium text-text1 mb-2">Sin semanas cargadas</div>
              <div className="text-sm text-text3 mb-4">
                Sube el archivo EPUB de la Guía de Actividades (mwb) para comenzar
              </div>
              <button
                onClick={() => document.getElementById('epubInput').click()}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-green-800"
              >
                ↑ Subir EPUB mwb
              </button>
            </div>
          ) : (
            semanas.map(s => {
              const partesSemana = partes.filter(p => p.semana_id === s.id)
              const asigSemana   = asignaciones.filter(a => partesSemana.some(p => p.id === a.parte_id))
              return (
                <TarjetaSemana
                  key={s.id}
                  semana={s}
                  partes={partesSemana}
                  asignaciones={asigSemana}
                  personas={personas}
                  historial={historial}
                  onAsignar={handleAsignar}
                  onConfirmar={handleConfirmar}
                  onConfirmarTodo={handleConfirmarTodo}
                />
              )
            })
          )}
        </div>
      )}

      {/* Vista resumen */}
      {vistaTab === 'resumen' && (
        <div className="bg-surface border border-border rounded-xl overflow-auto">
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr>
                {['SEMANA','CAPÍTULO','♪ AP','♪ VC','♪ CI','PARTES','CONFIRMADAS',''].map(h => (
                  <th key={h} className="bg-bg px-3 py-2 text-left text-xs font-mono font-medium text-text3 tracking-wider border-b border-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanas.map(s => {
                const partesSemana = partes.filter(p => p.semana_id === s.id)
                const asigConf     = asignaciones.filter(a => partesSemana.some(p => p.id === a.parte_id) && a.confirmado)
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                    <td className="px-3 py-2 text-sm text-text1 whitespace-nowrap">{s.fecha_inicio}<br/><span className="text-xs text-text3">{s.fecha_fin}</span></td>
                    <td className="px-3 py-2 text-xs text-text2 font-mono">{s.capitulo_biblico}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text3">{s.cancion_apertura || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text3">{s.cancion_vc || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text3">{s.cancion_cierre || '—'}</td>
                    <td className="px-3 py-2 text-xs font-mono text-text2 text-center">{partesSemana.length}</td>
                    <td className="px-3 py-2 text-xs font-mono text-center">
                      <span className={asigConf.length === partesSemana.length && partesSemana.length > 0 ? 'text-accent font-medium' : 'text-text3'}>
                        {asigConf.length}/{partesSemana.length}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button onClick={() => handleEliminarSemana(s.id)}
                        className="text-xs text-text3 hover:text-danger px-1">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 bg-text1 text-white text-xs font-mono px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}