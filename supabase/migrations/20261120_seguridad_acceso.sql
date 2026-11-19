-- ============================================================
-- Migración: 20261120_seguridad_acceso.sql
-- Descripción:
--   1. Guardrails a nivel servidor en public.usuarios_autorizados:
--      - Bloquea escalación de privilegios (no-admin no puede cambiar rol,
--        email ni reactivarse a sí mismo).
--      - Impide desactivar, degradar o eliminar al último administrador activo.
--   2. Actualiza fn_sync_email_usuario_autorizado con marca interna de transacción
--      para que el cambio confirmado desde auth.users sincronice sin bloqueos.
-- 3. RPCs SECURITY DEFINER seguras:
--      - verificar_mi_contrasena(p_password) [sin degradar sesión AAL2/MFA]
--      - verificar_cambio_correo_disponible(p_nuevo_email)
--      - puede_dar_de_baja_mi_cuenta()
--      - registrar_evento_seguridad(p_tipo, p_dispositivo, p_detalle)
--   4. Tabla inmutable (append-only) public.eventos_seguridad con RLS estricto
--      (solo el dueño de la cuenta lee sus propios eventos).
--   5. Asegura usuarios_autorizados en la publicación supabase_realtime para
--      expulsión inmediata en vivo si una cuenta es desactivada.
-- ============================================================

-- 1. Asegurar función auxiliar public.es_admin()
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_autorizados
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
      AND rol = 'admin'
      AND activo = true
  );
$$;

-- 2. Actualizar sincronización auth.users -> usuarios_autorizados con marca interna
CREATE OR REPLACE FUNCTION public.fn_sync_email_usuario_autorizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
    PERFORM set_config('app.internal_email_sync', 'true', true);
    UPDATE public.usuarios_autorizados
    SET email = LOWER(NEW.email)
    WHERE LOWER(email) = LOWER(OLD.email);
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Trigger protector anti-escalación y anti-lockout en public.usuarios_autorizados
CREATE OR REPLACE FUNCTION public.fn_proteger_usuarios_autorizados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_jwt_role       TEXT := COALESCE(auth.role(), '');
  v_caller_email   TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_is_admin       BOOLEAN := false;
  v_internal_sync  BOOLEAN := COALESCE(current_setting('app.internal_email_sync', true), '') = 'true';
  v_otros_admins   INTEGER := 0;
BEGIN
  -- Operaciones administrativas directas desde SQL Editor (postgres) sin JWT pasan libremente
  IF v_jwt_role = '' AND current_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Proteger siempre contra dejar 0 administradores activos (incluso desde admin o service_role)
  IF OLD.rol = 'admin' AND OLD.activo = true THEN
    IF TG_OP = 'DELETE'
       OR (TG_OP = 'UPDATE' AND (NEW.rol IS DISTINCT FROM 'admin' OR NEW.activo IS DISTINCT FROM true))
    THEN
      SELECT COUNT(*)
        INTO v_otros_admins
      FROM public.usuarios_autorizados
      WHERE rol = 'admin'
        AND activo = true
        AND LOWER(email) <> LOWER(OLD.email);

      IF v_otros_admins < 1 THEN
        RAISE EXCEPTION 'No se puede desactivar, degradar ni eliminar al último administrador activo.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  -- Si la operación proviene de un usuario autenticado vía PostgREST
  IF v_jwt_role = 'authenticated' AND NOT v_internal_sync THEN
    v_is_admin := public.es_admin();

    IF TG_OP = 'DELETE' THEN
      IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Solo un administrador activo puede eliminar usuarios autorizados.'
          USING ERRCODE = '42501';
      END IF;
      IF LOWER(OLD.email) = v_caller_email THEN
        RAISE EXCEPTION 'No puedes eliminar tu propia cuenta.'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
      -- Un no-admin solo puede tocar su propia fila
      IF LOWER(OLD.email) <> v_caller_email THEN
        RAISE EXCEPTION 'No tienes permiso para modificar otra cuenta.'
          USING ERRCODE = '42501';
      END IF;

      -- Bloquear cambio de rol (anti-escalación de privilegios)
      IF NEW.rol IS DISTINCT FROM OLD.rol THEN
        RAISE EXCEPTION 'No tienes permiso para modificar el rol de tu cuenta.'
          USING ERRCODE = '42501';
      END IF;

      -- Bloquear cambio directo de email (debe pasar por verificación en auth.users)
      IF LOWER(COALESCE(NEW.email, '')) IS DISTINCT FROM LOWER(COALESCE(OLD.email, '')) THEN
        RAISE EXCEPTION 'El correo solo puede cambiarse mediante verificación de identidad.'
          USING ERRCODE = '42501';
      END IF;

      -- Permitir auto-baja (true -> false), pero jamás auto-reactivación (false -> true)
      IF OLD.activo = false AND NEW.activo = true THEN
        RAISE EXCEPTION 'No puedes reactivar tu propia cuenta. Contacta a un administrador.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.usuarios_autorizados') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_proteger_usuarios_autorizados ON public.usuarios_autorizados;
    CREATE TRIGGER trg_proteger_usuarios_autorizados
      BEFORE UPDATE OR DELETE ON public.usuarios_autorizados
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_proteger_usuarios_autorizados();
  END IF;
END $$;

-- 3B. RPC: verificar contraseña actual sin degradar sesión MFA (AAL2 -> AAL1)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.verificar_mi_contrasena(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL OR p_password IS NULL OR LENGTH(p_password) = 0 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = v_uid
      AND u.encrypted_password IS NOT NULL
      AND u.encrypted_password = crypt(p_password, u.encrypted_password)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_mi_contrasena(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_mi_contrasena(TEXT) TO authenticated;

-- 4. RPC: verificar disponibilidad de nuevo correo antes de solicitar cambio en Auth
CREATE OR REPLACE FUNCTION public.verificar_cambio_correo_disponible(p_nuevo_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_caller_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_target       TEXT := LOWER(TRIM(COALESCE(p_nuevo_email, '')));
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('disponible', false, 'motivo', 'Sesión no autenticada.');
  END IF;

  IF v_target = '' OR v_target !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('disponible', false, 'motivo', 'Ingresa un correo electrónico con formato válido.');
  END IF;

  IF v_target = v_caller_email THEN
    RETURN jsonb_build_object('disponible', false, 'motivo', 'El nuevo correo es igual al actual.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuarios_autorizados
    WHERE LOWER(email) = v_target
  ) THEN
    RETURN jsonb_build_object(
      'disponible', false,
      'motivo', 'Ese correo ya pertenece a otra cuenta en usuarios autorizados.'
    );
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE LOWER(email) = v_target
      AND id <> v_uid
  ) THEN
    RETURN jsonb_build_object(
      'disponible', false,
      'motivo', 'Ese correo ya está registrado por otra cuenta de acceso.'
    );
  END IF;

  RETURN jsonb_build_object('disponible', true, 'motivo', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.verificar_cambio_correo_disponible(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verificar_cambio_correo_disponible(TEXT) TO authenticated;

-- 5. RPC: consultar si el usuario actual puede darse de baja sin dejar 0 admins
CREATE OR REPLACE FUNCTION public.puede_dar_de_baja_mi_cuenta()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_rol          TEXT;
  v_activo       BOOLEAN;
  v_admins       INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL OR v_caller_email = '' THEN
    RETURN jsonb_build_object(
      'permitido', false,
      'motivo', 'Sesión no autenticada.',
      'admins_activos', 0,
      'es_admin', false
    );
  END IF;

  SELECT rol, activo
    INTO v_rol, v_activo
  FROM public.usuarios_autorizados
  WHERE LOWER(email) = v_caller_email
  LIMIT 1;

  SELECT COUNT(*)
    INTO v_admins
  FROM public.usuarios_autorizados
  WHERE rol = 'admin'
    AND activo = true;

  IF v_rol = 'admin' AND v_activo = true AND v_admins <= 1 THEN
    RETURN jsonb_build_object(
      'permitido', false,
      'motivo', 'Eres el único administrador activo. Designa otro administrador antes de dar de baja tu cuenta.',
      'admins_activos', v_admins,
      'es_admin', true
    );
  END IF;

  RETURN jsonb_build_object(
    'permitido', true,
    'motivo', NULL,
    'admins_activos', v_admins,
    'es_admin', (v_rol = 'admin')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.puede_dar_de_baja_mi_cuenta() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.puede_dar_de_baja_mi_cuenta() TO authenticated;

-- 6. Tabla inmutable de eventos de seguridad por usuario (Security Audit Log)
CREATE TABLE IF NOT EXISTS public.eventos_seguridad (
  id BIGSERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_email TEXT NOT NULL,
  tipo TEXT NOT NULL,
  dispositivo TEXT,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_seguridad_uid_fecha
  ON public.eventos_seguridad (usuario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eventos_seguridad_email_fecha
  ON public.eventos_seguridad (LOWER(usuario_email), created_at DESC);

ALTER TABLE public.eventos_seguridad ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "eventos_seguridad_select_own" ON public.eventos_seguridad;
CREATE POLICY "eventos_seguridad_select_own"
  ON public.eventos_seguridad FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- Escritura exclusivamente vía RPC SECURITY DEFINER (append-only, sin UPDATE/DELETE cliente)
CREATE OR REPLACE FUNCTION public.registrar_evento_seguridad(
  p_tipo TEXT,
  p_dispositivo TEXT DEFAULT NULL,
  p_detalle JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT := LOWER(TRIM(COALESCE(auth.jwt() ->> 'email', '')));
  v_tipo  TEXT := UPPER(TRIM(COALESCE(p_tipo, '')));
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF v_email = '' THEN
    SELECT LOWER(u.email) INTO v_email FROM auth.users u WHERE u.id = v_uid;
  END IF;

  IF v_tipo NOT IN (
    'LOGIN_OK',
    'MFA_ENROLLED',
    'MFA_DISABLED',
    'MFA_CHALLENGE_OK',
    'PASSWORD_CHANGED',
    'PASSWORD_RESET_REQUESTED',
    'EMAIL_CHANGE_REQUESTED',
    'SIGN_OUT_OTHERS',
    'SIGN_OUT_ALL',
    'ACCOUNT_DEACTIVATED',
    'IDLE_LOGOUT'
  ) THEN
    RAISE EXCEPTION 'Tipo de evento de seguridad no permitido: %', v_tipo
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.eventos_seguridad (
    usuario_id,
    usuario_email,
    tipo,
    dispositivo,
    detalle,
    created_at
  ) VALUES (
    v_uid,
    COALESCE(v_email, 'desconocido'),
    v_tipo,
    NULLIF(LEFT(TRIM(COALESCE(p_dispositivo, '')), 160), ''),
    COALESCE(p_detalle, '{}'::jsonb),
    NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_evento_seguridad(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_evento_seguridad(TEXT, TEXT, JSONB) TO authenticated;

-- 7. Habilitar Realtime sobre usuarios_autorizados para revocación en vivo
DO $$
BEGIN
  IF to_regclass('public.usuarios_autorizados') IS NOT NULL THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios_autorizados;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
