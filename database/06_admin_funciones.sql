-- =========================================================
-- FUNCIONES DE ADMINISTRACIÓN Y MODERACIÓN CON SECURITY DEFINER
-- Permite eliminar usuarios en cascada y modificar puntajes
-- =========================================================

-- 1. Actualizar RLS en profiles para moderadores
DROP POLICY IF EXISTS "actualizar propio" ON profiles;
CREATE POLICY "actualizar propio" ON profiles 
FOR UPDATE USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'moderador')
);

DROP POLICY IF EXISTS "borrar perfiles" ON profiles;
CREATE POLICY "borrar perfiles" ON profiles 
FOR DELETE USING (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'moderador')
);

-- 2. Función atómica para modificar puntaje y racha (Superuser / Security Definer)
CREATE OR REPLACE FUNCTION admin_modificar_puntos(
  p_user_id UUID,
  p_nuevos_puntos INTEGER,
  p_nueva_racha INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_perfil RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ID de usuario nulo';
  END IF;

  UPDATE profiles
  SET puntos_total = GREATEST(0, p_nuevos_puntos),
      racha_actual = CASE WHEN p_nueva_racha IS NOT NULL THEN GREATEST(0, p_nueva_racha) ELSE racha_actual END,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_perfil;

  IF v_perfil.id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_perfil.id,
    'nombre', v_perfil.nombre,
    'puntos_total', v_perfil.puntos_total,
    'racha_actual', v_perfil.racha_actual
  );
END;
$$;

-- 3. Función atómica para eliminar usuario en cascada real (Superuser / Security Definer)
CREATE OR REPLACE FUNCTION admin_eliminar_usuario(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ID de usuario nulo';
  END IF;

  -- Eliminar registros dependientes
  DELETE FROM message_likes WHERE user_id = p_user_id;
  DELETE FROM messages WHERE user_id = p_user_id;
  DELETE FROM checkins WHERE user_id = p_user_id;
  DELETE FROM reto_completado WHERE user_id = p_user_id;
  DELETE FROM achievements WHERE user_id = p_user_id;
  DELETE FROM apuntes WHERE user_id = p_user_id;
  
  -- Tablas opcionales si existen
  BEGIN
    DELETE FROM pvp_partidas WHERE creador_id = p_user_id OR oponente_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM pvp_blackjack WHERE creador_id = p_user_id OR oponente_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM arcade_scores WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM juegos_puntuaciones WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  BEGIN
    DELETE FROM login_records WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN NULL; END;

  -- Eliminar de profiles
  DELETE FROM profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'mensaje', 'Usuario eliminado con éxito en cascada',
    'id', p_user_id
  );
END;
$$;
