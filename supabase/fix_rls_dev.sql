-- ============================================================
-- FIX RLS para desarrollo / admin sin auth todavía
-- Ejecuta esto en el SQL Editor de Supabase
-- ============================================================

-- Permitir que barbers sean insertados/actualizados sin auth (temporal hasta tener login)
drop policy if exists "barbers_staff" on barbers;
create policy "barbers_all_anon" on barbers for all using (true) with check (true);

-- Permitir que working_hours sea gestionado sin auth
drop policy if exists "wh_staff" on working_hours;
create policy "wh_all_anon" on working_hours for all using (true) with check (true);

-- Permitir que services sean gestionados sin auth
drop policy if exists "services_staff" on services;
create policy "services_all_anon" on services for all using (true) with check (true);

-- Permitir que service_categories sean gestionadas sin auth
drop policy if exists "cats_staff" on service_categories;
create policy "cats_all_anon" on service_categories for all using (true) with check (true);

-- Permitir que bookings sean leídas sin auth (dashboard)
drop policy if exists "book_staff_sel" on bookings;
drop policy if exists "book_staff_upd" on bookings;
create policy "book_all_anon" on bookings for all using (true) with check (true);

-- Permitir que clients sean leídos sin auth
drop policy if exists "clients_staff_upd" on clients;
create policy "clients_all_anon" on clients for all using (true) with check (true);

-- Permitir que barber_services sean gestionados sin auth
drop policy if exists "bs_staff" on barber_services;
create policy "bs_all_anon" on barber_services for all using (true) with check (true);

-- time_blocks
drop policy if exists "tb_staff" on time_blocks;
create policy "tb_all_anon" on time_blocks for all using (true) with check (true);
