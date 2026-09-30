-- ==========================================
-- SISTEMA PVP: BATALLA DE DADOS (APUESTAS 1v1)
-- ==========================================

CREATE TABLE IF NOT EXISTS pvp_partidas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creador_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  oponente_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  apuesta INTEGER NOT NULL CHECK (apuesta > 0),
  estado TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'finalizado', 'cancelado')),
  resultado_creador INTEGER,
  resultado_oponente INTEGER,
  dado1_creador INTEGER,
  dado2_creador INTEGER,
  dado1_oponente INTEGER,
  dado2_oponente INTEGER,
  ganador_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Asegurar columnas si la tabla ya existía
ALTER TABLE pvp_partidas ADD COLUMN IF NOT EXISTS dado1_creador INTEGER;
ALTER TABLE pvp_partidas ADD COLUMN IF NOT EXISTS dado2_creador INTEGER;
ALTER TABLE pvp_partidas ADD COLUMN IF NOT EXISTS dado1_oponente INTEGER;
ALTER TABLE pvp_partidas ADD COLUMN IF NOT EXISTS dado2_oponente INTEGER;

-- Habilitar RLS
ALTER TABLE pvp_partidas ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
DROP POLICY IF EXISTS "Todos pueden ver partidas PVP" ON pvp_partidas;
CREATE POLICY "Todos pueden ver partidas PVP" ON pvp_partidas FOR SELECT USING (true);

-- Configurar replicación Realtime
ALTER TABLE pvp_partidas REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'pvp_partidas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pvp_partidas;
  END IF;
END $$;

-- ==========================================
-- FUNCIONES RPC ATÓMICAS (Seguridad en BD)
-- ==========================================

-- 1. Crear una nueva partida PvP
CREATE OR REPLACE FUNCTION crear_partida_pvp(p_apuesta INTEGER, p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_saldo INTEGER;
  v_partida_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_apuesta <= 0 THEN RAISE EXCEPTION 'La apuesta debe ser mayor a 0'; END IF;
  
  -- Verificar saldo con bloqueo de fila
  SELECT puntos_total INTO v_saldo FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_saldo < p_apuesta THEN RAISE EXCEPTION 'Saldo insuficiente para crear el desafío'; END IF;
  
  -- Descontar apuesta al creador de forma atómica
  UPDATE profiles SET puntos_total = puntos_total - p_apuesta WHERE id = v_user_id;
  
  -- Crear la partida en estado 'esperando'
  INSERT INTO pvp_partidas (creador_id, apuesta, estado)
  VALUES (v_user_id, p_apuesta, 'esperando')
  RETURNING id INTO v_partida_id;
  
  RETURN v_partida_id;
END;
$$;

-- 2. Unirse y resolver partida (Atómico con 2 Dados 2d6 por jugador)
CREATE OR REPLACE FUNCTION unirse_partida_pvp(p_partida_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_partida pvp_partidas%ROWTYPE;
  v_saldo INTEGER;
  v_d1_c INTEGER;
  v_d2_c INTEGER;
  v_tot_c INTEGER;
  v_d1_o INTEGER;
  v_d2_o INTEGER;
  v_tot_o INTEGER;
  v_ganador_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  
  -- Bloquear la partida para evitar que dos usuarios entren a la vez
  SELECT * INTO v_partida FROM pvp_partidas WHERE id = p_partida_id FOR UPDATE;
  
  IF v_partida.id IS NULL THEN RAISE EXCEPTION 'Partida no encontrada'; END IF;
  IF v_partida.estado != 'esperando' THEN RAISE EXCEPTION 'La partida ya no está disponible'; END IF;
  IF v_partida.creador_id = v_user_id THEN RAISE EXCEPTION 'No puedes desafiarte a ti mismo'; END IF;
  
  -- Verificar saldo del oponente
  SELECT COALESCE(puntos_total, 0) INTO v_saldo FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_saldo < v_partida.apuesta THEN 
    RAISE EXCEPTION 'Saldo insuficiente (% pts disponibles, % requeridos)', v_saldo, v_partida.apuesta; 
  END IF;
  
  -- Descontar apuesta al oponente
  UPDATE profiles SET puntos_total = puntos_total - v_partida.apuesta WHERE id = v_user_id;
  
  -- LÓGICA DE DADOS (2 dados de 6 caras por jugador: 2-12)
  v_d1_c := floor(random() * 6) + 1;
  v_d2_c := floor(random() * 6) + 1;
  v_tot_c := v_d1_c + v_d2_c;

  v_d1_o := floor(random() * 6) + 1;
  v_d2_o := floor(random() * 6) + 1;
  v_tot_o := v_d1_o + v_d2_o;
  
  -- Resolver empates repitiendo la tirada hasta que haya un ganador claro
  WHILE v_tot_c = v_tot_o LOOP
    v_d1_c := floor(random() * 6) + 1;
    v_d2_c := floor(random() * 6) + 1;
    v_tot_c := v_d1_c + v_d2_c;

    v_d1_o := floor(random() * 6) + 1;
    v_d2_o := floor(random() * 6) + 1;
    v_tot_o := v_d1_o + v_d2_o;
  END LOOP;
  
  IF v_tot_c > v_tot_o THEN
    v_ganador_id := v_partida.creador_id;
  ELSE
    v_ganador_id := v_user_id;
  END IF;

  -- Entregar bote acumulado (apuesta * 2) al ganador
  UPDATE profiles SET puntos_total = puntos_total + (v_partida.apuesta * 2) WHERE id = v_ganador_id;
  
  -- Guardar resultado detallado (usando EXECUTE para tolerar de forma segura tablas con o sin columnas añadidas)
  BEGIN
    EXECUTE 'UPDATE pvp_partidas 
      SET estado = ''finalizado'',
          oponente_id = $1,
          resultado_creador = $2,
          resultado_oponente = $3,
          dado1_creador = $4,
          dado2_creador = $5,
          dado1_oponente = $6,
          dado2_oponente = $7,
          ganador_id = $8,
          resolved_at = NOW()
      WHERE id = $9'
    USING v_user_id, v_tot_c, v_tot_o, v_d1_c, v_d2_c, v_d1_o, v_d2_o, v_ganador_id, p_partida_id;
  EXCEPTION WHEN undefined_column THEN
    UPDATE pvp_partidas 
    SET estado = 'finalizado',
        oponente_id = v_user_id,
        resultado_creador = v_tot_c,
        resultado_oponente = v_tot_o,
        ganador_id = v_ganador_id,
        resolved_at = NOW()
    WHERE id = p_partida_id;
  END;
  
  -- Retornar resultado completo al cliente
  RETURN json_build_object(
      'partida_id', p_partida_id,
      'creador_id', v_partida.creador_id,
      'oponente_id', v_user_id,
      'creador_dado1', v_d1_c,
      'creador_dado2', v_d2_c,
      'creador_roll', v_tot_c,
      'oponente_dado1', v_d1_o,
      'oponente_dado2', v_d2_o,
      'oponente_roll', v_tot_o,
      'ganador_id', v_ganador_id,
      'premio', v_partida.apuesta * 2
  );
END;
$$;

-- 3. Cancelar partida y reembolsar puntos al creador
CREATE OR REPLACE FUNCTION cancelar_partida_pvp(p_partida_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_partida pvp_partidas%ROWTYPE;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT * INTO v_partida FROM pvp_partidas WHERE id = p_partida_id FOR UPDATE;
  
  IF v_partida.id IS NULL THEN RAISE EXCEPTION 'Partida no encontrada'; END IF;
  IF v_partida.creador_id != v_user_id THEN RAISE EXCEPTION 'Solo el creador puede cancelar esta partida'; END IF;
  IF v_partida.estado != 'esperando' THEN RAISE EXCEPTION 'La partida ya no puede ser cancelada'; END IF;
  
  -- Devolver puntos al creador
  UPDATE profiles SET puntos_total = puntos_total + v_partida.apuesta WHERE id = v_user_id;
  
  -- Marcar como cancelada
  UPDATE pvp_partidas SET estado = 'cancelado', resolved_at = NOW() WHERE id = p_partida_id;
END;
$$;
