import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SetPassword() {
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]                     = useState('')
  const [successMsg, setSuccessMsg]           = useState('')
  const [loading, setLoading]                 = useState(false)
  const [ready, setReady]                     = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar si la sesión ya existe en el SDK
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true)
      }
    })

    // Escuchar el evento de recuperación o inicio de sesión desde el hash de Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          setReady(true)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message || 'Error al actualizar la contraseña.')
      setLoading(false)
    } else {
      setSuccessMsg('¡Contraseña actualizada correctamente! Redirigiendo...')
      setTimeout(() => {
        navigate('/')
      }, 1500)
    }
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
          <div className="text-sm font-medium text-text1 mb-5">Establecer nueva contraseña</div>

          {!ready ? (
            <div className="text-center py-6 text-sm text-text3">
              Verificando enlace de acceso...
            </div>
          ) : (
            <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Repite tu nueva contraseña"
                  className="px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                />
              </div>

              {error && (
                <div className="text-xs text-danger bg-danger-bg border border-danger border-opacity-30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="text-xs text-accent bg-accent-bg border border-accent/30 rounded-lg px-3 py-2">
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(successMsg)}
                className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
