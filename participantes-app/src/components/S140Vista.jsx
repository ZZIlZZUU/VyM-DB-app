// src/components/S140Vista.jsx — Vista HTML nativa del formulario S-140 para impresión y PDF
import React from 'react'
import '../styles/s140-print.css'
import tesorosIcon from '../assets/icons/tesoros.svg'
import smtIcon from '../assets/icons/smt.svg'
import nvcIcon from '../assets/icons/nvc.svg'
import { formatRangoSemanaPrograma } from '../lib/fechas'
import { abreviarNombre, formatearParParticipantes } from '../lib/nombres'
import { obtenerHorariosS140, formatHora12 } from '../lib/horarios'

// Colores institucionales estándar S-140 solicitados por el usuario
const COLOR_TB = '#3A7E89'
const COLOR_SMT = '#D58E00'
const COLOR_VC = '#BE2D11'

/**
 * Formatea el rango de fechas de la semana en formato legible institucional (ej: "7 - 13 DE SEPTIEMBRE")
 */
function formatearFechaSemana(semana) {
  // 1. Si vienen fecha_inicio y fecha_fin en formato ISO 'YYYY-MM-DD'
  if (semana.fecha_inicio && semana.fecha_fin) {
    const formatted = formatRangoSemanaPrograma(semana.fecha_inicio, semana.fecha_fin)
    if (formatted) return formatted.toUpperCase()
  }

  // 2. Si viene semana.fecha con formato 'YYYY-MM-DD — YYYY-MM-DD' o similar
  if (semana.fecha) {
    const partes = String(semana.fecha).split(/—| al | - | – /)
    if (partes.length === 2) {
      const p0 = partes[0].trim().slice(0, 10)
      const p1 = partes[1].trim().slice(0, 10)
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
 * Encabezado de página institucional (con Cambria para la congregación y doble borde inferior)
 */
function PageHeader({ nombreCongregacion }) {
  return (
    <div className="flex items-baseline justify-between s140-header-line pb-1.5 mb-3">
      <div className="text-left">
        <span className="s140-fuente-titulo text-[17px] sm:text-[18px] font-bold tracking-normal text-zinc-900">
          {nombreCongregacion || 'Congregación'}
        </span>
      </div>
      <div className="text-right">
        <span className="s140-fuente-titulo text-[16.5pt] font-bold tracking-normal text-zinc-950 whitespace-nowrap">
          Programa para la reunión de entre semana
        </span>
      </div>
    </div>
  )
}

/**
 * Bloque individual de una semana del formulario S-140 (4 columnas fijas, sin bordes)
 */
function SemanaBloque({ semana }) {
  if (!semana) return null

  const fechaTexto = formatearFechaSemana(semana)
  const horarios = obtenerHorariosS140(semana)

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
    <div className="s140-semana-bloque text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug select-text">
      <table className="w-full border-collapse table-fixed bg-white">
        <colgroup>
          <col style={{ width: '6.5%' }} />
          <col style={{ width: '43.5%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '33%' }} />
        </colgroup>
        <tbody>
          {/* ── FILA 1: FECHA Y PRESIDENTE ── */}
          <tr>
            <td colSpan={2} className="py-[2.5px] font-bold text-[13px] sm:text-[13.5px] text-zinc-950">
              {fechaTexto}
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Presidente:
              </div>
            </td>
            <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
              {abreviarNombre(semana.presidente, 26)}
            </td>
          </tr>

          {/* ── APERTURA: CANCIÓN Y PALABRAS DE INTRODUCCIÓN ── */}
          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.apertura.cancion}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px]">
              <span className="inline-block mr-1.5 text-[9px] leading-none select-none" style={{ color: COLOR_TB }}>●</span>
              <span className="font-bold">Canción {semana.can_ap || ''}</span>
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Oración:
              </div>
            </td>
            <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
              {abreviarNombre(semana.oracion_ap, 26)}
            </td>
          </tr>

          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.apertura.intro}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px]">
              <span className="inline-block mr-1.5 text-[9px] leading-none select-none" style={{ color: COLOR_TB }}>●</span>
              <span>Palabras de introducción (1 min.)</span>
            </td>
            <td className="py-[2.5px]"></td>
            <td className="py-[2.5px]"></td>
          </tr>

          {/* Separador */}
          <tr className="h-[5px]">
            <td colSpan={4} className="h-[5px] p-0"></td>
          </tr>

          {/* ── SECCIÓN 1: TESOROS DE LA BIBLIA (#3A7E89) ── */}
          <tr>
            <td
              colSpan={2}
              style={{ backgroundColor: COLOR_TB }}
              className="px-2 py-[3px] text-white"
            >
              <div className="flex items-center gap-1.5">
                <img src={tesorosIcon} alt="" className="w-4 h-4 object-contain shrink-0" />
                <span className="font-bold text-[11.5px] sm:text-[12px] tracking-wider uppercase text-white">
                  TESOROS DE LA BIBLIA
                </span>
              </div>
            </td>
            <td className="py-[3px]"></td>
            <td className="py-[3px] text-left pl-2">
              <span className="text-[10.5px] font-bold text-zinc-600">
                Auditorio principal
              </span>
            </td>
          </tr>

          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.tb.discurso}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug">
              1. {semana.tb_titulo || 'Discurso de Tesoros'} <span className="text-[11.5px] text-zinc-600 font-normal">(10 mins.)</span>
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Conductor:
              </div>
            </td>
            <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
              {abreviarNombre(semana.tb_cond, 26)}
            </td>
          </tr>

          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.tb.perlas}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug">
              2. Busquemos perlas escondidas <span className="text-[11.5px] text-zinc-600 font-normal">(10 mins.)</span>
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Conductor:
              </div>
            </td>
            <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
              {abreviarNombre(semana.pe_cond, 26)}
            </td>
          </tr>

          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.tb.lectura}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug">
              3. Lectura de la Biblia <span className="text-[11.5px] text-zinc-600 font-normal">(4 mins.)</span>
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Estudiante:
              </div>
            </td>
            <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
              {abreviarNombre(semana.lb_est, 26)}
            </td>
          </tr>

          {/* Separador */}
          <tr className="h-[5px]">
            <td colSpan={4} className="h-[5px] p-0"></td>
          </tr>

          {/* ── SECCIÓN 2: SEAMOS MEJORES MAESTROS (#D58E00) ── */}
          <tr>
            <td
              colSpan={2}
              style={{ backgroundColor: COLOR_SMT }}
              className="px-2 py-[3px] text-white"
            >
              <div className="flex items-center gap-1.5">
                <img src={smtIcon} alt="" className="w-4 h-4 object-contain shrink-0" />
                <span className="font-bold text-[11.5px] sm:text-[12px] tracking-wider uppercase text-white">
                  SEAMOS MEJORES MAESTROS
                </span>
              </div>
            </td>
            <td className="py-[3px]"></td>
            <td className="py-[3px] text-left pl-2">
              <span className="text-[10.5px] font-bold text-zinc-600">
                Auditorio principal
              </span>
            </td>
          </tr>

          {/* Filas dinámicas de SMT (máximo 4) */}
          {smtNumeradas.map((p, idx) => {
            const horaLabel = horarios.smtHoras[idx] || (p.hora_inicio ? formatHora12(p.hora_inicio) : '7:XX')
            const duracionLabel = p.duracion_min ? `${p.duracion_min} mins.` : 'X mins.'
            const tieneAyudante = Boolean(p.ayu && String(p.ayu).trim() !== '')

            let participanteTexto = ''
            if (tieneAyudante) {
              participanteTexto = formatearParParticipantes(p.est, p.ayu, 28)
            } else if (p.est) {
              participanteTexto = abreviarNombre(p.est, 26)
            } else {
              participanteTexto = ' / '
            }

            return (
              <tr key={p.numero}>
                <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
                  {horaLabel}
                </td>
                <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug">
                  {p.numero}. {p.titulo} <span className="text-[11.5px] text-zinc-600 font-normal">({duracionLabel})</span>
                </td>
                <td className="py-[2.5px]">
                  <div className="text-right font-bold text-[10.5px] text-zinc-600">
                    {tieneAyudante || !p.est ? 'Estudiante/Ayudante:' : 'Estudiante:'}
                  </div>
                </td>
                <td className={`py-[2.5px] text-left font-normal ${tieneAyudante ? 'text-[12px] sm:text-[12.5px]' : 'text-[13px] sm:text-[13.5px]'} text-zinc-950 pl-2`}>
                  {participanteTexto}
                </td>
              </tr>
            )
          })}

          {/* Separador */}
          <tr className="h-[5px]">
            <td colSpan={4} className="h-[5px] p-0"></td>
          </tr>

          {/* ── SECCIÓN 3: NUESTRA VIDA CRISTIANA (#BE2D11) ── */}
          <tr>
            <td
              colSpan={2}
              style={{ backgroundColor: COLOR_VC }}
              className="px-2 py-[3px] text-white"
            >
              <div className="flex items-center gap-1.5">
                <img src={nvcIcon} alt="" className="w-4 h-4 object-contain shrink-0" />
                <span className="font-bold text-[11.5px] sm:text-[12px] tracking-wider uppercase text-white">
                  NUESTRA VIDA CRISTIANA
                </span>
              </div>
            </td>
            <td className="py-[3px]"></td>
            <td className="py-[3px]"></td>
          </tr>

          {/* Canción de Vida Cristiana */}
          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.vc.cancion}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px]">
              <span className="inline-block mr-1.5 text-[9px] leading-none select-none" style={{ color: COLOR_VC }}>●</span>
              <span className="font-bold">Canción {semana.can_vc || ''}</span>
            </td>
            <td className="py-[2.5px]"></td>
            <td className="py-[2.5px]"></td>
          </tr>

          {/* Filas dinámicas de VC (máximo 2) */}
          {vcNumeradas.map((v, idx) => {
            const horaLabel = horarios.vc.partesHoras[idx] || (idx === 0 ? '7:50' : v.hora_inicio ? formatHora12(v.hora_inicio) : '8:XX')
            const duracionLabel = v.duracion_min ? `${v.duracion_min} mins.` : 'XX mins.'

            return (
              <tr key={v.numero}>
                <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
                  {horaLabel}
                </td>
                <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug">
                  {v.numero}. {v.titulo} <span className="text-[11.5px] text-zinc-600 font-normal">({duracionLabel})</span>
                </td>
                <td className="py-[2.5px]">
                  <div className="text-right font-bold text-[10.5px] text-zinc-600">
                    Conductor:
                  </div>
                </td>
                <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
                  {abreviarNombre(v.cond, 26)}
                </td>
              </tr>
            )
          })}

          {/* Estudio Bíblico de la Congregación */}
          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.vc.ebcHora || (semana.ebc_hora_inicio ? formatHora12(semana.ebc_hora_inicio) : '8:XX')}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px] leading-snug">
              {numeroEBC}. Estudio bíblico de la congregación <span className="text-[11.5px] text-zinc-600 font-normal">(30 mins.)</span>
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Conductor/Lector:
              </div>
            </td>
            <td className={`py-[2.5px] text-left font-normal ${semana.ebc_cond && semana.ebc_lect ? 'text-[12px] sm:text-[12.5px]' : 'text-[13px] sm:text-[13.5px]'} text-zinc-950 pl-2`}>
              {semana.ebc_cond || semana.ebc_lect ? (
                formatearParParticipantes(semana.ebc_cond, semana.ebc_lect, 28)
              ) : (
                ' / '
              )}
            </td>
          </tr>

          {/* Palabras de conclusión */}
          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.cierre.conclu}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px]">
              <span className="inline-block mr-1.5 text-[9px] leading-none select-none" style={{ color: COLOR_VC }}>●</span>
              <span>Palabras de conclusión (3 min.)</span>
            </td>
            <td className="py-[2.5px]"></td>
            <td className="py-[2.5px]"></td>
          </tr>

          {/* Canción y oración final */}
          <tr>
            <td className="py-[2.5px] text-left font-bold text-[11.5px] text-zinc-700">
              {horarios.cierre.cancion}
            </td>
            <td className="py-[2.5px] text-zinc-950 text-[13px] sm:text-[13.5px]">
              <span className="inline-block mr-1.5 text-[9px] leading-none select-none" style={{ color: COLOR_VC }}>●</span>
              <span className="font-bold">Canción {semana.can_ci || ''}</span>
            </td>
            <td className="py-[2.5px]">
              <div className="text-right font-bold text-[10.5px] text-zinc-600">
                Oración:
              </div>
            </td>
            <td className="py-[2.5px] text-left font-normal text-[13px] sm:text-[13.5px] text-zinc-950 pl-2">
              {abreviarNombre(semana.oracion_ci, 26)}
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
    <div id="s140-print-root" className="s140-root s140-fuente-cuerpo">
      {paginas.map(([semana1, semana2], idx) => {
        const esUltima = idx === paginas.length - 1

        return (
          <React.Fragment key={idx}>
            <div className="s140-pagina flex flex-col justify-between">
              <div>
                <PageHeader nombreCongregacion={nombreCongregacion} />

                <div className="flex flex-col justify-start gap-6 sm:gap-7">
                  <SemanaBloque semana={semana1} />

                  {semana2 ? (
                    <SemanaBloque semana={semana2} />
                  ) : (
                    /* Si el total de semanas es impar, la mitad inferior queda vacía sin filas falsas */
                    <div className="flex-1 min-h-[140px] pointer-events-none" />
                  )}
                </div>
              </div>

              {/* Pie de página oficial S-140 */}
              <div className="pt-2 text-left select-none">
                <span className="text-[10px] text-zinc-500 font-normal tracking-tight">S-140-S 11/23</span>
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
