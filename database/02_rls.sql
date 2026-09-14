-- ============================================
-- Row Level Security - políticas
-- ============================================

-- perfiles
alter table profiles enable row level security;
create policy "lectura publica" on profiles for select using (true);
create policy "actualizar propio" on profiles for update using (auth.uid() = id);
create policy "insert propio" on profiles for insert with check (auth.uid() = id);

-- checkins
alter table checkins enable row level security;
create policy "lectura todos" on checkins for select using (true);
create policy "insert propio" on checkins for insert with check (auth.uid() = user_id);
create policy "actualizar propio" on checkins for update using (auth.uid() = user_id);

-- mensajes
alter table messages enable row level security;
create policy "lectura canales" on messages for select using (soft_deleted = false);
create policy "insert propio" on messages for insert with check (auth.uid() = user_id);
create policy "actualizar propio" on messages for update using (auth.uid() = user_id);
create policy "borrar mensaje" on messages for delete using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- message_likes
alter table message_likes enable row level security;
create policy "lectura" on message_likes for select using (true);
create policy "insert propio" on message_likes for insert with check (auth.uid() = user_id);
create policy "delete propio" on message_likes for delete using (auth.uid() = user_id);

-- apuntes
alter table apuntes enable row level security;
create policy "lectura todos" on apuntes for select using (true);
create policy "insert propio" on apuntes for insert with check (auth.uid() = user_id);
create policy "actualizar propio" on apuntes for update using (auth.uid() = user_id);
create policy "borrar propio" on apuntes for delete using (auth.uid() = user_id);

-- retos
alter table retos enable row level security;
create policy "lectura todos" on retos for select using (true);
create policy "insert propio" on retos for insert with check (auth.uid() = creado_por);
create policy "actualizar moderador" on retos for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- reto_completado
alter table reto_completado enable row level security;
create policy "lectura" on reto_completado for select using (true);
create policy "insert propio" on reto_completado for insert with check (auth.uid() = user_id);
create policy "actualizar moderador" on reto_completado for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

-- achievements
alter table achievements enable row level security;
create policy "lectura propia" on achievements for select using (auth.uid() = user_id);
create policy "insert propio" on achievements for insert with check (auth.uid() = user_id);
