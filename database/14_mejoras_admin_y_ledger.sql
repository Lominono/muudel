-- database/14_mejoras_admin_y_ledger.sql
-- ============================================================================
-- MIGRACIÓN: EXPANSIÓN DE TIPOS DE LEDGER Y SEGURIDAD DE ADMINISTRACIÓN
-- ============================================================================

BEGIN;

-- 1. Actualizar el CHECK CONSTRAINT de steven_ledger para abarcar todas las operaciones oficiales
ALTER TABLE public.steven_ledger DROP CONSTRAINT IF EXISTS steven_ledger_tipo_check;
ALTER TABLE public.steven_ledger ADD CONSTRAINT steven_ledger_tipo_check CHECK (tipo IN (
  'saldo_inicial',
  'yoshi_partida',
  'ruleta_yoshi',
  'bonus_diario',
  'mision',
  'checkin',
  'apuesta_casino',
  'premio_casino',
  'apuesta_pvp',
  'premio_pvp',
  'comision_pvp',
  'tienda',
  'ingreso_tienda',
  'bienvenida',
  'inyeccion_banca',
  'drenaje_banca',
  'estimulo_masivo',
  'ajuste_admin',
  'reversion_admin',
  'emision_diaria_banca'
));

-- 2. Asegurar que los perfiles tengan rol moderador o admin correctamente indexados
CREATE INDEX IF NOT EXISTS idx_profiles_rol ON public.profiles(rol);
CREATE INDEX IF NOT EXISTS idx_profiles_puntos ON public.profiles(puntos_total DESC);

COMMIT;
