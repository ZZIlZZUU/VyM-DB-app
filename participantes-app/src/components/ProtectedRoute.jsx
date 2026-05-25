import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [session, setSession]   = useState(undefined) // undefined = cargando
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    // Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) verificarAutorizacion(session.user.email)
    })

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) verificarAutorizacion(session.user.email)
      else setAutorizado(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function verificarAutorizacion(email) {
    const { data } = await supabase
      .from('usuarios_autorizados')
      .select('activo')
      .eq('email', email)
      .single()

    setAutorizado(data?.activo === true)
  }

  // Pantalla de carga mientras verifica sesión
  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text3 font-mono text-sm">Verificando sesión...</div>
      </div>
    )
  }

  // Sin sesión → Login
  if (!session) return <Navigate to="/login" replace />

  // Sesión activa pero no autorizado
  if (!autorizado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="bg-surface border border-border2 rounded-xl p-8 max-w-sm text-center">
          <div className="text-2xl mb-3">⛔</div>
          <div className="font-medium text-text1 mb-2">Acceso no autorizado</div>
          <div className="text-sm text-text3 mb-5">
            Tu cuenta no tiene acceso a esta aplicación.<br />
            Contacta al administrador para solicitar acceso.
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-danger hover:underline"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  return children
}