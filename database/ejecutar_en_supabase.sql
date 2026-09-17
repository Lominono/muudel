-- ==============================================================================
-- MUUDEL: SCRIPT DEFINITIVO PARA EL SQL EDITOR DE SUPABASE
-- ==============================================================================
-- Instrucciones:
-- 1. Ve a tu panel de Supabase: https://supabase.com/dashboard/project/ehzekojovbxdkcmfbugc/sql
-- 2. Abre una "New Query"
-- 3. Pega todo este código y pulsa "RUN"
-- ==============================================================================

-- 1. Añadir columnas a profiles para username, digito_id, email y onboarding
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists digito_id text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists color_acento text default '#0A84FF';
alter table public.profiles add column if not exists onboarding_completado boolean default false;

-- 2. Asegurar que los nombres y apellidos largos no den error (hasta 60 caracteres)
alter table public.profiles drop constraint if exists profiles_nombre_check;
alter table public.profiles add constraint profiles_nombre_check check (length(nombre) >= 2 and length(nombre) <= 60);

-- 3. Permisos completos en el esquema public
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.profiles to anon, authenticated, service_role;

-- 4. RLS para permitir insertar y actualizar perfil propio
alter table public.profiles enable row level security;

drop policy if exists "insert propio" on public.profiles;
create policy "insert propio" on public.profiles
  for insert with check (auth.uid() = id or auth.uid() is null);

drop policy if exists "actualizar propio" on public.profiles;
create policy "actualizar propio" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "lectura publica" on public.profiles;
create policy "lectura publica" on public.profiles
  for select using (true);

-- 5. Auto-confirmar usuarios en auth.users para no requerir confirmación por correo
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null;

create or replace function public.auto_confirm_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  new.email_confirmed_at := coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists trg_auto_confirm_new_user on auth.users;
create trigger trg_auto_confirm_new_user
  before insert on auth.users
  for each row execute function public.auto_confirm_new_user();

-- 6. Trigger handle_new_user robusto
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
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Estudiante'
  );

  if length(v_nombre) < 2 then
    v_nombre := 'Estudiante';
  elsif length(v_nombre) > 60 then
    v_nombre := substring(v_nombre from 1 for 60);
  end if;

  if lower(v_nombre) like '%lomino%' or lower(new.email) like '%lomino%' then
    v_rol := 'moderador';
    v_nombre := 'lominoño';
  end if;

  insert into public.profiles (
    id,
    email,
    nombre,
    avatar_emoji,
    puntos_total,
    racha_actual,
    mejor_racha,
    rol,
    color_acento,
    onboarding_completado
  )
  values (
    new.id,
    new.email,
    v_nombre,
    '🧑‍🎓',
    0,
    0,
    0,
    v_rol,
    '#0A84FF',
    (v_rol = 'moderador')
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    nombre = coalesce(nullif(profiles.nombre, 'Alumno'), excluded.nombre),
    rol = case when excluded.rol = 'moderador' then 'moderador' else profiles.rol end,
    updated_at = now();

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 7. Si lominoño ya está registrado, elevarlo a moderador
update public.profiles
set rol = 'moderador', nombre = 'lominoño'
where lower(nombre) like '%lomino%' or id in (
  select id from auth.users where lower(email) like '%lomino%'
);

-- 8. Recargar la caché de PostgREST
notify pgrst, 'reload schema';
