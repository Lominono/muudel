-- database/11_ruleta_yoshi_monedas.sql
-- Añadir saldo de monedas de ruleta Yoshi para perfiles (con límite de 500)

ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS monedas_ruleta_yoshi integer DEFAULT 0;

COMMENT ON COLUMN public.profiles.monedas_ruleta_yoshi IS 'Saldo exclusivo de monedas conseguidas en Yoshi Runner para apostar en la Ruleta. Límite máximo 500.';
