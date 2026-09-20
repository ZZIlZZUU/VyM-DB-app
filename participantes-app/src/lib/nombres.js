// src/lib/nombres.js — Utilidades de formateo y acotación inteligente de nombres para S-140

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'san', 'santa', 'y', 'e', 'von', 'van', 'da', 'di'])

/**
 * Agrupa palabras considerando partículas de apellidos compuestos (ej: 'del Carmen', 'de la Rosa')
 */
function tokenizarNombre(nombreStr) {
  if (!nombreStr || typeof nombreStr !== 'string') return []
  const palabras = nombreStr.trim().split(/\s+/).filter(Boolean)
  if (palabras.length <= 1) return palabras

  const tokens = []
  let buffer = []

  for (let i = 0; i < palabras.length; i++) {
    const p = palabras[i]
    const pLower = p.toLowerCase()

    if (PARTICULAS.has(pLower) && i < palabras.length - 1) {
      buffer.push(p)
    } else {
      if (buffer.length > 0) {
        tokens.push([...buffer, p].join(' '))
        buffer = []
      } else {
        tokens.push(p)
      }
    }
  }

  if (buffer.length > 0) {
    if (tokens.length > 0) {
      tokens[tokens.length - 1] += ' ' + buffer.join(' ')
    } else {
      tokens.push(buffer.join(' '))
    }
  }

  return tokens
}

/**
 * Obtiene la inicial con punto de un token (ej: 'Navarro' -> 'N.', 'del Carmen' -> 'C.')
 */
function inicialToken(token) {
  if (!token) return ''
  const partes = token.split(' ')
  const palabraSignificativa = partes.find(p => !PARTICULAS.has(p.toLowerCase())) || partes[partes.length - 1]
  return `${palabraSignificativa[0].toUpperCase()}.`
}

/**
 * Acota un nombre individual según la longitud máxima deseada.
 * Ejemplos:
 * - 'Roberto Rosemberg Navarro' -> 'Roberto Rosemberg N.'
 * - 'Juan Carlos Mora Vega' -> 'Juan C. Mora V.'
 */
export function abreviarNombre(nombreStr, maxLen = 24) {
  if (!nombreStr || typeof nombreStr !== 'string') return ''
  const limpio = nombreStr.trim().replace(/\s+/g, ' ')
  if (limpio.length <= maxLen) return limpio

  const tokens = tokenizarNombre(limpio)
  if (tokens.length <= 1) return limpio

  // Caso 1: 3 tokens (ej: [Roberto, Rosemberg, Navarro] o [Juan, Carlos, Mora])
  if (tokens.length === 3) {
    // Intento 1: Abreviar el último token (segundo apellido o apellido único)
    const intento1 = `${tokens[0]} ${tokens[1]} ${inicialToken(tokens[2])}`
    if (intento1.length <= maxLen) return intento1

    // Intento 2: Abreviar token del medio y último
    const intento2 = `${tokens[0]} ${inicialToken(tokens[1])} ${inicialToken(tokens[2])}`
    if (intento2.length <= maxLen) return intento2

    // Intento 3: Primer nombre + primer apellido completo
    const intento3 = `${tokens[0]} ${tokens[1]}`
    if (intento3.length <= maxLen) return intento3

    return intento2
  }

  // Caso 2: 4 o más tokens (ej: [Juan, Carlos, Mora, Vega])
  if (tokens.length >= 4) {
    // Abreviar 2do nombre y 2do apellido: Juan C. Mora V.
    const primerNombre = tokens[0]
    const segundoNombreIni = inicialToken(tokens[1])
    const primerApellido = tokens[tokens.length - 2]
    const segundoApellidoIni = inicialToken(tokens[tokens.length - 1])

    const intento1 = `${primerNombre} ${segundoNombreIni} ${primerApellido} ${segundoApellidoIni}`
    if (intento1.length <= maxLen) return intento1

    const intento2 = `${primerNombre} ${segundoNombreIni} ${primerApellido}`
    if (intento2.length <= maxLen) return intento2

    const intento3 = `${primerNombre} ${primerApellido}`
    if (intento3.length <= maxLen) return intento3

    return intento2
  }

  // Caso 3: 2 tokens muy largos (ej: [Maximiliano, Schwarzenberg])
  if (tokens.length === 2) {
    const intento = `${tokens[0]} ${inicialToken(tokens[1])}`
    return intento
  }

  return limpio
}

/**
 * Formatea de forma inteligente una pareja de participantes (Estudiante / Ayudante o Conductor / Lector).
 * Si caben juntos en una sola línea (<= maxLenTotal caracteres), se conservan completos.
 * Si exceden el límite, se acotan de manera simétrica y reconocible.
 */
export function formatearParParticipantes(nombre1, nombre2, maxLenTotal = 28) {
  const n1 = (nombre1 || '').trim()
  const n2 = (nombre2 || '').trim()

  if (!n1 && !n2) return ' / '
  if (!n1) return abreviarNombre(n2, maxLenTotal)
  if (!n2) return abreviarNombre(n1, maxLenTotal)

  const combinada = `${n1} / ${n2}`
  if (combinada.length <= maxLenTotal) {
    return combinada
  }

  // Paso 1: Intentar abreviar segundos apellidos si existen (3+ tokens en alguno)
  let n1Mod = abreviarNombre(n1, 18)
  let n2Mod = abreviarNombre(n2, 18)

  if (`${n1Mod} / ${n2Mod}`.length <= maxLenTotal) {
    return `${n1Mod} / ${n2Mod}`
  }

  // Paso 2: Si aún sobrepasa, acotar apellido a inicial del más largo
  const tokens1 = tokenizarNombre(n1Mod)
  const tokens2 = tokenizarNombre(n2Mod)

  if (n1Mod.length >= n2Mod.length && tokens1.length >= 2) {
    n1Mod = `${tokens1[0]} ${inicialToken(tokens1[tokens1.length - 1])}`
  } else if (tokens2.length >= 2) {
    n2Mod = `${tokens2[0]} ${inicialToken(tokens2[tokens2.length - 1])}`
  }

  if (`${n1Mod} / ${n2Mod}`.length <= maxLenTotal) {
    return `${n1Mod} / ${n2Mod}`
  }

  // Paso 3: Acotar ambos a 'Nombre A. / Nombre B.'
  if (tokens1.length >= 2) {
    n1Mod = `${tokens1[0]} ${inicialToken(tokens1[tokens1.length - 1])}`
  }
  if (tokens2.length >= 2) {
    n2Mod = `${tokens2[0]} ${inicialToken(tokens2[tokens2.length - 1])}`
  }

  return `${n1Mod} / ${n2Mod}`
}
