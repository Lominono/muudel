-- ==============================================================================
-- RACHA DE CLASE — MIGRACIÓN SUPABASE: CONTROL DE ASISTENCIA Y SESIONES
-- Puedes copiar y pegar todo este script en el SQL Editor de Supabase.
-- Es 100% idempotente (no da errores si tablas o políticas ya existen).
-- ==============================================================================

-- 1. EXTENSIÓN UUID
create extension if not exists "uuid-ossp";

-- 2. TABLA DE PERFILES (Asegurar columnas rol, avatar_color, frase)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null default 'Estudiante',
  avatar_emoji text default '🧑‍🎓',
  color_acento text default '#0A84FF',
  frase text default '',
  puntos_total integer default 0,
  racha_actual integer default 0,
  mejor_racha integer default 0,
  ultimo_checkin text,
  rol text default 'alumno' check (rol in ('alumno', 'moderador')),
  xp_nivel integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Si la tabla ya existía, añadir columnas faltantes de forma segura
alter table profiles add column if not exists rol text default 'alumno' check (rol in ('alumno', 'moderador'));
alter table profiles add column if not exists color_acento text default '#0A84FF';
alter table profiles add column if not exists frase text default '';

-- 3. TABLA DE CHECKINS (ASISTENCIA)
create table if not exists checkins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  fecha date default current_date not null,
  hora time not null,
  es_tarde boolean default false,
  puntos_ganados integer default 10 not null,
  nota text default '',
  created_at timestamptz default now(),
  unique(user_id, fecha)
);

create index if not exists idx_checkins_fecha on checkins(fecha);
create index if not exists idx_checkins_user on checkins(user_id, fecha);

-- 4. TABLA DE SESIONES DE CLASE Y AVISOS DEL PROFESOR
create table if not exists sesiones_clase (
  id uuid default uuid_generate_v4() primary key,
  fecha date default current_date not null unique,
  codigo_pin text,
  activa boolean default true,
  abierta_por uuid references profiles(id),
  aviso text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. TABLA DE MENSAJES Y LIKES
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  canal text not null default 'general',
  texto text not null check (length(texto) >= 1 and length(texto) <= 2000),
  reply_to uuid references messages(id) on delete set null,
  likes_count integer default 0,
  soft_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists message_likes (
  user_id uuid references profiles(id) on delete cascade,
  message_id uuid references messages(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, message_id)
);

create index if not exists idx_messages_canal on messages(canal, created_at);

-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
alter table profiles enable row level security;
drop policy if exists "lectura publica perfiles" on profiles;
create policy "lectura publica perfiles" on profiles for select using (true);
drop policy if exists "actualizar propio perfil" on profiles;
create policy "actualizar propio perfil" on profiles for update using (auth.uid() = id);
drop policy if exists "insert perfil" on profiles;
create policy "insert perfil" on profiles for insert with check (auth.uid() = id or auth.uid() is null);

-- Checkins: Alumno puede ver todos y el moderador puede insertar/modificar/borrar cualquier checkin
alter table checkins enable row level security;
drop policy if exists "lectura checkins" on checkins;
create policy "lectura checkins" on checkins for select using (true);

drop policy if exists "insert checkin" on checkins;
drop policy if exists "insert propio" on checkins;
create policy "insert checkin" on checkins for insert with check (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

drop policy if exists "actualizar checkin" on checkins;
drop policy if exists "actualizar propio" on checkins;
create policy "actualizar checkin" on checkins for update using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

drop policy if exists "borrar checkin moderador" on checkins;
create policy "borrar checkin moderador" on checkins for delete using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- Sesiones de clase: Todos leen, moderador gestiona
alter table sesiones_clase enable row level security;
drop policy if exists "lectura sesiones" on sesiones_clase;
create policy "lectura sesiones" on sesiones_clase for select using (true);
drop policy if exists "gestion sesiones moderador" on sesiones_clase;
create policy "gestion sesiones moderador" on sesiones_clase for all using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- Mensajes y Likes
alter table messages enable row level security;
drop policy if exists "lectura mensajes" on messages;
create policy "lectura mensajes" on messages for select using (soft_deleted = false);
drop policy if exists "insert mensaje" on messages;
create policy "insert mensaje" on messages for insert with check (auth.uid() = user_id);
drop policy if exists "borrar mensaje" on messages;
create policy "borrar mensaje" on messages for delete using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

alter table message_likes enable row level security;
drop policy if exists "lectura likes" on message_likes;
create policy "lectura likes" on message_likes for select using (true);
drop policy if exists "insert like" on message_likes;
create policy "insert like" on message_likes for insert with check (auth.uid() = user_id);
drop policy if exists "delete like" on message_likes;
create policy "delete like" on message_likes for delete using (auth.uid() = user_id);

-- 7. TRIGGER: Auto-crear perfil en Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_rol text;
begin
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Estudiante'
  );

  v_rol := coalesce(
    nullif(trim(new.raw_user_meta_data->>'rol'), ''),
    'alumno'
  );

  if length(v_nombre) < 2 then
    v_nombre := 'Estudiante';
  elsif length(v_nombre) > 30 then
    v_nombre := substring(v_nombre from 1 for 30);
  end if;

  insert into public.profiles (
    id,
    nombre,
    puntos_total,
    racha_actual,
    mejor_racha,
    rol
  )
  values (
    new.id,
    v_nombre,
    0,
    0,
    0,
    v_rol
  )
  on conflict (id) do update set
    nombre = coalesce(nullif(profiles.nombre, 'Estudiante'), excluded.nombre),
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

-- 8. TRIGGER: Actualizar racha y puntos tras Check-in
create or replace function actualizar_racha()
returns trigger as $$
declare
  v_ultimo text;
  v_racha_actual integer;
  v_nueva_racha integer;
begin
  select fecha::text into v_ultimo
  from checkins
  where user_id = new.user_id and fecha < new.fecha
  order by fecha desc
  limit 1;

  if v_ultimo is null then
    v_nueva_racha := 1;
  else
    v_racha_actual := coalesce((select racha_actual from profiles where id = new.user_id), 0);
    v_nueva_racha := v_racha_actual + 1;
  end if;

  update profiles set
    racha_actual = v_nueva_racha,
    mejor_racha = greatest(coalesce(mejor_racha, 0), v_nueva_racha),
    ultimo_checkin = new.fecha::text,
    puntos_total = coalesce(puntos_total, 0) + new.puntos_ganados,
    xp_nivel = coalesce(puntos_total, 0) + new.puntos_ganados,
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_checkin_after_insert on checkins;
create trigger trg_checkin_after_insert
  after insert on checkins
  for each row execute function actualizar_racha();

-- 9. VISTAS DE CLASIFICACIÓN
create or replace view ranking_diario as
select p.id, p.nombre, p.color_acento, p.puntos_total,
       p.racha_actual, p.mejor_racha, p.rol, count(c.id) as checkins_hoy
from profiles p
left join checkins c on c.user_id = p.id and c.fecha = current_date
where p.rol = 'alumno'
group by p.id, p.nombre, p.color_acento, p.puntos_total, p.racha_actual, p.mejor_racha, p.rol
order by p.puntos_total desc;

create or replace view ranking_semanal as
select p.id, p.nombre, p.color_acento, p.puntos_total,
       p.racha_actual, p.mejor_racha, p.rol, count(c.id) as checkins_semana
from profiles p
left join checkins c on c.user_id = p.id and c.fecha >= current_date - interval '7 days'
where p.rol = 'alumno'
group by p.id, p.nombre, p.color_acento, p.puntos_total, p.racha_actual, p.mejor_racha, p.rol
order by p.puntos_total desc;
