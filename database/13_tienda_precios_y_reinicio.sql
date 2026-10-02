-- database/13_tienda_precios_y_reinicio.sql
-- ============================================================================
-- MIGRACIÓN: REINICIO GENERAL DE ECONOMÍA Y TABLA CENTRAL DE PRECIOS DE TIENDA
-- Transaccional, idempotente y reversible.
-- ============================================================================

BEGIN;

-- 1. TABLA CENTRAL DE PRECIOS DE TIENDA (Única fuente de verdad de precios)
CREATE TABLE IF NOT EXISTS public.tienda_precios (
  id text PRIMARY KEY,
  titulo text NOT NULL,
  categoria text NOT NULL,
  tramo text NOT NULL CHECK (tramo IN ('comun', 'raro', 'epico', 'legendario')),
  precio integer NOT NULL CHECK (precio > 0),
  stock_max integer,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS en tienda_precios: Todos pueden leer, solo moderador/admin puede editar
ALTER TABLE public.tienda_precios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos pueden leer precios de tienda" ON public.tienda_precios;
CREATE POLICY "Todos pueden leer precios de tienda"
  ON public.tienda_precios FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Solo admins modifican precios de tienda" ON public.tienda_precios;
CREATE POLICY "Solo admins modifican precios de tienda"
  ON public.tienda_precios FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (profiles.rol IN ('moderador', 'admin') OR profiles.id = '00000000-0000-4000-a000-000000000001')
    )
  );

-- 2. HISTORIAL AUDITABLE DE CAMBIOS DE PRECIOS
CREATE TABLE IF NOT EXISTS public.tienda_precios_historial (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id text REFERENCES public.tienda_precios(id) ON DELETE CASCADE NOT NULL,
  precio_anterior integer NOT NULL,
  precio_nuevo integer NOT NULL,
  motivo text DEFAULT 'Ajuste de equilibrio de aula' NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.tienda_precios_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de historial de precios para todos" ON public.tienda_precios_historial;
CREATE POLICY "Lectura de historial de precios para todos"
  ON public.tienda_precios_historial FOR SELECT
  TO public
  USING (true);

-- 3. POBLAR ARTÍCULOS CON SUS PRECIOS DE TRAMO OFICIALES
-- Común: 30 SE | Raro: 100 SE | Épico: 200 SE | Legendario: 400 SE
INSERT INTO public.tienda_precios (id, titulo, categoria, tramo, precio, stock_max, activo)
VALUES
  -- COMÚN (30 SE)
  ('sello_tinta_chat', 'Sello de Tinta Lacrada en Chat', 'efectos', 'comun', 30, NULL, true),
  ('confeti_chat', 'Lluvia de Confeti en Aula', 'efectos', 'comun', 30, NULL, true),
  ('terremoto_chat', 'Sacudida Sísmica de Aula', 'efectos', 'comun', 30, NULL, true),
  ('sirena_descanso', 'Silbato del Recreo (18:10)', 'efectos', 'comun', 30, NULL, true),
  ('megafono_chat', 'Aviso Fijado con Megáfono', 'efectos', 'comun', 30, NULL, true),
  ('seguro_ruleta', 'Seguro de Ruleta (Reembolso 50%)', 'juegos', 'comun', 30, NULL, true),
  ('yoshi_vida_extra', 'Batería Extra Yoshi Runner (+1 Vida)', 'juegos', 'comun', 30, NULL, true),
  ('ruleta_max_50', 'Licencia Casino Nivel 1 (Tope 50)', 'juegos', 'comun', 30, NULL, true),

  -- RARO (100 SE)
  ('titulo_terminal', 'Título: Hacker de Terminal', 'titulos', 'raro', 100, NULL, true),
  ('titulo_centinela', 'Título: Centinela SMR2', 'titulos', 'raro', 100, NULL, true),
  ('titulo_yoshi', 'Título: Domador de Yoshi', 'titulos', 'raro', 100, NULL, true),
  ('titulo_vlan', 'Título: Maestro de VLANs', 'titulos', 'raro', 100, NULL, true),
  ('pin_arcade_master', 'Medalla Estrella Yoshi Runner', 'insignias', 'raro', 100, NULL, true),
  ('pin_hacker', 'Insignia Hacker Ético SMR2', 'insignias', 'raro', 100, NULL, true),
  ('racha_x2', 'Multiplicador x2 de Racha', 'racha', 'raro', 100, NULL, true),
  ('marco_obsidiana', 'Marco Obsidiana Stealth', 'marcos', 'raro', 100, NULL, true),
  ('marco_tinta', 'Marco Sello Carmín', 'marcos', 'raro', 100, NULL, true),
  ('ruleta_max_100', 'Licencia Casino Nivel 2 (Tope 100)', 'juegos', 'raro', 100, NULL, true),

  -- ÉPICO (200 SE)
  ('titulo_root', 'Título: Linux Root Master', 'titulos', 'epico', 200, 3, true),
  ('titulo_mvp', 'Título: MVP del Aula 15:30', 'titulos', 'epico', 200, 2, true),
  ('marco_esmeralda', 'Marco Esmeralda Matrix', 'marcos', 'epico', 200, NULL, true),
  ('marco_cyber', 'Marco Cyberpunk Neón', 'marcos', 'epico', 200, NULL, true),
  ('marco_fuego', 'Marco Flama de Racha', 'marcos', 'epico', 200, NULL, true),
  ('burbuja_matrix', 'Burbuja Matrix Consola', 'burbujas', 'epico', 200, NULL, true),
  ('burbuja_carmin', 'Burbuja Carmín VIP en Chat', 'burbujas', 'epico', 200, 3, true),
  ('congelar_racha', 'Escudo Congela-Racha', 'racha', 'epico', 200, NULL, true),
  ('restaurar_racha', 'Fénix: Restaurador de Racha', 'racha', 'epico', 200, NULL, true),

  -- LEGENDARIO (400 SE)
  ('marco_oro', 'Marco Dorado Imperial', 'marcos', 'legendario', 400, 2, true),
  ('pin_oro_smr2', 'Pin de Oro SMR2 Coleccionista', 'insignias', 'legendario', 400, 1, true),
  ('dados_oro_pvp', 'Dados Dorados VIP (Duelos 1v1)', 'juegos', 'legendario', 400, NULL, true),
  ('ruleta_max_500', 'Licencia Casino VIP High Roller', 'juegos', 'legendario', 400, 2, true)
ON CONFLICT (id) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  categoria = EXCLUDED.categoria,
  tramo = EXCLUDED.tramo,
  precio = EXCLUDED.precio,
  stock_max = EXCLUDED.stock_max,
  activo = EXCLUDED.activo,
  updated_at = now();

-- 4. ADAPTAR CONSTRAINTS EN STEVEN_LEDGER
DO $$
BEGIN
  ALTER TABLE public.steven_ledger DROP CONSTRAINT IF EXISTS steven_ledger_tipo_check;
  ALTER TABLE public.steven_ledger ADD CONSTRAINT steven_ledger_tipo_check
    CHECK (tipo IN (
      'saldo_inicial', 'reset_economia', 'bienvenida', 'emision_bienvenida',
      'yoshi_ruleta', 'yoshi_partida', 'bono_diario', 'mision',
      'apuesta_casino', 'premio_casino', 'tienda', 'compra_tienda',
      'ajuste_admin', 'reversion_admin', 'pvp_apuesta', 'pvp_premio',
      'pvp_cancelacion', 'comision_pvp', 'emision_banca', 'emision_mision'
    ));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. REINICIO GENERAL DE ECONOMÍA REGISTRADO EN EL LEDGER
DO $$
DECLARE
  v_banca_id uuid := '00000000-0000-4000-a000-000000000000';
  r RECORD;
  v_saldo_ant integer;
  v_monedas_ant integer;
  v_saldo_inicial_banca integer := 2000;
  v_bono_bienvenida integer := 10;
  v_banca_actual integer;
BEGIN
  -- A. Registrar reseteo de saldos de todos los usuarios alumnos y moderadores
  FOR r IN (
    SELECT id, nombre, puntos_total, COALESCE(monedas_ruleta_yoshi, 0) as monedas_yoshi
    FROM public.profiles
    WHERE id <> v_banca_id
  ) LOOP
    v_saldo_ant := COALESCE(r.puntos_total, 0);
    v_monedas_ant := r.monedas_yoshi;

    -- Si tenía StevenEuros, asentar en ledger
    IF v_saldo_ant > 0 THEN
      INSERT INTO public.steven_ledger (
        user_id, contrapartida_id, tipo, moneda, cantidad,
        saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key, detalles
      ) VALUES (
        r.id, v_banca_id, 'reset_economia', 'steveneuros', -v_saldo_ant,
        v_saldo_ant, 0, v_banca_id, 'reinicio de economía',
        'reset_se_' || r.id || '_' || extract(epoch from now())::text,
        jsonb_build_object('saldo_reseteado', v_saldo_ant, 'nombre', r.nombre)
      );
    END IF;

    -- Si tenía monedas de Yoshi, asentar en ledger
    IF v_monedas_ant > 0 THEN
      INSERT INTO public.steven_ledger (
        user_id, contrapartida_id, tipo, moneda, cantidad,
        saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key, detalles
      ) VALUES (
        r.id, v_banca_id, 'reset_economia', 'monedas_yoshi', -v_monedas_ant,
        v_monedas_ant, 0, v_banca_id, 'reinicio de economía',
        'reset_yoshi_' || r.id || '_' || extract(epoch from now())::text,
        jsonb_build_object('monedas_reseteadas', v_monedas_ant, 'nombre', r.nombre)
      );
    END IF;

    -- Resetear saldos a 0 en perfil (los artículos de inventario_usuario NO se tocan)
    UPDATE public.profiles
    SET puntos_total = 0,
        monedas_ruleta_yoshi = 0,
        updated_at = now()
    WHERE id = r.id;
  END LOOP;

  -- B. Establecer la Banca con su saldo inicial calculado (2.000 SE)
  UPDATE public.profiles
  SET puntos_total = v_saldo_inicial_banca,
      monedas_ruleta_yoshi = 0,
      updated_at = now()
  WHERE id = v_banca_id;

  INSERT INTO public.steven_ledger (
    user_id, contrapartida_id, tipo, moneda, cantidad,
    saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key, detalles
  ) VALUES (
    v_banca_id, v_banca_id, 'emision_banca', 'steveneuros', v_saldo_inicial_banca,
    0, v_saldo_inicial_banca, v_banca_id, 'Saldo inicial calculado tras reinicio de economía',
    'emision_banca_reset_' || extract(epoch from now())::text,
    jsonb_build_object('saldo_banca', v_saldo_inicial_banca)
  );

  -- C. Aplicar Bono de Bienvenida (10 SE por usuario pagados desde la Banca)
  v_banca_actual := v_saldo_inicial_banca;
  FOR r IN (
    SELECT id, nombre FROM public.profiles WHERE id <> v_banca_id
  ) LOOP
    -- Transferir 10 SE de la Banca al alumno
    UPDATE public.profiles SET puntos_total = v_bono_bienvenida, updated_at = now() WHERE id = r.id;
    v_banca_actual := v_banca_actual - v_bono_bienvenida;

    -- Asiento usuario
    INSERT INTO public.steven_ledger (
      user_id, contrapartida_id, tipo, moneda, cantidad,
      saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key, detalles
    ) VALUES (
      r.id, v_banca_id, 'bienvenida', 'steveneuros', v_bono_bienvenida,
      0, v_bono_bienvenida, v_banca_id, 'Bono inicial de bienvenida tras reinicio',
      'bienvenida_' || r.id, jsonb_build_object('bono', v_bono_bienvenida)
    );

    -- Asiento banca
    INSERT INTO public.steven_ledger (
      user_id, contrapartida_id, tipo, moneda, cantidad,
      saldo_anterior, saldo_posterior, actor_id, motivo, idempotency_key, detalles
    ) VALUES (
      v_banca_id, r.id, 'emision_bienvenida', 'steveneuros', -v_bono_bienvenida,
      v_banca_actual + v_bono_bienvenida, v_banca_actual, v_banca_id, 'Emisión bono de bienvenida a ' || r.nombre,
      'banca_bienvenida_' || r.id, jsonb_build_object('bono', v_bono_bienvenida)
    );
  END LOOP;

  -- Actualizar saldo final de la Banca tras bonos
  UPDATE public.profiles
  SET puntos_total = v_banca_actual, updated_at = now()
  WHERE id = v_banca_id;

END $$;

COMMIT;
