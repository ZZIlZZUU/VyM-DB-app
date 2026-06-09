// ============================================================
// epubParser.js — Parser del EPUB mwb para extraer semanas
// Usa JSZip para descomprimir y DOMParser para leer el HTML
// ============================================================

// Horarios fijos de Tesoros (siempre iguales)
const HORARIOS_TB = [
  { inicio: '19:00', fin: '19:10' }, // TB principal 10 min
  { inicio: '19:10', fin: '19:20' }, // Perlas 10 min
  { inicio: '19:20', fin: '19:24' }, // Lectura 4 min
]

// VC siempre empieza a las 19:45
const VC_START_MINUTES = 19 * 60 + 45
  
  function minutesToTime(totalMinutes) {
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  
  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }
  
  // Calcular horarios de SMT en base a las duraciones
  function calcularHorariosSMT(partesSMT) {
    let cursor = timeToMinutes('19:25') // SMT empieza en 19:25
    return partesSMT.map(p => {
      const inicio = minutesToTime(cursor)
      const dur = p.duracion_min || 5
      cursor += dur + 1 // +1 minuto de transición
      const fin = minutesToTime(cursor - 1)
      return { ...p, hora_inicio: inicio, hora_fin: fin }
    })
  }
  
  // Calcular horarios de VC
  function calcularHorariosVC(partesVC) {
    let cursor = VC_START_MINUTES
    return partesVC.map(p => {
      const inicio = minutesToTime(cursor)
      const dur = p.duracion_min || 15
      cursor += dur + 1
      const fin = minutesToTime(cursor - 1)
      return { ...p, hora_inicio: inicio, hora_fin: fin }
    })
  }
  
  // Identificar tipo de asignación SMT por título
  function inferirTipoSMT() {
  return 'SMT_EST' // tipo provisional, se corrige al hacer push
}
  
  // Identificar tipo VC por título
  function inferirTipoVC(titulo) {
    const t = titulo.toLowerCase()
    if (t.includes('estudio b') || t.includes('estudio biblico') || t.includes('estudio bíblico')) return 'EBC_CON'
    if (t.includes('necesidades')) return 'NC'
    return 'VC'
  }
  
  // Parser principal de un archivo xhtml de semana
  function parsearSemana(xhtmlString) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xhtmlString, 'text/html')
  
    const result = {
      fechas_raw: '',
      fecha_inicio: null,
      fecha_fin: null,
      capitulo_biblico: '',
      cancion_apertura: null,
      cancion_vc: null,
      cancion_cierre: null,
      partes: [],
    }
  
    // Fechas y capítulo
    const h1 = doc.querySelector('h1')
    const h2 = doc.querySelector('h2')
    result.fechas_raw = h1?.textContent?.trim() || ''
    result.capitulo_biblico = h2?.textContent?.trim() || ''
  
    // Parsear fechas → fecha_inicio y fecha_fin
    // Formato: "6-12 DE JULIO" o "27 DE JULIO A 2 DE AGOSTO"
    const fechasParsed = parsearFechas(result.fechas_raw)
    result.fecha_inicio = fechasParsed.inicio
    result.fecha_fin    = fechasParsed.fin

    const headings = doc.querySelectorAll('h3,h4,h5,h6')
    const canciones = []
    const partesTB  = []
    const partesSMT = []
    const partesVC  = []

    function inferirPartePorTexto(titulo, classes) {
      const lower = titulo.toLowerCase()
      const useTeal  = classes.includes('teal')
      const useGold  = classes.includes('gold')
      const useMaroon = classes.includes('maroon')

      if (useTeal || lower.includes('tesoros') || lower.includes('perlas') || lower.includes('lectura')) {
        let tipo = 'TB'
        if (lower.includes('perlas') || lower.includes('busquemos')) tipo = 'PE'
        else if (lower.includes('lectura')) tipo = 'LB'
        return { seccion: 'TB', tipo, requiere_ayudante: false }
      }

      if (useGold || 
          lower.includes('seamos') || 
          lower.includes('mejores maestros') || 
          lower.includes('discurso') || 
          lower.includes('empiece') ||       // ← agregar
          lower.includes('haga revisitas') || // ← agregar
          lower.includes('haga disc') ||      // ← agregar (discípulos/discurso)
          lower.includes('explique') ||       // ← agregar
          lower.includes('estudiante') || 
          lower.includes('ayudante')) {
        const tipo = inferirTipoSMT()  // siempre 'SMT_EST' provisional
        return { seccion: 'SMT', tipo, requiere_ayudante: false } // requiere_ayudante también se corrige en push
      }

      if (useMaroon || lower.includes('vida cristiana') || lower.includes('necesidades') || lower.includes('ebc') || lower.includes('estudio b')) {
        const tipo = inferirTipoVC(titulo)
        return { seccion: 'VC', tipo, requiere_ayudante: tipo === 'SMT_EST' }
      }

      if (/presidente|oraci[oó]n|introducci[oó]n|conclusi[oó]n/.test(lower)) {
        if (lower.includes('apertura')) return { seccion: 'APERTURA', tipo: lower.includes('oraci') ? 'ORACION' : lower.includes('presidente') ? 'P' : lower.includes('introduc') ? 'INTRO' : 'P', requiere_ayudante: false }
        if (lower.includes('cierre')) return { seccion: 'CIERRE', tipo: lower.includes('oraci') ? 'ORACION_C' : 'CONCLU', requiere_ayudante: false }
      }

      return null
    }

    headings.forEach(heading => {
      const classes = heading.className || ''
      const txt = heading.textContent?.trim() || ''

      // Canciones
      if (classes.includes('music') || /canci[oó]n/i.test(txt) || txt.toLowerCase().includes('cancion')) {
        const m = txt.match(/Canci[oó]n\s+(\d+)/i)
        if (m) canciones.push(parseInt(m[1], 10))

        if (txt.toLowerCase().includes('conclusi')) {
          const mc = txt.match(/Canci[oó]n\s+(\d+)/i)
          if (mc) canciones.push(parseInt(mc[1], 10))
        }
        return
      }

      // Obtener duración del siguiente div hermano
      let duracion = null
      const nextDiv = heading.nextElementSibling
      if (nextDiv) {
        const dm = nextDiv.textContent?.match(/\((\d+)\s*min/)
        if (dm) duracion = parseInt(dm[1], 10)
      }
      if (!duracion) {
        const dm = txt.match(/\((\d+)\s*min/)
        if (dm) duracion = parseInt(dm[1], 10)
      }

      const titulo = txt.replace(/^\d+\.\s*/, '').replace(/\s*\(\d+\s*mins?\.?\)/i, '').trim()
      if (!titulo) return

      const info = inferirPartePorTexto(titulo, classes)
      if (!info) return

      const parte = { titulo, duracion_min: duracion, seccion: info.seccion, tipo: info.tipo, requiere_ayudante: info.requiere_ayudante }

      if (info.seccion === 'TB') {
        partesTB.push(parte)
      } else if (info.seccion === 'SMT') {
        if (parte.tipo === 'EBC_CON') {
          partesVC.push({ ...parte, tipo: 'EBC_CON' })
          partesVC.push({ ...parte, titulo: 'Lector — ' + titulo, duracion_min: null, tipo: 'EBC_LEC', requiere_ayudante: false })
        } else {
          if (partesSMT.length < 4) {
            const t = parte.titulo.toLowerCase()
            const esSMT_EST =
              t.includes('empiece conversaciones') ||
              t.includes('haga revisitas') ||
              t.includes('explique sus creencias') ||
              t.includes('haga discípulos') ||    // por si aparece
              t.includes('haga discipulos')       // sin tilde por si acaso

            const tipoCorregido = esSMT_EST ? 'SMT_EST' : 'SMT_DSC'
            partesSMT.push({
              ...parte,
              tipo: tipoCorregido,
              requiere_ayudante: tipoCorregido === 'SMT_EST',
            })
          }
        }
      } else if (info.seccion === 'VC') {
        if (parte.tipo === 'EBC_CON') {
          partesVC.push({ ...parte, tipo: 'EBC_CON' })
          partesVC.push({ ...parte, titulo: 'Lector — ' + titulo, duracion_min: null, tipo: 'EBC_LEC', requiere_ayudante: false })
        } else {
          partesVC.push(parte)
        }
      } else if (info.seccion === 'APERTURA') {
        partesTB.unshift(parte)
      } else if (info.seccion === 'CIERRE') {
        partesVC.push(parte)
      }
    })

    // Asignar canciones
    result.cancion_apertura = canciones[0] || null
    result.cancion_vc       = canciones[1] || null
    result.cancion_cierre   = canciones[2] || null

    // Asignar horarios fijos a TB
    const partesTBConHorario = partesTB.map((p, i) => ({
      ...p,
      hora_inicio: HORARIOS_TB[i]?.inicio || null,
      hora_fin:    HORARIOS_TB[i]?.fin    || null,
    }))

    // Calcular horarios SMT y VC
    const partesSMTConHorario = calcularHorariosSMT(partesSMT)

    // Rellenar SMT hasta 4 slots con partes vacías
    while (partesSMTConHorario.length < 4) {
      partesSMTConHorario.push({
        titulo: '',
        duracion_min: null,
        seccion: 'SMT',
        tipo: 'SMT_VACIO',
        requiere_ayudante: false,
        hora_inicio: null,
        hora_fin: null,
      })
    }

    const partesVCConHorario  = calcularHorariosVC(partesVC)

    // Armar partes de apertura y cierre
    const apertura = [
      { titulo: 'Presidente', tipo: 'P', seccion: 'APERTURA', duracion_min: null, hora_inicio: '19:00', hora_fin: null, requiere_ayudante: false },
      { titulo: 'Oración de apertura', tipo: 'ORACION', seccion: 'APERTURA', duracion_min: null, hora_inicio: '19:00', hora_fin: null, requiere_ayudante: false },
    ]
    const cierre = [
      { titulo: 'Palabras de conclusión', tipo: 'CONCLU', seccion: 'CIERRE', duracion_min: 3, hora_inicio: '20:37', hora_fin: '20:40', requiere_ayudante: false },
      { titulo: 'Oración de cierre', tipo: 'ORACION_C', seccion: 'CIERRE', duracion_min: null, hora_inicio: '20:40', hora_fin: null, requiere_ayudante: false },
    ]

    result.partes = [
      ...apertura,
      ...partesTBConHorario,
      ...partesSMTConHorario,
      ...partesVCConHorario,
      ...cierre,
    ].map((p, index) => ({ ...p, numero_parte: index + 1 }))

    return result
  }

  // Parsear rango de fechas del encabezado
  // Formatos: "6-12 DE JULIO", "27 DE JULIO A 2 DE AGOSTO", "31 DE AGOSTO A 6 DE SEPTIEMBRE"
  const MESES_ES = {
    'ENERO':1,'FEBRERO':2,'MARZO':3,'ABRIL':4,'MAYO':5,'JUNIO':6,
    'JULIO':7,'AGOSTO':8,'SEPTIEMBRE':9,'OCTUBRE':10,'NOVIEMBRE':11,'DICIEMBRE':12
  }
  
  function parsearFechas(texto) {
    const t = texto.toUpperCase().trim()
    const anio = new Date().getFullYear()
  
    // Formato: "27 DE JULIO A 2 DE AGOSTO"
    const m2 = t.match(/(\d+)\s+DE\s+(\w+)\s+A\s+(\d+)\s+DE\s+(\w+)/)
    if (m2) {
      const d1 = parseInt(m2[1]), mes1 = MESES_ES[m2[2]] || 1
      const d2 = parseInt(m2[3]), mes2 = MESES_ES[m2[4]] || 1
      const anio2 = mes2 < mes1 ? anio + 1 : anio
      return {
        inicio: `${anio}-${String(mes1).padStart(2,'0')}-${String(d1).padStart(2,'0')}`,
        fin:    `${anio2}-${String(mes2).padStart(2,'0')}-${String(d2).padStart(2,'0')}`,
      }
    }
  
    // Formato: "6-12 DE JULIO"
    const m1 = t.match(/(\d+)-(\d+)\s+DE\s+(\w+)/)
    if (m1) {
      const d1 = parseInt(m1[1]), d2 = parseInt(m1[2]), mes = MESES_ES[m1[3]] || 1
      return {
        inicio: `${anio}-${String(mes).padStart(2,'0')}-${String(d1).padStart(2,'0')}`,
        fin:    `${anio}-${String(mes).padStart(2,'0')}-${String(d2).padStart(2,'0')}`,
      }
    }
  
    return { inicio: null, fin: null }
  }
  
  // ============================================================
  // Función principal exportada: recibe el File del input
  // Devuelve array de semanas listas para insertar en Supabase
  // ============================================================
  export async function parsearEPUB(file) {
    // Importar JSZip dinámicamente
    const JSZip = (await import('jszip')).default
  
    const zip = await JSZip.loadAsync(file)
  
    // Leer el OPF para obtener el orden de los archivos
    const opfFile = Object.keys(zip.files).find(f => f.endsWith('.opf'))
    if (!opfFile) throw new Error('No se encontró el archivo OPF en el EPUB')
  
    const opfContent = await zip.files[opfFile].async('string')
    const opfParser  = new DOMParser()
    const opfDoc     = opfParser.parseFromString(opfContent, 'text/xml')
  
    // Obtener spine (orden de lectura)
    const spineItems = Array.from(opfDoc.querySelectorAll('spine itemref'))
      .map(item => item.getAttribute('idref'))
  
    // Obtener manifest (id → href)
    const manifest = {}
    opfDoc.querySelectorAll('manifest item').forEach(item => {
      manifest[item.getAttribute('id')] = item.getAttribute('href')
    })
  
    // Directorio base del OPF
    const opfDir = opfFile.includes('/') ? opfFile.substring(0, opfFile.lastIndexOf('/') + 1) : ''
  
    // Filtrar solo archivos de artículos de semana (excluir portada, índice, etc.)
    // Los artículos de semana tienen estructura con h1 de fechas
    const semanas = []
    let numero = 0
  
    for (const idref of spineItems) {
      const href = manifest[idref]
      if (!href) continue
  
      const fullPath = opfDir + href
      const zipFile  = zip.files[fullPath] || zip.files[href]
      if (!zipFile) continue
  
      const content = await zipFile.async('string')
  
      // Solo procesar si tiene h1 con rango de fechas (patrón: número + "DE" + mes)
      if (!/\d+.*DE\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)/i.test(content)) continue
  
      numero++
      const semana = parsearSemana(content, numero)
      if (semana.fecha_inicio) {
        semanas.push(semana)
      }
    }
  
    return semanas
  }