-- Inventario más estricto: quién hizo cada movimiento, y tipo de movimiento
-- (compra/venta/merma/ajuste) para diferenciarlos en el historial.
alter table public.inventory_movements
  add column if not exists performed_by      uuid references public.profiles(id) on delete set null,
  add column if not exists performed_by_name text,
  add column if not exists type              text not null default 'adjustment'; -- 'purchase' | 'sale' | 'adjustment'

-- Costo unitario de cada compra puntual (puede variar entre compras del mismo
-- producto — no siempre lo que ya está guardado en price_cost).
alter table public.inventory_movements
  add column if not exists unit_cost numeric(10,2);

-- ── Catálogo del proveedor (supplier_products) ──────────────────────────
-- Mismo criterio: el stock no se edita a mano en el formulario, solo vía
-- movimientos auditados (reposición o corrección con motivo).
create table if not exists public.supplier_product_movements (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid not null references public.supplier_products(id) on delete cascade,
  supplier_id        uuid not null references public.suppliers(id) on delete cascade,
  delta              int not null,
  reason             text,
  performed_by       uuid references public.profiles(id) on delete set null,
  performed_by_name  text,
  created_at         timestamptz not null default now()
);

alter table public.supplier_product_movements enable row level security;

drop policy if exists "supplier_product_movements_staff_all" on supplier_product_movements;
create policy "supplier_product_movements_staff_all"
  on supplier_product_movements for all
  using (
    is_super_admin() or exists (
      select 1 from suppliers s
      where s.id = supplier_product_movements.supplier_id and s.profile_id = auth.uid()
    )
  )
  with check (
    is_super_admin() or exists (
      select 1 from suppliers s
      where s.id = supplier_product_movements.supplier_id and s.profile_id = auth.uid()
    )
  );
