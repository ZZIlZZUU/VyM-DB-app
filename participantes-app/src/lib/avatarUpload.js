const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const MAX_INPUT_BYTES = 5 * 1024 * 1024 // 5 MB
const TARGET_UPLOAD_SIZE = 256
const TARGET_FALLBACK_SIZE = 160
const MAX_METADATA_DATA_URL_LENGTH = 65000

/**
 * Valida que el archivo elegido sea una imagen permitida y de tamaño razonable.
 */
export function validateAvatarFile(file) {
  if (!file) {
    return { ok: false, error: 'Selecciona una imagen válida.' }
  }
  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      error: 'Formato no compatible. Usa JPG, PNG, WebP o GIF.',
    }
  }
  if (file.size > MAX_INPUT_BYTES) {
    return {
      ok: false,
      error: 'La imagen supera el límite de 5 MB antes de comprimir.',
    }
  }
  return { ok: true }
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => {},
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }
    img.src = objectUrl
  })
}

async function decodeImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => {
          if (typeof bitmap.close === 'function') bitmap.close()
        },
      }
    } catch {
      // Continuar con fallback via <img>
    }
  }
  return loadImageElement(file)
}

function drawSquareCropCanvas(source, width, height, targetSize) {
  const side = Math.max(1, Math.min(width, height))
  const sx = Math.max(0, Math.floor((width - side) / 2))
  const sy = Math.max(0, Math.floor((height - side) / 2))

  const canvas = document.createElement('canvas')
  canvas.width = targetSize
  canvas.height = targetSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo para procesar la imagen.')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, sx, sy, side, side, 0, 0, targetSize, targetSize)
  return canvas
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

/**
 * Recorta al centro en formato cuadrado y comprime una imagen de avatar.
 * Genera tanto un Blob para Storage como un dataURL compacto de respaldo.
 */
export async function compressAvatarImage(file) {
  const decoded = await decodeImageSource(file)
  try {
    const mainCanvas = drawSquareCropCanvas(
      decoded.source,
      decoded.width,
      decoded.height,
      TARGET_UPLOAD_SIZE
    )

    let contentType = 'image/webp'
    let extension = 'webp'
    let blob = await canvasToBlob(mainCanvas, 'image/webp', 0.85)
    if (!blob || blob.type !== 'image/webp') {
      contentType = 'image/jpeg'
      extension = 'jpg'
      blob = await canvasToBlob(mainCanvas, 'image/jpeg', 0.86)
    }
    if (!blob) {
      throw new Error('No se pudo exportar la imagen comprimida.')
    }

    const fallbackCanvas = drawSquareCropCanvas(
      decoded.source,
      decoded.width,
      decoded.height,
      TARGET_FALLBACK_SIZE
    )
    let dataUrl = fallbackCanvas.toDataURL('image/webp', 0.76)
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = fallbackCanvas.toDataURL('image/jpeg', 0.78)
    }

    return { blob, dataUrl, contentType, extension }
  } finally {
    decoded.cleanup()
  }
}

async function cleanupPreviousStorageAvatars(supabase, userId, keepPath) {
  if (!userId) return
  try {
    const { data: existing } = await supabase.storage.from('avatars').list(userId)
    if (!Array.isArray(existing) || existing.length === 0) return
    const toDelete = existing
      .map((item) => `${userId}/${item.name}`)
      .filter((fullPath) => !keepPath || fullPath !== keepPath)
    if (toDelete.length > 0) {
      await supabase.storage.from('avatars').remove(toDelete)
    }
  } catch {
    // Limpieza best-effort: no bloquear si el bucket no existe o no permite listar
  }
}

async function syncAvatarEnTablaUsuarios(supabase, email, avatarUrl) {
  if (!email) return
  try {
    await supabase
      .from('usuarios_autorizados')
      .update({ avatar_url: avatarUrl })
      .eq('email', email)
  } catch {
    // Best-effort: la columna o política puede no existir aún
  }
}

/**
 * Sube una nueva foto de perfil al bucket `avatars` de Supabase Storage
 * (con respaldo en user_metadata si el bucket no está habilitado) y actualiza la sesión.
 */
export async function uploadUserAvatar({ supabase, user, file }) {
  if (!supabase || !user?.id) {
    throw new Error('Debes tener una sesión activa para subir tu foto.')
  }

  const check = validateAvatarFile(file)
  if (!check.ok) {
    throw new Error(check.error)
  }

  const { blob, dataUrl, contentType, extension } = await compressAvatarImage(file)
  const objectPath = `${user.id}/avatar-${Date.now()}.${extension}`

  let finalAvatarUrl = null
  let storageFallback = false

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(objectPath, blob, { upsert: true, contentType })

  if (!uploadError) {
    const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(objectPath)
    finalAvatarUrl = pubData?.publicUrl || null
    await cleanupPreviousStorageAvatars(supabase, user.id, objectPath)
  }

  if (!finalAvatarUrl) {
    if (dataUrl && dataUrl.length <= MAX_METADATA_DATA_URL_LENGTH) {
      finalAvatarUrl = dataUrl
      storageFallback = true
    } else {
      throw new Error(
        uploadError?.message || 'No se pudo subir la imagen al almacenamiento.'
      )
    }
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: finalAvatarUrl },
  })
  if (authError) {
    throw authError
  }

  await syncAvatarEnTablaUsuarios(supabase, user.email, finalAvatarUrl)

  return { avatarUrl: finalAvatarUrl, storageFallback }
}

/**
 * Elimina la foto de perfil del usuario de user_metadata, Storage y usuarios_autorizados.
 */
export async function removeUserAvatar({ supabase, user }) {
  if (!supabase || !user?.id) {
    throw new Error('Debes tener una sesión activa para actualizar tu perfil.')
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  })
  if (authError) {
    throw authError
  }

  await cleanupPreviousStorageAvatars(supabase, user.id, null)
  await syncAvatarEnTablaUsuarios(supabase, user.email, null)

  return { ok: true }
}
