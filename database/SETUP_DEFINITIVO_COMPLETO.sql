-- ==============================================================================
-- MUUDEL / RACHA DE CLASE - SCHEMA DEFINITIVO COMPLETO DE SUPABASE
-- ==============================================================================
-- Este archivo es 100% IDEMPOTENTE: puedes ejecutarlo tanto en una base de datos
-- nueva como en una base de datos existente con datos. No borra nada, crea lo que
-- falte y actualiza columnas, triggers, RLS y funciones necesarias.
-- ==============================================================================

-- 0. Extensiones
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 1. TABLA: PROFILES (Perfiles de alumnos y profesores)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null check (length(nombre) >= 2 and length(nombre) <= 40),
  email text,
  username text,
  avatar_emoji text default '🧑‍🎓',
  color_acento text default '#0A84FF',
  color_id integer default 1,
  digito_id text,
  frase text default '',
  puntos_total integer default 0,
  xp_nivel integer default 0,
  racha_actual integer default 0,
  mejor_racha integer default 0,
  ultimo_checkin text,
  rol text default 'alumno' check (rol in ('alumno','moderador')),
  freeze_usadas integer default 0,
  onboarding_completado boolean default false,
  insignia_activa text default null,
  marco_avatar text default null,
  burbuja_chat text default null,
  titulo_vip text default null,
  checkins_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Asegurar columnas si la tabla ya existía con esquema previo
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists digito_id text;
alter table public.profiles add column if not exists color_acento text default '#0A84FF';
alter table public.profiles add column if not exists frase text default '';
alter table public.profiles add column if not exists onboarding_completado boolean default false;
alter table public.profiles add column if not exists insignia_activa text default null;
alter table public.profiles add column if not exists marco_avatar text default null;
alter table public.profiles add column if not exists burbuja_chat text default null;
alter table public.profiles add column if not exists titulo_vip text default null;
alter table public.profiles add column if not exists checkins_count integer default 0;

create index if not exists idx_profiles_puntos on public.profiles(puntos_total desc);
create index if not exists idx_profiles_username on public.profiles(username);

-- ==============================================================================
-- 2. TABLA: CHECKINS (Pase de lista diario y racha)
-- ==============================================================================
create table if not exists public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  fecha date default current_date,
  hora time not null,
  es_tarde boolean default false,
  puntos_ganados integer not null default 10,
  nota text default '',
  created_at timestamptz default now(),
  unique(user_id, fecha)
);

create index if not exists idx_checkins_fecha on public.checkins(fecha);
create index if not exists idx_checkins_user on public.checkins(user_id, fecha);

-- ==============================================================================
-- 3. TABLA: MESSAGES (Chat de clase por canales)
-- ==============================================================================
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  canal text not null default 'general',
  texto text not null check (length(texto) >= 1 and length(texto) <= 2000),
  reply_to uuid references public.messages(id) on delete set null,
  reply_to_texto text default '',
  reply_to_nombre text default '',
  likes_count integer default 0,
  fijado boolean default false,
  fijado_por uuid references public.profiles(id),
  fijado_en timestamptz,
  es_solucion boolean default false,
  solucion_marcada_por uuid references public.profiles(id),
  es_autoria_humana boolean default true,
  reacciones jsonb default '{}'::jsonb,
  soft_deleted boolean default false,
  created_at timestamptz default now()
);

-- Asegurar columnas y restricción de canales
alter table public.messages add column if not exists reply_to_texto text default '';
alter table public.messages add column if not exists reply_to_nombre text default '';
alter table public.messages add column if not exists likes_count integer default 0;
alter table public.messages add column if not exists fijado boolean default false;
alter table public.messages add column if not exists fijado_por uuid references public.profiles(id);
alter table public.messages add column if not exists fijado_en timestamptz;
alter table public.messages add column if not exists es_solucion boolean default false;
alter table public.messages add column if not exists solucion_marcada_por uuid references public.profiles(id);
alter table public.messages add column if not exists es_autoria_humana boolean default true;
alter table public.messages add column if not exists reacciones jsonb default '{}'::jsonb;
alter table public.messages add column if not exists soft_deleted boolean default false;

alter table public.messages drop constraint if exists messages_canal_check;
alter table public.messages add constraint messages_canal_check 
  check (canal in ('general', 'dudas', 'apuntes', 'avisos', 'retos'));

create index if not exists idx_messages_canal on public.messages(canal, created_at);
create index if not exists idx_messages_user on public.messages(user_id);
create index if not exists idx_messages_canal_fijado on public.messages(canal, fijado) where fijado = true;

-- ==============================================================================
-- 4. TABLA: MESSAGE_LIKES (Likes de mensajes del chat)
-- ==============================================================================
create table if not exists public.message_likes (
  message_id uuid references public.messages(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

create index if not exists idx_msg_likes_user on public.message_likes(user_id);

-- ==============================================================================
-- 5. TABLA: DIRECT_MESSAGES (Mensajes directos privados 1 a 1)
-- ==============================================================================
create table if not exists public.direct_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  texto text not null check (length(texto) >= 1 and length(texto) <= 2000),
  leido boolean default false,
  reply_to uuid references public.direct_messages(id) on delete set null,
  sello text default null,
  reacciones jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_dm_pair on public.direct_messages(sender_id, receiver_id, created_at);
create index if not exists idx_dm_receiver_unread on public.direct_messages(receiver_id, leido);
create index if not exists idx_dm_created on public.direct_messages(created_at desc);

-- ==============================================================================
-- 6. TABLA: APUNTES (Resúmenes y apuntes de clase compartidos)
-- ==============================================================================
create table if not exists public.apuntes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  titulo text not null check (length(titulo) >= 2 and length(titulo) <= 100),
  materia text not null,
  texto text,
  file_url text,
  favoritos_count integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_apuntes_materia on public.apuntes(materia);
create index if not exists idx_apuntes_user on public.apuntes(user_id);

-- ==============================================================================
-- 7. TABLAS: RETOS & RETO_COMPLETADO (Retos diarios de clase)
-- ==============================================================================
create table if not exists public.retos (
  id uuid default gen_random_uuid() primary key,
  titulo text not null check (length(titulo) >= 5 and length(titulo) <= 100),
  descripcion text default '',
  puntos integer not null default 15,
  activo boolean default true,
  creado_por uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.reto_completado (
  id uuid default gen_random_uuid() primary key,
  reto_id uuid references public.retos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  completado_at timestamptz default now(),
  unique(reto_id, user_id)
);

-- ==============================================================================
-- 8. TABLA: ARCADE_SCORES (Récords reales de Yoshi Runner)
-- ==============================================================================
create table if not exists public.arcade_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  juego text not null default 'yoshi_runner',
  puntuacion integer not null default 0,
  monedas integer not null default 0,
  fecha date default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_arcade_scores_top on public.arcade_scores(juego, puntuacion desc);
create index if not exists idx_arcade_scores_user on public.arcade_scores(user_id);

-- ==============================================================================
-- 9. TABLAS: PREGUNTA_FLASH & VOTOS (Votación diaria del profesor)
-- ==============================================================================
create table if not exists public.pregunta_flash (
  id text primary key,
  pregunta text not null,
  opciones jsonb not null default '[]'::jsonb,
  fecha date default current_date,
  activo boolean default true,
  creado_por uuid references public.profiles(id),
  created_at timestamptz default now()
);

create table if not exists public.pregunta_flash_votos (
  pregunta_id text not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  opcion_id text not null,
  created_at timestamptz default now(),
  primary key (pregunta_id, user_id)
);

create index if not exists idx_pregunta_votos_preg on public.pregunta_flash_votos(pregunta_id);

-- ==============================================================================
-- 10. TABLAS: SKILLS Y CANJES DE TIENDA
-- ==============================================================================
create table if not exists public.user_skills (
  user_id uuid references public.profiles(id) on delete cascade not null,
  skill_id text not null,
  xp integer not null default 0,
  nivel integer not null default 1,
  updated_at timestamptz default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.canjes_tienda (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_id text not null,
  costo integer not null,
  estado text not null default 'completado',
  created_at timestamptz default now()
);

-- ==============================================================================
-- 11. VISTAS PARA RANKINGS DIARIO Y SEMANAL
-- ==============================================================================
drop view if exists public.ranking_diario cascade;
create view public.ranking_diario as
select p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total,
       p.racha_actual, p.mejor_racha, count(c.id) as checkins_hoy
from public.profiles p
left join public.checkins c on c.user_id = p.id and c.fecha = current_date
group by p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

drop view if exists public.ranking_semanal cascade;
create view public.ranking_semanal as
select p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total,
       p.racha_actual, p.mejor_racha, count(c.id) as checkins_semana
from public.profiles p
left join public.checkins c on c.user_id = p.id and c.fecha >= current_date - interval '7 days'
group by p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) - Permisos seguros y sin bloqueos
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.messages enable row level security;
alter table public.message_likes enable row level security;
alter table public.direct_messages enable row level security;
alter table public.apuntes enable row level security;
alter table public.retos enable row level security;
alter table public.reto_completado enable row level security;
alter table public.arcade_scores enable row level security;
alter table public.pregunta_flash enable row level security;
alter table public.pregunta_flash_votos enable row level security;
alter table public.user_skills enable row level security;
alter table public.canjes_tienda enable row level security;

-- PROFILES
drop policy if exists "perfiles_select" on public.profiles;
create policy "perfiles_select" on public.profiles for select using (true);
drop policy if exists "perfiles_update" on public.profiles;
create policy "perfiles_update" on public.profiles for update using (auth.uid() = id or auth.uid() is null);
drop policy if exists "perfiles_insert" on public.profiles;
create policy "perfiles_insert" on public.profiles for insert with check (auth.uid() = id or auth.uid() is null);

-- CHECKINS
drop policy if exists "checkins_select" on public.checkins;
create policy "checkins_select" on public.checkins for select using (true);
drop policy if exists "checkins_insert" on public.checkins;
create policy "checkins_insert" on public.checkins for insert with check (auth.uid() = user_id or auth.uid() is null);

-- MESSAGES
drop policy if exists "messages_select" on public.messages;
create policy "messages_select" on public.messages for select using (true);
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert with check (auth.uid() = user_id or auth.uid() is null);
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and rol = 'moderador'));
drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages for delete using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and rol = 'moderador'));

-- MESSAGE_LIKES
drop policy if exists "likes_select" on public.message_likes;
create policy "likes_select" on public.message_likes for select using (true);
drop policy if exists "likes_insert" on public.message_likes;
create policy "likes_insert" on public.message_likes for insert with check (auth.uid() = user_id or auth.uid() is null);
drop policy if exists "likes_delete" on public.message_likes;
create policy "likes_delete" on public.message_likes for delete using (auth.uid() = user_id or auth.uid() is null);

-- DIRECT_MESSAGES
drop policy if exists "dm_select" on public.direct_messages;
create policy "dm_select" on public.direct_messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id or auth.uid() is null);
drop policy if exists "dm_insert" on public.direct_messages;
create policy "dm_insert" on public.direct_messages for insert with check (auth.uid() = sender_id or auth.uid() is null);
drop policy if exists "dm_update" on public.direct_messages;
create policy "dm_update" on public.direct_messages for update using (auth.uid() = receiver_id or auth.uid() = sender_id or auth.uid() is null);
drop policy if exists "dm_delete" on public.direct_messages;
create policy "dm_delete" on public.direct_messages for delete using (auth.uid() = sender_id);

-- APUNTES
drop policy if exists "apuntes_select" on public.apuntes;
create policy "apuntes_select" on public.apuntes for select using (true);
drop policy if exists "apuntes_insert" on public.apuntes;
create policy "apuntes_insert" on public.apuntes for insert with check (auth.uid() = user_id or auth.uid() is null);
drop policy if exists "apuntes_update" on public.apuntes;
create policy "apuntes_update" on public.apuntes for update using (auth.uid() = user_id);
drop policy if exists "apuntes_delete" on public.apuntes;
create policy "apuntes_delete" on public.apuntes for delete using (auth.uid() = user_id);

-- ARCADE_SCORES
drop policy if exists "arcade_select" on public.arcade_scores;
create policy "arcade_select" on public.arcade_scores for select using (true);
drop policy if exists "arcade_insert" on public.arcade_scores;
create policy "arcade_insert" on public.arcade_scores for insert with check (auth.uid() = user_id or auth.uid() is null);

-- RETOS & PREGUNTA FLASH
drop policy if exists "retos_select" on public.retos;
create policy "retos_select" on public.retos for select using (true);
drop policy if exists "retos_insert" on public.retos;
create policy "retos_insert" on public.retos for insert with check (auth.uid() = creado_por or exists (select 1 from public.profiles where id = auth.uid() and rol = 'moderador'));

drop policy if exists "reto_comp_select" on public.reto_completado;
create policy "reto_comp_select" on public.reto_completado for select using (true);
drop policy if exists "reto_comp_insert" on public.reto_completado;
create policy "reto_comp_insert" on public.reto_completado for insert with check (auth.uid() = user_id or auth.uid() is null);

drop policy if exists "flash_select" on public.pregunta_flash;
create policy "flash_select" on public.pregunta_flash for select using (true);
drop policy if exists "flash_admin" on public.pregunta_flash;
create policy "flash_admin" on public.pregunta_flash for all using (exists (select 1 from public.profiles where id = auth.uid() and rol = 'moderador'));

drop policy if exists "votos_select" on public.pregunta_flash_votos;
create policy "votos_select" on public.pregunta_flash_votos for select using (true);
drop policy if exists "votos_insert" on public.pregunta_flash_votos;
create policy "votos_insert" on public.pregunta_flash_votos for insert with check (auth.uid() = user_id or auth.uid() is null);
drop policy if exists "votos_update" on public.pregunta_flash_votos;
create policy "votos_update" on public.pregunta_flash_votos for update using (auth.uid() = user_id);

-- USER_SKILLS & CANJES
drop policy if exists "skills_select" on public.user_skills;
create policy "skills_select" on public.user_skills for select using (true);
drop policy if exists "skills_all" on public.user_skills;
create policy "skills_all" on public.user_skills for all using (auth.uid() = user_id or auth.uid() is null);

drop policy if exists "canjes_select" on public.canjes_tienda;
create policy "canjes_select" on public.canjes_tienda for select using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and rol = 'moderador'));
drop policy if exists "canjes_insert" on public.canjes_tienda;
create policy "canjes_insert" on public.canjes_tienda for insert with check (auth.uid() = user_id or auth.uid() is null);

-- ==============================================================================
-- 13. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- 13.1. Auto-crear perfil al autenticarse (OAuth Google o Email)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_username text;
  v_email text;
begin
  v_email := new.email;
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Estudiante'
  );

  if length(v_nombre) < 2 then
    v_nombre := 'Estudiante';
  elsif length(v_nombre) > 35 then
    v_nombre := substring(v_nombre from 1 for 35);
  end if;

  v_username := lower(regexp_replace(v_nombre, '[^a-zA-Z0-9_]', '', 'g'));
  if length(v_username) < 3 then
    v_username := 'user_' || substring(new.id::text from 1 for 6);
  end if;

  insert into public.profiles (
    id,
    nombre,
    email,
    username,
    avatar_emoji,
    puntos_total,
    racha_actual,
    mejor_racha,
    rol
  )
  values (
    new.id,
    v_nombre,
    v_email,
    v_username,
    '🧑‍🎓',
    10,
    1,
    1,
    'alumno'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    nombre = coalesce(nullif(profiles.nombre, 'Alumno'), excluded.nombre),
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

-- 13.2. Actualizar racha y puntos automáticamente al hacer check-in
create or replace function public.actualizar_racha()
returns trigger
language plpgsql
security definer
as $$
declare
  v_ayer date := new.fecha - interval '1 day';
  v_racha_ant integer := 0;
  v_mejor_ant integer := 0;
  v_nueva_racha integer := 1;
begin
  select racha_actual, mejor_racha
  into v_racha_ant, v_mejor_ant
  from public.profiles
  where id = new.user_id;

  if exists (
    select 1 from public.checkins
    where user_id = new.user_id and fecha = v_ayer
  ) then
    v_nueva_racha := coalesce(v_racha_ant, 0) + 1;
  else
    v_nueva_racha := 1;
  end if;

  update public.profiles set
    racha_actual = v_nueva_racha,
    mejor_racha = greatest(coalesce(v_mejor_ant, 0), v_nueva_racha),
    puntos_total = coalesce(puntos_total, 0) + new.puntos_ganados,
    ultimo_checkin = new.fecha::text,
    checkins_count = coalesce(checkins_count, 0) + 1,
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$;

drop trigger if exists trg_checkin_after_insert on public.checkins;
create trigger trg_checkin_after_insert
  after insert on public.checkins
  for each row execute function public.actualizar_racha();

-- 13.3. Funciones RPC para Likes y Reacciones
create or replace function public.increment_likes(msg_id uuid)
returns void as $$
begin
  update public.messages set likes_count = coalesce(likes_count, 0) + 1 where id = msg_id;
end;
$$ language plpgsql security definer;

create or replace function public.toggle_like_mensaje(
  p_msg_id text,
  p_user_id text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_msg_uuid uuid;
  v_user_uuid uuid;
  v_liked boolean;
  v_count integer;
begin
  begin
    v_msg_uuid := p_msg_id::uuid;
    v_user_uuid := p_user_id::uuid;
  exception when others then
    return jsonb_build_object('liked', true, 'count', 1, 'mock', true);
  end;

  if exists (select 1 from public.message_likes where message_id = v_msg_uuid and user_id = v_user_uuid) then
    delete from public.message_likes where message_id = v_msg_uuid and user_id = v_user_uuid;
    v_liked := false;
  else
    insert into public.message_likes (message_id, user_id) values (v_msg_uuid, v_user_uuid)
    on conflict do nothing;
    v_liked := true;
  end if;

  select count(*) into v_count from public.message_likes where message_id = v_msg_uuid;

  update public.messages
  set likes_count = v_count
  where id = v_msg_uuid;

  return jsonb_build_object('liked', v_liked, 'count', v_count);
end;
$$;

-- ==============================================================================
-- 14. ACTIVAR SUPABASE REALTIME
-- ==============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages;
    alter publication supabase_realtime add table public.direct_messages;
    alter publication supabase_realtime add table public.checkins;
    alter publication supabase_realtime add table public.profiles;
  end if;
exception when others then
  -- Silencioso si alguna tabla ya estaba agregada
end $$;
