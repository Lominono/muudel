-- ===============================================================
-- 06_retos_y_juegos.sql
-- Extensiones para verificación de retos, evidencias y mini-juegos
-- ===============================================================

-- Columnas adicionales para reto_completado para comprobación y feedback
alter table reto_completado add column if not exists evidencia text default '';
alter table reto_completado add column if not exists estado text default 'pendiente';
alter table reto_completado add column if not exists feedback_admin text default '';
alter table reto_completado add column if not exists revisado_por uuid references profiles(id);
alter table reto_completado add column if not exists revisado_en timestamptz;

-- Columnas adicionales para retos
alter table retos add column if not exists tipo text default 'general';
alter table retos add column if not exists objetivo_puntuacion integer default 0;

-- Tabla para récord y puntuaciones de mini-juegos (Yoshi Runner, etc.)
create table if not exists juegos_puntuaciones (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  juego text not null,
  puntos integer not null default 0,
  monedas_ganadas integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_juegos_puntuaciones_user on juegos_puntuaciones(user_id);
create index if not exists idx_juegos_puntuaciones_puntos on juegos_puntuaciones(juego, puntos desc);

-- RLS para juegos_puntuaciones
alter table juegos_puntuaciones enable row level security;
drop policy if exists "lectura juegos" on juegos_puntuaciones;
create policy "lectura juegos" on juegos_puntuaciones for select using (true);
drop policy if exists "insert juegos" on juegos_puntuaciones;
create policy "insert juegos" on juegos_puntuaciones for insert with check (auth.uid() = user_id);
