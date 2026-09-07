-- ============================================================
-- Migración: 20260906_epub_disponibles.sql
-- Descripción: Tabla para metadatos de EPUBs descargados,
--              buckets de storage (epubs, backups) y políticas RLS.
-- ============================================================

-- 1. Tabla de metadatos de EPUBs
CREATE TABLE IF NOT EXISTS public.epub_disponibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  issue CHAR(6) NOT NULL UNIQUE, -- Formato YYYYMM (ej. 202609)
  url_storage TEXT NOT NULL,
  descargado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en epub_disponibles
ALTER TABLE public.epub_disponibles ENABLE ROW LEVEL SECURITY;

-- Políticas para epub_disponibles
DROP POLICY IF EXISTS "Lectura autenticada en epub_disponibles" ON public.epub_disponibles;
CREATE POLICY "Lectura autenticada en epub_disponibles"
  ON public.epub_disponibles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Escritura solo service_role en epub_disponibles" ON public.epub_disponibles;
CREATE POLICY "Escritura solo service_role en epub_disponibles"
  ON public.epub_disponibles FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Eliminación solo service_role en epub_disponibles" ON public.epub_disponibles;
CREATE POLICY "Eliminación solo service_role en epub_disponibles"
  ON public.epub_disponibles FOR DELETE
  TO service_role
  USING (true);

-- 2. Buckets en storage.buckets (idempotente)
INSERT INTO storage.buckets (id, name, public)
VALUES ('epubs', 'epubs', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de acceso a storage.objects para el bucket 'epubs'
-- Permite a usuarios autenticados descargar los EPUBs almacenados
DROP POLICY IF EXISTS "Permitir lectura de epubs a usuarios autenticados" ON storage.objects;
CREATE POLICY "Permitir lectura de epubs a usuarios autenticados"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'epubs');

-- Permite a service_role (Edge Functions) insertar y eliminar en el bucket 'epubs'
DROP POLICY IF EXISTS "Permitir inserción de epubs a service_role" ON storage.objects;
CREATE POLICY "Permitir inserción de epubs a service_role"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'epubs');

DROP POLICY IF EXISTS "Permitir eliminación de epubs a service_role" ON storage.objects;
CREATE POLICY "Permitir eliminación de epubs a service_role"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'epubs');
