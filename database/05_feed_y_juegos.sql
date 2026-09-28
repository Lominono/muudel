-- ============================================================
-- 05_feed_y_juegos.sql
-- Ejecutar DESPUÉS de 01_tables.sql → 04_vistas.sql
-- ============================================================

-- ── feed_posts: posts del aula (anuncios, trucos, preguntas) ──────────────
create table if not exists feed_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  categoria text not null check (categoria in ('Aviso', 'Truco', 'Pregunta', 'Linux', 'Redes', 'Reto', 'General')),
  titulo text not null check (length(titulo) >= 3 and length(titulo) <= 120),
  contenido text not null check (length(contenido) >= 5 and length(contenido) <= 1000),
  likes_count integer default 0,
  soft_deleted boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_feed_posts_created on feed_posts(created_at desc);
create index if not exists idx_feed_posts_user on feed_posts(user_id);

alter table feed_posts enable row level security;

drop policy if exists "lectura feed" on feed_posts;
create policy "lectura feed" on feed_posts for select using (soft_deleted = false);

drop policy if exists "insert feed propio" on feed_posts;
create policy "insert feed propio" on feed_posts for insert with check (auth.uid() = user_id);

drop policy if exists "update feed propio" on feed_posts;
create policy "update feed propio" on feed_posts for update using (auth.uid() = user_id);

drop policy if exists "delete feed" on feed_posts;
create policy "delete feed" on feed_posts for delete using (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- ── feed_post_likes: likes en posts del feed ──────────────────────────────
create table if not exists feed_post_likes (
  post_id uuid references feed_posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table feed_post_likes enable row level security;

drop policy if exists "lectura likes feed" on feed_post_likes;
create policy "lectura likes feed" on feed_post_likes for select using (true);

drop policy if exists "insert like feed" on feed_post_likes;
create policy "insert like feed" on feed_post_likes for insert with check (auth.uid() = user_id);

drop policy if exists "delete like feed" on feed_post_likes;
create policy "delete like feed" on feed_post_likes for delete using (auth.uid() = user_id);

-- ── juegos_puntuaciones: historial de partidas de arcade ─────────────────
create table if not exists juegos_puntuaciones (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  juego text not null,
  puntos integer not null default 0,
  monedas_ganadas integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_juegos_user on juegos_puntuaciones(user_id, juego);
create index if not exists idx_juegos_created on juegos_puntuaciones(created_at desc);

alter table juegos_puntuaciones enable row level security;

drop policy if exists "lectura juegos" on juegos_puntuaciones;
create policy "lectura juegos" on juegos_puntuaciones for select using (true);

drop policy if exists "insert juegos propio" on juegos_puntuaciones;
create policy "insert juegos propio" on juegos_puntuaciones for insert with check (auth.uid() = user_id);

-- ── Función toggle like feed post ─────────────────────────────────────────
create or replace function toggle_feed_like(p_post_id uuid, p_user_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  if exists (select 1 from feed_post_likes where post_id = p_post_id and user_id = p_user_id) then
    delete from feed_post_likes where post_id = p_post_id and user_id = p_user_id;
    update feed_posts set likes_count = greatest(0, likes_count - 1) where id = p_post_id;
  else
    insert into feed_post_likes (post_id, user_id) values (p_post_id, p_user_id);
    update feed_posts set likes_count = likes_count + 1 where id = p_post_id;
  end if;
  select likes_count into v_count from feed_posts where id = p_post_id;
  return v_count;
end;
$$;

-- ── Columnas extra en profiles para la tienda virtual ─────────────────────
alter table profiles add column if not exists items_comprados jsonb default '[]'::jsonb;
alter table profiles add column if not exists aura_activa text default null;
alter table profiles add column if not exists titulo_activo text default null;
alter table profiles add column if not exists burbuja_activa text default null;
