import { QueryClient } from '@tanstack/react-query'

export const QUERY_KEYS = {
  personas: ['personas'],
  participaciones: ['participaciones'],
  programaSemanas: ['programa_semanas'],
  programaPartes: ['programa_partes'],
  programaAsignaciones: ['programa_asignaciones'],
  semanas: ['programa_semanas'],
  partes: ['programa_partes'],
  asignaciones: ['programa_asignaciones'],
  programaBundle: ['programa_bundle'],
  configuracion: ['configuracion'],
  eventosReunion: ['eventos_reunion'],
  userProfile: ['user_profile'],
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos en memoria fresca (sincronizada en vivo vía Realtime)
      gcTime: 1000 * 60 * 30,   // 30 minutos de retención en caché
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/**
 * Invalida de forma selectiva una o varias claves de la caché global.
 */
export function invalidateAppQueries(keys = []) {
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: key })
  }
}
