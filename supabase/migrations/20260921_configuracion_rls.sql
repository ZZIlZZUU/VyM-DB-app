-- ============================================================
-- Migración: 20260921_configuracion_rls.sql
-- Descripción: Habilitar políticas RLS para lectura y escritura
--              (INSERT / UPDATE / UPSERT) en la tabla 'configuracion'.
-- ============================================================

-- 1. Habilitar Row Level Security en la tabla configuracion
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

-- 2. Función auxiliar segura para comprobar si el usuario actual tiene rol 'admin'
-- SECURITY DEFINER asegura que la consulta a usuarios_autorizados se ejecute sin bloqueos de RLS
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

-- 3. Política de lectura: cualquier usuario (autenticado o anónimo) puede leer la configuración
DROP POLICY IF EXISTS "Lectura publica en configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Lectura autenticada en configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Lectura en configuracion" ON public.configuracion;

CREATE POLICY "Lectura en configuracion"
  ON public.configuracion FOR SELECT
  TO authenticated, anon
  USING (true);

-- 4. Política de escritura (INSERT, UPDATE, DELETE): reservada para administradores activos
DROP POLICY IF EXISTS "Escritura administradores en configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Insercion administradores en configuracion" ON public.configuracion;
DROP POLICY IF EXISTS "Actualizacion administradores en configuracion" ON public.configuracion;

CREATE POLICY "Escritura administradores en configuracion"
  ON public.configuracion FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

-- Nota alternativa:
-- Si en tu entorno prefieres permitir que cualquier usuario autenticado guarde la configuración,
-- puedes sustituir la política 4 por:
-- CREATE POLICY "Escritura autenticada en configuracion"
--   ON public.configuracion FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);
