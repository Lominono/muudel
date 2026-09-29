-- ==============================================================================
-- 08_skills_y_datos_reales.sql
-- Migración completa para eliminar datos inventados y conectar todo a Supabase:
-- 1. Pregunta Flash & Votos en tiempo real
-- 2. Canjes y pedidos de la Tienda de Recompensas
-- 3. Inventario de artículos activos de los alumnos
-- 4. Árbol de Habilidades y Competencias Técnicas SMR2 (Skills)
-- 5. Marcado de solución en chat de dudas y autoría humana verificada
-- 6. Puntuaciones reales del Arcade (Yoshi Runner) y verificación de retos
-- ==============================================================================

-- ── 1. PREGUNTA FLASH DEL DÍA Y VOTACIONES REALES ────────────────────────────
create table if not exists pregunta_flash (
  id text primary key,
  pregunta text not null,
  opciones jsonb not null default '[]'::jsonb,
  fecha date default current_date,
  activo boolean default true,
  creado_por uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists pregunta_flash_votos (
  pregunta_id text not null,
  user_id uuid references profiles(id) on delete cascade not null,
  opcion_id text not null,
  created_at timestamptz default now(),
  primary key (pregunta_id, user_id)
);

create index if not exists idx_pregunta_votos_preg on pregunta_flash_votos(pregunta_id);

alter table pregunta_flash enable row level security;
alter table pregunta_flash_votos enable row level security;

drop policy if exists "lectura pregunta_flash" on pregunta_flash;
create policy "lectura pregunta_flash" on pregunta_flash for select using (true);

drop policy if exists "admin gestion pregunta_flash" on pregunta_flash;
create policy "admin gestion pregunta_flash" on pregunta_flash for all using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

drop policy if exists "lectura votos flash" on pregunta_flash_votos;
create policy "lectura votos flash" on pregunta_flash_votos for select using (true);

drop policy if exists "insert voto flash propio" on pregunta_flash_votos;
create policy "insert voto flash propio" on pregunta_flash_votos for insert with check (auth.uid() = user_id);

drop policy if exists "update voto flash propio" on pregunta_flash_votos;
create policy "update voto flash propio" on pregunta_flash_votos for update using (auth.uid() = user_id);


-- ── 2. CANJES Y PEDIDOS DE LA TIENDA DE RECOMPENSAS ──────────────────────────
create table if not exists canjes_pedidos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  item_id text not null,
  titulo text not null,
  costo integer not null default 0,
  categoria text default 'ventajas',
  estado text default 'pendiente' check (estado in ('pendiente', 'entregado', 'rechazado')),
  notas text default '',
  created_at timestamptz default now(),
  resuelto_en timestamptz
);

create index if not exists idx_canjes_user on canjes_pedidos(user_id);
create index if not exists idx_canjes_estado on canjes_pedidos(estado);

alter table canjes_pedidos enable row level security;

drop policy if exists "lectura canjes" on canjes_pedidos;
create policy "lectura canjes" on canjes_pedidos for select using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);

drop policy if exists "insert canjes propio" on canjes_pedidos;
create policy "insert canjes propio" on canjes_pedidos for insert with check (auth.uid() = user_id);

drop policy if exists "update canjes moderador" on canjes_pedidos;
create policy "update canjes moderador" on canjes_pedidos for update using (
  exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);


-- ── 3. INVENTARIO DE ARTÍCULOS ACTIVOS DEL ALUMNO ───────────────────────────
create table if not exists inventario_usuario (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  item_id text not null,
  titulo text not null,
  categoria text not null,
  estado text default 'listo' check (estado in ('listo', 'activo', 'expirado')),
  comprado_en timestamptz default now(),
  activado_en timestamptz,
  expira_en timestamptz,
  duracion_ms bigint not null default 0,
  duracion_texto text default ''
);

create index if not exists idx_inventario_user on inventario_usuario(user_id);
create index if not exists idx_inventario_estado on inventario_usuario(estado);

alter table inventario_usuario enable row level security;

drop policy if exists "lectura inventario" on inventario_usuario;
create policy "lectura inventario" on inventario_usuario for select using (true);

drop policy if exists "gestion inventario propio" on inventario_usuario;
create policy "gestion inventario propio" on inventario_usuario for all using (auth.uid() = user_id);


-- ── 4. COMPETENCIAS TÉCNICAS Y ÁRBOL DE HABILIDADES (SKILLS SMR2) ────────────
create table if not exists user_skills (
  user_id uuid references profiles(id) on delete cascade not null,
  skill_id text not null,
  nivel integer default 1 check (nivel between 1 and 10),
  xp integer default 0,
  ultimo_avance timestamptz default now(),
  primary key (user_id, skill_id)
);

create index if not exists idx_user_skills_user on user_skills(user_id);

alter table user_skills enable row level security;

drop policy if exists "lectura skills" on user_skills;
create policy "lectura skills" on user_skills for select using (true);

drop policy if exists "gestion skills propio o moderador" on user_skills;
create policy "gestion skills propio o moderador" on user_skills for all using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);


-- ── 5. COLUMNAS ADICIONALES EN PROFILES PARA PERSONALIZACIÓN REAL ───────────
alter table profiles add column if not exists skills jsonb default '{}'::jsonb;
alter table profiles add column if not exists items_comprados jsonb default '[]'::jsonb;
alter table profiles add column if not exists aura_activa text default null;
alter table profiles add column if not exists titulo_activo text default null;
alter table profiles add column if not exists burbuja_activa text default null;
alter table profiles add column if not exists marco_avatar text default 'ninguno';
alter table profiles add column if not exists banner_estilo text default 'cuadricula';
alter table profiles add column if not exists titulo_personalizado text default '';
alter table profiles add column if not exists digito_id text default '';
alter table profiles add column if not exists username text default '';
alter table profiles add column if not exists baneado boolean default false;
alter table profiles add column if not exists motivo_ban text default null;


-- ── 6. MEJORAS DE CHAT: SOLUCIONES DE DUDAS Y AUTORÍA HUMANA ─────────────────
alter table messages add column if not exists es_solucion boolean default false;
alter table messages add column if not exists solucion_marcada_por uuid references profiles(id);
alter table messages add column if not exists es_autoria_humana boolean default true;
alter table messages add column if not exists fijado boolean default false;
alter table messages add column if not exists fijado_por uuid references profiles(id);
alter table messages add column if not exists fijado_en timestamptz;
alter table messages add column if not exists reply_to_texto text default '';
alter table messages add column if not exists reply_to_nombre text default '';
alter table messages add column if not exists reacciones jsonb default '{}'::jsonb;

-- Función para marcar/desmarcar un mensaje como solución oficial en 'dudas'
create or replace function marcar_solucion_duda(
  p_msg_id uuid,
  p_marcador_id uuid
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_actual boolean;
  v_autor_id uuid;
begin
  select es_solucion, user_id into v_actual, v_autor_id
  from messages
  where id = p_msg_id;

  if v_actual is null then
    return false;
  end if;

  if v_actual then
    -- Desmarcar
    update messages
    set es_solucion = false,
        solucion_marcada_por = null
    where id = p_msg_id;
  else
    -- Marcar y premiar con +10 pts de aula al autor de la respuesta
    update messages
    set es_solucion = true,
        solucion_marcada_por = p_marcador_id
    where id = p_msg_id;

    if v_autor_id is not null then
      update profiles
      set puntos_total = puntos_total + 10
      where id = v_autor_id;
    end if;
  end if;

  return not v_actual;
end;
$$;


-- ── 7. PUNTUACIONES REALES DEL RECREO ARCADE ────────────────────────────────
create table if not exists juegos_puntuaciones (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  juego text not null,
  puntos integer not null default 0,
  monedas_ganadas integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_juegos_user on juegos_puntuaciones(user_id, juego);
create index if not exists idx_juegos_puntos on juegos_puntuaciones(juego, puntos desc);

alter table juegos_puntuaciones enable row level security;

drop policy if exists "lectura juegos" on juegos_puntuaciones;
create policy "lectura juegos" on juegos_puntuaciones for select using (true);

drop policy if exists "insert juegos propio" on juegos_puntuaciones;
create policy "insert juegos propio" on juegos_puntuaciones for insert with check (auth.uid() = user_id);


-- ── 8. RETO COMPLETADO CON EVIDENCIA Y FEEDBACK DOCENTE ──────────────────────
alter table reto_completado add column if not exists evidencia text default '';
alter table reto_completado add column if not exists estado text default 'pendiente';
alter table reto_completado add column if not exists feedback_admin text default '';
alter table reto_completado add column if not exists revisado_por uuid references profiles(id);
alter table reto_completado add column if not exists revisado_en timestamptz;

alter table reto_completado enable row level security;

drop policy if exists "lectura retos_completados" on reto_completado;
create policy "lectura retos_completados" on reto_completado for select using (true);

drop policy if exists "insert reto_completado propio" on reto_completado;
create policy "insert reto_completado propio" on reto_completado for insert with check (auth.uid() = user_id);

drop policy if exists "update reto_completado moderador o propio" on reto_completado;
create policy "update reto_completado moderador o propio" on reto_completado for update using (
  auth.uid() = user_id or exists (select 1 from profiles where id = auth.uid() and rol = 'moderador')
);


-- ── 9. PREGUNTAS FLASH SEMILLA (INICIALIZACIÓN REAL) ─────────────────────────
insert into pregunta_flash (id, pregunta, opciones) values
('flash-1', '¿Qué bloque temático de SMR2 requiere mayor tiempo de laboratorio?', '[
  {"id": "a", "texto": "Configuración de switches y VLANs"},
  {"id": "b", "texto": "Administración de usuarios y permisos en Linux"},
  {"id": "c", "texto": "Montaje y diagnóstico físico de hardware"},
  {"id": "d", "texto": "Servidores DNS, DHCP y Cortafuegos"}
]'::jsonb),
('flash-2', '¿Cuál es el mejor horario para entregar las prácticas de clase?', '[
  {"id": "a", "texto": "Antes del pase de lista de las 15:30"},
  {"id": "b", "texto": "Justo al terminar el laboratorio en el taller"},
  {"id": "c", "texto": "Durante el descanso de las 18:10"},
  {"id": "d", "texto": "En casa repasando los apuntes compartidos"}
]'::jsonb)
on conflict (id) do nothing;
