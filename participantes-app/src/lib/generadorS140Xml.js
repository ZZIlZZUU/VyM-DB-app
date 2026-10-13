// src/lib/generadorS140Xml.js — Generador nativo OpenXML para el formulario S-140 (.docx)
import { obtenerHorariosS140, formatHora12 } from './horarios.js'
import { abreviarNombre, formatearParParticipantes } from './nombres.js'

// ── Helpers de fecha y texto para el S-140 ──────────────────
export const MESES_S140 = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const CONECTORES_MINUSCULA = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'a', 'al', 'y', 'en'])

// Sangría de espacios de no separación (NBSP) para que Word XML no colapse el espacio entre fecha y capítulos
export const SANGRIA_FECHA_CAPITULO = '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'

/**
 * Calcula el día exacto de la reunión de entre semana (Martes por defecto,
 * o `fechaEfectiva` si la reunión fue desplazada) y lo formatea como "3 de Noviembre".
 */
export function formatearFechaReunionMartes(fechaInicio, fechaEfectiva = null) {
  const targetStr = String(fechaEfectiva || fechaInicio || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetStr)) {
    return String(fechaInicio || '').trim()
  }

  const [y, m, d] = targetStr.split('-').map(Number)
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  if (isNaN(utcDate.getTime())) return targetStr

  // Si no hay fecha efectiva explícita, calcular el martes de esa semana a partir de fecha_inicio (lunes)
  if (!fechaEfectiva) {
    const dayOfWeek = utcDate.getUTCDay() // 0 = Dom, 1 = Lun, 2 = Mar...
    const offsetToTuesday = dayOfWeek === 1 ? 1 : (2 - dayOfWeek + 7) % 7
    utcDate.setUTCDate(utcDate.getUTCDate() + offsetToTuesday)
  }

  const dia = utcDate.getUTCDate()
  const mesNombre = MESES_S140[utcDate.getUTCMonth()] || ''
  return `${dia} de ${mesNombre}`
}

/**
 * Formatea los capítulos bíblicos de la semana (ej: "JEREMÍAS 49, 50" → "Jeremías 49, 50").
 */
export function formatearCapituloBiblico(raw) {
  if (!raw) return ''
  const limpio = String(raw).trim().replace(/\s+/g, ' ')
  if (!limpio) return ''

  if (limpio === limpio.toUpperCase()) {
    return limpio
      .toLowerCase()
      .split(' ')
      .map((pal, idx) => {
        if (idx > 0 && CONECTORES_MINUSCULA.has(pal)) return pal
        return pal.replace(/^([a-záéíóúüñ])/i, c => c.toUpperCase())
      })
      .join(' ')
  }

  return limpio
}

/**
 * Construye el texto completo del encabezado de semana para el S-140 (.docx):
 * Ej: "3 de Noviembre      Jeremías 49, 50"
 */
export function formatearEncabezadoFechaS140(fechaInicio, capituloBiblico, fechaEfectiva = null) {
  const fechaMartes = formatearFechaReunionMartes(fechaInicio, fechaEfectiva)
  const capitulo = formatearCapituloBiblico(capituloBiblico)
  if (!fechaMartes) return capitulo
  if (!capitulo) return fechaMartes
  return `${fechaMartes}${SANGRIA_FECHA_CAPITULO}${capitulo}`
}

// Colores institucionales estándar S-140 (coincidentes con S140Vista.jsx)
export const COLOR_TB = '3A7E89'
export const COLOR_SMT = 'D58E00'
export const COLOR_VC = 'BE2D11'
export const COLOR_TEXTO_GRIS = '575A5D'

/**
 * Escapa caracteres especiales para texto válido en OpenXML.
 */
export function xmlEscape(str = '') {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Genera el encabezado institucional para cada página física de Word:
 * - Izquierda: Nombre de la congregación (14 pt, negrita)
 * - Derecha: "Programa para la reunión de entre semana" (16.5 pt, Cambria, negrita)
 * - Línea divisoria inferior doble (thinThickSmallGap)
 */
function generarFilaEncabezadoPagina(congregacion) {
  const congEscapada = xmlEscape(congregacion || 'Congregación')
  return `<w:tr w:rsidR="00774CAF" w:rsidRPr="00774CAF">
  <w:trPr><w:cantSplit/></w:trPr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="3225" w:type="dxa"/>
      <w:gridSpan w:val="3"/>
      <w:tcBorders><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="${COLOR_TEXTO_GRIS}"/></w:tcBorders>
      <w:vAlign w:val="bottom"/>
    </w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="60" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:bCs/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
        <w:t>${congEscapada}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="6735" w:type="dxa"/>
      <w:gridSpan w:val="3"/>
      <w:tcBorders><w:bottom w:val="thinThickSmallGap" w:sz="18" w:space="0" w:color="${COLOR_TEXTO_GRIS}"/></w:tcBorders>
      <w:vAlign w:val="bottom"/>
    </w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="60" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="right"/>
        <w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="33"/><w:szCs w:val="33"/><w:lang w:val="es-ES"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="33"/><w:szCs w:val="33"/><w:lang w:val="es-ES"/></w:rPr>
        <w:t>Programa para la reunión de entre semana</w:t>
      </w:r>
    </w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila espaciadora de altura fija sin bordes.
 */
function generarFilaEspaciador(valDxa = 144) {
  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:hRule="exact" w:val="${valDxa}"/></w:trPr>
  <w:tc>
    <w:tcPr><w:tcW w:w="9960" w:type="dxa"/><w:gridSpan w:val="6"/></w:tcPr>
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila de encabezado de semana: Fecha de la reunión + Capítulos bíblicos a la izquierda y Presidente a la derecha.
 */
function generarFilaFechaPresidente(fechaTexto, capituloTexto, presidente, esDesplazada = false) {
  const presAbreviado = abreviarNombre(presidente, 26)
  const fechaEsc = xmlEscape(fechaTexto)
  const capEsc = xmlEscape(capituloTexto)
  const presEsc = xmlEscape(presAbreviado)

  let textoColIzq = fechaEsc
  if (capEsc) {
    textoColIzq += `${SANGRIA_FECHA_CAPITULO}${capEsc}`
  }
  if (esDesplazada) {
    textoColIzq += ` (Reunión desplazada)`
  }

  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr><w:tcW w:w="4935" w:type="dxa"/><w:gridSpan w:val="4"/><w:vAlign w:val="bottom"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
        <w:t xml:space="preserve">${textoColIzq}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1684" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="right"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t>Presidente:</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="3341" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr>
        <w:t>${presEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila de Canción + Oración (apertura o cierre).
 */
function generarFilaCancionOracion(hora, numCancion, oracionista, colorHex) {
  const oracionAbreviada = abreviarNombre(oracionista, 26)
  const horaEsc = xmlEscape(hora)
  const cancionEsc = xmlEscape(numCancion || '')
  const oracionEsc = xmlEscape(oracionAbreviada)

  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr><w:tcW w:w="632" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>${horaEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4303" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r>
        <w:rPr><w:color w:val="${colorHex}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t xml:space="preserve">● </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t>Canción ${cancionEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1684" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="right"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t>Oración:</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="3341" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr>
        <w:t>${oracionEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila de Palabras de introducción o conclusión de 1 o 3 minutos.
 */
function generarFilaPalabrasPunto(hora, texto, colorHex) {
  const horaEsc = xmlEscape(hora)
  const textoEsc = xmlEscape(texto)

  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr><w:tcW w:w="632" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>${horaEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4303" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r>
        <w:rPr><w:color w:val="${colorHex}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t xml:space="preserve">● </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t>${textoEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="5025" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila de encabezado de sección institucional (TESOROS, MAESTROS, VIDA CRISTIANA).
 */
function generarFilaBannerSeccion(titulo, colorHex, auditorio = true) {
  const titEsc = xmlEscape(titulo)

  if (auditorio) {
    return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="4935" w:type="dxa"/>
      <w:gridSpan w:val="4"/>
      <w:shd w:val="clear" w:color="auto" w:fill="${colorHex}"/>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="FFFFFF" w:themeColor="background1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
        <w:t>${titEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1684" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="3341" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t>Auditorio principal</w:t>
      </w:r>
    </w:p>
  </w:tc>
</w:tr>`
  }

  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="4935" w:type="dxa"/>
      <w:gridSpan w:val="4"/>
      <w:shd w:val="clear" w:color="auto" w:fill="${colorHex}"/>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="FFFFFF" w:themeColor="background1"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>
        <w:t>${titEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="5025" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila dinámica de parte (Tesoros, SMT, VC, EBC):
 * Contiene hora calculada, número correlativo, título, duración, etiqueta de rol y nombre(s).
 */
function generarFilaParteDinamica({
  hora,
  numero,
  titulo,
  duracionTexto,
  rolLabel,
  participanteTexto,
  esPareja = false,
}) {
  const horaEsc = xmlEscape(hora)
  const numEsc = xmlEscape(numero)
  const titEsc = xmlEscape(titulo)
  const durEsc = xmlEscape(duracionTexto)
  const rolEsc = xmlEscape(rolLabel)
  const partEsc = xmlEscape(participanteTexto)

  // Para parejas de participantes (Estudiante/Ayudante o Conductor/Lector) usamos 10.5 pt (w:val="21")
  // para garantizar que los nombres no se dividan en dos renglones.
  const szVal = esPareja ? '21' : '23'

  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr><w:tcW w:w="632" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>${horaEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4303" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t xml:space="preserve">${numEsc}. ${titEsc} </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>(${durEsc})</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="1684" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="right"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t>${rolEsc}:</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="3341" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/></w:rPr>
        <w:t>${partEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
</w:tr>`
}

/**
 * Fila de Canción intermedia de Vida Cristiana (solo hora y número de canción).
 */
function generarFilaCancionVC(hora, numCancion) {
  const horaEsc = xmlEscape(hora)
  const cancionEsc = xmlEscape(numCancion || '')

  return `<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="288"/></w:trPr>
  <w:tc>
    <w:tcPr><w:tcW w:w="632" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>${horaEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="4303" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p>
      <w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r>
        <w:rPr><w:color w:val="${COLOR_VC}"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr>
        <w:t xml:space="preserve">● </w:t>
      </w:r>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
        <w:t>Canción ${cancionEsc}</w:t>
      </w:r>
    </w:p>
  </w:tc>
  <w:tc>
    <w:tcPr><w:tcW w:w="5025" w:type="dxa"/><w:gridSpan w:val="2"/><w:vAlign w:val="center"/></w:tcPr>
    <w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>
  </w:tc>
</w:tr>`
}

/**
 * Genera el bloque compacto de aviso oficial cuando la semana es Asamblea o Reunión Cancelada.
 */
function generarFilasAvisoOficial(semana, fechaTexto, capituloTexto) {
  const esAsamb = semana.esAsamblea
  const tituloEvento = semana.tb_titulo || (esAsamb ? 'ASAMBLEA DE CIRCUITO' : 'REUNIÓN CANCELADA')
  const subtitulo = esAsamb
    ? 'Evento Especial — Sin reunión ordinaria de entre semana'
    : 'Aviso Oficial'
  const desc = semana.evento?.descripcion || ''

  return `${generarFilaFechaPresidente(fechaTexto, capituloTexto, '', false)}
<w:tr>
  <w:tblPrEx><w:tblBorders><w:bottom w:val="nil"/></w:tblBorders></w:tblPrEx>
  <w:trPr><w:cantSplit/><w:trHeight w:val="1200"/></w:trPr>
  <w:tc>
    <w:tcPr>
      <w:tcW w:w="9960" w:type="dxa"/>
      <w:gridSpan w:val="6"/>
      <w:shd w:val="clear" w:color="auto" w:fill="${esAsamb ? 'F3EEF9' : 'F4F4F5'}"/>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:after="60" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:color w:val="${COLOR_TEXTO_GRIS}"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>${xmlEscape(subtitulo.toUpperCase())}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:after="60" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
        <w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>
        <w:t>${xmlEscape(tituloEvento)}</w:t>
      </w:r>
    </w:p>
    ${desc ? `<w:p>
      <w:pPr>
        <w:spacing w:after="0" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="center"/>
        <w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
      </w:pPr>
      <w:r>
        <w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
        <w:t>${xmlEscape(desc)}</w:t>
      </w:r>
    </w:p>` : ''}
  </w:tc>
</w:tr>`
}

/**
 * Genera el conjunto completo de filas OpenXML de una semana ordinaria.
 * Aplica:
 * - Omisión de filas vacías
 * - Numeración correlativa automática (4, 5, 6, 7, 8...)
 * - Horarios y duraciones reales calculados
 * - Abreviación inteligente de nombres
 */
export function generarFilasSemanaXml(semana, config = null) {
  if (!semana) return ''

  const fechaTexto = semana.fecha_reunion ||
    (semana.fecha_inicio
      ? formatearFechaReunionMartes(
          semana.fecha_inicio,
          semana.esDesplazada ? semana.fecha_efectiva : null
        )
      : '')

  const capituloTexto = formatearCapituloBiblico(semana.capitulo_biblico)

  // 1. Caso especial: Asamblea o Reunión Cancelada
  if (semana.esAsamblea || semana.esCancelada) {
    return generarFilasAvisoOficial(semana, fechaTexto, capituloTexto)
  }

  // 2. Horarios y filtrado de partes reales
  const horarios = obtenerHorariosS140(semana, config || '19:00')
  const smtPartes = (semana.smt || []).filter(p => p && p.titulo && String(p.titulo).trim() !== '').slice(0, 4)
  const vcPartes = (semana.vc || []).filter(p => p && p.titulo && String(p.titulo).trim() !== '').slice(0, 2)

  let numeroCorrelativo = 4

  const filas = []

  // Fila 1: Fecha de reunión + Capítulos + Presidente
  filas.push(
    generarFilaFechaPresidente(fechaTexto, capituloTexto, semana.presidente, semana.esDesplazada)
  )

  // Apertura: Canción y Oración
  filas.push(
    generarFilaCancionOracion(horarios.apertura.cancion, semana.can_ap, semana.oracion_ap, COLOR_TB)
  )

  // Palabras de introducción
  filas.push(
    generarFilaPalabrasPunto(horarios.apertura.intro, 'Palabras de introducción (1 min.)', COLOR_TB)
  )

  // Espaciador fino
  filas.push(generarFilaEspaciador(144))

  // ── SECCIÓN 1: TESOROS DE LA BIBLIA ──
  filas.push(generarFilaBannerSeccion('TESOROS DE LA BIBLIA', COLOR_TB, true))

  filas.push(
    generarFilaParteDinamica({
      hora: horarios.tb.discurso,
      numero: 1,
      titulo: semana.tb_titulo || 'Discurso de Tesoros',
      duracionTexto: '10 mins.',
      rolLabel: 'Conductor',
      participanteTexto: abreviarNombre(semana.tb_cond, 26),
      esPareja: false,
    })
  )

  filas.push(
    generarFilaParteDinamica({
      hora: horarios.tb.perlas,
      numero: 2,
      titulo: 'Busquemos perlas escondidas',
      duracionTexto: '10 mins.',
      rolLabel: 'Conductor',
      participanteTexto: abreviarNombre(semana.pe_cond, 26),
      esPareja: false,
    })
  )

  filas.push(
    generarFilaParteDinamica({
      hora: horarios.tb.lectura,
      numero: 3,
      titulo: 'Lectura de la Biblia',
      duracionTexto: '4 mins.',
      rolLabel: 'Estudiante',
      participanteTexto: abreviarNombre(semana.lb_est, 26),
      esPareja: false,
    })
  )

  filas.push(generarFilaEspaciador(144))

  // ── SECCIÓN 2: SEAMOS MEJORES MAESTROS ──
  filas.push(generarFilaBannerSeccion('SEAMOS MEJORES MAESTROS', COLOR_SMT, true))

  smtPartes.forEach((p, idx) => {
    const num = numeroCorrelativo++
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

    const rolLabel = tieneAyudante || !p.est ? 'Estudiante/Ayudante' : 'Estudiante'

    filas.push(
      generarFilaParteDinamica({
        hora: horaLabel,
        numero: num,
        titulo: p.titulo,
        duracionTexto: duracionLabel,
        rolLabel,
        participanteTexto,
        esPareja: tieneAyudante,
      })
    )
  })

  filas.push(generarFilaEspaciador(144))

  // ── SECCIÓN 3: NUESTRA VIDA CRISTIANA ──
  filas.push(generarFilaBannerSeccion('NUESTRA VIDA CRISTIANA', COLOR_VC, false))

  // Canción de Vida Cristiana
  filas.push(generarFilaCancionVC(horarios.vc.cancion, semana.can_vc))

  vcPartes.forEach((v, idx) => {
    const num = numeroCorrelativo++
    const horaLabel = horarios.vc.partesHoras[idx] || (idx === 0 ? '7:50' : v.hora_inicio ? formatHora12(v.hora_inicio) : '8:XX')
    const duracionLabel = v.duracion_min ? `${v.duracion_min} mins.` : 'XX mins.'

    filas.push(
      generarFilaParteDinamica({
        hora: horaLabel,
        numero: num,
        titulo: v.titulo,
        duracionTexto: duracionLabel,
        rolLabel: 'Conductor',
        participanteTexto: abreviarNombre(v.cond, 26),
        esPareja: false,
      })
    )
  })

  // Estudio Bíblico de la Congregación o Discurso de Servicio (Visita SC)
  const numEBC = numeroCorrelativo
  const horaEbc = horarios.vc.ebcHora || (semana.ebc_hora_inicio ? formatHora12(semana.ebc_hora_inicio) : '8:XX')

  if (semana.esVisitaSC) {
    filas.push(
      generarFilaParteDinamica({
        hora: horaEbc,
        numero: numEBC,
        titulo: 'Discurso de servicio',
        duracionTexto: '30 mins.',
        rolLabel: 'Discursante',
        participanteTexto: abreviarNombre(semana.ebc_cond || 'Superintendente de Circuito', 26),
        esPareja: false,
      })
    )
  } else {
    const tieneLector = Boolean(semana.ebc_lect && String(semana.ebc_lect).trim() !== '')
    let ebcPartTexto = ''
    if (semana.ebc_cond || semana.ebc_lect) {
      ebcPartTexto = formatearParParticipantes(semana.ebc_cond, semana.ebc_lect, 28)
    } else {
      ebcPartTexto = ' / '
    }

    filas.push(
      generarFilaParteDinamica({
        hora: horaEbc,
        numero: numEBC,
        titulo: 'Estudio bíblico de la congregación',
        duracionTexto: '30 mins.',
        rolLabel: 'Conductor/Lector',
        participanteTexto: ebcPartTexto,
        esPareja: tieneLector,
      })
    )
  }

  // Palabras de conclusión
  filas.push(
    generarFilaPalabrasPunto(horarios.cierre.conclu, 'Palabras de conclusión (3 min.)', COLOR_VC)
  )

  // Canción de cierre y oración final
  filas.push(
    generarFilaCancionOracion(horarios.cierre.cancion, semana.can_ci, semana.oracion_ci, COLOR_VC)
  )

  return filas.join('\n')
}

/**
 * Construye el OpenXML completo para el cuerpo de `word/document.xml`.
 * Agrupa las semanas en pares de 2 por hoja Letter con salto forzado `<w:pageBreakBefore/>`.
 */
export function generarDocumentoXml(semanas = [], congregacion = '', config = null) {
  if (!semanas || semanas.length === 0) {
    return `<w:tbl>
  <w:tblPr><w:tblW w:w="0" w:type="auto"/></w:tblPr>
  <w:tblGrid><w:gridCol w:w="9960"/></w:tblGrid>
  <w:tr><w:tc><w:tcPr><w:tcW w:w="9960" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>No hay semanas disponibles para generar el formulario S-140.</w:t></w:r></w:p></w:tc></w:tr>
</w:tbl>`
  }

  const paginas = []
  for (let i = 0; i < semanas.length; i += 2) {
    paginas.push([semanas[i], semanas[i + 1] || null])
  }

  const bloquesXml = []

  paginas.forEach(([semana1, semana2], idx) => {
    const esPrimeraPagina = idx === 0

    // Si no es la primera página, forzamos un salto de página duro antes de la siguiente hoja
    if (!esPrimeraPagina) {
      bloquesXml.push(
        `<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:p>`
      )
    }

    // Tabla física de la página
    const filasTabla = []

    // 1. Encabezado institucional de la página (Congregación + Título)
    filasTabla.push(generarFilaEncabezadoPagina(congregacion))
    filasTabla.push(generarFilaEspaciador(144))

    // 2. Primera semana de la página
    filasTabla.push(generarFilasSemanaXml(semana1, config))

    // 3. Segunda semana de la página (si existe)
    if (semana2) {
      // Espaciador entre las dos semanas de la misma página (360 dxa = 18 pt)
      filasTabla.push(generarFilaEspaciador(360))
      filasTabla.push(generarFilasSemanaXml(semana2, config))
    }

    const tablaXml = `<w:tbl>
  <w:tblPr>
    <w:tblStyle w:val="Tablaconcuadrcula1"/>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="617"/>
    <w:gridCol w:w="15"/>
    <w:gridCol w:w="2593"/>
    <w:gridCol w:w="1710"/>
    <w:gridCol w:w="1684"/>
    <w:gridCol w:w="3341"/>
  </w:tblGrid>
  ${filasTabla.join('\n')}
</w:tbl>`

    bloquesXml.push(tablaXml)
  })

  return bloquesXml.join('\n')
}

/**
 * Inyecta el XML generado dentro del archivo base ZIP (`S-140_plantilla.docx`),
 * conservando márgenes Letter, estilos, encabezados/pies institucionales y fuentes.
 */
export function crearDocxNativo({ PizZip, templateArrayBuffer, congregacion, semanas, config = null }) {
  const zip = new PizZip(templateArrayBuffer)
  const origXml = zip.file('word/document.xml')?.asText()

  if (!origXml) {
    throw new Error('El archivo de plantilla no contiene word/document.xml válido')
  }

  const bodyStartIdx = origXml.indexOf('<w:body>')
  if (bodyStartIdx === -1) {
    throw new Error('Estructura de documento Word inválida (sin <w:body>)')
  }

  const prefix = origXml.slice(0, bodyStartIdx + '<w:body>'.length)
  const sectPrMatch = origXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)
  const sectPr = sectPrMatch ? sectPrMatch[0] : ''

  const cuerpoDinamicoXml = generarDocumentoXml(semanas, congregacion, config)
  const nuevoDocumentXml = `${prefix}${cuerpoDinamicoXml}${sectPr}</w:body></w:document>`

  zip.file('word/document.xml', nuevoDocumentXml)
  return zip
}
