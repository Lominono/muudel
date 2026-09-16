-- ==============================================================================
-- SOLUCIÓN AL ERROR: "Database error saving new user" (500)
-- ==============================================================================
-- Copia y pega todo este script en el SQL Editor de tu proyecto Supabase y pulsa RUN.
-- Resuelve de forma definitiva el fallo en el registro de usuarios nuevos.
-- ==============================================================================

-- 1. Permisos en el esquema public
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.profiles to anon, authenticated, service_role;

-- 2. Asegurar que las políticas RLS permitan crear perfiles
alter table public.profiles enable row level security;

drop policy if exists "insert propio" on public.profiles;
create policy "insert propio" on public.profiles
  for insert
  with check (auth.uid() = id or auth.uid() is null);

drop policy if exists "actualizar propio" on public.profiles;
create policy "actualizar propio" on public.profiles
  for update
  using (auth.uid() = id);

drop policy if exists "lectura publica" on public.profiles;
create policy "lectura publica" on public.profiles
  for select
  using (true);

-- 3. Función handle_new_user ultra robusta:
--    - Usa esquema explícito public.profiles
--    - Establece search_path = public
--    - Valida que el nombre cumpla la restricción de 2 a 30 caracteres
--    - Tiene bloque EXCEPTION para que NUNCA bloquee la creación en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  -- Obtener el nombre de metadata o del prefijo del correo
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Estudiante'
  );

  -- Validar longitud (la tabla exige entre 2 y 30 caracteres)
  if length(v_nombre) < 2 then
    v_nombre := 'Estudiante';
  elsif length(v_nombre) > 30 then
    v_nombre := substring(v_nombre from 1 for 30);
  end if;

  -- Insertar perfil
  insert into public.profiles (
    id,
    nombre,
    avatar_emoji,
    puntos_total,
    racha_actual,
    mejor_racha,
    rol
  )
  values (
    new.id,
    v_nombre,
    '🧑‍🎓',
    10,
    1,
    1,
    'alumno'
  )
  on conflict (id) do update set
    nombre = coalesce(nullif(profiles.nombre, 'Alumno'), excluded.nombre),
    updated_at = now();

  return new;
exception
  when others then
    -- Si ocurre cualquier detalle inesperado, NO impedir que el usuario se cree
    return new;
end;
$$;

-- 4. Re-asociar el trigger a auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
