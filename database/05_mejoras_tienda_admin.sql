-- ===============================================================
-- 05_mejoras_tienda_admin.sql
-- Actualizaciones para soporte de baneo, marcos y personalización
-- ===============================================================

alter table profiles add column if not exists baneado boolean default false;
alter table profiles add column if not exists motivo_ban text;
alter table profiles add column if not exists marco_avatar text default 'ninguno';
alter table profiles add column if not exists banner_estilo text default 'clasico';
alter table profiles add column if not exists titulo_personalizado text default '';

-- Tabla opcional para inventario de productos temporales de la tienda
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
  duracion_ms bigint not null,
  duracion_texto text
);

create index if not exists idx_inventario_user on inventario_usuario(user_id);
create index if not exists idx_inventario_estado on inventario_usuario(estado);
