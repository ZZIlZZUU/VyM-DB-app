-- ============================================================
-- Migración: 20261012_eventos_visitante.sql
-- Descripción: Ampliación de la tabla eventos_reunion para
--              soportar oradores visitantes (Superintendente de Circuito
--              y Representantes de la Sucursal).
-- ============================================================

ALTER TABLE public.eventos_reunion
  ADD COLUMN IF NOT EXISTS nombre_visitante VARCHAR(120),
  ADD COLUMN IF NOT EXISTS oracion_visitante BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.eventos_reunion.nombre_visitante IS 'Nombre del orador visitante para semanas de visita del SC o Representante de Sucursal';
COMMENT ON COLUMN public.eventos_reunion.oracion_visitante IS 'Indica si el orador visitante concluye la reunión con la oración final';
