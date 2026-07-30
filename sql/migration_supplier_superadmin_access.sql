-- Permite a super_admin leer y operar sobre los datos de CUALQUIER proveedor
-- (necesario para el modo "elegir proveedor a operar" en /supplier del panel super admin).
-- No modifica las policies existentes de cada proveedor sobre sus propios datos, solo agrega
-- una policy adicional de bypass para el rol super_admin.

do $$
declare
  t text;
begin
  foreach t in array array['suppliers', 'supplier_products', 'supplier_orders', 'supplier_sales', 'supplier_credits']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I enable row level security', t);
      execute format(
        'drop policy if exists "super_admin full access" on %I',
        t
      );
      execute format(
        'create policy "super_admin full access" on %I for all using (exists (select 1 from profiles where id = auth.uid() and role = ''super_admin''))',
        t
      );
    end if;
  end loop;
end $$;
