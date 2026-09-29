-- ============================================
-- Vistas para ranking
-- ============================================
-- ============================================
-- Vistas para ranking
-- ============================================
drop view if exists ranking_diario cascade;
create view ranking_diario as
select p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total,
       p.racha_actual, p.mejor_racha, count(c.id) as checkins_hoy
from profiles p
left join checkins c on c.user_id = p.id and c.fecha = current_date
group by p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

drop view if exists ranking_semanal cascade;
create view ranking_semanal as
select p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total,
       p.racha_actual, p.mejor_racha, count(c.id) as checkins_semana
from profiles p
left join checkins c on c.user_id = p.id and c.fecha >= current_date - interval '7 days'
group by p.id, p.nombre, p.username, p.avatar_emoji, p.color_acento, p.puntos_total, p.racha_actual, p.mejor_racha
order by p.puntos_total desc;

