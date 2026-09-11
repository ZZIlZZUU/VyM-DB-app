// src/lib/backups.js — Gestión de backups automáticos en Supabase Storage y rotación
import { supabase } from './supabase'

const MAX_BACKUPS_POR_FORMATO = 10

/**
 * Genera el nombre de archivo según la convención del Brief #32:
 * {YYYY-MM-DD}_{HH-mm}.{ext}
 */
export function generarNombreBackup(extension = 'csv') {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d}_${hh}-${mm}.${extension}`
}

/**
 * Sube un backup en segundo plano a Supabase Storage y registra en backups_disponibles.
 * Aplica rotación automática conservando máximo 10 backups por formato.
 *
 * @param {Object} params
 * @param {string|Blob} params.contenido - Contenido en texto o Blob
 * @param {'csv'|'json'|'pdf'} params.formato - Formato del backup
 * @param {string} [params.extension] - Extensión (por defecto igual a formato)
 * @param {string} [params.contentType] - Tipo MIME
 * @returns {Promise<Object>} Registro insertado en backups_disponibles
 */
export async function guardarBackupEnStorage({
  contenido,
  formato,
  extension,
  contentType,
}) {
  const ext = extension || formato
  const baseFilename = generarNombreBackup(ext)
  let filename = baseFilename

  // 1. Si ya existe un backup con ese nombre exacto en el mismo minuto, agregar segundos
  const { data: existing } = await supabase
    .from('backups_disponibles')
    .select('id')
    .eq('filename', filename)
    .maybeSingle()

  if (existing) {
    const ss = String(new Date().getSeconds()).padStart(2, '0')
    filename = baseFilename.replace(`.${ext}`, `-${ss}.${ext}`)
  }

  // 2. Rotación automática: conservar máximo 10 backups por formato
  try {
    const { data: records } = await supabase
      .from('backups_disponibles')
      .select('id, filename, formato')
      .eq('formato', formato)
      .not('filename', 'like', '%_reporte.csv')
      .order('generado_en', { ascending: true })

    if (records && records.length >= MAX_BACKUPS_POR_FORMATO) {
      const toRemoveCount = records.length - MAX_BACKUPS_POR_FORMATO + 1
      const toRemove = records.slice(0, toRemoveCount)
      for (const oldRec of toRemove) {
        await supabase.storage.from('backups').remove([`${oldRec.formato}/${oldRec.filename}`])
        await supabase.from('backups_disponibles').delete().eq('id', oldRec.id)
      }
    }
  } catch (rotErr) {
    console.warn('Aviso en rotación de backups:', rotErr)
  }

  // 3. Subir archivo a Supabase Storage
  const pathInBucket = `${formato}/${filename}`
  const blob =
    typeof contenido === 'string'
      ? new Blob([formato === 'csv' && !contenido.startsWith('\uFEFF') ? '\uFEFF' + contenido : contenido], {
          type: contentType || (formato === 'json' ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;'),
        })
      : contenido

  const { error: uploadError } = await supabase.storage
    .from('backups')
    .upload(pathInBucket, blob, {
      contentType: contentType || (formato === 'json' ? 'application/json' : 'text/csv'),
      upsert: true,
    })

  if (uploadError) throw uploadError

  // 4. Registrar en la tabla backups_disponibles
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const urlStorage = `backups/${pathInBucket}`

  const { data: inserted, error: insertError } = await supabase
    .from('backups_disponibles')
    .insert({
      filename,
      formato,
      url_storage: urlStorage,
      generado_por: user?.id || null,
    })
    .select()
    .single()

  if (insertError) throw insertError
  return inserted
}

/**
 * Consulta la lista de backups registrados en la base de datos
 * @param {string} [formato='todos']
 * @returns {Promise<Array>}
 */
export async function obtenerBackupsDisponibles(formato = 'todos') {
  let q = supabase
    .from('backups_disponibles')
    .select('*')
    .order('generado_en', { ascending: false })

  if (formato && formato !== 'todos') {
    q = q.eq('formato', formato)
  }

  const { data, error } = await q
  if (error) throw error
  return data || []
}

/**
 * Descarga un backup desde Supabase Storage directamente en el navegador del usuario
 * @param {Object} backup - Registro de backups_disponibles
 */
export async function descargarBackupStorage(backup) {
  // Resolver ruta real en el bucket: respeta url_storage (ej: reportes/202608_reporte.csv) o formato/filename
  const pathInBucket =
    backup.url_storage?.replace(/^backups\//, '') || `${backup.formato}/${backup.filename}`

  // Intentar descarga vía blob directo
  const { data: blob, error } = await supabase.storage
    .from('backups')
    .download(pathInBucket)

  if (!error && blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backup.filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }

  // Fallback: URL firmada con download
  const { data: signedData, error: signedErr } = await supabase.storage
    .from('backups')
    .createSignedUrl(pathInBucket, 60, { download: backup.filename })

  if (signedErr || !signedData?.signedUrl) {
    throw error || signedErr || new Error('No se pudo generar la URL de descarga')
  }

  const a = document.createElement('a')
  a.href = signedData.signedUrl
  a.download = backup.filename
  a.click()
}

/**
 * Elimina un backup tanto de Supabase Storage como de la tabla backups_disponibles.
 * Si es un reporte mensual, sincroniza también la eliminación en reportes_mensuales.
 * @param {Object} backup - Registro de backups_disponibles
 */
export async function eliminarBackupStorage(backup) {
  const pathInBucket =
    backup.url_storage?.replace(/^backups\//, '') || `${backup.formato}/${backup.filename}`

  // 1. Eliminar de Storage
  try {
    await supabase.storage.from('backups').remove([pathInBucket])
  } catch (err) {
    console.warn('Error eliminando de Storage (se procederá a eliminar el registro):', err)
  }

  // 2. Si es un reporte mensual (_reporte.csv), sincronizar en reportes_mensuales
  const matchMes = backup.filename?.match(/^(\d{6})_reporte\.csv$/)
  if (matchMes) {
    try {
      await supabase.from('reportes_mensuales').delete().eq('mes', matchMes[1])
    } catch (err) {
      console.warn('Aviso al sincronizar eliminación en reportes_mensuales:', err)
    }
  }

  // 3. Eliminar de la base de datos
  const { error } = await supabase
    .from('backups_disponibles')
    .delete()
    .eq('id', backup.id)

  if (error) throw error
}
