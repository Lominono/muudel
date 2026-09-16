-- ============================================
-- Funciones y triggers
-- ============================================

-- Auto-crear perfil al hacer login con Google o Correo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Estudiante'
  );

  if length(v_nombre) < 2 then
    v_nombre := 'Estudiante';
  elsif length(v_nombre) > 30 then
    v_nombre := substring(v_nombre from 1 for 30);
  end if;

  insert into public.profiles (
    id,
    nombre,
    avatar_emoji,
    puntos_total,
    racha_actual,
    mejor_racha,
    rol
  )
  values (
    new.id,
    v_nombre,
    '🧑‍🎓',
    10,
    1,
    1,
    'alumno'
  )
  on conflict (id) do update set
    nombre = coalesce(nullif(profiles.nombre, 'Alumno'), excluded.nombre),
    updated_at = now();

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
