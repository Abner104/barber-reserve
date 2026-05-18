-- ============================================================
-- MIGRACIÓN: Schema Multi-Tenant NobleCut
-- Ejecuta esto en el SQL Editor de Supabase
-- PASO 1: borrar todo lo anterior
-- PASO 2: crear schema nuevo con barbershops + shop_id
-- ============================================================

-- ── LIMPIAR SCHEMA ANTERIOR ──────────────────────────────────
drop table if exists notifications       cascade;
drop table if exists reviews             cascade;
drop table if exists booking_services    cascade;
drop table if exists bookings            cascade;
drop table if exists client_addresses    cascade;
drop table if exists clients             cascade;
drop table if exists time_blocks         cascade;
drop table if exists working_hours       cascade;
drop table if exists barber_services     cascade;
drop table if exists services            cascade;
drop table if exists service_categories  cascade;
drop table if exists barbers             cascade;
drop table if exists shop_settings       cascade;
drop table if exists profiles            cascade;

drop type if exists booking_status  cascade;
drop type if exists booking_type    cascade;
drop type if exists payment_status  cascade;
drop type if exists payment_method  cascade;
drop type if exists user_role       cascade;
drop type if exists day_of_week     cascade;
drop type if exists shop_plan       cascade;

drop function if exists update_updated_at()      cascade;
drop function if exists sync_client_visits()     cascade;
drop function if exists auth_role()              cascade;
drop function if exists is_barber_or_owner()     cascade;
drop function if exists get_user_shop_id()       cascade;

-- ── EXTENSIONES ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── ENUMS ────────────────────────────────────────────────────
create type booking_status as enum ('pending','confirmed','in_progress','completed','cancelled','no_show');
create type booking_type   as enum ('in_store','delivery');
create type payment_status as enum ('pending','paid','refunded');
create type payment_method as enum ('cash','card','transfer','nequi','daviplata');
create type user_role      as enum ('super_admin','owner','barber','client');
create type day_of_week    as enum ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
create type shop_plan      as enum ('trial','basic','pro','enterprise');

-- ── TABLA: barbershops (una fila = una barbería cliente) ──────
create table barbershops (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  slug            text not null unique,         -- para subdominio: noblecut.tuapp.com
  plan            shop_plan not null default 'trial',
  is_active       boolean not null default true,
  phone           text,
  address         text,
  city            text,
  lat             numeric(10,7),
  lng             numeric(10,7),
  logo_url        text,
  instagram_url   text,
  whatsapp_number text,
  currency        text not null default 'COP',
  timezone        text not null default 'America/Bogota',
  -- configuración de agenda
  booking_lead_time_min int default 60,
  booking_window_days   int default 30,
  slot_interval_min     int default 30,
  allows_delivery       boolean default true,
  delivery_fee_base     numeric(10,2) default 0,
  delivery_fee_per_km   numeric(10,2) default 0,
  -- suscripción
  trial_ends_at   timestamptz,
  subscribed_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── TABLA: profiles ───────────────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  shop_id     uuid references barbershops(id) on delete set null, -- null = super_admin
  role        user_role not null default 'client',
  full_name   text not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── TABLA: barbers ────────────────────────────────────────────
create table barbers (
  id              uuid primary key default uuid_generate_v4(),
  shop_id         uuid not null references barbershops(id) on delete cascade,
  profile_id      uuid references profiles(id) on delete set null,
  full_name       text not null,               -- nombre directo, no depende de auth
  phone           text,
  avatar_url      text,
  bio             text,
  specialty       text,
  commission_pct  numeric(5,2) default 0,
  does_delivery   boolean not null default true,
  delivery_radius numeric(6,2) default 10,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── TABLA: service_categories ─────────────────────────────────
create table service_categories (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references barbershops(id) on delete cascade,
  name        text not null,
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);

-- ── TABLA: services ───────────────────────────────────────────
create table services (
  id              uuid primary key default uuid_generate_v4(),
  shop_id         uuid not null references barbershops(id) on delete cascade,
  category_id     uuid references service_categories(id) on delete set null,
  name            text not null,
  description     text,
  duration_min    int not null,
  price           numeric(10,2) not null,
  price_delivery  numeric(10,2),
  is_available    boolean not null default true,
  allows_delivery boolean not null default true,
  image_url       text,
  sort_order      int default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── TABLA: barber_services ────────────────────────────────────
create table barber_services (
  barber_id  uuid not null references barbers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- ── TABLA: working_hours ──────────────────────────────────────
create table working_hours (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references barbershops(id) on delete cascade,
  barber_id   uuid not null references barbers(id) on delete cascade,
  day         day_of_week not null,
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true,
  constraint valid_hours check (start_time < end_time),
  unique(barber_id, day)
);

-- ── TABLA: time_blocks ────────────────────────────────────────
create table time_blocks (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references barbershops(id) on delete cascade,
  barber_id   uuid not null references barbers(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint valid_block check (starts_at < ends_at)
);

-- ── TABLA: clients ────────────────────────────────────────────
create table clients (
  id            uuid primary key default uuid_generate_v4(),
  shop_id       uuid not null references barbershops(id) on delete cascade,
  profile_id    uuid references profiles(id) on delete set null,
  full_name     text not null,
  phone         text,
  email         text,
  notes         text,
  total_visits  int not null default 0,
  last_visit_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ── TABLA: client_addresses ───────────────────────────────────
create table client_addresses (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references clients(id) on delete cascade,
  label        text default 'Casa',
  address_line text not null,
  city         text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ── TABLA: bookings ───────────────────────────────────────────
create table bookings (
  id              uuid primary key default uuid_generate_v4(),
  shop_id         uuid not null references barbershops(id) on delete cascade,
  client_id       uuid not null references clients(id) on delete restrict,
  barber_id       uuid not null references barbers(id) on delete restrict,
  service_id      uuid not null references services(id) on delete restrict,
  type            booking_type not null default 'in_store',
  status          booking_status not null default 'pending',
  scheduled_at    timestamptz not null,
  duration_min    int not null,
  started_at      timestamptz,
  ended_at        timestamptz,
  price           numeric(10,2) not null,
  price_final     numeric(10,2),
  payment_status  payment_status not null default 'pending',
  payment_method  payment_method,
  address_id      uuid references client_addresses(id) on delete set null,
  address_line    text,
  lat             numeric(10,7),
  lng             numeric(10,7),
  delivery_fee    numeric(10,2) default 0,
  travel_started_at timestamptz,
  client_notes    text,
  barber_notes    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── TABLA: reviews ────────────────────────────────────────────
create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references barbershops(id) on delete cascade,
  booking_id  uuid not null references bookings(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  barber_id   uuid not null references barbers(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique(booking_id)
);

-- ── ÍNDICES ───────────────────────────────────────────────────
create index idx_bookings_shop_date    on bookings(shop_id, scheduled_at);
create index idx_bookings_barber_date  on bookings(barber_id, scheduled_at);
create index idx_bookings_status       on bookings(status);
create index idx_bookings_client       on bookings(client_id);
create index idx_barbers_shop          on barbers(shop_id);
create index idx_services_shop         on services(shop_id);
create index idx_working_hours_barber  on working_hours(barber_id);
create index idx_clients_shop_phone    on clients(shop_id, phone);
create index idx_profiles_shop         on profiles(shop_id);

-- ── TRIGGERS: updated_at ─────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_barbershops_upd before update on barbershops for each row execute function update_updated_at();
create trigger trg_profiles_upd    before update on profiles    for each row execute function update_updated_at();
create trigger trg_barbers_upd     before update on barbers     for each row execute function update_updated_at();
create trigger trg_services_upd    before update on services    for each row execute function update_updated_at();
create trigger trg_bookings_upd    before update on bookings    for each row execute function update_updated_at();

-- ── TRIGGER: conteo de visitas ────────────────────────────────
create or replace function sync_client_visits()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    update clients set total_visits = total_visits + 1, last_visit_at = now() where id = new.client_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_visits after update on bookings for each row execute function sync_client_visits();

-- ── FUNCIONES HELPER RLS ─────────────────────────────────────
create or replace function get_my_shop_id()
returns uuid as $$
  select shop_id from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_super_admin()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'super_admin');
$$ language sql security definer stable;

create or replace function is_staff()
returns boolean as $$
  select exists(select 1 from profiles where id = auth.uid() and role in ('owner','barber','super_admin'));
$$ language sql security definer stable;

-- ── RLS ──────────────────────────────────────────────────────
alter table barbershops      enable row level security;
alter table profiles         enable row level security;
alter table barbers          enable row level security;
alter table service_categories enable row level security;
alter table services         enable row level security;
alter table barber_services  enable row level security;
alter table working_hours    enable row level security;
alter table time_blocks      enable row level security;
alter table clients          enable row level security;
alter table client_addresses enable row level security;
alter table bookings         enable row level security;
alter table reviews          enable row level security;

-- barbershops: público lee activas; super_admin gestiona todo; owner lee la suya
create policy "shops_public_read"  on barbershops for select using (is_active = true);
create policy "shops_superadmin"   on barbershops for all    using (is_super_admin());

-- profiles
create policy "profiles_self"      on profiles for select using (id = auth.uid() or is_staff());
create policy "profiles_self_upd"  on profiles for update using (id = auth.uid());
create policy "profiles_staff_ins" on profiles for insert with check (true);

-- barbers: público lee activos de su shop; staff de ese shop gestiona
create policy "barbers_public"     on barbers for select using (is_active = true);
create policy "barbers_staff"      on barbers for all    using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- services
create policy "services_public"    on services for select using (is_available = true);
create policy "services_staff"     on services for all    using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- categories
create policy "cats_public"        on service_categories for select using (true);
create policy "cats_staff"         on service_categories for all    using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- barber_services
create policy "bs_public"          on barber_services for select using (true);
create policy "bs_staff"           on barber_services for all    using (is_staff());

-- working_hours
create policy "wh_public"          on working_hours for select using (true);
create policy "wh_staff"           on working_hours for all    using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- time_blocks
create policy "tb_staff"           on time_blocks for all using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- clients: anónimo puede insertar (flujo de reserva sin login); staff ve los de su shop
create policy "clients_anon_ins"   on clients for insert with check (true);
create policy "clients_anon_sel"   on clients for select using (true);
create policy "clients_staff_upd"  on clients for update using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- client_addresses: anónimo inserta
create policy "addr_anon_ins"      on client_addresses for insert with check (true);
create policy "addr_staff"         on client_addresses for all    using (is_staff());

-- bookings: anónimo inserta; staff ve las de su shop
create policy "book_anon_ins"      on bookings for insert with check (true);
create policy "book_staff_sel"     on bookings for select using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));
create policy "book_staff_upd"     on bookings for update using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

-- reviews
create policy "rev_public"         on reviews for select using (true);
create policy "rev_anon_ins"       on reviews for insert with check (true);

-- ── SEED: primera barbería + datos de prueba ──────────────────
insert into barbershops (id, name, slug, plan, phone, address, city, lat, lng, currency, allows_delivery, delivery_fee_base, delivery_fee_per_km)
values (
  'a0000000-0000-0000-0000-000000000001',
  'NobleCut',
  'noblecut',
  'pro',
  '+57 300 000 0000',
  'Calle 80 # 10-25',
  'Bogotá',
  4.7110,
  -74.0721,
  'COP',
  true,
  5000,
  1500
);

-- categorías de la primera barbería
insert into service_categories (shop_id, name, sort_order) values
  ('a0000000-0000-0000-0000-000000000001', 'Cortes',      1),
  ('a0000000-0000-0000-0000-000000000001', 'Barba',       2),
  ('a0000000-0000-0000-0000-000000000001', 'Combos',      3),
  ('a0000000-0000-0000-0000-000000000001', 'Adicionales', 4);

-- servicios
insert into services (shop_id, category_id, name, duration_min, price, price_delivery, allows_delivery, sort_order)
select
  'a0000000-0000-0000-0000-000000000001',
  c.id,
  s.name,
  s.duration_min,
  s.price,
  s.price_delivery,
  s.allows_delivery,
  s.sort_order
from (values
  ('Cortes',      'Corte clásico',        30, 25000, 35000, true,  1),
  ('Cortes',      'Fade / degradado',     45, 35000, 45000, true,  2),
  ('Cortes',      'Corte con diseño',     50, 45000, 55000, true,  3),
  ('Barba',       'Perfilado de barba',   20, 20000, 28000, true,  4),
  ('Barba',       'Afeitado con navaja',  30, 30000, 40000, true,  5),
  ('Combos',      'Corte + barba',        60, 45000, 60000, true,  6),
  ('Combos',      'Fade + barba + cejas', 75, 65000, 80000, true,  7),
  ('Adicionales', 'Cejas',               10, 10000, 15000, true,  8),
  ('Adicionales', 'Tratamiento capilar', 20, 20000, null,  false, 9)
) as s(category, name, duration_min, price, price_delivery, allows_delivery, sort_order)
join service_categories c on c.name = s.category and c.shop_id = 'a0000000-0000-0000-0000-000000000001';
