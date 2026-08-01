-- Bug real: getAvailableSlots() en el frontend hace SELECT de huecos libres y
-- LUEGO el cliente hace INSERT. Si dos clientes consultan casi al mismo tiempo,
-- ambos ven la misma hora libre y ambos terminan reservando — no había ningún
-- bloqueo a nivel de base de datos que lo impidiera. Así se duplicó Héctor con
-- Bryan/Agustín a las 20:00.
--
-- Fix: un constraint de exclusión — Postgres rechaza el INSERT/UPDATE si se
-- superpone con otra reserva activa del mismo barbero, sin importar qué tan
-- rápido lleguen las peticiones. Es la única defensa que no depende de timing.

create extension if not exists btree_gist;

alter table bookings
  add constraint bookings_no_overlap_per_barber
  exclude using gist (
    barber_id with =,
    tstzrange(scheduled_at, scheduled_at + (duration_min || ' minutes')::interval, '[)') with &&
  )
  where (status in ('pending', 'confirmed', 'in_progress'));
