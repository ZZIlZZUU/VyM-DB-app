// src/components/S140Vista.jsx — Vista HTML nativa del formulario S-140 para impresión y PDF
import React from 'react'
import '../styles/s140-print.css'
import tesorosIcon from '../assets/icons/tesoros.svg'
import smtIcon from '../assets/icons/smt.svg'
import nvcIcon from '../assets/icons/nvc.svg'
import { formatRangoSemanaPrograma } from '../lib/fechas'

/**
 * Convierte un formato militar '19:25' o '20:10' a formato 12h sin sufijo ('7:25', '8:10')
 */
function formatHora12(horaStr) {
  if (!horaStr || typeof horaStr !== 'string') return ''
  const trimmed = horaStr.trim()
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return trimmed

  const h = parseInt(match[1], 10)
  const m = match[2]
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${m}`
}

/**
 * Formatea el rango de fechas de la semana en mayúsculas estilo S-140 (ej: "2 - 8 DE NOVIEMBRE")
 */
function formatearFechaSemana(semana) {
  if (semana.fecha_inicio && semana.fecha_fin) {
    const formatted = formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)
    if (formatted) return formatted.toUpperCase()
  }

  if (semana.fecha) {
    const partes = semana.fecha.split(/—|-/)
    if (partes.length === 2) {
      const p0 = partes[0].trim()
      const p1 = partes[1].trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(p0) && /^\d{4}-\d{2}-\d{2}$/.test(p1)) {
        const formatted = formatRangoSemanaPrograma(p0, p1)
        if (formatted) return formatted.toUpperCase()
      }
    }
    return String(semana.fecha).toUpperCase()
  }

  return ''
}

/**
 * Encabezado de página institucional (60% derecha, 40% izquierda)
 */
function PageHeader({ nombreCongregacion }) {
  return (
    <div className="flex items-baseline justify-between border-b border-zinc-950 pb-1 mb-2.5">
      <div className="w-[40%] text-left">
        <span className="text-[12px] font-bold tracking-tight text-zinc-900 uppercase">
          {nombreCongregacion || 'Congregación'}
        </span>
      </div>
      <div className="w-[60%] text-right">
        <span className="text-[13px] sm:text-[14px] font-extrabold tracking-tight text-zinc-950">
          Programa para la reunión de entre semana
        </span>
      </div>
    </div>
  )
}

/**
 * Bloque individual de una semana del formulario S-140
 */
function SemanaBloque({ semana }) {
  if (!semana) return null

  const fechaTexto = formatearFechaSemana(semana)

  // Filtrar partes con contenido real
  const smtPartes = (semana.smt || []).filter(p => p && p.titulo && String(p.titulo).trim() !== '').slice(0, 4)
  const vcPartes = (semana.vc || []).filter(p => p && p.titulo && String(p.titulo).trim() !== '').slice(0, 2)

  // Numeración correlativa continua
  let numeroActual = 4
  const smtNumeradas = smtPartes.map(p => ({
    ...p,
    numero: numeroActual++,
  }))

  const vcNumeradas = vcPartes.map(p => ({
    ...p,
    numero: numeroActual++,
  }))

  const numeroEBC = numeroActual

  return (
    <div className="s140-semana-bloque text-zinc-950 text-[11px] leading-tight select-text mb-2 last:mb-0">
      <table className="w-full border-collapse border border-zinc-400 table-fixed bg-white">
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '58%' }} />
          <col style={{ width: '34%' }} />
        </colgroup>
        <tbody>
          {/* ── FILA 1: FECHA Y PRESIDENTE ── */}
          <tr className="border border-zinc-400 bg-zinc-50/50">
            <td colSpan={2} className="border border-zinc-400 px-2 py-[2.5px] font-bold text-[11.5px] tracking-wide text-zinc-950">
              {fechaTexto}
            </td>
            <td className="border border-zinc-400 px-2 py-[2.5px]">
              <span className="text-[10px] text-zinc-500 font-medium">Presidente: </span>
              <span className="text-[11px] font-semibold text-zinc-950">{semana.presidente || ''}</span>
            </td>
          </tr>

          {/* Separador sutil sin bordes */}
          <tr className="h-1 border-none">
            <td colSpan={3} className="h-1 p-0 border-none"></td>
          </tr>

          {/* ── APERTURA: CANCIÓN Y PALABRAS DE INTRODUCCIÓN ── */}
          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              7:00
            </td>
            <td className="border border-zinc-400 px-2 py-[2px] font-medium text-zinc-900">
              Canción {semana.can_ap || ''}
            </td>
            <td className="border border-zinc-400 px-2 py-[2px]">
              <span className="text-[10px] text-zinc-500 font-medium">Oración: </span>
              <span className="text-[11px] font-normal text-zinc-900">{semana.oracion_ap || ''}</span>
            </td>
          </tr>

          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              7:04
            </td>
            <td colSpan={2} className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
              Palabras de introducción (1 min.)
            </td>
          </tr>

          {/* Separador */}
          <tr className="h-1 border-none">
            <td colSpan={3} className="h-1 p-0 border-none"></td>
          </tr>

          {/* ── SECCIÓN 1: TESOROS DE LA BIBLIA (#3A7E89) ── */}
          <tr className="border border-zinc-400">
            <td
              colSpan={2}
              style={{ backgroundColor: '#3A7E89' }}
              className="px-2 py-1 text-white border-r border-zinc-400"
            >
              <div className="flex items-center gap-2">
                <img src={tesorosIcon} alt="" className="w-5 h-5 object-contain shrink-0 brightness-0 invert" />
                <span className="font-bold text-[11.5px] tracking-wider uppercase text-white">
                  TESOROS DE LA BIBLIA
                </span>
              </div>
            </td>
            <td className="border border-zinc-400 px-2 py-1 bg-white text-right">
              <span className="text-[10.5px] font-medium text-zinc-600 italic">
                Auditorio principal
              </span>
            </td>
          </tr>

          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              7:05
            </td>
            <td className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
              1. {semana.tb_titulo || 'Discurso de Tesoros'} <span className="text-[10px] text-zinc-600">(10 mins.)</span>
            </td>
            <td className="border border-zinc-400 px-2 py-[2px]">
              <span className="text-[10px] text-zinc-500 font-medium">Conductor: </span>
              <span className="text-[11px] font-normal text-zinc-900">{semana.tb_cond || ''}</span>
            </td>
          </tr>

          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              7:15
            </td>
            <td className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
              2. Busquemos perlas escondidas <span className="text-[10px] text-zinc-600">(10 mins.)</span>
            </td>
            <td className="border border-zinc-400 px-2 py-[2px]">
              <span className="text-[10px] text-zinc-500 font-medium">Conductor: </span>
              <span className="text-[11px] font-normal text-zinc-900">{semana.pe_cond || ''}</span>
            </td>
          </tr>

          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              7:25
            </td>
            <td className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
              3. Lectura de la Biblia <span className="text-[10px] text-zinc-600">(4 mins.)</span>
            </td>
            <td className="border border-zinc-400 px-2 py-[2px]">
              <span className="text-[10px] text-zinc-500 font-medium">Estudiante: </span>
              <span className="text-[11px] font-normal text-zinc-900">{semana.lb_est || ''}</span>
            </td>
          </tr>

          {/* Separador */}
          <tr className="h-1 border-none">
            <td colSpan={3} className="h-1 p-0 border-none"></td>
          </tr>

          {/* ── SECCIÓN 2: SEAMOS MEJORES MAESTROS (#D58E00) ── */}
          <tr className="border border-zinc-400">
            <td
              colSpan={2}
              style={{ backgroundColor: '#D58E00' }}
              className="px-2 py-1 text-white border-r border-zinc-400"
            >
              <div className="flex items-center gap-2">
                <img src={smtIcon} alt="" className="w-5 h-5 object-contain shrink-0 brightness-0 invert" />
                <span className="font-bold text-[11.5px] tracking-wider uppercase text-white">
                  SEAMOS MEJORES MAESTROS
                </span>
              </div>
            </td>
            <td className="border border-zinc-400 px-2 py-1 bg-white text-right">
              <span className="text-[10.5px] font-medium text-zinc-600 italic">
                Auditorio principal
              </span>
            </td>
          </tr>

          {/* Filas dinámicas de SMT (máximo 4, solo con título presente) */}
          {smtNumeradas.map(p => {
            const horaLabel = p.hora_inicio ? formatHora12(p.hora_inicio) : '7:XX'
            const duracionLabel = p.duracion_min ? `${p.duracion_min} mins.` : 'X mins.'
            const tieneAyudante = Boolean(p.ayu && String(p.ayu).trim() !== '')

            return (
              <tr key={p.numero} className="border border-zinc-400">
                <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
                  {horaLabel}
                </td>
                <td className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
                  {p.numero}. {p.titulo} <span className="text-[10px] text-zinc-600">({duracionLabel})</span>
                </td>
                <td className="border border-zinc-400 px-2 py-[2px]">
                  {tieneAyudante ? (
                    <>
                      <span className="text-[10px] text-zinc-500 font-medium">Estudiante/Ayudante: </span>
                      <span className="text-[11px] font-normal text-zinc-900">
                        {p.est || '—'} / {p.ayu}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-zinc-500 font-medium">Estudiante: </span>
                      <span className="text-[11px] font-normal text-zinc-900">{p.est || ''}</span>
                    </>
                  )}
                </td>
              </tr>
            )
          })}

          {/* Separador */}
          <tr className="h-1 border-none">
            <td colSpan={3} className="h-1 p-0 border-none"></td>
          </tr>

          {/* ── SECCIÓN 3: NUESTRA VIDA CRISTIANA (#BE2D11) ── */}
          <tr className="border border-zinc-400">
            <td
              colSpan={2}
              style={{ backgroundColor: '#BE2D11' }}
              className="px-2 py-1 text-white border-r border-zinc-400"
            >
              <div className="flex items-center gap-2">
                <img src={nvcIcon} alt="" className="w-5 h-5 object-contain shrink-0 brightness-0 invert" />
                <span className="font-bold text-[11.5px] tracking-wider uppercase text-white">
                  NUESTRA VIDA CRISTIANA
                </span>
              </div>
            </td>
            <td className="border border-zinc-400 px-2 py-1 bg-white"></td>
          </tr>

          {/* Canción de Vida Cristiana */}
          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              7:45
            </td>
            <td colSpan={2} className="border border-zinc-400 px-2 py-[2px] font-medium text-zinc-900">
              Canción {semana.can_vc || ''}
            </td>
          </tr>

          {/* Filas dinámicas de VC (máximo 2, solo con título presente) */}
          {vcNumeradas.map((v, i) => {
            const horaLabel = i === 0 ? '7:50' : v.hora_inicio ? formatHora12(v.hora_inicio) : '8:XX'
            const duracionLabel = v.duracion_min ? `${v.duracion_min} mins.` : 'XX mins.'

            return (
              <tr key={v.numero} className="border border-zinc-400">
                <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
                  {horaLabel}
                </td>
                <td className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
                  {v.numero}. {v.titulo} <span className="text-[10px] text-zinc-600">({duracionLabel})</span>
                </td>
                <td className="border border-zinc-400 px-2 py-[2px]">
                  <span className="text-[10px] text-zinc-500 font-medium">Conductor: </span>
                  <span className="text-[11px] font-normal text-zinc-900">{v.cond || ''}</span>
                </td>
              </tr>
            )
          })}

          {/* Estudio Bíblico de la Congregación */}
          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              {semana.ebc_hora_inicio ? formatHora12(semana.ebc_hora_inicio) : '8:05'}
            </td>
            <td className="border border-zinc-400 px-2 py-[2px] text-zinc-900 font-medium">
              {numeroEBC}. Estudio bíblico de la congregación <span className="text-[10px] text-zinc-600 font-normal">(30 mins.)</span>
            </td>
            <td className="border border-zinc-400 px-2 py-[2px]">
              <span className="text-[10px] text-zinc-500 font-medium">Conductor/Lector: </span>
              <span className="text-[11px] font-normal text-zinc-900">
                {semana.ebc_cond || '—'}{semana.ebc_lect ? ` / ${semana.ebc_lect}` : ''}
              </span>
            </td>
          </tr>

          {/* Palabras de conclusión */}
          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              8:37
            </td>
            <td colSpan={2} className="border border-zinc-400 px-2 py-[2px] text-zinc-900">
              Palabras de conclusión (3 min.)
            </td>
          </tr>

          {/* Canción y oración final */}
          <tr className="border border-zinc-400">
            <td className="border border-zinc-400 px-1 py-[2px] text-center font-mono text-[10.5px] text-zinc-800">
              8:40
            </td>
            <td className="border border-zinc-400 px-2 py-[2px] font-medium text-zinc-900">
              Canción {semana.can_ci || ''}
            </td>
            <td className="border border-zinc-400 px-2 py-[2px]">
              <span className="text-[10px] text-zinc-500 font-medium">Oración: </span>
              <span className="text-[11px] font-normal text-zinc-900">{semana.oracion_ci || ''}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/**
 * Componente principal S140Vista:
 * Renderiza todas las semanas organizadas en pares de 2 por hoja Letter.
 */
export default function S140Vista({ semanas = [], nombreCongregacion = '' }) {
  if (!semanas || semanas.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-white rounded-lg border border-zinc-200">
        <p className="text-sm font-medium">No hay semanas disponibles para generar el formulario S-140.</p>
      </div>
    )
  }

  // Agrupar semanas en pares de 2 por página física
  const paginas = []
  for (let i = 0; i < semanas.length; i += 2) {
    paginas.push([semanas[i], semanas[i + 1] || null])
  }

  return (
    <div id="s140-print-root" className="s140-root">
      {paginas.map(([semana1, semana2], idx) => {
        const esUltima = idx === paginas.length - 1

        return (
          <React.Fragment key={idx}>
            <div className="s140-pagina flex flex-col justify-start">
              <PageHeader nombreCongregacion={nombreCongregacion} />

              <div className="flex-1 flex flex-col justify-start gap-3">
                <SemanaBloque semana={semana1} />

                {semana2 ? (
                  <SemanaBloque semana={semana2} />
                ) : (
                  /* Si el total de semanas es impar, la mitad inferior queda vacía sin filas falsas */
                  <div className="flex-1 min-h-[140px] pointer-events-none" />
                )}
              </div>
            </div>

            {/* Separador visual entre páginas solo para pantalla */}
            {!esUltima && <div className="s140-separador-pagina" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}
