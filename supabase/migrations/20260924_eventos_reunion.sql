-- ============================================================
-- Migración: 20260924_eventos_reunion.sql
-- Descripción: Tabla de eventos especiales y excepciones de reunión
--              (Asambleas de Circuito/Regional, Visitas del SC,
--              Reuniones Desplazadas y Canceladas).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.eventos_reunion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_id UUID REFERENCES public.programa_semanas(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(30) NOT NULL, -- 'asamblea_circuito', 'asamblea_regional', 'visita_sc', 'reunion_desplazada', 'reunion_cancelada', 'otro'
  titulo_evento VARCHAR(120) NOT NULL,
  fecha_original DATE,
  fecha_efectiva DATE, -- Si se desplazó el día
  hora_efectiva TIME,  -- Si se cambió la hora
  afecta_reunion VARCHAR(20) NOT NULL DEFAULT 'entre_semana', -- 'entre_semana' | 'fin_semana' | 'ambas'
  descripcion TEXT,
  creado_por UUID REFERENCES auth.users(id),
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.eventos_reunion ENABLE ROW LEVEL SECURITY;

-- 1. Política de lectura: todos los usuarios (autenticados y anónimos)
DROP POLICY IF EXISTS "Lectura eventos_reunion" ON public.eventos_reunion;
CREATE POLICY "Lectura eventos_reunion"
  ON public.eventos_reunion FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. Política de escritura: administradores autenticados
DROP POLICY IF EXISTS "Escritura administradores eventos_reunion" ON public.eventos_reunion;
CREATE POLICY "Escritura administradores eventos_reunion"
  ON public.eventos_reunion FOR ALL
  TO authenticated
  USING (
    -- Permite si la función es_admin() existe y retorna true, o si auth.uid() es válido
    COALESCE(public.es_admin(), true)
  )
  WITH CHECK (
    COALESCE(public.es_admin(), true)
  );

-- Índices de consulta rápida por semana y fechas
CREATE INDEX IF NOT EXISTS idx_eventos_reunion_semana ON public.eventos_reunion(semana_id);
CREATE INDEX IF NOT EXISTS idx_eventos_reunion_fecha_efectiva ON public.eventos_reunion(fecha_efectiva);
