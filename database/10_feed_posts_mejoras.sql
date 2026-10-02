-- ==============================================================================
-- 10_feed_posts_mejoras.sql
-- Mejoras para la sección del Feed, gestión de comentarios, likes y posts de administración
-- ==============================================================================

-- 1. Tabla feed_posts (asegurar columnas y restricciones)
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

-- Índices para búsqueda rápida en el feed
create index if not exists idx_feed_posts_created on feed_posts(created_at desc);
create index if not exists idx_feed_posts_user on feed_posts(user_id);
create index if not exists idx_feed_posts_categoria on feed_posts(categoria);

alter table feed_posts enable row level security;

-- Políticas RLS para feed_posts
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

-- 2. Tabla feed_post_likes
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

-- 3. Tabla feed_post_comments (Comentarios en posts del feed)
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

-- 4. Funciones RPC para conteo atómico de likes
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

-- Toggle atómico de likes en feed
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
    insert into feed_post_likes (post_id, user_id) values (p_post_id, p_user_id)
    on conflict (post_id, user_id) do nothing;
    update feed_posts set likes_count = likes_count + 1 where id = p_post_id;
  end if;
  select coalesce(likes_count, 0) into v_count from feed_posts where id = p_post_id;
  return v_count;
end;
$$;
