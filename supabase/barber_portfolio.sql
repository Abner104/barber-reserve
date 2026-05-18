-- Tabla para el portfolio de trabajos del barbero
create table if not exists barber_portfolio (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references barbers(id) on delete cascade,
  image_url   text not null,
  caption     text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_portfolio_barber on barber_portfolio(barber_id);

-- RLS
alter table barber_portfolio enable row level security;
create policy "portfolio_public_read" on barber_portfolio for select using (true);
create policy "portfolio_anon_write"  on barber_portfolio for all using (true) with check (true);
