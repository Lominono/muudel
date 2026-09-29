-- ==============================================================================
-- 09_direct_messages.sql
-- Sistema de Mensajes Directos (DMs) privados entre alumnos y profesores
-- ==============================================================================

create table if not exists direct_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  texto text not null check (length(texto) >= 1 and length(texto) <= 2000),
  leido boolean default false,
  reply_to uuid references direct_messages(id) on delete set null,
  sello text default null,
  reacciones jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Índices de alto rendimiento para chats 1 a 1 y conversaciones
create index if not exists idx_dm_pair on direct_messages(sender_id, receiver_id, created_at);
create index if not exists idx_dm_receiver_unread on direct_messages(receiver_id, leido);
create index if not exists idx_dm_created on direct_messages(created_at desc);

-- Políticas RLS
alter table direct_messages enable row level security;

drop policy if exists "lectura mensajes propios o recibidos" on direct_messages;
create policy "lectura mensajes propios o recibidos" on direct_messages
  for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id or auth.uid() is null
  );

drop policy if exists "insertar mensaje como remitente" on direct_messages;
create policy "insertar mensaje como remitente" on direct_messages
  for insert with check (
    auth.uid() = sender_id or auth.uid() is null
  );

drop policy if exists "actualizar estado leido o reacciones" on direct_messages;
create policy "actualizar estado leido o reacciones" on direct_messages
  for update using (
    auth.uid() = receiver_id or auth.uid() = sender_id or auth.uid() is null
  );

drop policy if exists "eliminar propios mensajes dm" on direct_messages;
create policy "eliminar propios mensajes dm" on direct_messages
  for delete using (
    auth.uid() = sender_id
  );

-- Habilitar publicación Realtime en Supabase si está disponible
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table direct_messages;
  end if;
exception when others then
  -- Silencioso si la tabla ya está en la publicación
end $$;
