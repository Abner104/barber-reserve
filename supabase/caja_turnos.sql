-- Tabla de turnos de caja
create table if not exists caja_turnos (
  id            uuid primary key default uuid_generate_v4(),
  shop_id       uuid not null references barbershops(id) on delete cascade,
  abierto_por   uuid references profiles(id),
  caja_chica    numeric(12,2) not null default 0,
  estado        text not null default 'abierto' check (estado in ('abierto','cerrado')),
  opened_at     timestamptz not null default now(),
  closed_at     timestamptz,
  notas         text,
  created_at    timestamptz not null default now()
);

-- Tabla de egresos del turno
create table if not exists caja_egresos (
  id          uuid primary key default uuid_generate_v4(),
  turno_id    uuid not null references caja_turnos(id) on delete cascade,
  shop_id     uuid not null references barbershops(id) on delete cascade,
  descripcion text not null,
  monto       numeric(12,2) not null,
  created_by  uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- Índices
create index if not exists idx_turnos_shop on caja_turnos(shop_id, opened_at desc);
create index if not exists idx_egresos_turno on caja_egresos(turno_id);

-- RLS
alter table caja_turnos  enable row level security;
alter table caja_egresos enable row level security;

create policy "turnos_all_anon"  on caja_turnos  for all using (true) with check (true);
create policy "egresos_all_anon" on caja_egresos for all using (true) with check (true);
