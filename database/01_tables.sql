-- Racha de Clase - Schema Supabase
-- Estructura: 4 archivos ejecutados en orden desde database.sql
-- 01_tables.sql → 02_rls.sql → 03_funciones_triggers.sql → 04_vistas.sql

create extension if not exists "uuid-ossp";

-- ============================================
-- perfiles
-- ============================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null check (length(nombre) >= 2 and length(nombre) <= 30),
  avatar_emoji text default '🧑',
  color_id integer default 1,
  frase text default '',
  puntos_total integer default 0,
  xp_nivel integer default 0,
  racha_actual integer default 0,
  mejor_racha integer default 0,
  ultimo_checkin text,
  rol text default 'alumno' check (rol in ('alumno','moderador')),
  freeze_usadas integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- checkins
-- ============================================
create table if not exists checkins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  fecha date default current_date,
  hora time not null,
  es_tarde boolean default false,
  puntos_ganados integer not null,
  nota text default '',
  created_at timestamptz default now(),
  unique(user_id, fecha)
);

create index idx_checkins_fecha on checkins(fecha);
create index idx_checkins_user on checkins(user_id, fecha);

-- ============================================
-- mensajes + likes
-- ============================================
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  canal text not null check (canal in ('general','dudas','apuntes','retos')),
  texto text not null check (length(texto) >= 1 and length(texto) <= 2000),
  reply_to uuid references messages(id) on delete set null,
  likes_count integer default 0,
  es_solucion boolean default false,
  soft_deleted boolean default false,
  created_at timestamptz default now()
);

create table if not exists message_likes (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

create index idx_messages_canal on messages(canal, created_at);
create index idx_messages_user on messages(user_id);

-- ============================================
-- apuntes
-- ============================================
create table if not exists apuntes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  titulo text not null check (length(titulo) >= 2 and length(titulo) <= 100),
  materia text not null,
  texto text,
  file_url text,
  favoritos_count integer default 0,
  created_at timestamptz default now()
);

create index idx_apuntes_materia on apuntes(materia);

-- ============================================
-- retos + completados
-- ============================================
create table if not exists retos (
  id uuid default uuid_generate_v4() primary key,
  titulo text not null check (length(titulo) >= 5 and length(titulo) <= 100),
  descripcion text,
  puntos integer not null check (puntos between 10 and 500),
  fecha_limite date,
  creado_por uuid references profiles(id),
  activo boolean default true,
  created_at timestamptz default now()
);

create table if not exists reto_completado (
  reto_id uuid references retos(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  fecha timestamptz default now(),
  validado boolean default false,
  primary key (reto_id, user_id)
);

-- ============================================
-- logros
-- ============================================
create table if not exists achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  codigo text not null,
  fecha timestamptz default now(),
  unique(user_id, codigo)
);
