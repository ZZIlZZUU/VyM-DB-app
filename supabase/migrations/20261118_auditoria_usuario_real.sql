-- ============================================================
-- Migración: 20261119_auditoria_usuario_real.sql
-- Descripción:
--   1. Corrige los triggers de auditoría en historial_cambios para
--      capturar el email/UID real del usuario autenticado mediante
--      auth.jwt() y auth.uid() (PostgREST v10+ / Supabase v2).
--   2. Limpia triggers de auditoría heredados para evitar duplicados.
--   3. Añade persona_clave en usuarios_autorizados para vincular
--      explícitamente cuentas con su ficha en personas.
--   4. Sincroniza cambios de correo desde auth.users hacia
--      usuarios_autorizados evitando bloqueos en ProtectedRoute.
-- ============================================================

-- 1. Asegurar estructura compatible en public.historial_cambios
CREATE TABLE IF NOT EXISTS public.historial_cambios (
  id BIGSERIAL PRIMARY KEY,
  tabla TEXT NOT NULL,
  operacion TEXT NOT NULL,
  registro_id TEXT,
  usuario_email TEXT,
  usuario_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.historial_cambios
  ADD COLUMN IF NOT EXISTS usuario_email TEXT,
  ADD COLUMN IF NOT EXISTS usuario_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Convertir registro_id a TEXT si existía como entero para soportar UUID, claves ('A-001') y emails
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT c.data_type
    INTO v_data_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'historial_cambios'
    AND c.column_name = 'registro_id';

  IF v_data_type IS NOT NULL AND v_data_type NOT IN ('text', 'character varying') THEN
    EXECUTE 'ALTER TABLE public.historial_cambios ALTER COLUMN registro_id TYPE TEXT USING registro_id::text';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_historial_cambios_email_fecha
  ON public.historial_cambios (LOWER(usuario_email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historial_cambios_created_at
  ON public.historial_cambios (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_historial_cambios_tabla_op
  ON public.historial_cambios (tabla, operacion);

-- 2. Función unificada de auditoría con resolución real de usuario autenticado
CREATE OR REPLACE FUNCTION public.fn_registrar_historial_cambios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid    UUID;
  v_email  TEXT;
  v_row    JSONB;
  v_reg_id TEXT;
BEGIN
  -- Resolver UID y email real desde el JWT de Supabase (PostgREST v10+)
  v_uid := auth.uid();
  v_email := NULLIF(TRIM(COALESCE(
    auth.jwt() ->> 'email',
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'email'
  )), '');

  -- Fallback seguro a auth.users si el JWT trae sub (uid) pero no email
  IF v_email IS NULL AND v_uid IS NOT NULL THEN
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_uid;
  END IF;

  -- Normalizar identificador de registro (soporta id SERIAL, UUID, clave o email)
  v_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  v_reg_id := COALESCE(v_row ->> 'id', v_row ->> 'clave', v_row ->> 'email');

  INSERT INTO public.historial_cambios (
    tabla,
    operacion,
    registro_id,
    usuario_email,
    usuario_id,
    datos_antes,
    datos_despues,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    v_reg_id,
    LOWER(v_email),
    v_uid,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 3. Limpiar triggers heredados de auditoría y adjuntar trigger unificado en las 8 tablas operativas
DO $$
DECLARE
  v_tablas TEXT[] := ARRAY[
    'personas',
    'participaciones',
    'programa_semanas',
    'programa_partes',
    'programa_asignaciones',
    'configuracion',
    'eventos_reunion',
    'usuarios_autorizados'
  ];
  v_tabla TEXT;
  v_trg   RECORD;
BEGIN
  FOREACH v_tabla IN ARRAY v_tablas LOOP
    IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
      RAISE NOTICE 'Tabla public.% no existe, omitiendo trigger.', v_tabla;
      CONTINUE;
    END IF;

    -- Eliminar triggers previos que escriban en historial_cambios para evitar registros duplicados
    FOR v_trg IN
      SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public'
        AND c.relname = v_tabla
        AND NOT t.tgisinternal
        AND (
          t.tgname = format('trg_auditoria_%s', v_tabla)
          OR p.prosrc ILIKE '%historial_cambios%'
        )
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', v_trg.tgname, v_tabla);
    END LOOP;

    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_historial_cambios();',
      format('trg_auditoria_%s', v_tabla),
      v_tabla
    );
  END LOOP;
END $$;

-- 4. RLS en historial_cambios: lectura autenticada; escritura exclusiva vía trigger SECURITY DEFINER
ALTER TABLE public.historial_cambios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura autenticada en historial_cambios" ON public.historial_cambios;
CREATE POLICY "Lectura autenticada en historial_cambios"
  ON public.historial_cambios FOR SELECT
  TO authenticated
  USING (true);

-- 5. Vinculación explícita Usuario <-> Participante en usuarios_autorizados
DO $$
BEGIN
  IF to_regclass('public.usuarios_autorizados') IS NOT NULL AND to_regclass('public.personas') IS NOT NULL THEN
    ALTER TABLE public.usuarios_autorizados
      ADD COLUMN IF NOT EXISTS persona_clave VARCHAR(10) REFERENCES public.personas(clave) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Sincronización automática de cambio de correo (auth.users -> public.usuarios_autorizados)
CREATE OR REPLACE FUNCTION public.fn_sync_email_usuario_autorizado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF OLD.email IS DISTINCT FROM NEW.email AND NEW.email IS NOT NULL THEN
    UPDATE public.usuarios_autorizados
    SET email = LOWER(NEW.email)
    WHERE LOWER(email) = LOWER(OLD.email);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_sync_email_usuarios_autorizados ON auth.users;
  CREATE TRIGGER trg_sync_email_usuarios_autorizados
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_email_usuario_autorizado();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Sin privilegios para crear trigger en auth.users; ejecute este bloque como propietario/postgres en Supabase SQL Editor.';
END $$;
