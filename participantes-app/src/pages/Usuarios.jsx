import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

export default function Usuarios({ currentUser: propUser, currentRol: propRol }) {
  const [currentUser, setCurrentUser]   = useState(propUser || null)
  const [currentRol, setCurrentRol]     = useState(propRol || 'editor')
  const [usuarios, setUsuarios]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState(null)
  const [email, setEmail]               = useState('')
  const [nombreInv, setNombreInv]       = useState('')
  const [inviting, setInviting]         = useState(false)

  const [editingEmail, setEditingEmail] = useState(null)
  const [editNombre, setEditNombre]     = useState('')
  const [savingName, setSavingName]     = useState(false)

  const { toast, showToast, success, error } = useToast()
  const { confirm, confirmProps }            = useConfirm()

  useEffect(() => {
    if (propUser) setCurrentUser(propUser)
  }, [propUser])

  useEffect(() => {
    if (propRol) setCurrentRol(propRol)
  }, [propRol])

  useEffect(() => {
    if (!propUser) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setCurrentUser(user)
          supabase
            .from('usuarios_autorizados')
            .select('rol')
            .eq('email', user.email)
            .single()
            .then(({ data }) => {
              if (data?.rol) setCurrentRol(data.rol)
            })
        }
      })
    }
  }, [propUser])

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('usuarios_autorizados')
        .select('*')
        .order('email')

      if (fetchErr) throw fetchErr
      setUsuarios(data || [])
    } catch (err) {
      console.error('[fetchUsuarios]', err)
      setFetchError(err?.message || 'Error al conectar con la base de datos')
      error('Error al cargar usuarios autorizados')
    } finally {
      setLoading(false)
    }
  }, [error])

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

  const handleInvite = async (e) => {
    if (e) e.preventDefault()
    const emailTrimmed = email.trim().toLowerCase()
    if (!emailTrimmed) return

    setInviting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        'https://evqhdemvmnhwnsnrmdzk.supabase.co/functions/v1/invite-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email: emailTrimmed }),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        if (result.code === '23505') {
          error('Este correo ya está en la lista de usuarios autorizados.')
        } else {
          error(result.error || 'Error al invitar al usuario.')
        }
        return
      }

      // Si se especificó nombre, guardarlo en usuarios_autorizados
      if (nombreInv.trim()) {
        await supabase
          .from('usuarios_autorizados')
          .update({ nombre: nombreInv.trim() })
          .eq('email', emailTrimmed)
      }

      success(`Invitación enviada a ${emailTrimmed}.`)
      setEmail('')
      setNombreInv('')
      fetchUsuarios()
    } catch (err) {
      error('Error de conexión al enviar la invitación.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRoleChange(u, newRol) {
    if (u.rol === newRol) return
    const { error: updateError } = await supabase
      .from('usuarios_autorizados')
      .update({ rol: newRol })
      .eq('email', u.email)

    if (updateError) {
      error(updateError.message || 'Error al cambiar rol')
    } else {
      success(`Rol de ${u.email} actualizado a "${newRol}"`)
      fetchUsuarios()
    }
  }

  async function handleSaveNombre(u) {
    setSavingName(true)
    const { error: updateError } = await supabase
      .from('usuarios_autorizados')
      .update({ nombre: editNombre.trim() })
      .eq('email', u.email)

    setSavingName(false)
    if (updateError) {
      error(updateError.message || 'Error al guardar el nombre')
    } else {
      success(`Nombre de ${u.email} actualizado`)
      setEditingEmail(null)
      fetchUsuarios()
    }
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
      error(updateError.message || 'Error al actualizar usuario')
    } else {
      showToast(
        u.activo ? 'Usuario desactivado' : 'Usuario activado',
        u.activo ? 'warning' : 'success'
      )
    }
  }

  async function handleDeleteUsuario(u) {
    const ok = await confirm({
      title: `¿Eliminar permanentemente a ${u.email}?`,
      message: 'Esta acción no se puede deshacer. Se eliminará la cuenta de autenticación y todos los accesos. Los registros de participación no se ven afectados.',
      danger: true,
    })
    if (!ok) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch(
        'https://evqhdemvmnhwnsnrmdzk.supabase.co/functions/v1/delete-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ emailToDelete: u.email }),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        error(result.error || 'Error al eliminar el usuario.')
        return
      }

      success(`Usuario ${u.email} eliminado.`)
      fetchUsuarios()
    } catch (err) {
      error('Error de conexión al eliminar el usuario.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── COLUMNA IZQUIERDA — INVITAR USUARIO ── */}
      <div className="bg-surface border border-border rounded-xl p-5 self-start">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Invitar nuevo usuario</span>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col gap-3">
          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">
              Correo electrónico *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@ejemplo.com"
              autoComplete="off"
              className="w-full px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">
              Nombre visible (opcional)
            </label>
            <input
              type="text"
              value={nombreInv}
              onChange={e => setNombreInv(e.target.value)}
              placeholder="Ej. Carlos Martínez"
              className="w-full px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={inviting}
            className="mt-1 bg-accent text-white text-sm font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {inviting ? 'Invitando...' : 'Enviar invitación →'}
          </button>
        </form>
      </div>

      {/* ── COLUMNA DERECHA — LISTA DE USUARIOS AUTORIZADOS ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
          <span className="text-sm font-medium text-text1">Usuarios autorizados</span>
          <span className="font-mono text-xs text-text3">{usuarios.length} total</span>
        </div>

        <div className="max-h-[500px] overflow-y-auto flex flex-col gap-2">
          {fetchError ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 bg-surface border border-border rounded-xl">
              <p className="text-sm text-danger font-medium">Error al cargar los datos</p>
              <p className="text-xs text-text3 font-mono">{fetchError}</p>
              <button
                onClick={fetchUsuarios}
                className="px-4 py-1.5 text-xs font-medium border border-border2 rounded-lg hover:bg-bg text-text1"
              >
                Reintentar
              </button>
            </div>
          ) : loading ? (
            <SkeletonList rows={4} cols={2} />
          ) : usuarios.length === 0 ? (
            <div className="text-center py-6 text-sm text-text3">Sin usuarios autorizados</div>
          ) : (
            usuarios.map(u => {
              const isEditing = editingEmail === u.email
              const isAdmin = u.rol === 'admin'

              return (
                <div
                  key={u.email}
                  className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border transition-all ${
                    !u.activo ? 'opacity-60 bg-bg/50 border-transparent' : 'border-border/60 bg-surface hover:border-border'
                  }`}
                >
                  {/* Avatar + Info */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-xs flex-shrink-0 border border-accent/20">
                      {(u.nombre || u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="text"
                            value={editNombre}
                            onChange={e => setEditNombre(e.target.value)}
                            placeholder="Nombre del usuario"
                            className="px-2 py-0.5 text-xs border border-accent rounded bg-bg text-text1 outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveNombre(u)}
                            disabled={savingName}
                            className="text-[10px] bg-accent text-white px-2 py-0.5 rounded hover:bg-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingEmail(null)}
                            className="text-[10px] text-text3 px-1 hover:text-text1"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-text1 truncate">
                            {u.nombre || u.email.split('@')[0]}
                          </span>
                          <button
                            onClick={() => {
                              setEditingEmail(u.email)
                              setEditNombre(u.nombre || '')
                            }}
                            title="Editar nombre"
                            className="text-[11px] text-text3 hover:text-accent"
                          >
                            ✎
                          </button>
                        </div>
                      )}
                      <div className="text-[11px] text-text3 font-mono truncate">{u.email}</div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto mt-1 sm:mt-0">
                    {/* Selector de Rol */}
                    <select
                      value={u.rol || 'editor'}
                      onChange={e => handleRoleChange(u, e.target.value)}
                      className={`text-[10px] font-mono font-medium px-2 py-1 rounded border outline-none cursor-pointer ${
                        isAdmin
                          ? 'bg-purple-bg text-purple border-purple/30'
                          : 'bg-blue-bg text-blue border-blue/30'
                      }`}
                    >
                      <option value="editor">EDITOR</option>
                      <option value="admin">ADMIN</option>
                    </select>

                    {/* Badge Estado */}
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                        u.activo
                          ? 'bg-accent-bg text-accent'
                          : 'bg-danger-bg text-danger'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>

                    {/* Botón Activar / Desactivar */}
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

                    {/* Botón Eliminar permanentemente (solo inactivos, solo admin, no cuenta propia) */}
                    {currentRol === 'admin' && !u.activo && u.email !== currentUser?.email && (
                      <button
                        onClick={() => handleDeleteUsuario(u)}
                        title="Eliminar permanentemente"
                        className="text-xs px-2 py-1 rounded shrink-0 border transition-colors text-danger border-danger/30 hover:bg-danger-bg"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
