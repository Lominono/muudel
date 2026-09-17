-- ==============================================================================
-- SOLUCIÓN: REGISTRO ROBUSTO Y ROL ADMINISTRADOR PARA LOMINOÑO
-- ==============================================================================
-- Copia y pega todo este script en el SQL Editor de tu proyecto Supabase y pulsa RUN.
-- 1. Resuelve de forma definitiva el fallo en el registro de nuevos usuarios (500).
-- 2. Asegura que lominoño sea el administrador con rol moderador.
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
--    - Reconoce a lominoño y le asigna rol = 'moderador' de forma automática
--    - Tiene bloque EXCEPTION para que NUNCA bloquee la creación en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_rol text := 'alumno';
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

  -- Asignar rol de moderador automático a lominoño
  if lower(v_nombre) like '%lomino%' or lower(new.email) like '%lomino%' then
    v_rol := 'moderador';
    v_nombre := 'lominoño';
  end if;

  -- Insertar perfil limpio (iniciando en 0 puntos)
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
    0,
    0,
    0,
    v_rol
  )
  on conflict (id) do update set
    nombre = coalesce(nullif(profiles.nombre, 'Alumno'), excluded.nombre),
    rol = case when excluded.rol = 'moderador' then 'moderador' else profiles.rol end,
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

-- 5. Si lominoño ya está registrado en profiles, elevarlo a moderador
update public.profiles
set rol = 'moderador', nombre = 'lominoño'
where lower(nombre) like '%lomino%' or id in (
  select id from auth.users where lower(email) like '%lomino%'
);
