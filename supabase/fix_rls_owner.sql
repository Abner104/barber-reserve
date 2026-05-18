-- ============================================================
-- FIX: Permitir que el owner actualice su propia barbería
-- El RLS anterior solo dejaba al super_admin modificar barbershops
-- ============================================================

-- Eliminar política restrictiva anterior
drop policy if exists "shops_superadmin" on barbershops;
drop policy if exists "shops_public_read" on barbershops;
drop policy if exists "shops_owner_update" on barbershops;

-- Todos pueden leer barberías activas (para la landing pública)
create policy "shops_public_read"
  on barbershops for select
  using (is_active = true);

-- El owner puede leer Y actualizar SU propia barbería
create policy "shops_owner_read"
  on barbershops for select
  using (
    auth.uid() in (
      select id from profiles where shop_id = barbershops.id
    )
  );

create policy "shops_owner_update"
  on barbershops for update
  using (
    auth.uid() in (
      select id from profiles where shop_id = barbershops.id and role in ('owner', 'barber')
    )
  );

-- El super_admin puede todo
create policy "shops_superadmin_all"
  on barbershops for all
  using (
    exists (
      select 1 from profiles where id = auth.uid() and role = 'super_admin'
    )
  );

-- El owner puede insertar su propia barbería (registro)
create policy "shops_insert_anon"
  on barbershops for insert
  with check (true);
