-- ============================================================
-- NobleCut - Schema completo para Supabase
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type booking_status as enum (
  'pending',    -- esperando confirmacion
  'confirmed',  -- confirmada
  'in_progress',-- en curso
  'completed',  -- finalizada
  'cancelled',  -- cancelada
  'no_show'     -- cliente no aparecio
);

create type booking_type as enum (
  'in_store',   -- en el local
  'delivery'    -- a domicilio
);

create type payment_status as enum (
  'pending',
  'paid',
  'refunded'
);

create type payment_method as enum (
  'cash',
  'card',
  'transfer',
  'nequi',
  'daviplata'
);

create type user_role as enum (
  'owner',    -- dueno de la barberia
  'barber',   -- barbero
  'client'    -- cliente
);

create type day_of_week as enum (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

-- ============================================================
-- TABLA: profiles (extiende auth.users de Supabase)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'client',
  full_name   text not null,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: barbers (perfil extendido de los barberos)
-- ============================================================
create table barbers (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid not null references profiles(id) on delete cascade,
  bio             text,
  specialty       text,                         -- ej: "Fades, Barbas"
  commission_pct  numeric(5,2) default 0,       -- % comision sobre servicios
  does_delivery   boolean not null default true,-- si hace domicilios
  delivery_radius numeric(6,2) default 10,      -- radio en km
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique(profile_id)
);

-- ============================================================
-- TABLA: service_categories
-- ============================================================
create table service_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABLA: services (catalogo de servicios de la barberia)
-- ============================================================
create table services (
  id              uuid primary key default uuid_generate_v4(),
  category_id     uuid references service_categories(id) on delete set null,
  name            text not null,
  description     text,
  duration_min    int not null,                   -- duracion en minutos
  price           numeric(10,2) not null,
  price_delivery  numeric(10,2),                  -- precio diferencial a domicilio (null = mismo precio)
  is_available    boolean not null default true,
  allows_delivery boolean not null default true,
  image_url       text,
  sort_order      int default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABLA: barber_services (que servicios ofrece cada barbero)
-- ============================================================
create table barber_services (
  barber_id   uuid not null references barbers(id) on delete cascade,
  service_id  uuid not null references services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- ============================================================
-- TABLA: working_hours (horario semanal por barbero)
-- ============================================================
create table working_hours (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references barbers(id) on delete cascade,
  day         day_of_week not null,
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true,
  constraint valid_hours check (start_time < end_time),
  unique(barber_id, day)
);

-- ============================================================
-- TABLA: time_blocks (bloqueos de agenda: vacaciones, descanso, etc.)
-- ============================================================
create table time_blocks (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references barbers(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  created_at  timestamptz not null default now(),
  constraint valid_block check (starts_at < ends_at)
);

-- ============================================================
-- TABLA: clients (clientes de la barberia)
-- ============================================================
create table clients (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid references profiles(id) on delete set null,  -- null si no tiene cuenta
  full_name       text not null,
  phone           text,
  email           text,
  notes           text,                 -- notas internas del barbero sobre el cliente
  total_visits    int not null default 0,
  last_visit_at   timestamptz,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TABLA: client_addresses (direcciones guardadas de clientes)
-- ============================================================
create table client_addresses (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references clients(id) on delete cascade,
  label        text default 'Casa',              -- etiqueta: Casa, Trabajo, etc.
  address_line text not null,
  city         text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- TABLA: bookings (reservas - core del negocio)
-- ============================================================
create table bookings (
  id              uuid primary key default uuid_generate_v4(),

  -- partes involucradas
  client_id       uuid not null references clients(id) on delete restrict,
  barber_id       uuid not null references barbers(id) on delete restrict,
  service_id      uuid not null references services(id) on delete restrict,

  -- tipo y estado
  type            booking_type not null default 'in_store',
  status          booking_status not null default 'pending',

  -- tiempos
  scheduled_at    timestamptz not null,
  duration_min    int not null,          -- copia del servicio al momento de reservar
  started_at      timestamptz,           -- cuando inicio realmente
  ended_at        timestamptz,           -- cuando termino realmente

  -- precios (se copian al momento de reservar para historico)
  price           numeric(10,2) not null,
  price_final     numeric(10,2),         -- precio cobrado realmente (puede diferir)

  -- pago
  payment_status  payment_status not null default 'pending',
  payment_method  payment_method,

  -- domicilio (solo aplica si type = 'delivery')
  address_id      uuid references client_addresses(id) on delete set null,
  address_line    text,                  -- copia de la direccion al momento de reservar
  lat             numeric(10,7),
  lng             numeric(10,7),
  delivery_fee    numeric(10,2) default 0,
  travel_started_at timestamptz,         -- cuando salio el barbero

  -- notas
  client_notes    text,                  -- lo que pide el cliente
  barber_notes    text,                  -- lo que anota el barbero internamente

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABLA: booking_services (servicios adicionales en una reserva)
-- Permite agregar mas de un servicio a la misma reserva
-- ============================================================
create table booking_services (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  service_id  uuid not null references services(id) on delete restrict,
  price       numeric(10,2) not null,
  duration_min int not null
);

-- ============================================================
-- TABLA: reviews (valoraciones de clientes)
-- ============================================================
create table reviews (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid not null references bookings(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  barber_id   uuid not null references barbers(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique(booking_id)  -- una sola review por reserva
);

-- ============================================================
-- TABLA: notifications (historial de notificaciones enviadas)
-- ============================================================
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  booking_id  uuid references bookings(id) on delete set null,
  client_id   uuid references clients(id) on delete set null,
  type        text not null,     -- 'booking_confirmed', 'reminder', 'cancelled', etc.
  channel     text not null,     -- 'whatsapp', 'email', 'push'
  sent_at     timestamptz not null default now(),
  status      text not null default 'sent'  -- 'sent', 'failed', 'delivered'
);

-- ============================================================
-- TABLA: shop_settings (configuracion global de la barberia)
-- ============================================================
create table shop_settings (
  id                    uuid primary key default uuid_generate_v4(),
  shop_name             text not null default 'NobleCut',
  phone                 text,
  address               text,
  city                  text,
  lat                   numeric(10,7),
  lng                   numeric(10,7),
  booking_lead_time_min int default 60,     -- minutos minimos de anticipacion para reservar
  booking_window_days   int default 30,     -- cuantos dias hacia adelante se puede reservar
  slot_interval_min     int default 30,     -- granularidad de slots de tiempo
  allows_delivery       boolean default true,
  delivery_fee_base     numeric(10,2) default 0,
  delivery_fee_per_km   numeric(10,2) default 0,
  currency              text default 'COP',
  timezone              text default 'America/Bogota',
  logo_url              text,
  instagram_url         text,
  whatsapp_number       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================
-- INDICES para consultas frecuentes
-- ============================================================

-- bookings por fecha y estado (lo mas consultado)
create index idx_bookings_scheduled_at on bookings(scheduled_at);
create index idx_bookings_barber_date on bookings(barber_id, scheduled_at);
create index idx_bookings_status on bookings(status);
create index idx_bookings_client on bookings(client_id);
create index idx_bookings_type on bookings(type);

-- disponibilidad
create index idx_working_hours_barber on working_hours(barber_id);
create index idx_time_blocks_barber on time_blocks(barber_id, starts_at, ends_at);

-- clientes
create index idx_clients_phone on clients(phone);
create index idx_clients_profile on clients(profile_id);

-- ============================================================
-- TRIGGERS: updated_at automatico
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger trg_services_updated_at
  before update on services
  for each row execute function update_updated_at();

create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

create trigger trg_shop_settings_updated_at
  before update on shop_settings
  for each row execute function update_updated_at();

-- ============================================================
-- TRIGGER: sincronizar total_visits del cliente al completar reserva
-- ============================================================

create or replace function sync_client_visits()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    update clients
    set
      total_visits = total_visits + 1,
      last_visit_at = now()
    where id = new.client_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_client_visits
  after update on bookings
  for each row execute function sync_client_visits();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table profiles enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;
alter table service_categories enable row level security;
alter table barber_services enable row level security;
alter table working_hours enable row level security;
alter table time_blocks enable row level security;
alter table clients enable row level security;
alter table client_addresses enable row level security;
alter table bookings enable row level security;
alter table booking_services enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table shop_settings enable row level security;

-- Funciones helper para RLS
create or replace function auth_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function is_barber_or_owner()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('barber', 'owner')
  );
$$ language sql security definer stable;

-- profiles: cada usuario ve y edita su propio perfil; owner/barber ven todos
create policy "profiles_self_read" on profiles for select using (id = auth.uid() or is_barber_or_owner());
create policy "profiles_self_update" on profiles for update using (id = auth.uid());

-- services: todos pueden ver; solo owner edita
create policy "services_public_read" on services for select using (true);
create policy "services_owner_write" on services for all using (auth_role() = 'owner');

-- service_categories: publico
create policy "categories_public_read" on service_categories for select using (true);
create policy "categories_owner_write" on service_categories for all using (auth_role() = 'owner');

-- barbers: todos pueden ver activos; owner gestiona
create policy "barbers_public_read" on barbers for select using (is_active = true or is_barber_or_owner());
create policy "barbers_owner_write" on barbers for all using (auth_role() = 'owner');
create policy "barbers_self_update" on barbers for update using (profile_id = auth.uid());

-- working_hours: todos ven; barber edita las suyas; owner edita todas
create policy "wh_public_read" on working_hours for select using (true);
create policy "wh_barber_write" on working_hours for all using (
  auth_role() = 'owner' or
  exists (select 1 from barbers where id = barber_id and profile_id = auth.uid())
);

-- bookings: cliente ve las suyas; barbero ve las asignadas; owner ve todas
create policy "bookings_client_read" on bookings for select using (
  is_barber_or_owner() or
  exists (select 1 from clients where id = client_id and profile_id = auth.uid())
);
create policy "bookings_client_insert" on bookings for insert with check (true);
create policy "bookings_staff_update" on bookings for update using (is_barber_or_owner());

-- clients: barbero y owner gestionan todo; anónimos pueden insertar (flujo de reserva sin login); cliente ve su propio registro
create policy "clients_anon_insert" on clients for insert with check (true);
create policy "clients_anon_phone_lookup" on clients for select using (true);  -- necesario para buscar por telefono en createBooking
create policy "clients_staff_update" on clients for update using (is_barber_or_owner());
create policy "clients_staff_delete" on clients for delete using (is_barber_or_owner());

-- shop_settings: todos leen; solo owner escribe
create policy "settings_public_read" on shop_settings for select using (true);
create policy "settings_owner_write" on shop_settings for all using (auth_role() = 'owner');

-- client_addresses: anónimos pueden insertar (se crea al guardar un domicilio); staff gestiona
create policy "addresses_anon_insert" on client_addresses for insert with check (true);
create policy "addresses_staff_all" on client_addresses for all using (is_barber_or_owner());

-- reviews: todos leen; cliente inserta la suya
create policy "reviews_public_read" on reviews for select using (true);
create policy "reviews_client_insert" on reviews for insert with check (
  exists (select 1 from clients where id = client_id and profile_id = auth.uid())
);

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================

-- Configuracion de la barberia
insert into shop_settings (shop_name, currency, timezone, allows_delivery, delivery_fee_base, delivery_fee_per_km)
values ('NobleCut', 'COP', 'America/Bogota', true, 5000, 1500);

-- Categorias de servicios
insert into service_categories (name, sort_order) values
  ('Cortes', 1),
  ('Barba', 2),
  ('Combos', 3),
  ('Adicionales', 4);

-- Servicios base
insert into services (category_id, name, duration_min, price, price_delivery, allows_delivery, sort_order)
select
  c.id,
  s.name,
  s.duration_min,
  s.price,
  s.price_delivery,
  s.allows_delivery,
  s.sort_order
from (values
  ('Cortes',       'Corte clásico',           30,  25000,  35000, true,  1),
  ('Cortes',       'Fade / degradado',         45,  35000,  45000, true,  2),
  ('Cortes',       'Corte con diseño',         50,  45000,  55000, true,  3),
  ('Barba',        'Perfilado de barba',       20,  20000,  28000, true,  4),
  ('Barba',        'Afeitado con navaja',      30,  30000,  40000, true,  5),
  ('Combos',       'Corte + barba',            60,  45000,  60000, true,  6),
  ('Combos',       'Fade + barba + cejas',     75,  65000,  80000, true,  7),
  ('Adicionales',  'Cejas',                    10,  10000,  15000, true,  8),
  ('Adicionales',  'Tratamiento capilar',      20,  20000,  null,  false, 9)
) as s(category, name, duration_min, price, price_delivery, allows_delivery, sort_order)
join service_categories c on c.name = s.category;
