-- ===============================================================
-- 07_chat_mejoras.sql
-- Mejoras avanzadas para el chat de clase:
-- Citas/respuestas, reacciones multiples, mensajes fijados y canales
-- ===============================================================

-- 1. Ampliar canales permitidos en la tabla messages (añadir 'avisos')
alter table messages drop constraint if exists messages_canal_check;
alter table messages add constraint messages_canal_check 
  check (canal in ('general', 'dudas', 'apuntes', 'avisos', 'retos'));

-- 2. Columnas adicionales para reacciones, fijados y citas enriquecidas
alter table messages add column if not exists reply_to_texto text default '';
alter table messages add column if not exists reply_to_nombre text default '';
alter table messages add column if not exists reacciones jsonb default '{}'::jsonb;
alter table messages add column if not exists fijado boolean default false;
alter table messages add column if not exists fijado_por uuid references profiles(id);
alter table messages add column if not exists fijado_en timestamptz;

-- 3. Índices para rendimiento en canales y fijados
create index if not exists idx_messages_canal_fijado on messages(canal, fijado) where fijado = true;
create index if not exists idx_messages_soft_deleted on messages(canal, soft_deleted);

-- 4. Función RPC para reaccionar a un mensaje de forma atómica
create or replace function toggle_reaccion_mensaje(
  p_msg_id uuid,
  p_reaccion text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_reacciones jsonb;
  v_users jsonb;
  v_idx int;
begin
  select coalesce(reacciones, '{}'::jsonb) into v_reacciones
  from messages
  where id = p_msg_id;

  v_users := coalesce(v_reacciones->p_reaccion, '[]'::jsonb);

  -- Comprobar si el usuario ya reaccionó con este emoji
  if v_users ? p_user_id::text then
    -- Quitar la reacción
    v_users := (
      select jsonb_agg(elem)
      from jsonb_array_elements_text(v_users) as elem
      where elem != p_user_id::text
    );
    if v_users is null then
      v_users := '[]'::jsonb;
    end if;
  else
    -- Añadir la reacción
    v_users := v_users || jsonb_build_array(p_user_id::text);
  end if;

  v_reacciones := jsonb_set(v_reacciones, array[p_reaccion], v_users);

  update messages
  set reacciones = v_reacciones
  where id = p_msg_id;

  return v_reacciones;
end;
$$;

-- 5. Función RPC para alternar Likes de mensajes (Like / Unlike)
-- Sobrecarga robusta que acepta text o uuid para evitar fallos de tipado desde clientes JS
create or replace function toggle_like_mensaje(
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
    -- Si es un ID temporal de mock/offline
    return jsonb_build_object('liked', true, 'count', 1, 'mock', true);
  end;

  if exists (select 1 from message_likes where message_id = v_msg_uuid and user_id = v_user_uuid) then
    delete from message_likes where message_id = v_msg_uuid and user_id = v_user_uuid;
    v_liked := false;
  else
    insert into message_likes (message_id, user_id) values (v_msg_uuid, v_user_uuid)
    on conflict do nothing;
    v_liked := true;
  end if;

  select count(*) into v_count from message_likes where message_id = v_msg_uuid;
  update messages set likes_count = v_count where id = v_msg_uuid;

  return jsonb_build_object('liked', v_liked, 'count', v_count);
end;
$$;

