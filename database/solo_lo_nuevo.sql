-- ==============================================================================
-- ACTUALIZACIÓN SEGURA: SOLO LO NUEVO / FALTANTE
-- Puedes copiar y pegar todo este archivo en el SQL Editor de Supabase
-- Es 100% idempotente (no dará errores si algo ya existe).
-- ==============================================================================

-- 1. TABLAS BÁSICAS (por si alguna no fue creada)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null default 'Alumno',
  avatar_emoji text default '🧑‍🎓',
  puntos_total integer default 0,
  racha_actual integer default 0,
  mejor_racha integer default 0,
  ultimo_checkin date,
  color_acento text default '#0A84FF',
  frase text,
  rol text default 'alumno' check (rol in ('alumno', 'moderador')),
  xp_nivel integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists checkins (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  fecha date default current_date not null,
  hora_checkin time default current_time not null,
  en_hora boolean default true,
  puntos_ganados integer default 10,
  comentario text,
  created_at timestamptz default now(),
  unique(user_id, fecha)
);

create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  canal text not null default 'general',
  contenido text not null check (length(contenido) >= 1 and length(contenido) <= 1000),
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

create table if not exists apuntes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  titulo text not null check (length(titulo) >= 3 and length(titulo) <= 120),
  materia text not null,
  descripcion text,
  file_url text,
  favoritos_count integer default 0,
  created_at timestamptz default now()
);

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

create table if not exists achievements (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  codigo text not null,
  fecha timestamptz default now(),
  unique(user_id, codigo)
);

-- 2. POLÍTICAS DE SEGURIDAD (Con DROP IF EXISTS para evitar error 42710)
alter table profiles enable row level security;
drop policy if exists "lectura publica" on profiles;
create policy "lectura publica" on profiles for select using (true);
drop policy if exists "actualizar propio" on profiles;
create policy "actualizar propio" on profiles for update using (auth.uid() = id);
drop policy if exists "insert propio" on profiles;
create policy "insert propio" on profiles for insert with check (auth.uid() = id);

alter table checkins enable row level security;
drop policy if exists "lectura todos" on checkins;
create policy "lectura todos" on checkins for select using (true);
drop policy if exists "insert propio" on checkins;
create policy "insert propio" on checkins for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar propio" on checkins;
create policy "actualizar propio" on checkins for update using (auth.uid() = user_id);

alter table messages enable row level security;
drop policy if exists "lectura canales" on messages;
create policy "lectura canales" on messages for select using (soft_deleted = false);
drop policy if exists "insert propio" on messages;
create policy "insert propio" on messages for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar propio" on messages;
create policy "actualizar propio" on messages for update using (auth.uid() = user_id);
drop policy if exists "borrar mensaje" on messages;
create policy "borrar mensaje" on messages for delete using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

alter table message_likes enable row level security;
drop policy if exists "lectura" on message_likes;
create policy "lectura" on message_likes for select using (true);
drop policy if exists "insert propio" on message_likes;
create policy "insert propio" on message_likes for insert with check (auth.uid() = user_id);
drop policy if exists "delete propio" on message_likes;
create policy "delete propio" on message_likes for delete using (auth.uid() = user_id);

alter table apuntes enable row level security;
drop policy if exists "lectura todos" on apuntes;
create policy "lectura todos" on apuntes for select using (true);
drop policy if exists "insert propio" on apuntes;
create policy "insert propio" on apuntes for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar propio" on apuntes;
create policy "actualizar propio" on apuntes for update using (auth.uid() = user_id);
drop policy if exists "borrar propio" on apuntes;
create policy "borrar propio" on apuntes for delete using (auth.uid() = user_id);

alter table retos enable row level security;
drop policy if exists "lectura todos" on retos;
create policy "lectura todos" on retos for select using (true);
drop policy if exists "insert propio" on retos;
create policy "insert propio" on retos for insert with check (auth.uid() = creado_por);
drop policy if exists "actualizar moderador" on retos;
create policy "actualizar moderador" on retos for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

alter table reto_completado enable row level security;
drop policy if exists "lectura" on reto_completado;
create policy "lectura" on reto_completado for select using (true);
drop policy if exists "insert propio" on reto_completado;
create policy "insert propio" on reto_completado for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar moderador" on reto_completado;
create policy "actualizar moderador" on reto_completado for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

alter table achievements enable row level security;
drop policy if exists "lectura propia" on achievements;
create policy "lectura propia" on achievements for select using (auth.uid() = user_id);
drop policy if exists "insert propio" on achievements;
create policy "insert propio" on achievements for insert with check (auth.uid() = user_id);

-- 3. TRIGGER AUTOMÁTICO: Auto-crear perfil al hacer login con Google
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nombre, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', new.raw_user_meta_data->>'full_name', 'Alumno'),
    '🧑‍🎓'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 4. FUNCIÓN PARA LIKES EN MENSAJES
create or replace function increment_likes(msg_id uuid)
returns void as $$
begin
  update messages set likes_count = likes_count + 1 where id = msg_id;
end;
$$ language plpgsql security definer;

-- 5. TRIGGER AUTOMÁTICO: Cálculo de racha y puntos tras Check-in
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
    mejor_racha = greatest(mejor_racha, v_nueva_racha),
    ultimo_checkin = new.fecha::text,
    puntos_total = puntos_total + new.puntos_ganados,
    xp_nivel = puntos_total + new.puntos_ganados,
    updated_at = now()
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_checkin_after_insert on checkins;
create trigger trg_checkin_after_insert
  after insert on checkins
  for each row execute function actualizar_racha();

-- 6. VISTAS DE RANKING DIARIO Y SEMANAL
create or replace view ranking_diario as
select p.id, p.nombre, p.avatar_emoji, p.puntos_total,
       p.racha_actual, p.mejor_racha, count(c.id) as checkins_hoy
from profiles p
left join checkins c on c.user_id = p.id and c.fecha = current_date
group by p.id, p.nombre, p.avatar_emoji, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

create or replace view ranking_semanal as
select p.id, p.nombre, p.avatar_emoji, p.puntos_total,
       p.racha_actual, p.mejor_racha, count(c.id) as checkins_semana
from profiles p
left join checkins c on c.user_id = p.id and c.fecha >= current_date - interval '7 days'
group by p.id, p.nombre, p.avatar_emoji, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;
