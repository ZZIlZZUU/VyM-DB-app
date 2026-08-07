import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [email, setEmail]       = useState('')
  const [inviting, setInviting] = useState(false)

  const { toast, showToast, success, error: toastError } = useToast()
  const { confirm, confirmProps } = useConfirm()

  const fetchUsuarios = useCallback(async () => {
    const { data, error } = await supabase
      .from('usuarios_autorizados')
      .select('*')
      .order('email')
    
    if (error) {
      toastError('Error al cargar usuarios autorizados')
    } else {
      setUsuarios(data || [])
    }
    setLoading(false)
  }, [toastError])

  useEffect(() => {
    fetchUsuarios()
  }, [fetchUsuarios])

  useEffect(() => {
    const canal = supabase
      .channel('usuarios-mgmt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'usuarios_autorizados' },
        () => fetchUsuarios()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [fetchUsuarios])

  async function handleInvite(e) {
    if (e) e.preventDefault()
    const targetEmail = email.trim().toLowerCase()
    
    if (!targetEmail) {
      toastError('Ingresa un correo electrónico')
      return
    }

    setInviting(true)

    const { error: insertError } = await supabase
      .from('usuarios_autorizados')
      .insert({ email: targetEmail, activo: true })

    if (insertError) {
      if (insertError.code === '23505') {
        toastError('El usuario ya se encuentra registrado')
      } else {
        toastError(insertError.message || 'Error al invitar al usuario')
      }
    } else {
      success('Usuario invitado: ' + targetEmail)
      setEmail('')
    }

    setInviting(false)
  }

  async function toggleActivo(u) {
    const ok = await confirm({
      title: u.activo ? `¿Desactivar a ${u.email}?` : `¿Activar a ${u.email}?`,
      message: u.activo
        ? 'El usuario perderá el acceso a la aplicación.'
        : 'El usuario recuperará el acceso a la aplicación.',
      danger: u.activo,
    })
    if (!ok) return

    const { error: updateError } = await supabase
      .from('usuarios_autorizados')
      .update({ activo: !u.activo })
      .eq('email', u.email)

    if (updateError) {
      toastError(updateError.message || 'Error al actualizar usuario')
    } else {
      showToast(
        u.activo ? 'Usuario desactivado' : 'Usuario activado',
        u.activo ? 'warning' : 'success'
      )
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── COLUMNA IZQUIERDA — INVITAR USUARIO ── */}
      <div className="bg-surface border border-border rounded-xl p-5 self-start">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Invitar usuario</span>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              autoComplete="off"
              className="w-full px-3 py-1.5 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={inviting}
            className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {inviting ? 'Invitando...' : 'Invitar →'}
          </button>
        </form>
      </div>

      {/* ── COLUMNA DERECHA — LISTA DE USUARIOS AUTORIZADOS ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Usuarios autorizados</span>
          <span className="font-mono text-xs text-text3">{usuarios.length} total</span>
        </div>

        <div className="max-h-96 overflow-y-auto flex flex-col gap-1">
          {loading ? (
            <SkeletonList rows={4} cols={2} />
          ) : usuarios.length === 0 ? (
            <div className="text-center py-6 text-sm text-text3">Sin usuarios autorizados</div>
          ) : (
            usuarios.map(u => (
              <div
                key={u.email}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-none
                  ${!u.activo ? 'opacity-60 bg-bg/50 border-transparent' : 'border-border/50 hover:border-border hover:bg-bg'}`}
              >
                <span className="flex-1 text-sm text-text1 truncate font-mono">{u.email}</span>

                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mr-1 ${
                    u.activo
                      ? 'bg-accent-bg text-accent'
                      : 'bg-danger-bg text-danger'
                  }`}
                >
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>

                <button
                  onClick={() => toggleActivo(u)}
                  title={u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                  className={`text-xs px-2 py-1 rounded shrink-0 border transition-colors ${
                    u.activo
                      ? 'text-text3 border-border2 hover:text-danger hover:bg-danger-bg hover:border-danger'
                      : 'text-accent border-accent/30 bg-accent-bg hover:bg-accent hover:text-white'
                  }`}
                >
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
