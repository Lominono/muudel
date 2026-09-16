-- ============================================
-- Row Level Security - políticas idempotentes
-- ============================================

-- perfiles
alter table profiles enable row level security;
drop policy if exists "lectura publica" on profiles;
create policy "lectura publica" on profiles for select using (true);
drop policy if exists "actualizar propio" on profiles;
create policy "actualizar propio" on profiles for update using (auth.uid() = id);
drop policy if exists "insert propio" on profiles;
create policy "insert propio" on profiles for insert with check (auth.uid() = id);

-- checkins
alter table checkins enable row level security;
drop policy if exists "lectura todos" on checkins;
create policy "lectura todos" on checkins for select using (true);
drop policy if exists "insert propio" on checkins;
create policy "insert propio" on checkins for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar propio" on checkins;
create policy "actualizar propio" on checkins for update using (auth.uid() = user_id);

-- mensajes
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

-- message_likes
alter table message_likes enable row level security;
drop policy if exists "lectura" on message_likes;
create policy "lectura" on message_likes for select using (true);
drop policy if exists "insert propio" on message_likes;
create policy "insert propio" on message_likes for insert with check (auth.uid() = user_id);
drop policy if exists "delete propio" on message_likes;
create policy "delete propio" on message_likes for delete using (auth.uid() = user_id);

-- apuntes
alter table apuntes enable row level security;
drop policy if exists "lectura todos" on apuntes;
create policy "lectura todos" on apuntes for select using (true);
drop policy if exists "insert propio" on apuntes;
create policy "insert propio" on apuntes for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar propio" on apuntes;
create policy "actualizar propio" on apuntes for update using (auth.uid() = user_id);
drop policy if exists "borrar propio" on apuntes;
create policy "borrar propio" on apuntes for delete using (auth.uid() = user_id);

-- retos
alter table retos enable row level security;
drop policy if exists "lectura todos" on retos;
create policy "lectura todos" on retos for select using (true);
drop policy if exists "insert propio" on retos;
create policy "insert propio" on retos for insert with check (auth.uid() = creado_por);
drop policy if exists "actualizar moderador" on retos;
create policy "actualizar moderador" on retos for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- reto_completado
alter table reto_completado enable row level security;
drop policy if exists "lectura" on reto_completado;
create policy "lectura" on reto_completado for select using (true);
drop policy if exists "insert propio" on reto_completado;
create policy "insert propio" on reto_completado for insert with check (auth.uid() = user_id);
drop policy if exists "actualizar moderador" on reto_completado;
create policy "actualizar moderador" on reto_completado for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- achievements
alter table achievements enable row level security;
drop policy if exists "lectura propia" on achievements;
create policy "lectura propia" on achievements for select using (auth.uid() = user_id);
drop policy if exists "insert propio" on achievements;
create policy "insert propio" on achievements for insert with check (auth.uid() = user_id);
