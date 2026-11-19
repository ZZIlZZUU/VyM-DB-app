import { MESES, formatFechaLegible } from './fechas'

export const DISMISSED_ALERTS_STORAGE_KEY = 'vym_home_dismissed_alerts_v1'

const PRIORITY_RANK = {
  danger: 0,
  warning: 1,
  info: 2,
}

export function loadDismissedAlertIds() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return []
    const raw = window.localStorage.getItem(DISMISSED_ALERTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveDismissedAlertIds(ids) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    if (!Array.isArray(ids) || ids.length === 0) {
      window.localStorage.removeItem(DISMISSED_ALERTS_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(DISMISSED_ALERTS_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore storage errors
  }
}

export function countParticipacionesEnMes(participaciones = [], mesNombre, anioNum) {
  const targetMonthIdx = MESES.indexOf(mesNombre)
  const targetAnio = Number(anioNum)
  if (targetMonthIdx === -1) return 0

  let count = 0
  for (const p of participaciones || []) {
    if (!p) continue
    if (p.fecha) {
      const d = new Date(String(p.fecha).slice(0, 10) + 'T12:00:00')
      if (!Number.isNaN(d.getTime())) {
        if (d.getMonth() === targetMonthIdx && d.getFullYear() === targetAnio) {
          count++
        }
        continue
      }
    }
    if (p.mes === mesNombre) {
      count++
    }
  }
  return count
}

/**
 * Filtra y ordena participantes activos con más de 2 meses sin actividad:
 * primero quienes nunca han participado y luego por fecha más antigua.
 */
export function sortPersonasPorEspera(personas = [], participaciones = [], haceDosMesesIso = '') {
  const ultimaFechaPorClave = new Map()
  for (const r of participaciones || []) {
    if (!r?.clave || !r?.fecha) continue
    const f = String(r.fecha).slice(0, 10)
    const prev = ultimaFechaPorClave.get(r.clave)
    if (!prev || f > prev) ultimaFechaPorClave.set(r.clave, f)
  }

  return (personas || [])
    .filter(p => {
      if (!p?.activo) return false
      const ult = ultimaFechaPorClave.get(p.clave)
      return !ult || ult < haceDosMesesIso
    })
    .sort((a, b) => {
      const fA = ultimaFechaPorClave.get(a.clave) || ''
      const fB = ultimaFechaPorClave.get(b.clave) || ''
      if (!fA && fB) return -1
      if (fA && !fB) return 1
      const cmp = fA.localeCompare(fB)
      if (cmp !== 0) return cmp
      return String(a.nombre || '').localeCompare(String(b.nombre || ''))
    })
}

/**
 * Genera y prioriza las alertas del widget "Por resolver hoy".
 * Degrada automáticamente la alerta de EPUB faltante de rojo a ámbar cuando
 * ya existen asignaciones registradas en `participaciones` para ese mes.
 */
export function buildHomeAlertas({
  mesActual,
  anioActual,
  semanasIncompletasMesActual = [],
  personasSinActividad2Meses = [],
  eventoProximo = null,
  semanasProximoMes = [],
  proxMesInfo = { mes: '', anio: anioActual },
  participaciones = [],
  rol = 'admin',
  onNavigate,
} = {}) {
  const alertas = []

  if (semanasIncompletasMesActual.length > 0) {
    alertas.push({
      id: `semanas_incompletas_${anioActual}_${mesActual}`,
      tipo: 'warning',
      titulo: `Semanas incompletas en ${mesActual}`,
      mensaje: `Hay ${semanasIncompletasMesActual.length} semana(s) con asignaciones pendientes de confirmar en el programa de este mes.`,
      linkTexto: 'Revisar programa →',
      onAction: () => onNavigate?.('programa'),
    })
  }

  if (personasSinActividad2Meses.length > 0) {
    alertas.push({
      id: `personas_inactivas_${anioActual}_${mesActual}`,
      tipo: 'info',
      titulo: 'Participantes sin actividad reciente',
      mensaje: `${personasSinActividad2Meses.length} participante(s) activo(s) llevan más de 2 meses consecutivos sin ninguna asignación registrada.`,
      linkTexto: 'Ver personas →',
      onAction: () => onNavigate?.('personas'),
    })
  }

  if (eventoProximo) {
    const esDesp = eventoProximo.tipo_evento === 'reunion_desplazada'
    const esAdmin = rol === 'admin'
    alertas.push({
      id: `evento_${eventoProximo.id}`,
      tipo: 'info',
      titulo: `Evento programado: ${eventoProximo.titulo_evento}`,
      mensaje: esDesp
        ? `Reunión trasladada al ${formatFechaLegible(eventoProximo.fecha_efectiva, true)}${eventoProximo.hora_efectiva ? ` a las ${eventoProximo.hora_efectiva} hrs` : ''}.`
        : eventoProximo.descripcion ||
          `Excepción programada para ${formatFechaLegible(eventoProximo.fecha_original || eventoProximo.fecha_efectiva, true)}.`,
      linkTexto: esAdmin ? 'Gestionar eventos →' : 'Ver calendario →',
      onAction: () =>
        esAdmin
          ? onNavigate?.('configuracion', { tab: 'eventos' })
          : onNavigate?.('calendario'),
    })
  }

  if (semanasProximoMes.length === 0 && proxMesInfo?.mes) {
    const regsProxMes = countParticipacionesEnMes(
      participaciones,
      proxMesInfo.mes,
      proxMesInfo.anio
    )

    if (regsProxMes > 0) {
      alertas.push({
        id: `programa_proximo_mes_${proxMesInfo.anio}_${proxMesInfo.mes}`,
        tipo: 'warning',
        titulo: `Programa de ${proxMesInfo.mes} sin EPUB (con registros)`,
        mensaje: `El EPUB de ${proxMesInfo.mes} ${proxMesInfo.anio} aún no está cargado, pero ya existen ${regsProxMes} asignación(es) registradas para ese mes.`,
        linkTexto: 'Cargar EPUB →',
        onAction: () => onNavigate?.('programa'),
        secondaryLinkTexto: 'Ver semanas →',
        onSecondaryAction: () => onNavigate?.('semanal'),
      })
    } else {
      alertas.push({
        id: `programa_proximo_mes_${proxMesInfo.anio}_${proxMesInfo.mes}`,
        tipo: 'danger',
        titulo: `Programa de ${proxMesInfo.mes} sin cargar`,
        mensaje: `Aún no se ha importado el archivo EPUB mwb para las reuniones de ${proxMesInfo.mes} ${proxMesInfo.anio}.`,
        linkTexto: 'Cargar EPUB →',
        onAction: () => onNavigate?.('programa'),
      })
    }
  }

  return alertas.sort(
    (a, b) => (PRIORITY_RANK[a.tipo] ?? 9) - (PRIORITY_RANK[b.tipo] ?? 9)
  )
}

export function buildLogResumenCorto(log) {
  if (!log) return ''
  let data = log.datos_despues || log.datos_antes
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      return data
    }
  }
  if (!data || typeof data !== 'object') {
    return log.registro_id != null ? `ID #${log.registro_id}` : ''
  }

  const partes = []
  if (data.nombre) partes.push(data.nombre)
  else if (data.titulo_evento) partes.push(data.titulo_evento)
  else if (data.clave) partes.push(data.clave)
  if (data.tipo) partes.push(data.tipo)
  if (data.fecha) partes.push(formatFechaLegible(String(data.fecha).slice(0, 10), true))
  else if (data.fecha_inicio) partes.push(formatFechaLegible(String(data.fecha_inicio).slice(0, 10), true))

  if (partes.length > 0) return partes.join(' · ')
  return log.registro_id != null ? `ID #${log.registro_id}` : ''
}
