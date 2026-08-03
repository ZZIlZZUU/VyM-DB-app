import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { parsearEPUB } from '../lib/epubParser'
import { sugerirCandidatos, sugerirAyudante } from '../lib/asignacionesSugeridas'
import { generarYDescargarS140, buildDatosDesdeSupabase } from '../lib/generarS140'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import { SkeletonPrograma } from '../components/Skeleton'

// ── Constantes UI ─────────────────────────────────────────────
const SECCION_LABEL = {
  APERTURA: 'Apertura',
  TB:       'Tesoros de la Biblia',
  SMT:      'Seamos Mejores Maestros',
  VC:       'Nuestra Vida Cristiana',
  CIERRE:   'Cierre',
}

const TIPO_LABEL = {
  P:'Presidente', 
  ORACION:'Oración apertura', 
  ORACION_C:'Oración cierre',
  CONCLU:'Palabras de conclusión',
  TB:'Tesoros de la Biblia', 
  PE:'Perlas escondidas', 
  LB:'Lectura de la Biblia',
  SMT_EST:'Estudiante', 
  SMT_EXP:'Explique sus creencias',
  SMT_DSC:'Discurso', 
  SMT_AYU:'Ayudante',
  VC:'Vida Cristiana', 
  NC:'Nec. de la congregación',
  EBC_CON:'Conductor EBC', 
  LEBC: 'Lector EBC', 
  SMT_VACIO:'—',
}

const TIPO_COLOR = {
  P:'bg-purple-bg text-purple', 
  ORACION:'bg-blue-bg text-blue', 
  ORACION_C:'bg-blue-bg text-blue',
  CONCLU:'bg-bg text-text2',
  TB:'bg-teal-bg text-teal', 
  PE:'bg-rose-bg text-rose', 
  LB:'bg-amber-bg text-amber',
  SMT_EST:'bg-accent-bg text-accent', 
  SMT_EXP:'bg-accent-bg text-accent',
  SMT_DSC:'bg-amber-bg text-amber', 
  SMT_AYU:'bg-blue-bg text-blue',
  VC:'bg-green-100 text-green-800', 
  NC:'bg-red-100 text-red-800',
  EBC_CON:'bg-orange-100 text-orange-700', 
  LEBC: 'bg-maroon/15 text-maroon',
  SMT_VACIO:'bg-bg text-text3',
}

const PESO_TIPO = { T:2, A:1, LB:1, SMT_EST:1, SMT_EXP:1, SMT_DSC:1, SMT_AYU:1, TB:1, PE:1, VC:1, NC:1, EBC_CON:1, LEBC:1, P:1, ORACION:0, ORACION_C:0 }

// Mapa tipo_asignacion → campo 'tipo' en tabla participaciones
const TIPO_PARTICIPACION = {
  P:'P', 
  ORACION:'P',
  ORACION_C:'OC', 
  CONCLU:'P',
  TB:'TB', 
  PE:'PE', 
  LB:'LB', 
  SMT_EST:'T', 
  SMT_EXP:'T',
  SMT_DSC:'DSC', 
  SMT_AYU:'A',
  VC:'VC', 
  NC:'NC', 
  EBC_CON:'EBC', 
  LEBC: 'LEBC',
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
function FilaParte({ parte, asignaciones, personas, historial, mes, semanaAsignados, onAsignar, onConfirmar, clavePresidente }) {
  const asig = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'principal')
  const asigAyu = asignaciones.filter(a => a.parte_id === parte.id && a.rol === 'ayudante')
  const principal = asig[0] || null
  const ayudante  = asigAyu[0] || null

    // Slot vacío — no renderizar nada asignable
  if (parte.tipo_asignacion === 'SMT_VACIO') {
    return (
      <div className="grid gap-2 py-2 border-b border-border last:border-0 items-start grid-cols-[auto_1fr_180px_120px]">
        <div className="text-xs font-mono text-text3 w-20 pt-1 shrink-0" />
        <div>
          <div className="text-sm text-text3 italic">Sin cuarta asignación</div>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-bg text-text3">SMT</span>
        </div>
        <div />
        <div />
      </div>
    )
  }

    // CONCLU y ORACION — read-only, siempre refleja al Presidente (visual only, no se guarda en BD)
  if (parte.tipo_asignacion === 'CONCLU' || parte.tipo_asignacion === 'ORACION') {
    const nombrePresidente = personas.find(p => p.clave === clavePresidente)?.nombre || '—'
    return (
      <div className="grid gap-2 py-2 border-b border-border last:border-0 items-start grid-cols-[auto_1fr_180px_120px]">
        <div className="text-xs font-mono text-text3 w-20 pt-1 shrink-0 whitespace-nowrap">
          {parte.hora_inicio || ''}
        </div>
        <div>
          <div className="text-sm text-text1 leading-tight">{parte.titulo}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${TIPO_COLOR[parte.tipo_asignacion] || 'bg-bg text-text2'}`}>
              {parte.tipo_asignacion}
            </span>
          </div>
        </div>
        <div className="px-2 py-1 text-xs text-text2 italic bg-bg border border-border2 rounded-lg">
          {clavePresidente ? nombrePresidente : '— Asignar presidente primero —'}
        </div>
        <div />
      </div>
    )
  }

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
          {parte.requiere_ayudante && (() => {
            // Para SMT_EXP: el ayudante debe ser del mismo sexo que el principal
            const tipoAyu = parte.tipo_asignacion === 'SMT_EXP'
              ? (personas.find(p => p.clave === principal?.clave)?.sexo === 'M' ? 'SMT_EXP_M' : 'SMT_EXP_F')
              : parte.tipo_asignacion
            return (
              <PersonaSelector
                tipo={tipoAyu}
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
            )
          })()}
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

      // Clave del presidente de esta semana
  const partePresidente = partes.find(p => p.tipo_asignacion === 'P')
  const asigPresidente  = partePresidente
    ? asignaciones.find(a => a.parte_id === partePresidente.id && a.rol === 'principal')
    : null
  const clavePresidente = asigPresidente?.clave || null

  const TIPOS_SOLO_VISUAL = ['SMT_VACIO', 'ORACION', 'CONCLU']
  const partesContables  = partes.filter(p => !TIPOS_SOLO_VISUAL.includes(p.tipo_asignacion))
  const totalPartes      = partesContables.length
  const confirmadas      = partesContables.filter(p => {
    const asigParte = asignaciones.filter(a => a.parte_id === p.id && a.confirmado)
    // Una parte se considera confirmada si su asignación principal está confirmada
    return asigParte.some(a => a.rol === 'principal')
  }).length
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
          <div className="flex flex-col items-end gap-1 min-w-[72px]">
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-mono text-text3">{confirmadas}/{totalPartes}</span>
              <span className={`text-xs font-mono font-medium ${pct === 100 ? 'text-accent' : pct >= 50 ? 'text-amber' : 'text-text3'}`}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${pct === 100 ? 'bg-accent' : pct >= 50 ? 'bg-amber' : 'bg-danger'}`}
                style={{width:`${pct}%`}}
              />
            </div>
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
                    clavePresidente={clavePresidente} 
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
  const [vistaTab, setVistaTab]         = useState('semanas')
  const [congregacion, setCongregacion] = useState('Congregacion del Recreo')
  const { toast, showToast, success, error: toastError } = useToast()

  const fetchData = useCallback(async () => {
    const [
      { data: sem },
      { data: par },
      { data: asi },
      { data: per },
      { data: his },
      { data: cfg },
    ] = await Promise.all([
      supabase.from('programa_semanas').select('*').order('fecha_inicio'),
      supabase.from('programa_partes').select('*').order('numero_parte'),
      supabase.from('programa_asignaciones').select('*'),
      supabase.from('personas').select('*').eq('activo', true).order('nombre'),
      supabase.from('participaciones').select('*').order('fecha'),
      supabase.from('configuracion').select('*'),
    ])
    setSemanas(sem || [])
    setPartes(par || [])
    setAsignaciones(asi || [])
    setPersonas(per || [])
    setHistorial(his || [])
    const nombreCfg = cfg?.find(r => r.clave === 'nombre_congregacion')?.valor
    if (nombreCfg) setCongregacion(nombreCfg)
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
          toastError('Error al guardar partes del EPUB: ' + partesError.message)
          continue
        }

        insertadas++
      }

      success(`${insertadas} semanas importadas del EPUB`)
      e.target.value = ''
      await fetchData()
    } catch (err) {
      console.error(err)
      toastError('Error al procesar el EPUB: ' + err.message)
    }

    setUploading(false)
  }

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

    // ORACION y CONCLU son puramente visuales (se propagan desde clavePresidente en FilaParte)
    // No se guardan en BD — no hay lógica de propagación aquí

    await fetchData()
  }

  // ── Confirmar asignación individual ─────────────────────
  async function handleConfirmar(parteId, principal, ayudante) {
    if (!principal?.clave) return

    const parte = partes.find(p => p.id === parteId)
    if (!parte) return

    // ORACION y CONCLU son puramente visuales (propagadas del Presidente)
    // No generan registro en participaciones ni en programa_asignaciones
    if (parte.tipo_asignacion === 'ORACION' || parte.tipo_asignacion === 'CONCLU') return

    // Evitar que una asignación de ayudante sea procesada como principal
    // (puede ocurrir si se llama directamente con el objeto ayudante)
    if (principal.rol === 'ayudante') return

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
    // Solo iteramos sobre rol === 'principal' para evitar procesar el ayudante dos veces:
    // una como ayudante dentro de handleConfirmar, y otra como "principal" en el loop.
    const asigPendientes = asignacionesS.filter(a =>
      partesS.some(p => p.id === a.parte_id) && !a.confirmado && a.clave && a.rol === 'principal'
    )
    for (const asig of asigPendientes) {
      const parte = partesS.find(p => p.id === asig.parte_id)
      if (parte) {
        const ayudante = asignacionesS.find(a => a.parte_id === parte.id && a.rol === 'ayudante')
        await handleConfirmar(parte.id, asig, ayudante)
      }
    }
    success('Semana confirmada completa ✓')
  }

  // ── Generar S-140.docx ──────────────────────────────────
  async function handleGenerarDocx() {
    if (!semanas.length) { showToast('No hay semanas cargadas'); return }
    showToast('Generando S-140...')

    try {
      const semanasConDatos = buildDatosDesdeSupabase(semanas, partes, asignaciones, personas)
      await generarYDescargarS140({
        congregacion,
        semanas: semanasConDatos,
      })
      success('S-140 descargado ✓')
    } catch (err) {
      console.error(err)
      toastError('Error al generar el S-140: ' + err.message)
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
    <div className="p-6">
      <SkeletonPrograma cards={4} />
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

      <Toast toast={toast} />
    </div>
  )
}