-- Atribución de referidos: qué proveedor trajo a cada barbería, y tracking de comisión del 40%.

alter table barbershops
  add column if not exists referred_by_supplier_id uuid references suppliers(id) on delete set null;

create index if not exists idx_barbershops_referred_by on barbershops(referred_by_supplier_id);

create table if not exists referral_commissions (
  id                uuid primary key default gen_random_uuid(),
  supplier_id       uuid not null references suppliers(id) on delete cascade,
  shop_id           uuid not null references barbershops(id) on delete cascade,
  rate              numeric not null default 0.40,
  first_payment_amount numeric,
  commission_amount    numeric,
  status            text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  unique (supplier_id, shop_id)
);

create index if not exists idx_referral_commissions_supplier on referral_commissions(supplier_id);
create index if not exists idx_referral_commissions_status on referral_commissions(status);

alter table referral_commissions enable row level security;

-- Cada proveedor ve solo sus propias comisiones
create policy "supplier reads own commissions"
  on referral_commissions for select
  using (
    supplier_id in (select id from suppliers where profile_id = auth.uid())
  );

-- Solo el backend/super_admin escribe (altas y marcar pagado se hacen server-side)
create policy "super_admin manages commissions"
  on referral_commissions for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
  );
