import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Edit2,
  Trash2,
  Check,
  X,
  RotateCcw,
  Mail,
  User,
  Power,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'

import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

export default function Usuarios({ currentUser: propUser, currentRol: propRol }) {
  const [currentUser, setCurrentUser] = useState(propUser || null)
  const [currentRol, setCurrentRol] = useState(propRol || 'editor')
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [email, setEmail] = useState('')
  const [nombreInv, setNombreInv] = useState('')
  const [inviting, setInviting] = useState(false)

  const [editingEmail, setEditingEmail] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [savingName, setSavingName] = useState(false)

  const { toast, showToast, success, error } = useToast()
  const { confirm, confirmProps } = useConfirm()

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
      .channel('usuarios-sync-channel')
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

  const handleInvite = async e => {
    if (e) e.preventDefault()
    const emailTrimmed = email.trim().toLowerCase()
    if (!emailTrimmed) return

    setInviting(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(
        'https://evqhdemvmnhwnsnrmdzk.supabase.co/functions/v1/invite-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

      if (nombreInv.trim()) {
        await supabase
          .from('usuarios_autorizados')
          .update({ nombre: nombreInv.trim() })
          .eq('email', emailTrimmed)
      }

      success(`Invitación enviada a ${emailTrimmed}`)
      setEmail('')
      setNombreInv('')
      fetchUsuarios()
    } catch (err) {
      console.error(err)
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
      fetchUsuarios()
    }
  }

  async function handleDeleteUsuario(u) {
    const ok = await confirm({
      title: `¿Eliminar permanentemente a ${u.email}?`,
      message:
        'Esta acción no se puede deshacer. Se eliminará la cuenta de autenticación y todos los accesos. Los registros de participación no se ven afectados.',
      danger: true,
    })
    if (!ok) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch(
        'https://evqhdemvmnhwnsnrmdzk.supabase.co/functions/v1/delete-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ emailToDelete: u.email }),
        }
      )

      const result = await res.json()

      if (!res.ok) {
        error(result.error || 'Error al eliminar el usuario.')
        return
      }

      success(`Usuario ${u.email} eliminado permanentemente.`)
      fetchUsuarios()
    } catch (err) {
      console.error(err)
      error('Error de conexión al eliminar el usuario.')
    }
  }

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-text1">
              Usuarios y Accesos
            </h1>
            <Badge variant="neutral" size="sm">
              {usuarios.length} autorizados
            </Badge>
          </div>
          <p className="text-xs text-text2 mt-0.5">
            Administración de permisos, roles de acceso y credenciales del equipo.
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 text-xs shadow-2xs">
            <span className="text-text3 text-[11px]">Tu sesión:</span>
            <span className="font-medium text-text1 truncate max-w-[180px]">
              {currentUser.email}
            </span>
            <Badge
              variant={currentRol === 'admin' ? 'purple' : 'blue'}
              size="xs"
            >
              {currentRol.toUpperCase()}
            </Badge>
          </div>
        )}
      </div>

      {/* ── GRID PRINCIPAL: INVITAR VS LISTA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* COLUMNA 1: INVITAR NUEVO USUARIO */}
        <div className="p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-text1">
              Invitar Nuevo Usuario
            </h3>
          </div>

          <form onSubmit={handleInvite} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-text2 mb-1">
                Correo electrónico *
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                icon={Mail}
                size="md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text2 mb-1">
                Nombre visible <span className="text-text3 text-[11px]">(opcional)</span>
              </label>
              <Input
                type="text"
                value={nombreInv}
                onChange={e => setNombreInv(e.target.value)}
                placeholder="Ej. Carlos Martínez"
                icon={User}
                size="md"
              />
            </div>

            <Button
              type="submit"
              variant="accent"
              size="md"
              loading={inviting}
              disabled={!email.trim()}
              className="w-full mt-2"
            >
              Enviar invitación
            </Button>
          </form>
        </div>

        {/* COLUMNA 2 Y 3: LISTA DE USUARIOS */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-surface border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text3" />
              <h3 className="text-sm font-semibold text-text1">
                Cuentas Autorizadas
              </h3>
            </div>
            <span className="text-xs font-mono text-text3">
              {usuarios.filter(u => u.activo).length} activas · {usuarios.filter(u => !u.activo).length} inactivas
            </span>
          </div>

          <div className="space-y-2">
            {fetchError ? (
              <div className="py-12 px-4 text-center flex flex-col items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <p className="text-xs text-text3 font-mono">{fetchError}</p>
                <Button variant="outline" size="xs" onClick={fetchUsuarios}>
                  Reintentar
                </Button>
              </div>
            ) : loading ? (
              <SkeletonList rows={4} cols={2} />
            ) : usuarios.length === 0 ? (
              <div className="py-12 text-center text-xs text-text3">
                No hay usuarios autorizados registrados.
              </div>
            ) : (
              usuarios.map(u => {
                const isEditing = editingEmail === u.email
                const isAdmin = u.rol === 'admin'
                const isSelf = u.email === currentUser?.email

                return (
                  <div
                    key={u.email}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !u.activo
                        ? 'opacity-60 bg-zinc-50/40 dark:bg-zinc-900/30 border-zinc-200/60 dark:border-zinc-800/60'
                        : 'bg-surface hover:bg-zinc-50/70 dark:hover:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800/80'
                    }`}
                  >
                    {/* Avatar & User Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-center text-xs shrink-0 border border-emerald-500/20">
                        {(u.nombre || u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="text"
                              value={editNombre}
                              onChange={e => setEditNombre(e.target.value)}
                              placeholder="Nombre visible"
                              size="xs"
                              className="h-7 text-xs"
                              autoFocus
                            />
                            <Button
                              variant="accent"
                              size="iconXs"
                              loading={savingName}
                              onClick={() => handleSaveNombre(u)}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="iconXs"
                              onClick={() => setEditingEmail(null)}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-text1 truncate">
                              {u.nombre || u.email.split('@')[0]}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] text-text3 font-mono">
                                (Tú)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmail(u.email)
                                setEditNombre(u.nombre || '')
                              }}
                              className="text-text3 hover:text-text1 p-0.5 rounded cursor-pointer"
                              title="Editar nombre"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <span className="text-[11px] text-text3 font-mono block truncate">
                          {u.email}
                        </span>
                      </div>
                    </div>

                    {/* Roles & Controls */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
                      {/* Selector de Rol */}
                      <div className="w-28">
                        <Select
                          value={u.rol || 'editor'}
                          onChange={e => handleRoleChange(u, e.target.value)}
                          size="xs"
                        >
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </div>

                      {/* Estado */}
                      <Badge variant={u.activo ? 'success' : 'neutral'} size="xs">
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </Badge>

                      {/* Botón Activar / Desactivar */}
                      <Button
                        variant={u.activo ? 'outline' : 'secondary'}
                        size="xs"
                        onClick={() => toggleActivo(u)}
                        disabled={isSelf}
                        title={isSelf ? 'No puedes desactivar tu propia cuenta' : ''}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </Button>

                      {/* Botón Eliminar permanentemente (solo inactivos, solo admin, no cuenta propia) */}
                      {currentRol === 'admin' && !u.activo && !isSelf && (
                        <Button
                          variant="dangerGhost"
                          size="iconXs"
                          onClick={() => handleDeleteUsuario(u)}
                          title="Eliminar permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <Toast toast={toast} />
      <ConfirmDialog {...confirmProps} />
    </div>
  )
}
