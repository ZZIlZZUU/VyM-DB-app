import { Clock, ShieldCheck } from 'lucide-react'

/**
 * Formulario reutilizable de verificación en dos pasos (2FA · TOTP) con instrucciones claras
 * para pantallas de inicio de sesión (`Login`) y guarda de rutas (`ProtectedRoute`).
 */
export default function MfaChallengeCard({
  email,
  code,
  onChangeCode,
  onSubmit,
  onCancel,
  loading = false,
  lockSeconds = 0,
  error = '',
  title = 'Verificación en dos pasos',
  submitLabel = 'Verificar y entrar',
  cancelLabel = 'Usar otra cuenta',
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Cabecera */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-muted-bg text-accent border border-accent-muted-border flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text1 leading-tight">{title}</h2>
          {email && (
            <p className="text-xs font-mono text-text3 mt-0.5 truncate">{email}</p>
          )}
        </div>
      </div>

      {/* Instrucciones claras paso a paso */}
      <div className="rounded-xl bg-surface-alt/55 border border-border p-3.5 space-y-2">
        <p className="text-xs text-text1 leading-relaxed">
          Abre tu aplicación de autenticación (<strong>Google Authenticator</strong>,{' '}
          <strong>Authy</strong>, <strong>1Password</strong> o{' '}
          <strong>Microsoft Authenticator</strong>) y escribe el código temporal de{' '}
          <strong>6 dígitos</strong> generado para tu cuenta de <strong>VyM-DB</strong>.
        </p>
        <div className="flex items-start gap-1.5 text-[11px] text-text3 leading-snug">
          <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-text3" />
          <span>
            El código cambia cada 30 segundos. Si marca error, espera al siguiente código y
            verifica que la fecha y hora de tu dispositivo estén en automático.
          </span>
        </div>
      </div>

      {/* Campo de código */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="font-mono text-xs text-text2 uppercase tracking-wider">
            Código de verificación
          </label>
          <span className="font-mono text-[11px] text-text3">{code.length}/6</span>
        </div>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => onChangeCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          required
          aria-label="Código de verificación de 6 dígitos"
          className="w-full px-3 py-2.5 border border-border2 rounded-lg text-lg font-mono tracking-[0.35em] text-center bg-surface text-text1 outline-none focus:border-accent"
        />
      </div>

      {error && (
        <div className="text-xs text-danger bg-danger-bg border border-danger/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || lockSeconds > 0 || code.length !== 6}
        className="mt-0.5 bg-accent text-white text-sm font-medium py-2.5 rounded-lg hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {loading
          ? 'Verificando código...'
          : lockSeconds > 0
          ? `Espera ${lockSeconds}s`
          : submitLabel}
      </button>

      {onCancel && (
        <div className="text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-text3 hover:text-text1 underline cursor-pointer"
          >
            {cancelLabel}
          </button>
        </div>
      )}

      <p className="text-[11px] text-text3 text-center leading-snug pt-2 border-t border-border/70">
        ¿Perdiste acceso a tu app autenticadora? Contacta a un administrador para restablecer
        tu acceso.
      </p>
    </form>
  )
}
