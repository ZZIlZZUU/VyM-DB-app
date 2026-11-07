import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EmptyState } from './ui/EmptyState'
import { ShieldBan } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const [session, setSession]       = useState(undefined) // undefined = cargando sesión
  const [autorizado, setAutorizado] = useState(undefined) // undefined = cargando comprobación DB

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.email) {
        verificarAutorizacion(session.user.email)
      } else {
        setAutorizado(false)
      }
    })

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.email) {
        verificarAutorizacion(session.user.email)
      } else {
        setAutorizado(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function verificarAutorizacion(email) {
    try {
      const cleanEmail = email?.trim().toLowerCase()
      if (!cleanEmail) {
        setAutorizado(false)
        return
      }
      const { data, error } = await supabase
        .from('usuarios_autorizados')
        .select('activo')
        .eq('email', cleanEmail)
        .single()

      if (error || !data) {
        setAutorizado(false)
      } else {
        setAutorizado(data.activo === true)
      }
    } catch (err) {
      setAutorizado(false)
    }
  }

  // Pantalla de carga mientras verifica sesión o autorización
  if (session === undefined || (session && autorizado === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text3 font-mono text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Verificando sesión...
        </div>
      </div>
    )
  }

  // Sin sesión → Login
  if (!session) return <Navigate to="/login" replace />

  // Sesión activa pero no autorizado
  if (!autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg px-4">
        <div className="bg-surface border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-lg">
          <EmptyState
            icon={ShieldBan}
            title="Acceso no autorizado"
            description="Tu cuenta no tiene permisos para acceder a esta aplicación. Contacta al administrador para solicitar acceso."
            action={
              <button
                type="button"
                onClick={() => supabase.auth.signOut()}
                className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                Cerrar sesión
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return children
}