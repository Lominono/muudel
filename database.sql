-- Racha de Clase - Schema Supabase
-- Ejecutar en Supabase SQL Editor

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLA: perfiles
-- ============================================
create table profiles (
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

alter table profiles enable row level security;

create policy "lectura publica" on profiles
  for select using (true);

create policy "actualizar propio perfil" on profiles
  for update using (auth.uid() = id);

create policy "insercion propia" on profiles
  for insert with check (auth.uid() = id);

-- ============================================
-- TABLA: checkins
-- ============================================
create table checkins (
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

alter table checkins enable row level security;

create policy "lectura todos" on checkins
  for select using (true);

create policy "insert propio" on checkins
  for insert with check (auth.uid() = user_id);

create policy "actualizar propio" on checkins
  for update using (auth.uid() = user_id);

-- Índice para buscar checkins por fecha
create index idx_checkins_fecha on checkins(fecha);
create index idx_checkins_user on checkins(user_id, fecha);

-- ============================================
-- TABLA: mensajes (chat)
-- ============================================
create table messages (
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

alter table messages enable row level security;

create policy "lectura canales" on messages
  for select using (soft_deleted = false);

create policy "insert propio" on messages
  for insert with check (auth.uid() = user_id);

create policy "actualizar propio" on messages
  for update using (auth.uid() = user_id);

create policy "borrar mensaje" on messages
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
  );

-- Índices
create index idx_messages_canal on messages(canal, created_at);
create index idx_messages_user on messages(user_id);

-- ============================================
-- TABLA: likes de mensajes
-- ============================================
create table message_likes (
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (message_id, user_id)
);

alter table message_likes enable row level security;

create policy "lectura" on message_likes for select using (true);
create policy "insert propio" on message_likes for insert with check (auth.uid() = user_id);
create policy "delete propio" on message_likes for delete using (auth.uid() = user_id);

-- ============================================
-- TABLA: apuntes
-- ============================================
create table apuntes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  titulo text not null check (length(titulo) >= 2 and length(titulo) <= 100),
  materia text not null,
  texto text,
  file_url text,
  favoritos_count integer default 0,
  created_at timestamptz default now()
);

alter table apuntes enable row level security;

create policy "lectura todos" on apuntes for select using (true);
create policy "insert propio" on apuntes for insert with check (auth.uid() = user_id);
create policy "actualizar propio" on apuntes for update using (auth.uid() = user_id);
create policy "borrar propio" on apuntes for delete using (auth.uid() = user_id);

create index idx_apuntes_materia on apuntes(materia);

-- ============================================
-- TABLA: retos
-- ============================================
create table retos (
  id uuid default uuid_generate_v4() primary key,
  titulo text not null check (length(titulo) >= 5 and length(titulo) <= 100),
  descripcion text,
  puntos integer not null check (puntos between 10 and 500),
  fecha_limite date,
  creado_por uuid references profiles(id),
  activo boolean default true,
  created_at timestamptz default now()
);

alter table retos enable row level security;

create policy "lectura todos" on retos for select using (true);
create policy "insert propio" on retos for insert with check (auth.uid() = creado_por);
create policy "actualizar moderador" on retos for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- ============================================
-- TABLA: retos completados
-- ============================================
create table reto_completado (
  reto_id uuid references retos(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  fecha timestamptz default now(),
  validado boolean default false,
  primary key (reto_id, user_id)
);

alter table reto_completado enable row level security;

create policy "lectura" on reto_completado for select using (true);
create policy "insert propio" on reto_completado for insert with check (auth.uid() = user_id);
create policy "actualizar moderador" on reto_completado for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- ============================================
-- TABLA: logros
-- ============================================
create table achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  codigo text not null,
  fecha timestamptz default now(),
  unique(user_id, codigo)
);

alter table achievements enable row level security;

create policy "lectura propia" on achievements for select using (auth.uid() = user_id);
create policy "insert propio" on achievements for insert with check (auth.uid() = user_id);

-- ============================================
-- FUNCIONES: racha y puntos
-- ============================================

-- Función para calcular puntos de check-in
create or replace function calcular_puntos_checkin(
  p_user_id uuid,
  p_es_tarde boolean
) returns integer as $$
declare
  v_puntos integer := 10;
begin
  if p_es_tarde then
    v_puntos := 5;
  end if;
  return v_puntos;
end;
$$ language plpgsql security definer;

-- Función para actualizar racha tras check-in
create or replace function actualizar_racha()
returns trigger as $$
declare
  v_ultimo text;
  v_racha_actual integer;
  v_nueva_racha integer;
begin
  -- Obtener último checkin del usuario
  select fecha into v_ultimo
  from checkins
  where user_id = new.user_id and fecha < new.fecha
  order by fecha desc
  limit 1;

  if v_ultimo is null then
    v_nueva_racha := 1;
  else
    v_racha_actual := (select racha_actual from profiles where id = new.user_id);
    v_nueva_racha := v_racha_actual + 1;
  end if;

  -- Actualizar perfil
  update profiles set
    racha_actual = v_nueva_racha,
    mejor_racha = greatest(mejor_racha, v_nueva_racha),
    ultimo_checkin = new.fecha::text,
    puntos_total = puntos_total + new.puntos_ganados
  where id = new.user_id;

  -- Actualizar nivel XP
  update profiles set
    xp_nivel = puntos_total
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger: después de insertar checkin, actualizar racha
create trigger trg_checkin_after_insert
  after insert on checkins
  for each row execute function actualizar_racha();

-- ============================================
-- VISTAS ÚTILES
-- ============================================
create view ranking_diario as
select
  p.id,
  p.nombre,
  p.avatar_emoji,
  p.puntos_total,
  p.racha_actual,
  p.mejor_racha,
  count(c.id) as checkins_hoy
from profiles p
left join checkins c on c.user_id = p.id and c.fecha = current_date
group by p.id, p.nombre, p.avatar_emoji, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

create view ranking_semanal as
select
  p.id,
  p.nombre,
  p.avatar_emoji,
  p.puntos_total,
  p.racha_actual,
  p.mejor_racha,
  count(c.id) as checkins_semana
from profiles p
left join checkins c on c.user_id = p.id and c.fecha >= current_date - interval '7 days'
group by p.id, p.nombre, p.avatar_emoji, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

-- ============================================
-- DATOS INICIALES (opcional)
-- ============================================
-- insertar 10 apuntes de ejemplo si quieres probar
-- (dejar vacío para que el profesor suba los reales)
