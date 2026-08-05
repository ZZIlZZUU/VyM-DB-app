import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    // Verificar si está en la lista de autorizados
    const { data } = await supabase
      .from('usuarios_autorizados')
      .select('activo')
      .eq('email', email)
      .single()

    if (!data?.activo) {
      await supabase.auth.signOut()
      setError('Tu cuenta no tiene acceso. Contacta al administrador.')
      setLoading(false)
      return
    }

    navigate('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-mono text-xs text-text3 tracking-widest uppercase mb-1">
            Base de datos
          </div>
          <h1 className="text-xl font-medium text-text1">
            Participantes 2026
          </h1>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-7">
          <div className="text-sm font-medium text-text1 mb-5">Iniciar sesión</div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className="px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
              />
            </div>

            {error && (
              <div className="text-xs text-danger bg-danger-bg border border-danger border-opacity-30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="text-center mt-5 text-xs text-text3">
          Acceso solo por invitación
        </div>
      </div>
    </div>
  )
}