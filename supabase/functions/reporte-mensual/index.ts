import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPO_LABEL: Record<string, string> = {
  T: 'Titular',
  A: 'Asistente',
  X: 'Participación',
  LB: 'Lectura Bíblica',
  P: 'Presidente',
  TB: 'Tesoros',
  PE: 'Perlas',
  SMT_DSC: 'Discurso',
  EBC: 'Est. Bíblico',
  LEBC: 'Lector EBC',
  VC: 'Vida Cristiana',
  NC: 'Nec. Congr.',
  ORACION_C: 'Oración conclusión',
}

function formatMesYYYYMM(mesStr: string): string {
  if (!mesStr || mesStr.length < 6) return mesStr || ''
  const y = mesStr.slice(0, 4)
  const mIndex = parseInt(mesStr.slice(4, 6), 10) - 1
  const nombreMes = MESES[mIndex] || mesStr.slice(4, 6)
  return `${nombreMes} ${y}`
}

function getMesAnteriorDefault(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() // 0-indexed: mes actual (0 = Enero, etc.)
  if (m === 0) {
    return `${y - 1}12`
  }
  return `${y}${String(m).padStart(2, '0')}`
}

function escapeCSV(val: any): string {
  if (val == null) return ''
  const str = String(val)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function construirCSV(mes: string, participaciones: any[], personas: any[]): {
  csv: string
  totalParticipaciones: number
  totalPersonas: number
} {
  const personasMap = new Map<string, any>()
  personas.forEach(p => {
    if (p.clave) personasMap.set(p.clave, p)
  })

  // Normalizar y ordenar
  const filas = participaciones.map(r => {
    const p = r.clave ? personasMap.get(r.clave) : null
    const nombre = r.nombre || p?.nombre || 'Sin nombre'
    const lista = r.lista || p?.lista || 'Mat'
    const tipo = r.tipo || r.tipo_asignacion || 'X'
    const tipoLabel = TIPO_LABEL[tipo] || tipo
    const fecha = String(r.fecha || '').slice(0, 10)
    const observaciones = r.observaciones || ''

    return {
      clave: r.clave || '',
      nombre,
      lista,
      fecha,
      tipo,
      tipoLabel,
      observaciones,
    }
  })

  filas.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
    return a.nombre.localeCompare(b.nombre, 'es')
  })

  const totalParticipaciones = filas.length
  const personasUnicas = new Set(filas.map(f => f.clave || f.nombre.toLowerCase()))
  const totalPersonas = personasUnicas.size

  const resumenListas: Record<string, number> = {}
  const resumenTipos: Record<string, number> = {}
  const conteoPorPersona: Record<string, number> = {}

  filas.forEach(f => {
    resumenListas[f.lista] = (resumenListas[f.lista] || 0) + 1
    const keyTipo = `${f.tipoLabel} (${f.tipo})`
    resumenTipos[keyTipo] = (resumenTipos[keyTipo] || 0) + 1
    const keyPersona = `${f.nombre} [${f.lista}]`
    conteoPorPersona[keyPersona] = (conteoPorPersona[keyPersona] || 0) + 1
  })

  const fechaGenStr = new Date().toISOString().replace('T', ' ').slice(0, 19)

  const lineasComentario = [
    `# ============================================================`,
    `# REPORTE MENSUAL DE PARTICIPACIONES — ${formatMesYYYYMM(mes).toUpperCase()}`,
    `# Mes: ${mes}`,
    `# Generado: ${fechaGenStr}`,
    `#`,
    `# RESUMEN GENERAL:`,
    `# Total participaciones: ${totalParticipaciones}`,
    `# Total personas participantes: ${totalPersonas}`,
    `#`,
    `# TOTALES POR LISTA:`,
  ]

  Object.entries(resumenListas).forEach(([lista, cant]) => {
    lineasComentario.push(`# - Total ${lista}: ${cant}`)
  })

  lineasComentario.push(`#`)
  lineasComentario.push(`# TOTALES POR TIPO DE ASIGNACIÓN:`)
  Object.entries(resumenTipos)
    .sort((a, b) => b[1] - a[1])
    .forEach(([tipoStr, cant]) => {
      lineasComentario.push(`# - ${tipoStr}: ${cant}`)
    })

  lineasComentario.push(`#`)
  lineasComentario.push(`# PARTICIPACIONES POR PERSONA:`)
  Object.entries(conteoPorPersona)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
    .forEach(([personaStr, cant]) => {
      lineasComentario.push(`# - ${personaStr}: ${cant}`)
    })

  lineasComentario.push(`# ============================================================`)

  const cabecerasCSV = 'Nombre,Lista,Fecha,Tipo,Observaciones'
  const filasCSV = filas.map(f =>
    [
      escapeCSV(f.nombre),
      escapeCSV(f.lista),
      escapeCSV(f.fecha),
      escapeCSV(f.tipoLabel),
      escapeCSV(f.observaciones),
    ].join(',')
  )

  const BOM = '\uFEFF'
  const csv = [
    BOM + lineasComentario.join('\n'),
    cabecerasCSV,
    ...filasCSV,
  ].join('\n')

  return {
    csv,
    totalParticipaciones,
    totalPersonas,
  }
}

Deno.serve(async req => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Validar token del llamador
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    const isServiceKey = authHeader.includes(supabaseServiceKey)
    if (!isServiceKey && (callerErr || !caller)) {
      return new Response(JSON.stringify({ error: 'Token de autenticación inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cliente administrativo
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}))
    }

    const mesInput = body?.mes
    const mes = mesInput && /^\d{6}$/.test(String(mesInput)) ? String(mesInput) : getMesAnteriorDefault()

    // 1. Verificar si ya existe en reportes_mensuales
    const { data: existing } = await adminClient
      .from('reportes_mensuales')
      .select('*')
      .eq('mes', mes)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({
          status: 'already_exists',
          reporte: existing,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 2. Consultar participaciones del mes
    const y = parseInt(mes.slice(0, 4), 10)
    const m = parseInt(mes.slice(4, 6), 10)
    const startFecha = `${y}-${String(m).padStart(2, '0')}-01`
    const nextY = m === 12 ? y + 1 : y
    const nextM = m === 12 ? 1 : m + 1
    const endFecha = `${nextY}-${String(nextM).padStart(2, '0')}-01`

    const [partRes, perRes] = await Promise.all([
      adminClient
        .from('participaciones')
        .select('*')
        .gte('fecha', startFecha)
        .lt('fecha', endFecha)
        .order('fecha', { ascending: true })
        .order('nombre', { ascending: true }),
      adminClient.from('personas').select('clave, nombre, lista'),
    ])

    if (partRes.error) throw partRes.error
    const participaciones = partRes.data || []
    const personas = perRes.data || []

    // 3. Construir el CSV
    const { csv, totalParticipaciones, totalPersonas } = construirCSV(
      mes,
      participaciones,
      personas
    )

    // 4. Subir a Supabase Storage: backups/reportes/{YYYYMM}_reporte.csv
    const filename = `${mes}_reporte.csv`
    const pathInBucket = `reportes/${filename}`
    const urlStorage = `backups/${pathInBucket}`

    const { error: uploadErr } = await adminClient.storage
      .from('backups')
      .upload(
        pathInBucket,
        new Blob([csv], { type: 'text/csv; charset=utf-8' }),
        {
          contentType: 'text/csv; charset=utf-8',
          upsert: true,
        }
      )

    if (uploadErr) throw uploadErr

    // 5. Registrar en reportes_mensuales y en backups_disponibles en paralelo
    const [insRep, insBack] = await Promise.all([
      adminClient
        .from('reportes_mensuales')
        .upsert(
          {
            mes,
            url_storage: urlStorage,
            total_participaciones: totalParticipaciones,
            total_personas: totalPersonas,
            generado_en: new Date().toISOString(),
          },
          { onConflict: 'mes' }
        )
        .select()
        .single(),
      adminClient
        .from('backups_disponibles')
        .insert({
          filename,
          formato: 'csv',
          url_storage: urlStorage,
          generado_por: caller?.id || null,
        })
        .select()
        .single(),
    ])

    if (insRep.error) throw insRep.error
    if (insBack.error) {
      console.warn('Aviso registrando en backups_disponibles:', insBack.error)
    }

    // 6. Responder
    return new Response(
      JSON.stringify({
        status: 'generated',
        reporte: insRep.data || {
          mes,
          url_storage: urlStorage,
          total_participaciones: totalParticipaciones,
          total_personas: totalPersonas,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('[reporte-mensual Error]:', err)
    return new Response(
      JSON.stringify({ error: err?.message || 'Error interno al generar reporte mensual' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
