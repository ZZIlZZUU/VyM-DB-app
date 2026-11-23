-- ============================================================
-- Migración: 20261122_programa_estado_revision.sql
-- Descripción: Añade soporte de estado de revisión, notas y
--              trazabilidad de verificación a programa_semanas.
-- ============================================================

ALTER TABLE public.programa_semanas
  ADD COLUMN IF NOT EXISTS estado_revision VARCHAR(20) NOT NULL DEFAULT 'borrador'
    CHECK (estado_revision IN ('borrador', 'en_revision', 'verificada')),
  ADD COLUMN IF NOT EXISTS notas_revision TEXT,
  ADD COLUMN IF NOT EXISTS revisado_por VARCHAR(120),
  ADD COLUMN IF NOT EXISTS revisado_en TIMESTAMPTZ;

COMMENT ON COLUMN public.programa_semanas.estado_revision IS 'Estado del flujo de verificación de la semana: borrador | en_revision | verificada';
COMMENT ON COLUMN public.programa_semanas.notas_revision IS 'Observaciones o cambios pendientes anotados durante la revisión del programa';
COMMENT ON COLUMN public.programa_semanas.revisado_por IS 'Usuario que cambió el estado de revisión por última vez';
COMMENT ON COLUMN public.programa_semanas.revisado_en IS 'Fecha y hora de la última actualización de estado de revisión';
