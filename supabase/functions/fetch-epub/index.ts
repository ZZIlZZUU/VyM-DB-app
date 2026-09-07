import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Normaliza un issue a formato bimestral YYYYMM con mes impar (01, 03, 05, 07, 09, 11)
function normalizarIssue(inputIssue?: string): string {
  if (inputIssue && /^\d{6}$/.test(inputIssue)) {
    const y = parseInt(inputIssue.slice(0, 4), 10)
    let m = parseInt(inputIssue.slice(4, 6), 10)
    if (m < 1) m = 1
    if (m > 12) m = 12
    if (m % 2 === 0) m = m - 1
    return `${y}${String(m).padStart(2, '0')}`
  }

  const now = new Date()
  const y = now.getFullYear()
  let m = now.getMonth() + 1 // 1-indexed
  if (m % 2 === 0) m = m - 1
  return `${y}${String(m).padStart(2, '0')}`
}

// Genera una secuencia de issues bimestrales alrededor de una fecha de referencia
function getBimonthlySequence(referenceDate: Date, pastCount = 2, futureCount = 2): string[] {
  let y = referenceDate.getFullYear()
  let m = referenceDate.getMonth() + 1
  if (m % 2 === 0) m = m - 1

  // Retroceder pastCount bimestres
  let curY = y
  let curM = m
  for (let i = 0; i < pastCount; i++) {
    curM -= 2
    if (curM < 1) {
      curM += 12
      curY -= 1
    }
  }

  const sequence: string[] = []
  const total = pastCount + 1 + futureCount
  for (let i = 0; i < total; i++) {
    sequence.push(`${curY}${String(curM).padStart(2, '0')}`)
    curM += 2
    if (curM > 12) {
      curM -= 12
      curY += 1
    }
  }
  return sequence
}

// Consulta el CDN de JW.org para obtener la URL directa del EPUB
async function getJWMediaUrl(issue: string): Promise<string | null> {
  const jwEndpoints = [
    `https://b.jw-cdn.org/apis/pub-media/GETPUBMEDIALINKS?output=json&pub=mwb&fileformat=EPUB&langwritten=S&issue=${issue}`,
    `https://www.jw.org/apps/GETPUBMEDIALINKS?output=json&pub=mwb&fileformat=EPUB&langwritten=S&issue=${issue}`,
  ]

  for (const endpoint of jwEndpoints) {
    try {
      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        const url = data?.files?.S?.EPUB?.[0]?.file?.url
        if (url) return url
      }
    } catch (_) {
      // Intentar el siguiente endpoint
    }
  }
  return null
}

// Descarga el archivo desde el CDN y lo guarda en Storage y en la tabla epub_disponibles
async function downloadAndSaveIssue(adminClient: any, issue: string, downloadUrl: string) {
  const filename = `${issue}.epub`
  const urlStorage = `epubs/${filename}`

  const downloadRes = await fetch(downloadUrl)
  if (!downloadRes.ok) {
    throw new Error(`Error HTTP ${downloadRes.status} al descargar ${downloadUrl}`)
  }

  const fileBuffer = await downloadRes.arrayBuffer()

  const { error: uploadErr } = await adminClient.storage
    .from('epubs')
    .upload(filename, fileBuffer, {
      contentType: 'application/epub+zip',
      upsert: true,
    })
  if (uploadErr) throw uploadErr

  const { data: inserted, error: insertErr } = await adminClient
    .from('epub_disponibles')
    .upsert(
      {
        filename,
        issue,
        url_storage: urlStorage,
        descargado_en: new Date().toISOString(),
      },
      { onConflict: 'issue' }
    )
    .select()
    .single()

  if (insertErr) throw insertErr
  return inserted
}

// Rotación del bucket: mantiene como máximo los maxCount registros más recientes
async function rotateEpubs(adminClient: any, maxCount = 4) {
  const { data: records, error } = await adminClient
    .from('epub_disponibles')
    .select('*')
    .order('issue', { ascending: true })

  if (!error && records && records.length > maxCount) {
    const toRemoveCount = records.length - maxCount
    const toRemove = records.slice(0, toRemoveCount)
    for (const oldRecord of toRemove) {
      console.log(`Rotación: eliminando issue antiguo ${oldRecord.issue} (${oldRecord.filename})`)
      await adminClient.storage.from('epubs').remove([oldRecord.filename])
      await adminClient.from('epub_disponibles').delete().eq('id', oldRecord.id)
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado: falta encabezado Authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Validar token del usuario que llama
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

    // Cliente administrativo para operaciones en Storage y Base de Datos
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Leer payload
    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}))
    }

    const requestedIssue = body?.issue
    const isSyncMode = body?.sync !== false && !requestedIssue

    // MODO 1: Sincronización completa (edición más reciente + anteriores bimestres)
    if (isSyncMode) {
      const now = new Date()
      // Secuencia: 2 bimestres atrás, actual, y hasta 2 futuros
      const candidateSequence = getBimonthlySequence(now, 2, 2)
      console.log('Secuencia bimestral a comprobar:', candidateSequence)

      // Obtener registros existentes en BD
      const { data: existingRecords } = await adminClient
        .from('epub_disponibles')
        .select('issue')

      const existingSet = new Set((existingRecords || []).map((r: any) => r.issue))
      const newlyDownloaded: any[] = []

      for (const candidate of candidateSequence) {
        if (existingSet.has(candidate)) {
          continue
        }

        const mediaUrl = await getJWMediaUrl(candidate)
        if (mediaUrl) {
          console.log(`Descargando nuevo issue disponible: ${candidate} desde ${mediaUrl}`)
          try {
            const saved = await downloadAndSaveIssue(adminClient, candidate, mediaUrl)
            newlyDownloaded.push(saved)
          } catch (err: any) {
            console.error(`Error guardando issue ${candidate}:`, err?.message)
          }
        }
      }

      // Aplicar rotación (conservar máximo 4 registros)
      await rotateEpubs(adminClient, 4)

      // Obtener todos los registros disponibles ordenados de más reciente a más antiguo
      const { data: allAvailable } = await adminClient
        .from('epub_disponibles')
        .select('*')
        .order('issue', { ascending: false })

      const latestEpub = allAvailable?.[0] || null

      return new Response(
        JSON.stringify({
          status: 'ok',
          downloadedCount: newlyDownloaded.length,
          newlyDownloaded,
          latestEpub,
          epubs: allAvailable || [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // MODO 2: Petición de un issue específico
    const issue = normalizarIssue(requestedIssue)

    // Verificar si ya existe
    const { data: existing } = await adminClient
      .from('epub_disponibles')
      .select('*')
      .eq('issue', issue)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({
          status: 'already_exists',
          epub: existing,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Consultar JW.org
    const downloadUrl = await getJWMediaUrl(issue)
    if (!downloadUrl) {
      return new Response(
        JSON.stringify({
          error: `No se encontró archivo EPUB en JW.org para el issue ${issue}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Descargar y guardar
    const saved = await downloadAndSaveIssue(adminClient, issue, downloadUrl)
    await rotateEpubs(adminClient, 4)

    return new Response(
      JSON.stringify({
        status: 'downloaded',
        epub: saved,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('Error no controlado en fetch-epub:', err)
    return new Response(
      JSON.stringify({
        error: `Error interno en el servidor: ${err?.message || 'Desconocido'}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
