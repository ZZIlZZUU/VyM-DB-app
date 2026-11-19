import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  evaluarFortalezaPassword,
  verificarPasswordFiltradaHIBP,
  registrarEventoSeguridad,
} from '../lib/seguridad'
import { EmptyState } from '../components/ui/EmptyState'

const STRENGTH_BAR_COLORS = ['bg-danger', 'bg-danger', 'bg-amber', 'bg-blue', 'bg-accent']

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [hibpConfirmed, setHibpConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true)
    }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user?.email || '')
        setReady(true)
        clearTimeout(timer)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) {
          setUserEmail(session.user?.email || '')
          setReady(true)
          clearTimeout(timer)
        }
      }
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const strength = useMemo(
    () => evaluarFortalezaPassword(password, { email: userEmail }),
    [password, userEmail]
  )

  async function handleSetPassword(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')

    if (!strength.cumpleMinimo) {
      setError(strength.bloqueos[0] || 'La contraseña no cumple los requisitos de seguridad.')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    if (!hibpConfirmed) {
      const hibp = await verificarPasswordFiltradaHIBP(password)
      if (hibp.filtrada) {
        setHibpConfirmed(true)
        setError(
          `Esta contraseña apareció ${hibp.conteo.toLocaleString('es-MX')} veces en filtraciones conocidas. Cámbiala o vuelve a pulsar Guardar si deseas usarla igual.`
        )
        setLoading(false)
        return
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password })

    if (updateErr) {
      setError(updateErr.message || 'Error al actualizar la contraseña.')
      setLoading(false)
    } else {
      await supabase.auth.signOut({ scope: 'others' }).catch(() => {})
      await registrarEventoSeguridad(supabase, {
        tipo: 'PASSWORD_CHANGED',
        detalle: { via: 'recovery', revocoOtrasSesiones: true },
      })
      setSuccessMsg('¡Contraseña actualizada correctamente! Redirigiendo...')
      setTimeout(() => {
        navigate('/')
      }, 1400)
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
          <h1 className="text-xl font-medium text-text1">Participantes 2026</h1>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-7">
          <div className="text-sm font-medium text-text1 mb-5">Establecer nueva contraseña</div>

          {!ready ? (
            timedOut ? (
              <EmptyState
                icon={AlertTriangle}
                title="Enlace inválido o expirado"
                description="El enlace de recuperación es inválido, ha expirado o ya fue utilizado anteriormente."
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="mt-2 w-full bg-accent text-white text-xs font-medium py-2 rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    Volver a Iniciar Sesión
                  </button>
                }
              />
            ) : (
              <div className="text-center py-6 text-sm text-text3 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Verificando enlace de acceso...
              </div>
            )
          ) : (
            <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setHibpConfirmed(false)
                    }}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Mín. 8 caracteres (Aa + 0-9)"
                    className="w-full pl-3 pr-9 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text3 hover:text-text1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {password.length > 0 && (
                <div className="p-2.5 rounded-lg bg-surface-alt/50 border border-border space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text3">Fortaleza</span>
                    <span className="font-mono font-semibold text-text1">{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-1.5 rounded-full transition-colors ${
                          strength.score >= step ? STRENGTH_BAR_COLORS[strength.score] : 'bg-surface'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="space-y-1">
                    {strength.checks.map((chk) => (
                      <div
                        key={chk.id}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          chk.met ? 'text-accent' : 'text-text3'
                        }`}
                      >
                        {chk.met ? (
                          <Check className="w-3 h-3 shrink-0" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-border2 inline-block shrink-0" />
                        )}
                        <span>{chk.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-mono text-xs text-text3 uppercase tracking-wider">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repite tu nueva contraseña"
                    className="w-full pl-3 pr-9 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-text3 hover:text-text1 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-danger bg-danger-bg border border-danger/30 rounded-lg px-3 py-2">
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
                className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
