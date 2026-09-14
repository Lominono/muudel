-- ============================================
-- Funciones y triggers
-- ============================================

-- Auto-crear perfil al hacer login con Google
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nombre, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    '🧑'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Sumar like a un mensaje
create or replace function increment_likes(msg_id uuid)
returns void as $$
begin
  update messages set likes_count = likes_count + 1 where id = msg_id;
end;
$$ language plpgsql security definer;

-- Actualizar racha y puntos tras check-in
create or replace function actualizar_racha()
returns trigger as $$
declare
  v_ultimo text;
  v_racha_actual integer;
  v_nueva_racha integer;
begin
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

  update profiles set
    racha_actual = v_nueva_racha,
    mejor_racha = greatest(mejor_racha, v_nueva_racha),
    ultimo_checkin = new.fecha::text,
    puntos_total = puntos_total + new.puntos_ganados
  where id = new.user_id;

  update profiles set xp_nivel = puntos_total where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: checkin → actualizar racha
drop trigger if exists trg_checkin_after_insert on checkins;
create trigger trg_checkin_after_insert
  after insert on checkins
  for each row execute function actualizar_racha();
