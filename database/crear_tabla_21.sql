-- ==============================================================================
-- MUUDEL: CREAR TABLA PVP_BLACKJACK Y CONFIGURAR REALTIME
-- Copia y pega esto en Supabase SQL Editor si deseas jugar al 21 online sincronizado:
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.pvp_blackjack (
  id TEXT PRIMARY KEY,
  creador_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  creador_nombre TEXT,
  oponente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  oponente_nombre TEXT,
  apuesta INTEGER NOT NULL CHECK (apuesta > 0),
  estado TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'jugando', 'finalizado', 'cancelado')),
  turno TEXT DEFAULT 'creador',
  mano_creador JSONB DEFAULT '[]'::jsonb,
  mano_oponente JSONB DEFAULT '[]'::jsonb,
  baraja_restante JSONB DEFAULT '[]'::jsonb,
  ganador_id TEXT,
  desenlace_motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pvp_blackjack ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden ver partidas de Blackjack 21" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden ver partidas de Blackjack 21" ON public.pvp_blackjack FOR SELECT USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar partidas Blackjack" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden insertar partidas Blackjack" ON public.pvp_blackjack FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar partidas Blackjack" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden actualizar partidas Blackjack" ON public.pvp_blackjack FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Todos pueden borrar partidas Blackjack" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden borrar partidas Blackjack" ON public.pvp_blackjack FOR DELETE USING (true);

-- Agregar a Realtime para escuchar cambios de cartas en vivo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER TABLE public.pvp_blackjack REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_blackjack;
  END IF;
EXCEPTION WHEN OTHERS THEN
END $$;

NOTIFY pgrst, 'reload schema';
