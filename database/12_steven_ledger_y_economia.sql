-- database/12_steven_ledger_y_economia.sql
-- ============================================================================
-- MIGRACIÓN DEFINITIVA: ECONOMÍA DE STEVEEUROS, BANCA SISTEMA Y LEDGER INMUTABLE
-- Idempotente, transaccional y reversible.
-- ============================================================================

BEGIN;

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. COLUMNAS ECONÓMICAS Y DE CONTROL EN PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monedas_ruleta_yoshi integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_bonus_diario_se date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS racha_bonus_se integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_jackpot_at timestamptz;

COMMENT ON COLUMN public.profiles.monedas_ruleta_yoshi IS 'Saldo exclusivo de monedas conseguidas en Yoshi Runner para ruleta. Límite 1500 máx.';
COMMENT ON COLUMN public.profiles.ultimo_bonus_diario_se IS 'Última fecha (Europe/Madrid) en la que se cobró el bonus diario de SE.';
COMMENT ON COLUMN public.profiles.racha_bonus_se IS 'Días consecutivos de racha de bonus diario de SE (máx 7).';
COMMENT ON COLUMN public.profiles.ultimo_jackpot_at IS 'Timestamp del último jackpot de ruleta ganado (máx 1 semanal).';

-- 3. PERFIL DE LA BANCA SISTEMA (Partida doble y banco central del aula)
-- ID reservado: 00000000-0000-4000-a000-000000000000
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check CHECK (rol IN ('alumno', 'moderador', 'sistema'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-4000-a000-000000000000') THEN
    INSERT INTO public.profiles (
      id,
      nombre,
      username,
      avatar_emoji,
      color_acento,
      rol,
      puntos_total,
      monedas_ruleta_yoshi,
      onboarding_completado,
      frase
    ) VALUES (
      '00000000-0000-4000-a000-000000000000',
      'BANCA SISTEMA',
      'banca_sistema',
      '🏛️',
      '#FFD700',
      'sistema',
      5000,
      0,
      true,
      'Banco Central y Reserva de Liquidez de SMR2'
    );
  END IF;
END $$;

-- 4. TABLA DEL LEDGER INMUTABLE (Auditoría contable y partida doble)
CREATE TABLE IF NOT EXISTS public.steven_ledger (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  contrapartida_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN (
    'saldo_inicial',
    'yoshi_partida',
    'ruleta_yoshi',
    'bonus_diario',
    'mision',
    'apuesta_casino',
    'premio_casino',
    'apuesta_pvp',
    'premio_pvp',
    'comision_pvp',
    'tienda',
    'ajuste_admin',
    'reversion_admin',
    'emision_diaria_banca'
  )),
  moneda text NOT NULL CHECK (moneda IN ('steveneuros', 'monedas_yoshi')),
  cantidad integer NOT NULL, -- Positivo = crédito, Negativo = débito
  saldo_anterior integer NOT NULL,
  saldo_posterior integer NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  motivo text NOT NULL,
  idempotency_key text UNIQUE,
  detalles jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

-- Índices de alto rendimiento para auditoría
CREATE INDEX IF NOT EXISTS idx_steven_ledger_user ON public.steven_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_steven_ledger_contrapartida ON public.steven_ledger(contrapartida_id);
CREATE INDEX IF NOT EXISTS idx_steven_ledger_tipo ON public.steven_ledger(tipo);
CREATE INDEX IF NOT EXISTS idx_steven_ledger_idempotency ON public.steven_ledger(idempotency_key);

-- 5. TRIGGER INMUTABILIDAD DEL LEDGER (Prohíbe UPDATE y DELETE)
CREATE OR REPLACE FUNCTION public.fn_prevent_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El ledger contable es estrictamente inmutable. No se permite UPDATE ni DELETE. Para correcciones use reversion_admin.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_mutation ON public.steven_ledger;
CREATE TRIGGER trg_prevent_ledger_mutation
BEFORE UPDATE OR DELETE ON public.steven_ledger
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_ledger_mutation();

-- 6. SESIONES SEGURAS DE YOSHI RUNNER (Anti-cheat, expiración e idempotencia)
CREATE TABLE IF NOT EXISTS public.yoshi_sesiones (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_token text UNIQUE NOT NULL,
  started_at timestamptz DEFAULT NOW() NOT NULL,
  expires_at timestamptz DEFAULT (NOW() + interval '15 minutes') NOT NULL,
  estado text DEFAULT 'activa' CHECK (estado IN ('activa', 'finalizada', 'caducada', 'invalida')),
  monedas_recogidas integer DEFAULT 0,
  duracion_ms integer DEFAULT 0,
  distancia_m integer DEFAULT 0,
  idempotency_key text UNIQUE,
  finalizada_at timestamptz,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_yoshi_sesiones_user ON public.yoshi_sesiones(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_yoshi_sesiones_token ON public.yoshi_sesiones(session_token);

-- 7. MIGRACIÓN DE SALDOS EXISTENTES (Cuadre de saldos iniciales en el ledger)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, puntos_total, monedas_ruleta_yoshi FROM public.profiles LOOP
    -- StevenEuros iniciales
    IF NOT EXISTS (SELECT 1 FROM public.steven_ledger WHERE user_id = r.id AND tipo = 'saldo_inicial' AND moneda = 'steveneuros') THEN
      INSERT INTO public.steven_ledger (
        user_id,
        contrapartida_id,
        tipo,
        moneda,
        cantidad,
        saldo_anterior,
        saldo_posterior,
        motivo,
        idempotency_key
      ) VALUES (
        r.id,
        NULL,
        'saldo_inicial',
        'steveneuros',
        COALESCE(r.puntos_total, 0),
        0,
        COALESCE(r.puntos_total, 0),
        'Migración y cuadre inicial de StevenEuros en circulación',
        'init_se_' || r.id
      );
    END IF;

    -- Monedas de Yoshi iniciales (si tuviera)
    IF COALESCE(r.monedas_ruleta_yoshi, 0) > 0 AND NOT EXISTS (SELECT 1 FROM public.steven_ledger WHERE user_id = r.id AND tipo = 'saldo_inicial' AND moneda = 'monedas_yoshi') THEN
      INSERT INTO public.steven_ledger (
        user_id,
        contrapartida_id,
        tipo,
        moneda,
        cantidad,
        saldo_anterior,
        saldo_posterior,
        motivo,
        idempotency_key
      ) VALUES (
        r.id,
        NULL,
        'saldo_inicial',
        'monedas_yoshi',
        r.monedas_ruleta_yoshi,
        0,
        r.monedas_ruleta_yoshi,
        'Migración inicial de saldo de monedas de Yoshi',
        'init_yoshi_' || r.id
      );
    END IF;
  END LOOP;
END $$;

-- 8. FUNCIONES ATÓMICAS EN BASE DE DATOS (SECURITY DEFINER + search_path seguro)

-- A. Giro atómico de Ruleta Yoshi con débito de monedas y crédito de SE
CREATE OR REPLACE FUNCTION public.fn_ejecutar_giro_ruleta(
  p_user_id uuid,
  p_nivel text,
  p_costo_monedas integer,
  p_premio_se integer,
  p_es_jackpot boolean,
  p_motivo text,
  p_idempotency_key text,
  p_detalles jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_saldo_monedas_ant integer;
  v_saldo_monedas_post integer;
  v_saldo_se_ant integer;
  v_saldo_se_post integer;
  v_banca_id uuid := '00000000-0000-4000-a000-000000000000';
  v_banca_se_ant integer;
  v_banca_se_post integer;
  v_ledger_monedas_id uuid;
  v_ledger_se_id uuid;
BEGIN
  -- Comprobar idempotencia
  IF EXISTS (SELECT 1 FROM public.steven_ledger WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Operación ya ejecutada previamente (idempotencia duplicada)',
      'idempotente', true
    );
  END IF;

  -- Bloquear fila del usuario para consistencia atómica
  SELECT monedas_ruleta_yoshi, puntos_total
  INTO v_saldo_monedas_ant, v_saldo_se_ant
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
  END IF;

  v_saldo_monedas_ant := COALESCE(v_saldo_monedas_ant, 0);
  v_saldo_se_ant := COALESCE(v_saldo_se_ant, 0);

  IF v_saldo_monedas_ant < p_costo_monedas THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Saldo insuficiente de monedas: tienes %s y requieres %s', v_saldo_monedas_ant, p_costo_monedas)
    );
  END IF;

  -- Si hay premio en SE, comprobar solvencia de la Banca
  IF p_premio_se > 0 THEN
    SELECT puntos_total INTO v_banca_se_ant
    FROM public.profiles
    WHERE id = v_banca_id
    FOR UPDATE;

    v_banca_se_ant := COALESCE(v_banca_se_ant, 0);

    IF v_banca_se_ant < p_premio_se THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'La Banca del sistema no tiene fondos suficientes para este premio en este momento.',
        'banca_insolvente', true
      );
    END IF;
  END IF;

  -- 1. Deducir monedas de Yoshi
  v_saldo_monedas_post := v_saldo_monedas_ant - p_costo_monedas;
  
  -- 2. Acreditar StevenEuros
  v_saldo_se_post := v_saldo_se_ant + p_premio_se;

  -- Actualizar perfil usuario
  UPDATE public.profiles
  SET monedas_ruleta_yoshi = v_saldo_monedas_post,
      puntos_total = v_saldo_se_post,
      ultimo_jackpot_at = CASE WHEN p_es_jackpot THEN NOW() ELSE ultimo_jackpot_at END,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Registrar en ledger el gasto de monedas de Yoshi
  INSERT INTO public.steven_ledger (
    user_id,
    contrapartida_id,
    tipo,
    moneda,
    cantidad,
    saldo_anterior,
    saldo_posterior,
    actor_id,
    motivo,
    idempotency_key,
    detalles
  ) VALUES (
    p_user_id,
    v_banca_id,
    'ruleta_yoshi',
    'monedas_yoshi',
    -p_costo_monedas,
    v_saldo_monedas_ant,
    v_saldo_monedas_post,
    p_user_id,
    format('Tirada Ruleta Yoshi Nivel %s (-%s monedas)', p_nivel, p_costo_monedas),
    p_idempotency_key || '_monedas',
    p_detalles
  ) RETURNING id INTO v_ledger_monedas_id;

  -- Si hay premio en SE, transferir desde la Banca (partida doble)
  IF p_premio_se > 0 THEN
    v_banca_se_post := v_banca_se_ant - p_premio_se;

    -- Actualizar saldo de la Banca
    UPDATE public.profiles
    SET puntos_total = v_banca_se_post, updated_at = NOW()
    WHERE id = v_banca_id;

    -- Registrar débito en la Banca
    INSERT INTO public.steven_ledger (
      user_id,
      contrapartida_id,
      tipo,
      moneda,
      cantidad,
      saldo_anterior,
      saldo_posterior,
      actor_id,
      motivo,
      idempotency_key,
      detalles
    ) VALUES (
      v_banca_id,
      p_user_id,
      'ruleta_yoshi',
      'steveneuros',
      -p_premio_se,
      v_banca_se_ant,
      v_banca_se_post,
      p_user_id,
      format('Pago de premio Ruleta Yoshi a usuario %s (+%s SE)', p_user_id, p_premio_se),
      p_idempotency_key || '_banca_se',
      p_detalles
    );

    -- Registrar crédito en el usuario
    INSERT INTO public.steven_ledger (
      user_id,
      contrapartida_id,
      tipo,
      moneda,
      cantidad,
      saldo_anterior,
      saldo_posterior,
      actor_id,
      motivo,
      idempotency_key,
      detalles
    ) VALUES (
      p_user_id,
      v_banca_id,
      'ruleta_yoshi',
      'steveneuros',
      p_premio_se,
      v_saldo_se_ant,
      v_saldo_se_post,
      p_user_id,
      p_motivo,
      p_idempotency_key || '_user_se',
      p_detalles
    ) RETURNING id INTO v_ledger_se_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'nuevo_saldo_monedas', v_saldo_monedas_post,
    'nuevo_saldo_se', v_saldo_se_post,
    'premio_se', p_premio_se,
    'costo_monedas', p_costo_monedas
  );
END;
$$;

-- B. Ajuste Administrativo con partida doble y límites estrictos
CREATE OR REPLACE FUNCTION public.fn_ajuste_admin_saldo(
  p_admin_id uuid,
  p_target_user_id uuid,
  p_cantidad integer,
  p_motivo text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_rol text;
  v_saldo_user_ant integer;
  v_saldo_user_post integer;
  v_banca_id uuid := '00000000-0000-4000-a000-000000000000';
  v_banca_ant integer;
  v_banca_post integer;
  v_ajustes_hoy integer;
BEGIN
  -- 1. Validar que no se ajuste a sí mismo
  IF p_admin_id = p_target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'El administrador no puede ajustar su propio saldo.');
  END IF;

  -- 2. Validar motivo obligatorio
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El motivo del ajuste es obligatorio (mínimo 4 caracteres).');
  END IF;

  -- 3. Validar rol de admin
  SELECT rol INTO v_admin_rol FROM public.profiles WHERE id = p_admin_id;
  IF v_admin_rol NOT IN ('moderador', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permiso denegado: solo moderadores o administradores pueden ajustar saldos.');
  END IF;

  -- 4. Validar límite individual por operación (máx 50 SE)
  IF abs(p_cantidad) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Límite excedido: el máximo por operación individual es 50 SE.');
  END IF;

  -- 5. Validar idempotencia
  IF EXISTS (SELECT 1 FROM public.steven_ledger WHERE idempotency_key = p_idempotency_key) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Operación ya procesada (idempotencia duplicada).');
  END IF;

  -- 6. Bloquear filas y verificar saldos
  SELECT puntos_total INTO v_saldo_user_ant FROM public.profiles WHERE id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario objetivo no encontrado.');
  END IF;
  v_saldo_user_ant := COALESCE(v_saldo_user_ant, 0);

  SELECT puntos_total INTO v_banca_ant FROM public.profiles WHERE id = v_banca_id FOR UPDATE;
  v_banca_ant := COALESCE(v_banca_ant, 0);

  v_saldo_user_post := v_saldo_user_ant + p_cantidad;
  IF v_saldo_user_post < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El saldo del usuario no puede quedar negativo.');
  END IF;

  -- Si se da dinero al usuario, sale de la Banca
  v_banca_post := v_banca_ant - p_cantidad;
  IF v_banca_post < 500 AND p_cantidad > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La Banca se encuentra en reserva mínima (< 500 SE). No es posible emitir más saldo.');
  END IF;

  -- Aplicar cambios
  UPDATE public.profiles SET puntos_total = v_saldo_user_post, updated_at = NOW() WHERE id = p_target_user_id;
  UPDATE public.profiles SET puntos_total = v_banca_post, updated_at = NOW() WHERE id = v_banca_id;

  -- Registrar en ledger para el usuario
  INSERT INTO public.steven_ledger (
    user_id, contrapartida_id, tipo, moneda, cantidad, saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key
  ) VALUES (
    p_target_user_id, v_banca_id, 'ajuste_admin', 'steveneuros', p_cantidad, v_saldo_user_ant, v_saldo_user_post, p_admin_id, p_motivo, p_idempotency_key || '_user'
  );

  -- Registrar en ledger para la Banca
  INSERT INTO public.steven_ledger (
    user_id, contrapartida_id, tipo, moneda, cantidad, saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key
  ) VALUES (
    v_banca_id, p_target_user_id, 'ajuste_admin', 'steveneuros', -p_cantidad, v_banca_ant, v_banca_post, p_admin_id, format('Contrapartida ajuste admin a %s: %s', p_target_user_id, p_motivo), p_idempotency_key || '_banca'
  );

  RETURN jsonb_build_object(
    'success', true,
    'usuario_id', p_target_user_id,
    'saldo_anterior', v_saldo_user_ant,
    'nuevo_saldo_usuario', v_saldo_user_post,
    'nuevo_saldo_banca', v_banca_post
  );
END;
$$;

-- C. Auditoría y verificación de la Invariante Contable
CREATE OR REPLACE FUNCTION public.fn_auditar_integridad_economia()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_usuarios_se integer;
  v_saldo_banca integer;
  v_suministro_total integer;
  v_discrepancias jsonb := '[]'::jsonb;
  v_banca_id uuid := '00000000-0000-4000-a000-000000000000';
  r RECORD;
  v_saldo_calc integer;
BEGIN
  -- Suma de saldos actuales de usuarios (excluyendo la Banca)
  SELECT COALESCE(SUM(puntos_total), 0)
  INTO v_total_usuarios_se
  FROM public.profiles
  WHERE id <> v_banca_id;

  -- Saldo de la Banca
  SELECT COALESCE(puntos_total, 0)
  INTO v_saldo_banca
  FROM public.profiles
  WHERE id = v_banca_id;

  v_suministro_total := v_total_usuarios_se + v_saldo_banca;

  -- Comprobar si cada usuario cuadra con la suma histórica de su ledger
  FOR r IN SELECT id, nombre, puntos_total FROM public.profiles LOOP
    SELECT COALESCE(SUM(cantidad), 0)
    INTO v_saldo_calc
    FROM public.steven_ledger
    WHERE user_id = r.id AND moneda = 'steveneuros';

    IF v_saldo_calc <> COALESCE(r.puntos_total, 0) THEN
      v_discrepancias := v_discrepancias || jsonb_build_object(
        'user_id', r.id,
        'nombre', r.nombre,
        'saldo_perfil', r.puntos_total,
        'saldo_calculado_ledger', v_saldo_calc,
        'diferencia', (r.puntos_total - v_saldo_calc)
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'timestamp', NOW(),
    'circulante_usuarios_se', v_total_usuarios_se,
    'saldo_banca_se', v_saldo_banca,
    'suministro_total_ecosistema', v_suministro_total,
    'invariante_valida', (jsonb_array_length(v_discrepancias) = 0),
    'discrepancias_encontradas', jsonb_array_length(v_discrepancias),
    'detalle_discrepancias', v_discrepancias
  );
END;
$$;

-- 9. PERMISOS Y BLINDAJE RLS
ALTER TABLE public.steven_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoshi_sesiones ENABLE ROW LEVEL SECURITY;

-- steven_ledger: solo lectura de filas propias o todas para moderadores
DROP POLICY IF EXISTS "lectura ledger propio o admin" ON public.steven_ledger;
CREATE POLICY "lectura ledger propio o admin" ON public.steven_ledger
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = actor_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('moderador', 'admin'))
);

-- yoshi_sesiones: lectura e inserción propia
DROP POLICY IF EXISTS "lectura sesiones propia" ON public.yoshi_sesiones;
CREATE POLICY "lectura sesiones propia" ON public.yoshi_sesiones
FOR SELECT USING (auth.uid() = user_id);

-- Retirar permisos públicos de ejecución en funciones atómicas
-- Solo el rol service_role (usado por el backend con Service Key) puede llamarlas
REVOKE EXECUTE ON FUNCTION public.fn_ejecutar_giro_ruleta FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ejecutar_giro_ruleta TO service_role;

REVOKE EXECUTE ON FUNCTION public.fn_ajuste_admin_saldo FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_ajuste_admin_saldo TO service_role;

REVOKE EXECUTE ON FUNCTION public.fn_auditar_integridad_economia FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_auditar_integridad_economia TO service_role;

COMMIT;
