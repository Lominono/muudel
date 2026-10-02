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
alter table public.profiles add column if not exists ultimo_acceso timestamptz default now();

-- Permitir perfiles locales/demo sin bloqueo estricto si no están en auth.users
alter table public.profiles drop constraint if exists profiles_id_fkey;

create index if not exists idx_profiles_puntos on public.profiles(puntos_total desc);
create index if not exists idx_profiles_username on public.profiles(username);

-- Perfil oficial moderador lominoño garantizado
insert into public.profiles (
  id, nombre, username, email, rol, color_acento, avatar_emoji, frase, puntos_total, racha_actual, mejor_racha, onboarding_completado
)
values (
  '00000000-0000-4000-a000-000000000001'::uuid,
  'lominoño',
  'lominono',
  'lominono@muudel.app',
  'moderador',
  '#0A84FF',
  '👨‍🏫',
  'Profesor / Moderador de muudel',
  100,
  10,
  10,
  true
)
on conflict (id) do update set
  rol = 'moderador',
  nombre = 'lominoño',
  username = 'lominono';

-- ==============================================================================
-- 1.1 TABLA: LOGIN_RECORDS (Registro de inicios de sesión y accesos al aula)
-- ==============================================================================
create table if not exists public.login_records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  email text,
  metodo text default 'login', -- 'google', 'email', 'pin'
  ip text,
  created_at timestamptz default now()
);

create index if not exists idx_login_records_user on public.login_records(user_id, created_at desc);

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
alter table public.login_records enable row level security;

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

-- LOGIN_RECORDS
drop policy if exists "login_records_select" on public.login_records;
create policy "login_records_select" on public.login_records for select using (auth.uid() = user_id or exists (select 1 from public.profiles where id = auth.uid() and rol = 'moderador'));
drop policy if exists "login_records_insert" on public.login_records;
create policy "login_records_insert" on public.login_records for insert with check (auth.uid() = user_id or auth.uid() is null);

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

-- ==============================================================================
-- 15. SISTEMA DE DUELOS PVP (BATALLA DE DADOS 1v1)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pvp_partidas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creador_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  oponente_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  apuesta INTEGER NOT NULL CHECK (apuesta > 0),
  estado TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'finalizado', 'cancelado')),
  resultado_creador INTEGER,
  resultado_oponente INTEGER,
  dado1_creador INTEGER,
  dado2_creador INTEGER,
  dado1_oponente INTEGER,
  dado2_oponente INTEGER,
  ganador_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pvp_partidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver partidas PVP" ON public.pvp_partidas;
CREATE POLICY "Todos pueden ver partidas PVP" ON public.pvp_partidas FOR SELECT USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER TABLE public.pvp_partidas REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_partidas;
  END IF;
EXCEPTION WHEN OTHERS THEN
END $$;

-- ==============================================================================
-- 15.1. SISTEMA PVP: DUELO 21 (BLACKJACK ONLINE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pvp_blackjack (
  id TEXT PRIMARY KEY,
  creador_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  creador_nombre TEXT,
  oponente_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  oponente_nombre TEXT,
  apuesta INTEGER NOT NULL CHECK (apuesta > 0),
  estado TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'jugando', 'finalizado', 'cancelado')),
  turno TEXT DEFAULT 'creador',
  mano_creador JSONB DEFAULT '[]'::jsonb,
  mano_oponente JSONB DEFAULT '[]'::jsonb,
  baraja_restante JSONB DEFAULT '[]'::jsonb,
  ganador_id TEXT,
  desenlace_motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pvp_blackjack ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver partidas de Blackjack 21" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden ver partidas de Blackjack 21" ON public.pvp_blackjack FOR SELECT USING (true);
DROP POLICY IF EXISTS "Todos pueden insertar partidas Blackjack" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden insertar partidas Blackjack" ON public.pvp_blackjack FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Todos pueden actualizar partidas Blackjack" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden actualizar partidas Blackjack" ON public.pvp_blackjack FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Todos pueden borrar partidas Blackjack" ON public.pvp_blackjack;
CREATE POLICY "Todos pueden borrar partidas Blackjack" ON public.pvp_blackjack FOR DELETE USING (true);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER TABLE public.pvp_blackjack REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pvp_blackjack;
  END IF;
EXCEPTION WHEN OTHERS THEN
END $$;

CREATE OR REPLACE FUNCTION public.crear_partida_pvp(p_apuesta INTEGER, p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_saldo INTEGER;
  v_partida_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  IF p_apuesta <= 0 THEN RAISE EXCEPTION 'La apuesta debe ser mayor a 0'; END IF;
  
  SELECT puntos_total INTO v_saldo FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_saldo < p_apuesta THEN RAISE EXCEPTION 'Saldo insuficiente para crear el desafío'; END IF;
  
  UPDATE public.profiles SET puntos_total = puntos_total - p_apuesta WHERE id = v_user_id;
  
  INSERT INTO public.pvp_partidas (creador_id, apuesta, estado)
  VALUES (v_user_id, p_apuesta, 'esperando')
  RETURNING id INTO v_partida_id;
  
  RETURN v_partida_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unirse_partida_pvp(p_partida_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_partida public.pvp_partidas%ROWTYPE;
  v_saldo INTEGER;
  v_d1_c INTEGER;
  v_d2_c INTEGER;
  v_tot_c INTEGER;
  v_d1_o INTEGER;
  v_d2_o INTEGER;
  v_tot_o INTEGER;
  v_ganador_id UUID;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;
  
  SELECT * INTO v_partida FROM public.pvp_partidas WHERE id = p_partida_id FOR UPDATE;
  
  IF v_partida.id IS NULL THEN RAISE EXCEPTION 'Partida no encontrada'; END IF;
  IF v_partida.estado != 'esperando' THEN RAISE EXCEPTION 'La partida ya no está disponible'; END IF;
  IF v_partida.creador_id = v_user_id THEN RAISE EXCEPTION 'No puedes desafiarte a ti mismo'; END IF;
  
  SELECT COALESCE(puntos_total, 0) INTO v_saldo FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_saldo < v_partida.apuesta THEN 
    RAISE EXCEPTION 'Saldo insuficiente (% pts disponibles, % requeridos)', v_saldo, v_partida.apuesta; 
  END IF;
  
  UPDATE public.profiles SET puntos_total = puntos_total - v_partida.apuesta WHERE id = v_user_id;
  
  v_d1_c := floor(random() * 6) + 1;
  v_d2_c := floor(random() * 6) + 1;
  v_tot_c := v_d1_c + v_d2_c;

  v_d1_o := floor(random() * 6) + 1;
  v_d2_o := floor(random() * 6) + 1;
  v_tot_o := v_d1_o + v_d2_o;
  
  WHILE v_tot_c = v_tot_o LOOP
    v_d1_c := floor(random() * 6) + 1;
    v_d2_c := floor(random() * 6) + 1;
    v_tot_c := v_d1_c + v_d2_c;

    v_d1_o := floor(random() * 6) + 1;
    v_d2_o := floor(random() * 6) + 1;
    v_tot_o := v_d1_o + v_d2_o;
  END LOOP;
  
  IF v_tot_c > v_tot_o THEN
    v_ganador_id := v_partida.creador_id;
  ELSE
    v_ganador_id := v_user_id;
  END IF;

  UPDATE public.profiles SET puntos_total = puntos_total + (v_partida.apuesta * 2) WHERE id = v_ganador_id;
  
  BEGIN
    EXECUTE 'UPDATE public.pvp_partidas 
      SET estado = ''finalizado'',
          oponente_id = $1,
          resultado_creador = $2,
          resultado_oponente = $3,
          dado1_creador = $4,
          dado2_creador = $5,
          dado1_oponente = $6,
          dado2_oponente = $7,
          ganador_id = $8,
          resolved_at = NOW()
      WHERE id = $9'
    USING v_user_id, v_tot_c, v_tot_o, v_d1_c, v_d2_c, v_d1_o, v_d2_o, v_ganador_id, p_partida_id;
  EXCEPTION WHEN undefined_column THEN
    UPDATE public.pvp_partidas 
    SET estado = 'finalizado',
        oponente_id = v_user_id,
        resultado_creador = v_tot_c,
        resultado_oponente = v_tot_o,
        ganador_id = v_ganador_id,
        resolved_at = NOW()
    WHERE id = p_partida_id;
  END;
  
  RETURN json_build_object(
      'partida_id', p_partida_id,
      'creador_id', v_partida.creador_id,
      'oponente_id', v_user_id,
      'creador_dado1', v_d1_c,
      'creador_dado2', v_d2_c,
      'creador_roll', v_tot_c,
      'oponente_dado1', v_d1_o,
      'oponente_dado2', v_d2_o,
      'oponente_roll', v_tot_o,
      'ganador_id', v_ganador_id,
      'premio', v_partida.apuesta * 2
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_partida_pvp(p_partida_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_partida public.pvp_partidas%ROWTYPE;
BEGIN
  v_user_id := COALESCE(auth.uid(), p_user_id);
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'No autorizado'; END IF;

  SELECT * INTO v_partida FROM public.pvp_partidas WHERE id = p_partida_id FOR UPDATE;
  
  IF v_partida.id IS NULL THEN RAISE EXCEPTION 'Partida no encontrada'; END IF;
  IF v_partida.creador_id != v_user_id THEN RAISE EXCEPTION 'Solo el creador puede cancelar esta partida'; END IF;
  IF v_partida.estado != 'esperando' THEN RAISE EXCEPTION 'La partida ya no puede ser cancelada'; END IF;
  
  UPDATE public.profiles SET puntos_total = puntos_total + v_partida.apuesta WHERE id = v_user_id;
  UPDATE public.pvp_partidas SET estado = 'cancelado', resolved_at = NOW() WHERE id = p_partida_id;
END;
$$;

-- ==============================================================================
-- 10. FUNCIONES DE ADMINISTRACIÓN Y MODERACIÓN CON SECURITY DEFINER
-- ==============================================================================

-- Actualizar RLS en profiles para moderadores
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

-- Modificar puntaje y racha de forma atómica y garantizada
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

-- Eliminar usuario en cascada real
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

-- ── FEED DE CLASE, COMENTARIOS Y RPC DE LIKES ─────────────────────────────
create table if not exists feed_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  categoria text not null default 'General',
  titulo text not null default '',
  contenido text not null check (length(contenido) >= 1 and length(contenido) <= 2000),
  likes_count integer not null default 0,
  es_admin boolean default false,
  fijado boolean default false,
  soft_deleted boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_feed_posts_created on feed_posts(created_at desc);
create index if not exists idx_feed_posts_user on feed_posts(user_id);
create index if not exists idx_feed_posts_categoria on feed_posts(categoria);

alter table feed_posts enable row level security;

drop policy if exists "lectura feed" on feed_posts;
create policy "lectura feed" on feed_posts for select using (soft_deleted = false);

drop policy if exists "insert feed propio" on feed_posts;
create policy "insert feed propio" on feed_posts for insert with check (
  auth.uid() = user_id 
  or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
  or auth.uid() is not null
);

drop policy if exists "update feed propio" on feed_posts;
create policy "update feed propio" on feed_posts for update using (
  auth.uid() = user_id 
  or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

drop policy if exists "delete feed" on feed_posts;
create policy "delete feed" on feed_posts for delete using (
  auth.uid() = user_id 
  or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

create table if not exists feed_post_likes (
  post_id uuid references feed_posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_feed_likes_post on feed_post_likes(post_id);
create index if not exists idx_feed_likes_user on feed_post_likes(user_id);

alter table feed_post_likes enable row level security;

drop policy if exists "lectura likes feed" on feed_post_likes;
create policy "lectura likes feed" on feed_post_likes for select using (true);

drop policy if exists "insert like feed" on feed_post_likes;
create policy "insert like feed" on feed_post_likes for insert with check (
  auth.uid() = user_id or auth.uid() is not null
);

drop policy if exists "delete like feed" on feed_post_likes;
create policy "delete like feed" on feed_post_likes for delete using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

create table if not exists feed_post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references feed_posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  contenido text not null check (length(contenido) >= 1 and length(contenido) <= 600),
  soft_deleted boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_feed_comments_post on feed_post_comments(post_id, created_at asc);
create index if not exists idx_feed_comments_user on feed_post_comments(user_id);

alter table feed_post_comments enable row level security;

drop policy if exists "lectura comentarios feed" on feed_post_comments;
create policy "lectura comentarios feed" on feed_post_comments for select using (soft_deleted = false);

drop policy if exists "insert comentario feed" on feed_post_comments;
create policy "insert comentario feed" on feed_post_comments for insert with check (
  auth.uid() = user_id or auth.uid() is not null
);

drop policy if exists "delete comentario feed" on feed_post_comments;
create policy "delete comentario feed" on feed_post_comments for delete using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

create or replace function increment_likes_count(post_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update feed_posts
  set likes_count = likes_count + 1
  where id = post_id
  returning likes_count into v_count;
  return coalesce(v_count, 0);
end;
$$;

create or replace function decrement_likes_count(post_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update feed_posts
  set likes_count = greatest(0, likes_count - 1)
  where id = post_id
  returning likes_count into v_count;
  return coalesce(v_count, 0);
end;
$$;





-- ============================================================================
-- APARTADO 12: ECONOMÍA DE STEVEEUROS, BANCA SISTEMA Y LEDGER INMUTABLE
-- ============================================================================

-- Columnas de control en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS monedas_ruleta_yoshi integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_bonus_diario_se date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS racha_bonus_se integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ultimo_jackpot_at timestamptz;

-- Permitir rol sistema en profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_rol_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check CHECK (rol IN ('alumno', 'moderador', 'sistema'));

-- Perfil de la Banca Sistema
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = '00000000-0000-4000-a000-000000000000') THEN
    INSERT INTO public.profiles (
      id, nombre, username, avatar_emoji, color_acento, rol, puntos_total, monedas_ruleta_yoshi, onboarding_completado, frase
    ) VALUES (
      '00000000-0000-4000-a000-000000000000', 'BANCA SISTEMA', 'banca_sistema', '🏛️', '#FFD700', 'sistema', 5000, 0, true, 'Banco Central y Reserva de Liquidez de SMR2'
    );
  END IF;
END $$;

-- Ledger inmutable
CREATE TABLE IF NOT EXISTS public.steven_ledger (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  contrapartida_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN (
    'saldo_inicial', 'yoshi_partida', 'ruleta_yoshi', 'bonus_diario', 'mision',
    'apuesta_casino', 'premio_casino', 'apuesta_pvp', 'premio_pvp', 'comision_pvp',
    'tienda', 'ajuste_admin', 'reversion_admin', 'emision_diaria_banca'
  )),
  moneda text NOT NULL CHECK (moneda IN ('steveneuros', 'monedas_yoshi')),
  cantidad integer NOT NULL,
  saldo_anterior integer NOT NULL,
  saldo_posterior integer NOT NULL,
  actor_id uuid REFERENCES public.profiles(id),
  motivo text NOT NULL,
  idempotency_key text UNIQUE,
  detalles jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_steven_ledger_user ON public.steven_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_steven_ledger_contrapartida ON public.steven_ledger(contrapartida_id);
CREATE INDEX IF NOT EXISTS idx_steven_ledger_tipo ON public.steven_ledger(tipo);
CREATE INDEX IF NOT EXISTS idx_steven_ledger_idempotency ON public.steven_ledger(idempotency_key);

-- Trigger inmutabilidad
CREATE OR REPLACE FUNCTION public.fn_prevent_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El ledger contable es estrictamente inmutable. No se permite UPDATE ni DELETE.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_mutation ON public.steven_ledger;
CREATE TRIGGER trg_prevent_ledger_mutation
BEFORE UPDATE OR DELETE ON public.steven_ledger
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_ledger_mutation();

-- Sesiones de Yoshi
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

-- Migración inicial de saldos
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id, puntos_total, monedas_ruleta_yoshi FROM public.profiles LOOP
    IF NOT EXISTS (SELECT 1 FROM public.steven_ledger WHERE user_id = r.id AND tipo = 'saldo_inicial' AND moneda = 'steveneuros') THEN
      INSERT INTO public.steven_ledger (
        user_id, contrapartida_id, tipo, moneda, cantidad, saldo_anterior, saldo_posterior, motivo, idempotency_key
      ) VALUES (
        r.id, NULL, 'saldo_inicial', 'steveneuros', COALESCE(r.puntos_total, 0), 0, COALESCE(r.puntos_total, 0), 'Migración y cuadre inicial de StevenEuros', 'init_se_' || r.id
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.steven_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yoshi_sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lectura ledger propio o admin" ON public.steven_ledger;
CREATE POLICY "lectura ledger propio o admin" ON public.steven_ledger
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = actor_id
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol IN ('moderador', 'admin'))
);

DROP POLICY IF EXISTS "lectura sesiones propia" ON public.yoshi_sesiones;
CREATE POLICY "lectura sesiones propia" ON public.yoshi_sesiones
FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- 13. TABLA CENTRAL DE PRECIOS DE TIENDA E HISTORIAL
-- ============================================================================
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

INSERT INTO public.tienda_precios (id, titulo, categoria, tramo, precio, stock_max, activo)
VALUES
  ('sello_tinta_chat', 'Sello de Tinta Lacrada en Chat', 'efectos', 'comun', 30, NULL, true),
  ('confeti_chat', 'Lluvia de Confeti en Aula', 'efectos', 'comun', 30, NULL, true),
  ('terremoto_chat', 'Sacudida Sísmica de Aula', 'efectos', 'comun', 30, NULL, true),
  ('sirena_descanso', 'Silbato del Recreo (18:10)', 'efectos', 'comun', 30, NULL, true),
  ('megafono_chat', 'Aviso Fijado con Megáfono', 'efectos', 'comun', 30, NULL, true),
  ('seguro_ruleta', 'Seguro de Ruleta (Reembolso 50%)', 'juegos', 'comun', 30, NULL, true),
  ('yoshi_vida_extra', 'Batería Extra Yoshi Runner (+1 Vida)', 'juegos', 'comun', 30, NULL, true),
  ('ruleta_max_50', 'Licencia Casino Nivel 1 (Tope 50)', 'juegos', 'comun', 30, NULL, true),
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
  ('titulo_root', 'Título: Linux Root Master', 'titulos', 'epico', 200, 3, true),
  ('titulo_mvp', 'Título: MVP del Aula 15:30', 'titulos', 'epico', 200, 2, true),
  ('marco_esmeralda', 'Marco Esmeralda Matrix', 'marcos', 'epico', 200, NULL, true),
  ('marco_cyber', 'Marco Cyberpunk Neón', 'marcos', 'epico', 200, NULL, true),
  ('marco_fuego', 'Marco Flama de Racha', 'marcos', 'epico', 200, NULL, true),
  ('burbuja_matrix', 'Burbuja Matrix Consola', 'burbujas', 'epico', 200, NULL, true),
  ('burbuja_carmin', 'Burbuja Carmín VIP en Chat', 'burbujas', 'epico', 200, 3, true),
  ('congelar_racha', 'Escudo Congela-Racha', 'racha', 'epico', 200, NULL, true),
  ('restaurar_racha', 'Fénix: Restaurador de Racha', 'racha', 'epico', 200, NULL, true),
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

