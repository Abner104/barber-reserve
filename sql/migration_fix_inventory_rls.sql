-- Las 3 tablas del módulo de inventario tenían la misma policy rota: filtraban
-- por profiles.shop_id = auth.uid() sin ninguna excepción para super_admin.
-- Un super_admin no tiene shop_id propio, así que la comparación nunca matchea
-- y RLS bloquea silenciosamente (Supabase devuelve [] sin error) — por eso
-- Inventario y Ventas no mostraban nada al impersonar una barbería.
-- Mismo patrón que ya usan bookings/barbershops: is_super_admin() OR (is_staff() AND shop_id = get_my_shop_id()).

drop policy if exists "owner_inventory_products" on inventory_products;
create policy "inventory_products_staff_all"
  on inventory_products for all
  using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()))
  with check (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

drop policy if exists "owner_inventory_movements" on inventory_movements;
create policy "inventory_movements_staff_all"
  on inventory_movements for all
  using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()))
  with check (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));

drop policy if exists "owner_inventory_sales" on inventory_sales;
create policy "inventory_sales_staff_all"
  on inventory_sales for all
  using (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()))
  with check (is_super_admin() or (is_staff() and shop_id = get_my_shop_id()));
