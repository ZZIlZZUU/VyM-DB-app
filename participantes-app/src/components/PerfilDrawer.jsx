import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import { useConfirm } from '../hooks/useConfirm'
import Toast from './Toast'
import ConfirmDialog from './ConfirmDialog'

function initials(email, nombre) {
  if (nombre && nombre.trim()) {
    return nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }
  return (email || 'U').slice(0, 2).toUpperCase()
}

export default function PerfilDrawer({ open, onClose, user, rol, onLogout, onUserUpdated }) {
  const [activeTab, setActiveTab]                     = useState('perfil')
  const [nombre, setNombre]                           = useState('')
  const [savingPerfil, setSavingPerfil]               = useState(false)
  const [currentPassword, setCurrentPassword]         = useState('')
  const [password, setPassword]                       = useState('')
  const [confirmPassword, setConfirmPassword]         = useState('')
  const [savingPassword, setSavingPassword]           = useState(false)
  const [resetLoading, setResetLoading]               = useState(false)
  const [newEmail, setNewEmail]                       = useState('')
  const [emailPassword, setEmailPassword]             = useState('')
  const [savingEmail, setSavingEmail]                 = useState(false)
  const [asignaciones, setAsignaciones]               = useState([])
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(false)
  const [historial, setHistorial]                     = useState([])
  const [loadingHistorial, setLoadingHistorial]       = useState(false)

  const { toast, showToast, success, error } = useToast()
  const { confirm, confirmProps }            = useConfirm()

  const step1Done = Boolean(currentPassword && currentPassword.trim().length > 0)
  const step2Done = Boolean(step1Done && password && password.length >= 8)
  const step3Done = Boolean(step2Done && confirmPassword && confirmPassword === password)
  const allDone   = step1Done && step2Done && step3Done
  const activeTextClass = allDone ? 'text-blue' : 'text-accent'

  const fetchPerfil = useCallback(async () => {
    if (!user?.email) return
    const { data } = await supabase
      .from('usuarios_autorizados')
      .select('nombre, rol')
      .eq('email', user.email)
      .single()
    if (data?.nombre) {
      setNombre(data.nombre)
    }
  }, [user?.email])

  const fetchProximaAsignacion = useCallback(async () => {
    if (!user?.email) return
    setLoadingAsignaciones(true)
    try {
      const { data: ua } = await supabase
        .from('usuarios_autorizados')
        .select('nombre')
        .eq('email', user.email)
        .single()

      const buscarNombre = ua?.nombre || user.email.split('@')[0]
      const { data: pers } = await supabase
        .from('personas')
        .select('clave, nombre')
        .ilike('nombre', `%${buscarNombre}%`)
        .limit(1)

      if (pers && pers.length > 0) {
        const clavePersona = pers[0].clave
        const { data: asig } = await supabase
          .from('programa_asignaciones')
          .select(`
            id, rol, confirmado,
            programa_partes (
              titulo, tipo_asignacion, duracion_min,
              programa_semanas ( fecha_inicio, fecha_fin, capitulo_biblico )
            )
          `)
          .eq('clave', clavePersona)
          .order('id', { ascending: false })
          .limit(5)

        const validas = (asig || []).filter(a => a.programa_partes && a.programa_partes.programa_semanas)
        setAsignaciones(validas)
      } else {
        setAsignaciones([])
      }
    } catch (err) {
      setAsignaciones([])
    } finally {
      setLoadingAsignaciones(false)
    }
  }, [user?.email])

  const fetchHistorial = useCallback(async () => {
    if (!user?.email) return
    setLoadingHistorial(true)
    try {
      const { data } = await supabase
        .from('historial_cambios')
        .select('*')
        .ilike('usuario_email', `%${user.email}%`)
        .order('created_at', { ascending: false })
        .limit(6)
      setHistorial(data || [])
    } catch (err) {
      setHistorial([])
    } finally {
      setLoadingHistorial(false)
    }
  }, [user?.email])

  useEffect(() => {
    if (open && user?.email) {
      fetchPerfil()
      fetchProximaAsignacion()
      fetchHistorial()
    }
  }, [open, user?.email, fetchPerfil, fetchProximaAsignacion, fetchHistorial])

  if (!open) return null

  async function handleSaveNombre(e) {
    if (e) e.preventDefault()
    if (!user?.email) return
    setSavingPerfil(true)
    const { error: err } = await supabase
      .from('usuarios_autorizados')
      .update({ nombre: nombre.trim() })
      .eq('email', user.email)

    setSavingPerfil(false)
    if (err) {
      error(err.message || 'Error al guardar el nombre')
    } else {
      success('Nombre visible actualizado')
      if (onUserUpdated) onUserUpdated()
    }
  }

  async function handleSavePassword(e) {
    if (e) e.preventDefault()
    if (!currentPassword) {
      error('Ingresa tu contraseña actual.')
      return
    }
    if (password.length < 8) {
      error('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      error('Las contraseñas no coinciden.')
      return
    }

    setSavingPassword(true)

    // Re-autenticación para verificar la contraseña actual
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: currentPassword,
    })

    if (authErr) {
      error('La contraseña actual es incorrecta.')
      setSavingPassword(false)
      return
    }

    // Actualizar la contraseña
    const { error: err } = await supabase.auth.updateUser({ password })
    setSavingPassword(false)

    if (err) {
      error(err.message || 'Error al actualizar la contraseña.')
    } else {
      success('Contraseña actualizada correctamente.')
      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
    }
  }

  async function handleForgotCurrentPassword() {
    if (!user?.email) return
    setResetLoading(true)
    const redirectUrl = `${window.location.origin}/set-password`
    const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: redirectUrl,
    })
    setResetLoading(false)

    if (err) {
      error(err.message || 'Error al enviar correo de recuperación.')
    } else {
      showToast(`Correo de recuperación enviado a ${user.email}`, 'info')
    }
  }

  async function handleSaveEmail(e) {
    if (e) e.preventDefault()
    const emailTrimmed = newEmail.trim().toLowerCase()
    if (!emailTrimmed || emailTrimmed === user?.email) {
      error('Ingresa una dirección de correo diferente a la actual.')
      return
    }
    if (!emailPassword) {
      error('Ingresa tu contraseña actual para autorizar el cambio de correo.')
      return
    }

    setSavingEmail(true)

    // Re-autenticación previa con la contraseña actual
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user?.email,
      password: emailPassword,
    })

    if (authErr) {
      error('La contraseña actual es incorrecta.')
      setSavingEmail(false)
      return
    }

    const { error: err } = await supabase.auth.updateUser({ email: emailTrimmed })
    setSavingEmail(false)

    if (err) {
      error(err.message || 'Error al solicitar el cambio de correo.')
    } else {
      showToast(`Se ha enviado un enlace de confirmación a ${emailTrimmed}.`, 'info')
      setNewEmail('')
      setEmailPassword('')
    }
  }

  async function handleBajaCuenta() {
    const ok = await confirm({
      title: '¿Dar de baja mi cuenta?',
      message: 'Tu cuenta será desactivada y perderás el acceso inmediatamente. Contacta a un administrador para reactivarla.',
      danger: true,
    })
    if (!ok) return

    const { error: err } = await supabase
      .from('usuarios_autorizados')
      .update({ activo: false })
      .eq('email', user.email)

    if (err) {
      error('Error al dar de baja la cuenta: ' + err.message)
    } else {
      onClose()
      onLogout()
    }
  }

  const isDark = rol === 'admin'

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      <ConfirmDialog {...confirmProps} />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-surface border-l border-border shadow-2xl flex flex-col z-10 animate-slide-up sm:animate-none">

        {/* Top bar header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-bg/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-sm border border-accent/20 flex-shrink-0">
              {initials(user?.email, nombre)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-text1 truncate">
                {nombre || user?.email?.split('@')[0]}
              </div>
              <div className="text-xs text-text3 font-mono truncate">{user?.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full ${
                isDark
                  ? 'bg-purple-bg text-purple border border-purple/20'
                  : 'bg-blue-bg text-blue border border-blue/20'
              }`}
            >
              {rol === 'admin' ? 'ADMIN' : 'EDITOR'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text3 hover:text-text1 hover:bg-bg"
              title="Cerrar panel"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="flex border-b border-border bg-surface px-2">
          {[
            { id: 'perfil', label: 'Mi Perfil' },
            { id: 'seguridad', label: 'Seguridad' },
            { id: 'asignaciones', label: 'Asignaciones' },
            { id: 'actividad', label: 'Actividad' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 text-center text-xs font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text3 hover:text-text1'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content area */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── PESTAÑA PERFIL ── */}
          {activeTab === 'perfil' && (
            <div className="flex flex-col gap-5">
              <form onSubmit={handleSaveNombre} className="flex flex-col gap-3">
                <div>
                  <label className="block font-mono text-xs text-text3 uppercase tracking-wider mb-1">
                    Nombre visible
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                  />
                  <p className="text-[11px] text-text3 mt-1">
                    Este nombre se mostrará en las listas de usuarios e historial de cambios.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={savingPerfil}
                  className="bg-accent text-white text-xs font-medium py-2 rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {savingPerfil ? 'Guardando...' : 'Guardar nombre'}
                </button>
              </form>

              <div className="border-t border-border pt-4">
                <div className="font-mono text-xs text-text3 uppercase tracking-wider mb-2">
                  Detalles de cuenta
                </div>
                <div className="bg-bg border border-border rounded-lg p-3 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text3">Correo registrado:</span>
                    <span className="font-mono text-text1">{user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text3">Nivel de permiso:</span>
                    <span className="font-medium text-text1 capitalize">{rol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text3">Estado de cuenta:</span>
                    <span className="text-accent font-medium">Activa</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PESTAÑA SEGURIDAD ── */}
          {activeTab === 'seguridad' && (
            <div className="flex flex-col gap-6">
                {/* Cambiar contraseña */}
                <form onSubmit={handleSavePassword} className="flex flex-col gap-3">
                  <div className="font-mono text-xs text-text3 uppercase tracking-wider">
                    Cambiar contraseña
                  </div>

                  {/* Contenedor con línea de pasos vertical a la izquierda */}
                  <div className="flex gap-3 items-stretch">
                    {/* Columna de línea de pasos */}
                    <div className="flex flex-col items-center py-2 flex-shrink-0 w-6 select-none">
                      {/* Paso 1: Contraseña actual */}
                      <div
                        title="Paso 1: Contraseña actual"
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          allDone
                            ? 'bg-blue text-white shadow-sm'
                            : step1Done
                              ? 'bg-accent text-white shadow-sm'
                              : 'bg-accent/15 text-accent border border-accent/40 animate-pulse'
                        }`}
                      >
                        {step1Done ? '✓' : '1'}
                      </div>

                      {/* Línea conectora 1 -> 2 */}
                      <div className={`w-0.5 flex-1 min-h-[38px] my-1 transition-colors duration-300 ${
                        allDone
                          ? 'bg-blue'
                          : step1Done
                            ? 'bg-accent'
                            : 'bg-border2'
                      }`} />

                      {/* Paso 2: Nueva contraseña */}
                      <div
                        title="Paso 2: Nueva contraseña"
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          allDone
                            ? 'bg-blue text-white shadow-sm'
                            : step2Done
                              ? 'bg-accent text-white shadow-sm'
                              : step1Done
                                ? 'bg-accent/15 text-accent border border-accent/40 animate-pulse'
                                : 'bg-bg text-text3 border border-border'
                        }`}
                      >
                        {step2Done ? '✓' : '2'}
                      </div>

                      {/* Línea conectora 2 -> 3 */}
                      <div className={`w-0.5 flex-1 min-h-[38px] my-1 transition-colors duration-300 ${
                        allDone
                          ? 'bg-blue'
                          : step2Done
                            ? 'bg-accent'
                            : 'bg-border2'
                      }`} />

                      {/* Paso 3: Confirmación */}
                      <div
                        title="Paso 3: Confirmación"
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          allDone
                            ? 'bg-blue text-white shadow-sm'
                            : step3Done
                              ? 'bg-accent text-white shadow-sm'
                              : step2Done
                                ? 'bg-accent/15 text-accent border border-accent/40 animate-pulse'
                                : 'bg-bg text-text3 border border-border'
                        }`}
                      >
                        {step3Done ? '✓' : '3'}
                      </div>
                    </div>

                    {/* Columna de campos */}
                    <div className="flex-1 flex flex-col gap-3.5">
                      {/* Paso 1: Contraseña actual */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-text2">
                            Paso 1: Contraseña actual *
                          </label>
                          {step1Done && (
                            <span className={`text-[10px] font-mono font-medium ${activeTextClass}`}>
                              ✓ Ingresada
                            </span>
                          )}
                        </div>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          placeholder="Ingresa tu contraseña actual"
                          required
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text1 outline-none transition-colors ${
                            step1Done ? (allDone ? 'border-blue/60' : 'border-accent/60') : 'border-border2 focus:border-accent'
                          }`}
                        />
                        <div className="text-right mt-1">
                          <button
                            type="button"
                            onClick={handleForgotCurrentPassword}
                            disabled={resetLoading}
                            className="text-[11px] text-text3 hover:text-accent underline transition-colors disabled:opacity-50"
                          >
                            {resetLoading ? 'Enviando correo...' : '¿Olvidaste tu contraseña actual?'}
                          </button>
                        </div>
                      </div>

                      {/* Aviso de bloqueo si Paso 1 está incompleto */}
                      {!step1Done && (
                        <div className="text-[11px] text-amber bg-amber/10 border border-amber/20 rounded-lg px-3 py-2 flex items-center gap-2 font-medium animate-fade-in">
                          <span>🔒</span> Debe introducir su contraseña actual primero para continuar.
                        </div>
                      )}

                      {/* Paso 2: Nueva contraseña */}
                      <div className={!step1Done ? 'opacity-50' : ''}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-text2">
                            Paso 2: Nueva contraseña *
                          </label>
                          {step2Done && (
                            <span className={`text-[10px] font-mono font-medium ${activeTextClass}`}>
                              ✓ 8+ caracteres
                            </span>
                          )}
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          minLength={8}
                          disabled={!step1Done}
                          required
                          placeholder={step1Done ? 'Mínimo 8 caracteres' : '🔒 Introduce la contraseña actual primero'}
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text1 outline-none transition-colors disabled:bg-bg/60 disabled:cursor-not-allowed ${
                            step2Done ? (allDone ? 'border-blue/60' : 'border-accent/60') : 'border-border2 focus:border-accent'
                          }`}
                        />
                      </div>

                      {/* Paso 3: Confirmar nueva contraseña */}
                      <div className={!step2Done ? 'opacity-50' : ''}>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-medium text-text2">
                            Paso 3: Confirmar nueva contraseña *
                          </label>
                          {step3Done && (
                            <span className={`text-[10px] font-mono font-medium ${activeTextClass}`}>
                              ✓ Coinciden
                            </span>
                          )}
                        </div>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          minLength={8}
                          disabled={!step2Done}
                          required
                          placeholder={step2Done ? 'Repite la nueva contraseña' : '🔒 Completa los pasos anteriores primero'}
                          className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text1 outline-none transition-colors disabled:bg-bg/60 disabled:cursor-not-allowed ${
                            step3Done ? (allDone ? 'border-blue/60' : 'border-accent/60') : 'border-border2 focus:border-accent'
                          }`}
                        />
                        {step2Done && confirmPassword && !step3Done && (
                          <p className="text-[11px] text-danger mt-1">Las contraseñas no coinciden aún.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Indicador visual de 3/3 pasos completados */}
                  {allDone && (
                    <div className="text-xs text-blue bg-blue-bg border border-blue/30 rounded-lg px-3 py-2 flex items-center justify-between animate-fade-in font-medium mt-1">
                      <span>🎉 ¡Todos los pasos completados! Listo para actualizar.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingPassword || !allDone}
                    className={`text-xs font-medium py-2.5 rounded-lg transition-all shadow-sm ${
                      allDone
                        ? 'bg-blue text-white hover:bg-blue-600'
                        : 'bg-accent text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {savingPassword ? 'Verificando y actualizando...' : allDone ? 'Confirmar y guardar nueva contraseña' : 'Actualizar contraseña'}
                  </button>
                </form>

              {/* Cambiar email */}
              <form onSubmit={handleSaveEmail} className="border-t border-border pt-4 flex flex-col gap-3">
                <div className="font-mono text-xs text-text3 uppercase tracking-wider">
                  Cambiar correo electrónico
                </div>

                <div>
                  <label className="block text-xs text-text2 mb-1">Nuevo correo electrónico *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    placeholder="nuevo@correo.com"
                    className="w-full px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs text-text2 mb-1">Contraseña actual para autorizar *</label>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    required
                    placeholder="Ingresa tu contraseña actual"
                    className="w-full px-3 py-2 border border-border2 rounded-lg text-sm bg-surface text-text1 outline-none focus:border-accent"
                  />
                  <p className="text-[11px] text-text3 mt-1">
                    Supabase enviará un correo de verificación a la nueva dirección para confirmar el cambio.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingEmail || !newEmail || !emailPassword}
                  className="bg-surface border border-border2 text-text1 hover:bg-bg text-xs font-medium py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {savingEmail ? 'Verificando y enviando...' : 'Solicitar cambio de correo'}
                </button>
              </form>
            </div>
          )}

          {/* ── PESTAÑA ASIGNACIONES ── */}
          {activeTab === 'asignaciones' && (
            <div className="flex flex-col gap-3">
              <div className="font-mono text-xs text-text3 uppercase tracking-wider">
                Próximas participaciones
              </div>

              {loadingAsignaciones ? (
                <div className="text-center py-8 text-xs text-text3">Buscando asignaciones...</div>
              ) : asignaciones.length === 0 ? (
                <div className="bg-bg border border-border rounded-xl p-6 text-center">
                  <div className="text-2xl mb-1">📋</div>
                  <div className="text-sm font-medium text-text1">Sin asignaciones programadas</div>
                  <p className="text-xs text-text3 mt-1">
                    No se encontraron partes confirmadas asignadas a tu participante en el programa activo.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {asignaciones.map(a => {
                    const parte = a.programa_partes
                    const sem = parte?.programa_semanas
                    return (
                      <div key={a.id} className="bg-bg border border-border rounded-lg p-3 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-accent font-medium">
                            {sem?.fecha_inicio ? `${sem.fecha_inicio} al ${sem.fecha_fin}` : 'Semana programada'}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.confirmado ? 'bg-accent-bg text-accent' : 'bg-amber-bg text-amber'}`}>
                            {a.confirmado ? 'Confirmada' : 'Pendiente'}
                          </span>
                        </div>
                        <div className="font-medium text-text1 mt-0.5">{parte?.titulo || 'Parte programada'}</div>
                        <div className="text-text3 flex justify-between text-[11px] mt-1">
                          <span>Tipo: {parte?.tipo_asignacion}</span>
                          <span>Rol: {a.rol}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── PESTAÑA ACTIVIDAD ── */}
          {activeTab === 'actividad' && (
            <div className="flex flex-col gap-3">
              <div className="font-mono text-xs text-text3 uppercase tracking-wider">
                Historial de actividad reciente
              </div>

              {loadingHistorial ? (
                <div className="text-center py-8 text-xs text-text3">Cargando auditoría...</div>
              ) : historial.length === 0 ? (
                <div className="bg-bg border border-border rounded-xl p-6 text-center">
                  <div className="text-2xl mb-1">⟳</div>
                  <div className="text-sm font-medium text-text1">Sin cambios registrados</div>
                  <p className="text-xs text-text3 mt-1">
                    Tus acciones recientes en la base de datos aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {historial.map(h => {
                    const data = h.datos_despues || h.datos_antes || {}
                    const info = data.nombre || data.clave || (data.mes ? `${data.tipo} (${data.mes})` : null)
                    const label = h.operacion === 'INSERT'
                      ? `Agregado en ${h.tabla}${info ? `: ${info}` : ''}`
                      : h.operacion === 'DELETE'
                        ? `Eliminado de ${h.tabla}${info ? `: ${info}` : ''}`
                        : h.operacion === 'UPDATE'
                          ? `Modificado en ${h.tabla}${info ? `: ${info}` : ''}`
                          : `Cambio en ${h.tabla}`

                    return (
                      <div key={h.id || h.created_at} className="bg-bg border border-border rounded-lg p-3 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[11px] text-text3">
                            {new Date(h.created_at || h.fecha || Date.now()).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 border border-border rounded text-text2">
                            {h.operacion} · {h.tabla}
                          </span>
                        </div>
                        <div className="text-text1 mt-1 leading-snug">{label}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-border bg-bg/50 flex flex-col gap-2">
          <button
            onClick={() => {
              onClose()
              onLogout()
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-border2 text-xs font-medium text-text1 hover:bg-bg hover:text-danger hover:border-danger transition-colors"
          >
            Cerrar sesión
          </button>

          <button
            onClick={handleBajaCuenta}
            className="w-full py-1.5 text-center text-[11px] text-text3 hover:text-danger transition-colors"
          >
            Dar de baja mi cuenta
          </button>
        </div>

      </div>

      <Toast toast={toast} />
    </div>
  )
}
