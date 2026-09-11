-- ============================================================
-- Migración: 20260909_reporte_mensual.sql
-- Descripción: Tabla de control de reportes mensuales automáticos
--              y políticas de seguridad RLS.
-- ============================================================

-- 1. Tabla de control de reportes mensuales
CREATE TABLE IF NOT EXISTS public.reportes_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes CHAR(6) NOT NULL UNIQUE,
  url_storage TEXT NOT NULL,
  generado_en TIMESTAMPTZ DEFAULT NOW(),
  total_participaciones INT,
  total_personas INT
);

-- 2. Habilitar RLS en reportes_mensuales
ALTER TABLE public.reportes_mensuales ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
DROP POLICY IF EXISTS "Lectura autenticada en reportes_mensuales" ON public.reportes_mensuales;
CREATE POLICY "Lectura autenticada en reportes_mensuales"
  ON public.reportes_mensuales FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Eliminación autenticada en reportes_mensuales" ON public.reportes_mensuales;
CREATE POLICY "Eliminación autenticada en reportes_mensuales"
  ON public.reportes_mensuales FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Escritura solo Edge Functions" ON public.reportes_mensuales;
CREATE POLICY "Escritura solo Edge Functions"
  ON public.reportes_mensuales FOR INSERT
  TO service_role
  WITH CHECK (true);
