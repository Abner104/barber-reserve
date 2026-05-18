-- ============================================================
-- FIX COMPLETO: Settings no guarda
-- Ejecuta todo esto de una en el SQL Editor de Supabase
-- ============================================================

-- PASO 1: Ver qué tienes (para diagnóstico)
select 'barbershops' as tabla, id, name, slug from barbershops;
select 'profiles' as tabla, id, role, shop_id from profiles;

-- PASO 2: Asegurar que tu perfil está linkado a la barbería del seed
-- (Si ya tienes un perfil con shop_id correcto, esto no cambia nada)
update profiles
set shop_id = 'a0000000-0000-0000-0000-000000000001'
where shop_id is null
  and role in ('owner', 'super_admin', 'barber');

-- PASO 3: Agregar columnas que pueden faltar
alter table barbershops
  add column if not exists theme_mode       text default 'dark',
  add column if not exists theme_color      text default '#FF6B2C',
  add column if not exists theme_font       text default 'Inter',
  add column if not exists cover_url        text,
  add column if not exists tagline          text,
  add column if not exists address          text,
  add column if not exists city             text,
  add column if not exists whatsapp_number  text,
  add column if not exists instagram_url    text,
  add column if not exists logo_url         text;

-- PASO 4: Fix RLS en barbershops
drop policy if exists "shops_superadmin"     on barbershops;
drop policy if exists "shops_superadmin_all" on barbershops;
drop policy if exists "shops_public_read"    on barbershops;
drop policy if exists "shops_owner_read"     on barbershops;
drop policy if exists "shops_owner_update"   on barbershops;
drop policy if exists "shops_insert_anon"    on barbershops;

-- Lectura pública (landing de cada barbería)
create policy "shops_public_read"
  on barbershops for select
  using (is_active = true);

-- Lectura del owner de su propia barbería
create policy "shops_owner_read"
  on barbershops for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.shop_id = barbershops.id
    )
  );

-- Update: el owner puede editar SU barbería
create policy "shops_owner_update"
  on barbershops for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.shop_id = barbershops.id
        and profiles.role in ('owner', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.shop_id = barbershops.id
        and profiles.role in ('owner', 'super_admin')
    )
  );

-- Insert: cualquiera puede crear barbería (registro)
create policy "shops_insert_anon"
  on barbershops for insert
  with check (true);

-- PASO 5: Verificar que quedó bien
select id, name, city, theme_mode from barbershops;
