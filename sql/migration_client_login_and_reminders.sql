-- 1. Columna para no reenviar recordatorios duplicados
alter table public.bookings
  add column if not exists reminder_sent boolean not null default false;

-- 2. Tabla de códigos de verificación para login de clientes (OTP por WhatsApp)
create table if not exists public.client_verifications (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.barbershops(id) on delete cascade,
  phone       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);

create unique index if not exists client_verifications_shop_phone_idx
  on public.client_verifications (shop_id, phone);

alter table public.client_verifications enable row level security;

-- Solo el backend (service role) accede a esta tabla — sin policies para anon/authenticated
