-- ============================================================
-- Migración: 20260908_backups_tabla.sql
-- Descripción: Tabla de metadatos para backups automáticos y
--              políticas RLS en tabla y storage.objects.
-- ============================================================

-- 1. Tabla de metadatos de backups
CREATE TABLE IF NOT EXISTS public.backups_disponibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  formato TEXT NOT NULL CHECK (formato IN ('csv', 'json', 'pdf')),
  url_storage TEXT NOT NULL,
  generado_en TIMESTAMPTZ DEFAULT NOW(),
  generado_por UUID REFERENCES auth.users(id)
);

-- Habilitar RLS en backups_disponibles
ALTER TABLE public.backups_disponibles ENABLE ROW LEVEL SECURITY;

-- Políticas en public.backups_disponibles
DROP POLICY IF EXISTS "Lectura autenticada en backups_disponibles" ON public.backups_disponibles;
CREATE POLICY "Lectura autenticada en backups_disponibles"
  ON public.backups_disponibles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Inserción autenticada en backups_disponibles" ON public.backups_disponibles;
CREATE POLICY "Inserción autenticada en backups_disponibles"
  ON public.backups_disponibles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = generado_por);

DROP POLICY IF EXISTS "Eliminación autenticada en backups_disponibles" ON public.backups_disponibles;
CREATE POLICY "Eliminación autenticada en backups_disponibles"
  ON public.backups_disponibles FOR DELETE
  TO authenticated
  USING (true);

-- 2. Asegurar existencia del bucket 'backups' (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas en storage.objects para el bucket 'backups' (lectura, inserción y eliminación autenticada)
DROP POLICY IF EXISTS "Permitir lectura de backups a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir lectura de backups a usuarios autenticados"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'backups');

DROP POLICY IF EXISTS "Permitir inserción de backups a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir inserción de backups a usuarios autenticados"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'backups');

DROP POLICY IF EXISTS "Permitir eliminación de backups a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir eliminación de backups a usuarios autenticados"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'backups');
